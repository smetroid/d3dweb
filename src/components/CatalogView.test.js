// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import CatalogView from '@/components/CatalogView.vue'
import { takePendingCluster } from '@/helpers/pendingCluster'

const { mockGetCatalog, mockExchange, mockImport } = vi.hoisted(() => ({
  mockGetCatalog: vi.fn(),
  mockExchange: vi.fn(),
  mockImport: vi.fn()
}))

// Keeps a real cytoscape canvas out of jsdom; the render itself is covered by
// ClusterGraphPreview.test.js.
vi.mock('@/helpers/CytoscapeRenderer', () => ({
  default: class {
    init() {}
    updateScene() {}
    fitToContent() {}
    teardown() {}
  }
}))

// Thumbnail rendering has its own tests; here it only needs to resolve.
vi.mock('@/helpers/shareThumbnails', () => ({
  renderThumbnail: vi.fn().mockResolvedValue('data:image/png;base64,AAAA')
}))

vi.mock('@/services/api', () => ({
  default: {
    getCatalog: mockGetCatalog,
    exchangeElementShare: mockExchange,
    importElementShare: mockImport
  }
}))

const ITEMS = [
  {
    id: 'es1',
    title: 'Auth service nodes',
    createdBy: 'alice',
    rootIds: ['n1'],
    nodeCount: 5,
    edgeCount: 3,
    token: 'tok-abc',
    tags: [],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'es2',
    title: 'Payment flow',
    createdBy: 'bob',
    rootIds: ['n2'],
    nodeCount: 8,
    edgeCount: 6,
    token: 'tok-xyz',
    tags: [],
    createdAt: '2026-01-02T00:00:00Z'
  }
]

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountCatalog() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () => h(CatalogView)
    }
  })
  const push = vi.fn()
  app.config.globalProperties.$router = { push }
  app.component('v-icon', { template: '<span />' })
  app.component('FocusTrap', {
    props: { active: Boolean },
    setup(_, { slots }) {
      return () => h('div', slots.default?.())
    }
  })
  app.mount(host)
  return { host, app, push }
}

