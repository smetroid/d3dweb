// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ElementShareDialog from '@/components/ElementShareDialog.vue'

const { mockCreateElementShare, mockListCompanies, mockListGroups } = vi.hoisted(() => ({
  mockCreateElementShare: vi.fn(),
  mockListCompanies: vi.fn(),
  mockListGroups: vi.fn()
}))

vi.mock('@/services/api', () => ({
  default: {
    createElementShare: mockCreateElementShare,
    listCompanies: mockListCompanies,
    listGroups: mockListGroups
  }
}))

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountDialog(props = {}) {
  const defaults = {
    dagId: 'dag1',
    selectedNodeIds: ['node1', 'node2']
  }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const closed = { value: false }

  const app = createApp({
    setup() {
      return () =>
        h(ElementShareDialog, {
          ...defaults,
          ...props,
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
  mockCreateElementShare.mockResolvedValue({ token: 'share-token-abc' })
  mockListCompanies.mockResolvedValue([{ id: 'c1', name: 'Acme' }])
  mockListGroups.mockResolvedValue([{ id: 'g1', name: 'Eng' }])
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ElementShareDialog – rendering', () => {
  it('shows the number of selected nodes', async () => {
    mountDialog({ selectedNodeIds: ['a', 'b', 'c'] })
    await flush()
    expect(document.body.textContent).toMatch(/3/)
  })

  it('shows audience options: public, user, company, group', async () => {
    mountDialog()
    await flush()
    const text = document.body.textContent
    expect(text).toMatch(/public/i)
    expect(text).toMatch(/user|me/i)
    expect(text).toMatch(/company/i)
    expect(text).toMatch(/group/i)
  })

  it('shows depth selector with at least the full-component option', async () => {
    mountDialog()
    await flush()
    expect(document.body.textContent).toMatch(/full component/i)
  })

  it('shows expiry buttons 1d, 7d, 30d', async () => {
    mountDialog()
    await flush()
    const text = document.body.textContent
    expect(text).toMatch(/1d/)
    expect(text).toMatch(/7d/)
    expect(text).toMatch(/30d/)
  })

  it('shows a Generate Link button', async () => {
    mountDialog()
    await flush()
    const btn = document.querySelector('[data-testid="generate-btn"]')
    expect(btn).not.toBeNull()
  })
})

describe('ElementShareDialog – generate flow', () => {
  it('calls createElementShare with correct dagId and request on submit', async () => {
    mountDialog({ dagId: 'mydag', selectedNodeIds: ['n1'] })
    await flush()
    document.querySelector('[data-testid="generate-btn"]').click()
    await flush()
    expect(mockCreateElementShare).toHaveBeenCalledWith(
      'mydag',
      expect.objectContaining({
        rootIds: ['n1'],
        audience: expect.objectContaining({ kind: 'public' })
      })
    )
  })

  it('shows generated link after success', async () => {
    mountDialog({ selectedNodeIds: ['n1'] })
    await flush()
    document.querySelector('[data-testid="generate-btn"]').click()
    await flush()
    const linkInput = document.querySelector('.share-link-input')
    expect(linkInput).not.toBeNull()
    expect(linkInput.value).toMatch(/share-token-abc/)
  })

  it('disables the button while generating', async () => {
    let resolve
    mockCreateElementShare.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    mountDialog({ selectedNodeIds: ['n1'] })
    await flush()
    const btn = document.querySelector('[data-testid="generate-btn"]')
    btn.click()
    await nextTick()
    expect(btn.disabled).toBe(true)
    resolve({ token: 't' })
    await flush()
    expect(btn.disabled).toBe(false)
  })

  it('shows an error message when the API returns no token', async () => {
    mockCreateElementShare.mockResolvedValue({ error: 'permission denied' })
    mountDialog({ selectedNodeIds: ['n1'] })
    await flush()
    document.querySelector('[data-testid="generate-btn"]').click()
    await flush()
    expect(document.body.textContent).toMatch(/permission denied|failed|error/i)
  })

  it('shows an error message when the API throws', async () => {
    mockCreateElementShare.mockRejectedValue(new Error('network'))
    mountDialog({ selectedNodeIds: ['n1'] })
    await flush()
    document.querySelector('[data-testid="generate-btn"]').click()
    await flush()
    expect(document.body.textContent).toMatch(/failed|error/i)
  })
})

describe('ElementShareDialog – close', () => {
  it('emits close when the × button is clicked', async () => {
    const { closed } = mountDialog()
    await flush()
    document.querySelector('[data-testid="close-btn"]').click()
    await flush()
    expect(closed.value).toBe(true)
  })
})

describe('ElementShareDialog – title and catalog', () => {
  it('renders a title input', async () => {
    mountDialog()
    await flush()
    expect(document.querySelector('[data-testid="share-title-input"]')).not.toBeNull()
  })

  it('renders the catalog checkbox when audience is public', async () => {
    mountDialog()
    await flush()
    expect(document.querySelector('[data-testid="catalog-checkbox"]')).not.toBeNull()
  })

  it('hides the catalog checkbox when audience is not public', async () => {
    mountDialog()
    await flush()
    const companyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.match(/company/i)
    )
    companyBtn?.click()
    await flush()
    expect(document.querySelector('[data-testid="catalog-checkbox"]')).toBeNull()
  })

  it('includes title in the createElementShare request', async () => {
    mountDialog({ dagId: 'dag1', selectedNodeIds: ['n1'] })
    await flush()
    const titleInput = document.querySelector('[data-testid="share-title-input"]')
    titleInput.value = 'My Share'
    titleInput.dispatchEvent(new Event('input'))
    await flush()
    document.querySelector('[data-testid="generate-btn"]').click()
    await flush()
    expect(mockCreateElementShare).toHaveBeenCalledWith(
      'dag1',
      expect.objectContaining({ title: 'My Share' })
    )
  })

  it('includes catalog:true in the request when checkbox is checked', async () => {
    mountDialog({ dagId: 'dag1', selectedNodeIds: ['n1'] })
    await flush()
    const checkbox = document.querySelector('[data-testid="catalog-checkbox"]')
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change'))
    await flush()
    document.querySelector('[data-testid="generate-btn"]').click()
    await flush()
    expect(mockCreateElementShare).toHaveBeenCalledWith(
      'dag1',
      expect.objectContaining({ catalog: true })
    )
  })
})

describe('ElementShareDialog – audience switching', () => {
  it('selecting company audience loads companies', async () => {
    mountDialog()
    await flush()
    const companyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.match(/company/i)
    )
    companyBtn?.click()
    await flush()
    expect(mockListCompanies).toHaveBeenCalled()
  })

  it('selecting group audience loads groups', async () => {
    mountDialog()
    await flush()
    const groupBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.match(/group/i)
    )
    groupBtn?.click()
    await flush()
    expect(mockListGroups).toHaveBeenCalled()
  })
})
