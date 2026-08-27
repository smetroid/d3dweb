// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ShareDialog from '@/components/ShareDialog.vue'

const { mockCreateShare, mockGetDiagramPublic, mockSetDiagramPublic } = vi.hoisted(() => ({
  mockCreateShare: vi.fn(),
  mockGetDiagramPublic: vi.fn(),
  mockSetDiagramPublic: vi.fn()
}))

vi.mock('@/services/api', () => ({
  default: {
    createShare: mockCreateShare,
    getDiagramPublic: mockGetDiagramPublic,
    setDiagramPublic: mockSetDiagramPublic
  }
}))

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountDialog(props = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () => h(ShareDialog, { dagId: 'dag1', ...props, onClose: () => {} })
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

const clickGenerate = () => document.querySelector('.share-generate-btn').click()

beforeEach(() => {
  mockCreateShare.mockResolvedValue({ token: 'share-token-abc' })
  mockGetDiagramPublic.mockRejectedValue(new Error('not public'))
  mockSetDiagramPublic.mockResolvedValue({ status: 'ok' })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ShareDialog – generate flow', () => {
  it('shows the generated link on success', async () => {
    mountDialog()
    await flush()
    clickGenerate()
    await flush()
    expect(document.body.innerHTML).toContain('share-token-abc')
  })

  it('surfaces the server message from a failed request', async () => {
    // The API answers with {status: "error", message: "..."}; the unbound
    // catch discarded it and always showed the generic fallback.
    const err = new Error('Request failed with status code 500')
    err.response = {
      status: 500,
      data: { status: 'error', message: 'diagram has no content' }
    }
    mockCreateShare.mockRejectedValue(err)
    mountDialog()
    await flush()
    clickGenerate()
    await flush()
    expect(document.body.textContent).toContain('diagram has no content')
    expect(document.body.textContent).not.toMatch(/Failed to generate link/)
  })

  it('surfaces the server message from a non-token response body', async () => {
    mockCreateShare.mockResolvedValue({ status: 'error', message: 'share limit reached' })
    mountDialog()
    await flush()
    clickGenerate()
    await flush()
    expect(document.body.textContent).toContain('share limit reached')
  })

  it('keeps the generic message when the server sends none', async () => {
    mockCreateShare.mockRejectedValue(new Error('Network Error'))
    mountDialog()
    await flush()
    clickGenerate()
    await flush()
    expect(document.body.textContent).toMatch(/Failed to generate link/)
    expect(document.body.textContent).not.toMatch(/Network Error/)
  })
})

const openReadmeTab = () =>
  [...document.querySelectorAll('.tab-btn')].find((b) => b.textContent.trim() === 'README').click()

describe('ShareDialog – public toggle', () => {
  it('turns the diagram public on success', async () => {
    mountDialog()
    await flush()
    openReadmeTab()
    await flush()
    document.querySelector('.public-toggle').click()
    await flush()
    expect(mockSetDiagramPublic).toHaveBeenCalledWith('dag1', true)
    expect(document.querySelector('.public-toggle').textContent.trim()).toBe('On')
  })

  it('surfaces the server message when the toggle fails', async () => {
    const err = new Error('Request failed with status code 403')
    err.response = { status: 403, data: { status: 'error', message: 'not the diagram owner' } }
    mockSetDiagramPublic.mockRejectedValue(err)
    mountDialog()
    await flush()
    openReadmeTab()
    await flush()
    document.querySelector('.public-toggle').click()
    await flush()
    expect(document.body.textContent).toContain('not the diagram owner')
    expect(document.body.textContent).not.toMatch(/Failed to update visibility/)
  })

  it('keeps the generic message when the server sends none', async () => {
    mockSetDiagramPublic.mockRejectedValue(new Error('Network Error'))
    mountDialog()
    await flush()
    openReadmeTab()
    await flush()
    document.querySelector('.public-toggle').click()
    await flush()
    expect(document.body.textContent).toMatch(/Failed to update visibility/)
    expect(document.body.textContent).not.toMatch(/Network Error/)
  })
})
