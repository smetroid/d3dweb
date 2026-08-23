// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import CatalogView from '@/components/CatalogView.vue'

const { mockGetCatalog } = vi.hoisted(() => ({
  mockGetCatalog: vi.fn()
}))

vi.mock('@/services/api', () => ({
  default: { getCatalog: mockGetCatalog }
}))

const ITEMS = [
  {
    id: 'es1',
    title: 'Auth service nodes',
    shared_by: 'alice',
    depth: -1,
    node_count: 5,
    edge_count: 3,
    token: 'tok-abc'
  },
  {
    id: 'es2',
    title: 'Payment flow',
    shared_by: 'bob',
    depth: 0,
    node_count: 8,
    edge_count: 6,
    token: 'tok-xyz'
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
  app.mount(host)
  return { host, app }
}

beforeEach(() => {
  mockGetCatalog.mockResolvedValue(ITEMS)
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

describe('CatalogView – preview links', () => {
  it('each card has a preview link pointing to /element-share/:token', async () => {
    mountCatalog()
    await flush()
    const links = document.querySelectorAll('[data-testid="catalog-preview-link"]')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toMatch(/element-share\/tok-abc/)
    expect(links[1].getAttribute('href')).toMatch(/element-share\/tok-xyz/)
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