beforeEach(() => {
  mockGetCatalog.mockResolvedValue(ITEMS)
  mockExchange.mockResolvedValue({
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
  })
  // Mirrors POST /element-shares/:id/import, which returns the cluster for the
  // client to open — it never creates a diagram, so there is no dagId.
  mockImport.mockResolvedValue({
    status: 'ok',
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
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('CatalogView – loading and listing', () => {
  it('shows a thumbnail for every card', async () => {
    mountCatalog()
    await flush()
    expect(document.querySelectorAll('[data-testid="share-thumb"]')).toHaveLength(2)
  })

  // A catalog item carries a public token, not a cluster, so each thumbnail
  // has to exchange it.
  it("fetches each card's cluster by its token", async () => {
    mountCatalog()
    await flush()
    expect(mockExchange).toHaveBeenCalledWith('tok-abc')
    expect(mockExchange).toHaveBeenCalledWith('tok-xyz')
  })

  it('calls getCatalog on mount', async () => {
    mountCatalog()
    await flush()
    expect(mockGetCatalog).toHaveBeenCalled()
  })

  it('shows loading state before catalog resolves', async () => {
    let resolve
    mockGetCatalog.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    mountCatalog()
    await nextTick()
    expect(document.body.textContent).toMatch(/loading/i)
    resolve([])
    await flush()
  })

  it('renders a card for each catalog item', async () => {
    mountCatalog()
    await flush()
    const cards = document.querySelectorAll('[data-testid="catalog-card"]')
    expect(cards).toHaveLength(2)
  })

  it('shows item titles', async () => {
    mountCatalog()
    await flush()
    const text = document.body.textContent
    expect(text).toContain('Auth service nodes')
    expect(text).toContain('Payment flow')
  })

  it('shows sharer names', async () => {
    mountCatalog()
    await flush()
    const text = document.body.textContent
    expect(text).toMatch(/alice/)
    expect(text).toMatch(/bob/)
  })

  it('shows node counts', async () => {
    mountCatalog()
    await flush()
    const text = document.body.textContent
    expect(text).toMatch(/5/)
    expect(text).toMatch(/8/)
  })

  it('shows empty state when catalog is empty', async () => {
    mockGetCatalog.mockResolvedValue([])
    mountCatalog()
    await flush()
    expect(document.body.textContent).toMatch(/empty|nothing|no public/i)
  })

  it('shows error state when getCatalog rejects', async () => {
    mockGetCatalog.mockRejectedValue(new Error('network'))
    mountCatalog()
    await flush()
    expect(document.body.textContent).toMatch(/error|failed/i)
  })
})

describe('CatalogView – preview dialog', () => {
  const previewButtons = () => document.querySelectorAll('[data-testid="catalog-preview-btn"]')
  const dialog = () => document.querySelector('[data-testid="catalog-preview-dialog"]')

  it('offers a preview control per card that is not a document link', async () => {
    mountCatalog()
    await flush()
    expect(previewButtons()).toHaveLength(2)
    // A plain <a href> would tear down the SPA and reload the whole app.
    expect(document.querySelector('a[href^="/element-share/"]')).toBeNull()
  })

  it("opens the dialog and exchanges the clicked item's token", async () => {
    mountCatalog()
    await flush()
    expect(dialog()).toBeNull()
    previewButtons()[1].click()
    await flush()
    expect(dialog()).not.toBeNull()
    expect(mockExchange).toHaveBeenCalledWith('tok-xyz')
  })

  it('shows the catalog item title in the dialog', async () => {
    mountCatalog()
    await flush()
    previewButtons()[0].click()
    await flush()
    expect(dialog().textContent).toContain('Auth service nodes')
  })

  // The fx-panel chrome is a right-hand drawer by default, and six other
  // dialogs share it — the catalog opts out with a modifier rather than
  // restyling the class everyone uses.
  it('opens the preview centred rather than as a right-hand drawer', async () => {
    mountCatalog()
    await flush()
    document.querySelectorAll('[data-testid="catalog-preview-btn"]')[0].click()
    await flush()
    const stage = document.querySelector('.fx-hud-stage')
    expect(stage.classList.contains('fx-hud-stage--center')).toBe(true)
  })

  it('renders the previewed cluster as a graph', async () => {
    mountCatalog()
    await flush()
    document.querySelectorAll('[data-testid="catalog-preview-btn"]')[0].click()
    await flush()
    expect(dialog().querySelector('[data-testid="cluster-graph"]')).not.toBeNull()
  })

  it('shows the cluster counts from the exchanged share', async () => {
    mountCatalog()
    await flush()
    previewButtons()[0].click()
    await flush()
    expect(dialog().textContent).toMatch(/2 nodes/)
    expect(dialog().textContent).toMatch(/1 edge/)
  })

  it('does not offer "Merge here" — the catalog has no active diagram', async () => {
    mountCatalog()
    await flush()
    previewButtons()[0].click()
    await flush()
    expect(document.querySelector('[data-testid="merge-btn"]')).toBeNull()
    expect(document.querySelector('[data-testid="import-btn"]')).not.toBeNull()
  })

  it('closes the dialog with the close button', async () => {
    mountCatalog()
    await flush()
    previewButtons()[0].click()
    await flush()
    document.querySelector('[data-testid="catalog-preview-close"]').click()
    await flush()
    expect(dialog()).toBeNull()
  })

  it('re-exchanges when a different item is previewed', async () => {
    mountCatalog()
    await flush()
    previewButtons()[0].click()
    await flush()
    document.querySelector('[data-testid="catalog-preview-close"]').click()
    await flush()
    previewButtons()[1].click()
    await flush()
    expect(mockExchange).toHaveBeenNthCalledWith(1, 'tok-abc')
    expect(mockExchange).toHaveBeenNthCalledWith(2, 'tok-xyz')
  })

  it('surfaces the server message when the preview exchange fails', async () => {
    const err = new Error('Request failed with status code 403')
    err.response = { status: 403, data: { status: 'error', message: 'share link revoked' } }
    mockExchange.mockRejectedValue(err)
    mountCatalog()
    await flush()
    previewButtons()[0].click()
    await flush()
    expect(dialog().textContent).toContain('share link revoked')
  })
})

describe('CatalogView – importing as a new diagram', () => {
  const previewButtons = () => document.querySelectorAll('[data-testid="catalog-preview-btn"]')
  const dialog = () => document.querySelector('[data-testid="catalog-preview-dialog"]')

  const openAndImport = async (harness) => {
    previewButtons()[0].click()
    await flush()
    document.querySelector('[data-testid="import-btn"]').click()
    await flush()
    return harness
  }

  it('imports the exchanged share by id', async () => {
    const h = mountCatalog()
    await flush()
    await openAndImport(h)
    expect(mockImport).toHaveBeenCalledWith('es1')
  })

  it('treats a cluster response as success — the API returns no dagId', async () => {
    const h = mountCatalog()
    await flush()
    await openAndImport(h)
    expect(document.body.textContent).not.toMatch(/import failed/i)
  })

  it('hands the cluster off for the editor to open', async () => {
    const h = mountCatalog()
    await flush()
    await openAndImport(h)
    const pending = takePendingCluster()
    expect(pending).not.toBeNull()
    expect(pending.mode).toBe('new')
    expect(pending.cluster.nodes).toHaveLength(2)
    expect(pending.cluster.edges).toHaveLength(1)
  })

  it('returns to the app so the new diagram is visible', async () => {
    const h = mountCatalog()
    await flush()
    await openAndImport(h)
    expect(h.push).toHaveBeenCalledWith('/')
  })

  it('surfaces a server error and does not hand anything off', async () => {
    const err = new Error('Request failed with status code 403')
    err.response = { status: 403, data: { status: 'error', message: 'access denied' } }
    mockImport.mockRejectedValue(err)
    const h = mountCatalog()
    await flush()
    await openAndImport(h)
    expect(document.body.textContent).toContain('access denied')
    expect(takePendingCluster()).toBeNull()
    expect(h.push).not.toHaveBeenCalled()
  })

  it('does not hand off a success response that carries no cluster', async () => {
    mockImport.mockResolvedValue({ status: 'ok' })
    const h = mountCatalog()
    await flush()
    await openAndImport(h)
    expect(takePendingCluster()).toBeNull()
    expect(h.push).not.toHaveBeenCalled()
    expect(dialog().textContent).toMatch(/failed/i)
  })
})

describe('CatalogView – attribution', () => {
  it("shows the catalog's real author, not the share's anonymous alias", async () => {
    mountCatalog()
    await flush()
    document.querySelectorAll('[data-testid="catalog-preview-btn"]')[0].click()
    await flush()
    const text = document.querySelector('[data-testid="catalog-preview-dialog"]').textContent
    expect(text).toContain('alice')
    expect(text).not.toContain('anon-fox')
  })
})

describe('CatalogView – search/filter', () => {
  it('filtering by title narrows the cards shown', async () => {
    mountCatalog()
    await flush()
    const input = document.querySelector('[data-testid="catalog-search"]')
    expect(input).not.toBeNull()
    input.value = 'auth'
    input.dispatchEvent(new Event('input'))
    await flush()
    const cards = document.querySelectorAll('[data-testid="catalog-card"]')
    expect(cards).toHaveLength(1)
    expect(cards[0].textContent).toContain('Auth service nodes')
  })

  it('clearing the filter restores all cards', async () => {
    mountCatalog()
    await flush()
    const input = document.querySelector('[data-testid="catalog-search"]')
    input.value = 'auth'
    input.dispatchEvent(new Event('input'))
    await flush()
    input.value = ''
    input.dispatchEvent(new Event('input'))
    await flush()
    expect(document.querySelectorAll('[data-testid="catalog-card"]')).toHaveLength(2)
  })
})

describe('CatalogView – import straight from a card', () => {
  const importBtns = () => document.querySelectorAll('[data-testid="catalog-import-btn"]')

  it('offers a New diagram button on every card', async () => {
    mountCatalog()
    await flush()
    expect(importBtns()).toHaveLength(2)
  })

  it("imports the clicked card's share by id", async () => {
    mountCatalog()
    await flush()
    importBtns()[1].click()
    await flush()
    expect(mockImport).toHaveBeenCalledWith('es2')
  })

  // Same handoff the preview dialog uses: /catalog renders instead of the
  // editor, so the cluster is parked and the app applies it on arrival.
  it('parks the cluster and returns to the app', async () => {
    const { push } = mountCatalog()
    await flush()
    importBtns()[0].click()
    await flush()
    const pending = takePendingCluster()
    expect(pending.mode).toBe('new')
    expect(push).toHaveBeenCalledWith('/')
  })

  // /catalog is a full-screen route, so App's toast stack is not mounted —
  // the card has to carry its own error. This is what a logged-out visitor sees.
  it('shows the server message on the card when the import is refused', async () => {
    const err = new Error('Request failed with status code 401')
    err.response = { status: 401, data: { status: 'error', message: 'login required' } }
    mockImport.mockRejectedValue(err)
    mountCatalog()
    await flush()
    importBtns()[0].click()
    await flush()
    expect(document.body.textContent).toContain('login required')
  })

  it('disables the button while the import is in flight', async () => {
    let resolve
    mockImport.mockReturnValue(new Promise((r) => (resolve = r)))
    mountCatalog()
    await flush()
    importBtns()[0].click()
    await nextTick()
    expect(importBtns()[0].disabled).toBe(true)
    resolve({ status: 'ok', cluster: { nodes: [], edges: [] } })
    await flush()
  })
})
