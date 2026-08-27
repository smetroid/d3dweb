// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import SharedClusterPreview from '@/components/SharedClusterPreview.vue'
import { takePendingCluster } from '@/helpers/pendingCluster'

const { mockExchange, mockImport } = vi.hoisted(() => ({
  mockExchange: vi.fn(),
  mockImport: vi.fn()
}))

// The graph render is exercised in ClusterGraphPreview.test.js; here it only
// needs to not spin up a real cytoscape canvas under jsdom.
vi.mock('@/helpers/CytoscapeRenderer', () => ({
  default: class {
    init() {}
    updateScene() {}
    fitToContent() {}
    teardown() {}
  }
}))

vi.mock('@/services/api', () => ({
  default: {
    exchangeElementShare: mockExchange,
    importElementShare: mockImport
  }
}))

// Mirrors GET /element-shares/exchange: shareId (not id), title, and anonName
// in place of the creator's username.
const SHARE = {
  status: 'ok',
  shareId: 'es1',
  title: '',
  role: 'view',
  anonName: 'anon-fox',
  type: 'node',
  rootIds: ['n1'],
  cluster: {
    options: { directed: true },
    nodes: [
      { v: 'n1', value: {} },
      { v: 'n2', value: {} }
    ],
    edges: [{ v: 'n1', w: 'n2', value: {} }]
  }
}

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountPreview(token = 'tok123') {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () => h(SharedClusterPreview, { token })
    }
  })
  const push = vi.fn()
  app.config.globalProperties.$router = { push }
  app.component('v-icon', { template: '<span />' })
  app.mount(host)
  return { host, app, push }
}

