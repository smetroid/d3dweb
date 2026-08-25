// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import SharedInbox from '@/components/SharedInbox.vue'

const { mockListInbox, mockImport, mockRevoke } = vi.hoisted(() => ({
  mockListInbox: vi.fn(),
  mockImport: vi.fn(),
  mockRevoke: vi.fn()
}))

vi.mock('@/services/api', () => ({
  default: {
    listInbox: mockListInbox,
    importElementShare: mockImport,
    revokeElementShare: mockRevoke
  }
}))

const SHARES = [
  {
    id: 'es1',
    title: 'Auth cluster',
    type: 'cluster',
    rootIds: ['n1', 'n2'],
    audienceKind: 'user',
    role: 'view',
    createdBy: 'alice',
    expiresAt: '2027-01-01T00:00:00Z',
    catalog: false,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'es2',
    title: 'Payment nodes',
    type: 'node',
    rootIds: ['n3'],
    audienceKind: 'company',
    role: 'view',
    createdBy: 'bob',
    expiresAt: '2027-06-01T00:00:00Z',
    catalog: false,
    tags: [],
    createdAt: '2026-01-02T00:00:00Z'
  }
]

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountInbox() {
  const closed = { value: false }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () =>
        h(SharedInbox, {
          onClose: () => {
            closed.value = true
          }
        })
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
  return { host, app, closed }
}

beforeEach(() => {
  mockListInbox.mockResolvedValue(SHARES)
  mockImport.mockResolvedValue({ dagId: 'dag-new' })
  mockRevoke.mockResolvedValue({ ok: true })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('SharedInbox – loading and listing', () => {
  it('calls listInbox on mount', async () => {
    mountInbox()
    await flush()
    expect(mockListInbox).toHaveBeenCalled()
  })

  it('shows loading state before inbox resolves', async () => {
    let resolve
    mockListInbox.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    mountInbox()
    await nextTick()
    expect(document.body.textContent).toMatch(/loading/i)
    resolve([])
    await flush()
  })

  it('renders a row for each share in the inbox', async () => {
    mountInbox()
    await flush()
    const rows = document.querySelectorAll('[data-testid="inbox-row"]')
    expect(rows).toHaveLength(2)
  })

  it('shows share titles', async () => {
    mountInbox()
    await flush()
    const text = document.body.textContent
    expect(text).toContain('Auth cluster')
    expect(text).toContain('Payment nodes')
  })

  it('shows sharer names', async () => {
    mountInbox()
    await flush()
    const text = document.body.textContent
    expect(text).toMatch(/alice/)
    expect(text).toMatch(/bob/)
  })

  it('shows empty state when inbox is empty', async () => {
    mockListInbox.mockResolvedValue([])
    mountInbox()
    await flush()
    expect(document.body.textContent).toMatch(/empty|no share/i)
  })

  it('shows error state when listInbox rejects', async () => {
    mockListInbox.mockRejectedValue(new Error('network'))
    mountInbox()
    await flush()
    expect(document.body.textContent).toMatch(/error|failed/i)
  })
})

describe('SharedInbox – import as new diagram', () => {
  it('each row has an "import as new" button', async () => {
    mountInbox()
    await flush()
    const btns = document.querySelectorAll('[data-testid="inbox-import-btn"]')
    expect(btns).toHaveLength(2)
  })

  it('calls importElementShare with share id on import-new click', async () => {
    mountInbox()
    await flush()
    document.querySelectorAll('[data-testid="inbox-import-btn"]')[0].click()
    await flush()
    expect(mockImport).toHaveBeenCalledWith('es1')
  })

  it('shows success indicator after import', async () => {
    mountInbox()
    await flush()
    document.querySelectorAll('[data-testid="inbox-import-btn"]')[0].click()
    await flush()
    const row = document.querySelectorAll('[data-testid="inbox-row"]')[0]
    expect(row.textContent).toMatch(/import|success|added/i)
  })
})

describe('SharedInbox – merge into current diagram', () => {
  it('each row has a "merge here" button', async () => {
    mountInbox()
    await flush()
    const btns = document.querySelectorAll('[data-testid="inbox-merge-btn"]')
    expect(btns).toHaveLength(2)
  })

  it('emits merge event with share id when merge button is clicked', async () => {
    const mergedIds = []
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      setup() {
        return () =>
          h(SharedInbox, {
            onClose: () => {},
            onMerge: (id) => mergedIds.push(id)
          })
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
    await flush()
    document.querySelectorAll('[data-testid="inbox-merge-btn"]')[0].click()
    await flush()
    expect(mergedIds).toEqual(['es1'])
  })
})

describe('SharedInbox – close', () => {
  it('emits close when the × button is clicked', async () => {
    const { closed } = mountInbox()
    await flush()
    document.querySelector('[data-testid="inbox-close-btn"]').click()
    await flush()
    expect(closed.value).toBe(true)
  })
})
