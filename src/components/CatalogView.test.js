// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import CatalogView from '@/components/CatalogView.vue'

const { mockGetCatalog, mockExchange, mockImport } = vi.hoisted(() => ({
  mockGetCatalog: vi.fn(),
  mockExchange: vi.fn(),
  mockImport: vi.fn()
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
  app.component('v-icon', { template: '<span />' })
  app.component('FocusTrap', {
    props: { active: Boolean },
    setup(_, { slots }) {
      return () => h('div', slots.default?.())
    }
  })
  app.mount(host)
  return { host, app }
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
  mockImport.mockResolvedValue({ dagId: 'new-dag' })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('CatalogView – loading and listing', () => {
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