beforeEach(() => {
  mockExchange.mockResolvedValue(SHARE)
  // Mirrors POST /element-shares/:id/import: the cluster to open, no dagId.
  mockImport.mockResolvedValue({
    status: 'ok',
    type: 'node',
    rootIds: ['n1'],
    cluster: SHARE.cluster
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('SharedClusterPreview – exchange flow', () => {
  it('calls exchangeElementShare with the token on mount', async () => {
    mountPreview('mytoken')
    await flush()
    expect(mockExchange).toHaveBeenCalledWith('mytoken')
  })

  it('shows a loading state before the exchange resolves', async () => {
    let resolve
    mockExchange.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    mountPreview()
    await nextTick()
    expect(document.body.textContent).toMatch(/loading|fetching/i)
    resolve(SHARE)
    await flush()
  })

  it('shows the title returned by the exchange endpoint', async () => {
    mockExchange.mockResolvedValue({ ...SHARE, title: 'Auth service cluster' })
    mountPreview()
    await flush()
    expect(document.body.textContent).toContain('Auth service cluster')
    expect(document.body.textContent).not.toContain('Shared Cluster')
  })

  it('falls back to a generic title when the share has none', async () => {
    mockExchange.mockResolvedValue({ ...SHARE, title: '' })
    mountPreview()
    await flush()
    expect(document.body.textContent).toContain('Shared Cluster')
  })

  it('shows the anonymised sharer name the endpoint does return', async () => {
    mountPreview()
    await flush()
    expect(document.body.textContent).toMatch(/anon-fox/)
  })

  it('shows the node and edge counts', async () => {
    mountPreview()
    await flush()
    const text = document.body.textContent
    expect(text).toMatch(/2/)
    expect(text).toMatch(/1/)
  })

  it('renders the cluster as a graph, not just its counts', async () => {
    mountPreview()
    await flush()
    expect(document.querySelector('[data-testid="cluster-graph"]')).not.toBeNull()
  })

  it('shows an error when exchange returns null', async () => {
    mockExchange.mockResolvedValue(null)
    mountPreview()
    await flush()
    expect(document.body.textContent).toMatch(/invalid|expired|error/i)
  })

  it('surfaces the server message when exchange rejects', async () => {
    // The API answers with {status: "error", message: "..."}; the unbound
    // catch discarded it and always showed the generic fallback.
    const err = new Error('Request failed with status code 403')
    err.response = { status: 403, data: { status: 'error', message: 'share link revoked' } }
    mockExchange.mockRejectedValue(err)
    mountPreview()
    await flush()
    expect(document.body.textContent).toContain('share link revoked')
  })

  it('surfaces the server message when import fails', async () => {
    const err = new Error('Request failed with status code 500')
    err.response = { status: 500, data: { status: 'error', message: 'diagram not found' } }
    mockImport.mockRejectedValue(err)
    mountPreview()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await flush()
    expect(document.body.textContent).toContain('diagram not found')
  })

  it('keeps the generic message when the server sends none', async () => {
    mockExchange.mockRejectedValue(new Error('Network Error'))
    mountPreview()
    await flush()
    expect(document.body.textContent).toMatch(/invalid, expired, or revoked/i)
    expect(document.body.textContent).not.toMatch(/Network Error/)
  })

  it('shows an error when exchange rejects', async () => {
    mockExchange.mockRejectedValue(new Error('network'))
    mountPreview()
    await flush()
    expect(document.body.textContent).toMatch(/invalid|expired|error/i)
  })
})

describe('SharedClusterPreview – import action', () => {
  it('shows an import button after successful exchange', async () => {
    mountPreview()
    await flush()
    const btn = document.querySelector('[data-testid="import-btn"]')
    expect(btn).not.toBeNull()
  })

  it('calls importElementShare when import button is clicked', async () => {
    mountPreview()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await flush()
    expect(mockImport).toHaveBeenCalledWith('es1')
  })

  it('shows importing state while in progress', async () => {
    let resolve
    mockImport.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    mountPreview()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await nextTick()
    const btn = document.querySelector('[data-testid="import-btn"]')
    expect(btn.disabled).toBe(true)
    resolve({ status: 'ok', cluster: SHARE.cluster })
    await flush()
  })

  it('shows success message after import', async () => {
    mountPreview()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await flush()
    expect(document.body.textContent).toMatch(/success/i)
    expect(document.body.textContent).not.toMatch(/import failed/i)
  })

  it('hands the cluster off and returns to the app', async () => {
    const { push } = mountPreview()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await flush()
    const pending = takePendingCluster()
    expect(pending.mode).toBe('new')
    expect(pending.cluster.nodes).toHaveLength(2)
    expect(push).toHaveBeenCalledWith('/')
  })

  // A bare share link carries no real name, so the alias is all there is.
  it('keeps the anonymous alias — no real author is known here', async () => {
    mountPreview()
    await flush()
    expect(document.body.textContent).toContain('anon-fox')
  })
})

describe('SharedClusterPreview – merge action', () => {
  const mergeBtn = () => document.querySelector('[data-testid="merge-btn"]')

  // A share link is opened outside the editor, so "Merge here" cannot reach the
  // open diagram directly — it hands the cluster to the app the same way the
  // import does.
  it('offers merge on the standalone share page', async () => {
    mountPreview()
    await flush()
    expect(mergeBtn()).not.toBeNull()
  })

  it('hands the cluster off for merging and returns to the app', async () => {
    const { push } = mountPreview()
    await flush()
    mergeBtn().click()
    await flush()
    const pending = takePendingCluster()
    expect(pending).not.toBeNull()
    expect(pending.mode).toBe('merge')
    expect(pending.cluster.nodes).toHaveLength(2)
    expect(push).toHaveBeenCalledWith('/')
  })

  it('does not claim the cluster was imported when it was merged', async () => {
    mountPreview()
    await flush()
    mergeBtn().click()
    await flush()
    expect(document.body.textContent).toMatch(/merging/i)
    expect(document.body.textContent).not.toMatch(/imported/i)
  })

  it('merges the cluster it already exchanged, without a second fetch', async () => {
    mountPreview()
    await flush()
    mergeBtn().click()
    await flush()
    expect(mockImport).not.toHaveBeenCalled()
  })
})
