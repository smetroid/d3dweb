// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import JoinView from '@/components/JoinView.vue'

const { mockExchangeShare } = vi.hoisted(() => ({ mockExchangeShare: vi.fn() }))

vi.mock('@/services/api', () => ({
  default: { exchangeShare: mockExchangeShare }
}))

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

// Only the error paths are mounted here; the success path navigates via
// window.location.href, which jsdom does not implement.
function mountJoin(token = 'tok123') {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () => h(JoinView)
    }
  })
  app.component('router-link', {
    props: { to: [String, Object] },
    setup(_, { slots }) {
      return () => h('a', slots.default?.())
    }
  })
  app.config.globalProperties.$route = { params: { token } }
  app.config.globalProperties.$cookies = { set: vi.fn() }
  app.mount(host)
  return { host, app }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// jsdom in this repo's vitest setup does not expose a working global
// localStorage (Node's own experimental localStorage shadows it), so tests
// that touch localStorage stub it explicitly — same pattern as collab.test.js.
function makeStorage() {
  const store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k])
    }
  }
}

describe('JoinView', () => {
  it('surfaces the server message when the exchange fails', async () => {
    // The API answers with {status: "error", message: "..."}; reading `error`
    // always yielded undefined and hid the cause behind the generic fallback.
    const err = new Error('Request failed with status code 403')
    err.response = { status: 403, data: { status: 'error', message: 'share link revoked' } }
    mockExchangeShare.mockRejectedValue(err)
    mountJoin()
    await flush()
    expect(document.body.textContent).toContain('share link revoked')
  })

  it('surfaces the server message from a non-ok response body', async () => {
    mockExchangeShare.mockResolvedValue({ status: 'error', message: 'share has expired' })
    mountJoin()
    await flush()
    expect(document.body.textContent).toContain('share has expired')
  })

  it('keeps the generic message when the server sends none', async () => {
    mockExchangeShare.mockRejectedValue(new Error('Network Error'))
    mountJoin()
    await flush()
    expect(document.body.textContent).toMatch(/could not reach the server/i)
    expect(document.body.textContent).not.toMatch(/Network Error/)
  })

  it('reports an invalid link when the route carries no token', async () => {
    mountJoin(null)
    await flush()
    expect(document.body.textContent).toMatch(/invalid share link/i)
    expect(mockExchangeShare).not.toHaveBeenCalled()
  })

  it('stores the share token under its own key, not the session key', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    localStorage.clear()
    // status: 'ok' is required to pass JoinView's `data.status !== 'ok'` gate
    // (see the "surfaces the server message from a non-ok response body" test
    // above) so execution reaches the localStorage.setItem call under test.
    mockExchangeShare.mockResolvedValue({ status: 'ok', dagId: 'dag-1', title: 'Shared' })

    await mountJoin('share-jwt-123')
    await flush()

    expect(localStorage.getItem('shareToken')).toBe('share-jwt-123')
    expect(localStorage.getItem('token')).toBeNull()
  })
})
