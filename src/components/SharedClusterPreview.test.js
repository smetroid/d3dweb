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

const SHARE = {
  id: 'es1',
  title: 'Auth Service cluster',
  shared_by: 'alice',
  depth: -1,
  expires_at: '2027-01-01T00:00:00Z',
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

  it('shows the share title after successful exchange', async () => {
    mountPreview()
    await flush()
    expect(document.body.textContent).toContain('Auth Service cluster')
  })

  it('shows the sharer name', async () => {
    mountPreview()
    await flush()
    expect(document.body.textContent).toMatch(/alice/)
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
