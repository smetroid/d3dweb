// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import SharedClusterPreview from '@/components/SharedClusterPreview.vue'

const { mockExchange, mockImport } = vi.hoisted(() => ({
  mockExchange: vi.fn(),
  mockImport: vi.fn()
}))

vi.mock('@/services/api', () => ({
  default: {
    exchangeElementShare: mockExchange,
    importElementShare: mockImport
  }
}))

// Mirrors GET /element-shares/exchange: shareId (not id), and no title or
// shared_by — the endpoint does not return them.
const SHARE = {
  status: 'ok',
  shareId: 'es1',
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
  app.component('v-icon', { template: '<span />' })
  app.mount(host)
  return { host, app }
}

beforeEach(() => {
  mockExchange.mockResolvedValue(SHARE)
  mockImport.mockResolvedValue({ dagId: 'new-dag' })
})

afterEach(() => {
  document.body.innerHTML = ''
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

  it('falls back to a generic title, which the exchange endpoint does not return', async () => {
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
    resolve({ dagId: 'dag2' })
    await flush()
  })

  it('shows success message after import', async () => {
    mountPreview()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await flush()
    expect(document.body.textContent).toMatch(/import|added|success/i)
  })
})
