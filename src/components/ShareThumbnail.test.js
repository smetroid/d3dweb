// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ShareThumbnail from '@/components/ShareThumbnail.vue'

const { mockRender } = vi.hoisted(() => ({ mockRender: vi.fn() }))

vi.mock('@/helpers/shareThumbnails', () => ({
  renderThumbnail: mockRender
}))

let observers = []

class FakeObserver {
  constructor(callback) {
    this.callback = callback
    observers.push(this)
  }
  observe(el) {
    this.el = el
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  scrollIntoView() {
    this.callback([{ isIntersecting: true, target: this.el }], this)
  }
}

const CLUSTER = { options: {}, nodes: [{ v: 'n1', value: {} }], edges: [] }

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountThumb(loader = vi.fn().mockResolvedValue(CLUSTER)) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () => h(ShareThumbnail, { shareId: 'es1', loader })
    }
  })
  app.mount(host)
  return { host, app, loader }
}

const image = () => document.querySelector('[data-testid="share-thumb-img"]')

beforeEach(() => {
  observers = []
  window.IntersectionObserver = FakeObserver
  mockRender.mockResolvedValue('data:image/png;base64,AAAA')
})

afterEach(() => {
  document.body.innerHTML = ''
  delete window.IntersectionObserver
  vi.clearAllMocks()
})

describe('ShareThumbnail', () => {
  // Each thumbnail costs a request, so a card the user never scrolls to should
  // never spend one.
  it('fetches nothing until it scrolls into view', async () => {
    const { loader } = mountThumb()
    await flush()
    expect(loader).not.toHaveBeenCalled()
    expect(mockRender).not.toHaveBeenCalled()
  })

  it('renders the cluster once it comes into view', async () => {
    const { loader } = mountThumb()
    await flush()
    observers[0].scrollIntoView()
    await flush()
    expect(loader).toHaveBeenCalled()
    expect(mockRender).toHaveBeenCalledWith('es1', CLUSTER)
    expect(image().getAttribute('src')).toBe('data:image/png;base64,AAAA')
  })

  it('loads straight away where the browser has no IntersectionObserver', async () => {
    delete window.IntersectionObserver
    const { loader } = mountThumb()
    await flush()
    expect(loader).toHaveBeenCalled()
    expect(image()).not.toBeNull()
  })

  it('loads a share only once, however often it re-enters view', async () => {
    const { loader } = mountThumb()
    await flush()
    observers[0].scrollIntoView()
    observers[0].scrollIntoView()
    await flush()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  // A share that fails to load leaves the placeholder — a card must not break,
  // and must not retry the failing request on every scroll.
  it('keeps the placeholder when the share cannot be fetched', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('403'))
    mountThumb(loader)
    await flush()
    observers[0].scrollIntoView()
    await flush()
    expect(image()).toBeNull()
    expect(document.querySelector('[data-testid="share-thumb"]')).not.toBeNull()
  })

  it('keeps the placeholder when the scene cannot be exported', async () => {
    mockRender.mockResolvedValue(null)
    mountThumb()
    await flush()
    observers[0].scrollIntoView()
    await flush()
    expect(image()).toBeNull()
  })

  it('stops observing once unmounted', async () => {
    const { app } = mountThumb()
    await flush()
    app.unmount()
    expect(observers[0].disconnected).toBe(true)
  })
})
