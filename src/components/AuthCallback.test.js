// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'

const { mockSocialCallback, mockReplace } = vi.hoisted(() => ({
  mockSocialCallback: vi.fn(),
  mockReplace: vi.fn()
}))

vi.mock('@/services/api', () => ({ default: { socialCallback: mockSocialCallback } }))

import AuthCallback from '@/components/AuthCallback.vue'
import { session, clearSession } from '@/services/session'

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountCallback(query) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp({
    render: () => h(AuthCallback)
  })
  const emitter = { emit: vi.fn() }
  app.config.globalProperties.$route = { query }
  app.config.globalProperties.$router = { replace: mockReplace }
  app.config.globalProperties.emitter = emitter
  app.mount(el)
  return { app, el, emitter }
}

// jsdom in this repo's vitest setup does not expose a working global
// localStorage (Node's own experimental localStorage shadows it), so tests
// that touch localStorage stub it explicitly - same pattern as
// Login.test.js / JoinView.test.js / collab.test.js.
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

describe('AuthCallback', () => {
  beforeEach(() => {
    mockSocialCallback.mockReset()
    mockReplace.mockReset()
    clearSession()
    vi.stubGlobal('localStorage', makeStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exchanges the code and redirects home on success', async () => {
    const user = { username: 'github:smetroid', displayName: 'Enrique' }
    mockSocialCallback.mockResolvedValue({ data: { user } })

    const { emitter } = mountCallback({ code: 'c1', state: 's1', provider: 'github' })
    await flush()

    expect(mockSocialCallback).toHaveBeenCalledWith({
      code: 'c1',
      state: 's1',
      provider: 'github'
    })
    expect(session.user).toEqual(user)
    expect(mockReplace).toHaveBeenCalledWith('/')
    // I1: without this, App.vue's shell (username, logout button, inbox
    // count) never learns a social login succeeded until a manual reload.
    expect(emitter.emit).toHaveBeenCalledWith('authChanged')
  })

  it('clears a stray shareToken once a real session is established', async () => {
    // C3: a leftover shareToken from an earlier share visit would otherwise
    // keep outranking the new session cookie on every request (api.js sends
    // it as a Bearer header ahead of the cookie) and could even lock the
    // account out of /auth/me.
    localStorage.setItem('shareToken', 'stale-share-jwt')
    mockSocialCallback.mockResolvedValue({
      data: { user: { username: 'github:smetroid', displayName: 'Enrique' } }
    })

    mountCallback({ code: 'c1', state: 's1', provider: 'github' })
    await flush()

    expect(localStorage.getItem('shareToken')).toBeNull()
  })

  it('shows an error and does not redirect when the exchange fails', async () => {
    mockSocialCallback.mockRejectedValue({ response: { status: 401 } })

    const { el, emitter } = mountCallback({ code: 'c1', state: 'bad', provider: 'github' })
    await flush()

    expect(mockReplace).not.toHaveBeenCalled()
    expect(session.user).toBeNull()
    expect(el.textContent).toMatch(/sign in|try again/i)
    expect(emitter.emit).not.toHaveBeenCalledWith('authChanged')
  })

  it('errors immediately when the provider sent no code', async () => {
    const { el, emitter } = mountCallback({ error: 'access_denied' })
    await flush()

    expect(mockSocialCallback).not.toHaveBeenCalled()
    expect(el.textContent).toMatch(/sign in|try again/i)
    expect(emitter.emit).not.toHaveBeenCalledWith('authChanged')
  })
})
