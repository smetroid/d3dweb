// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import mitt from 'mitt'

const { mockGetOAuthUrl, mockAuth, mockMe } = vi.hoisted(() => ({
  mockGetOAuthUrl: vi.fn(),
  mockAuth: vi.fn(),
  mockMe: vi.fn()
}))

vi.mock('@/services/api', () => ({
  // login() calls loadSession() after a successful auth() call, which hits
  // api.me() - without a mock here that test would fail for the wrong
  // reason (api.me is not a function) rather than proving what it claims.
  default: { getOAuthUrl: mockGetOAuthUrl, auth: mockAuth, me: mockMe }
}))

import Login from '@/components/Login.vue'

const flush = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

// jsdom in this repo's vitest setup does not expose a working global
// localStorage (Node's own experimental localStorage shadows it), so tests
// that touch localStorage stub it explicitly - same pattern as
// JoinView.test.js / collab.test.js.
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

// Login.vue only renders its dialog contents once `loginModal` is true,
// which App.vue triggers by emitting 'showLogin' on the app-wide emitter
// (main.js puts a single mitt instance on globalProperties.emitter). Mounting
// alone leaves the dialog - and therefore the social buttons - out of the DOM,
// so every mount here opens it the same way the real app does.
//
// The template's root is `<Teleport to="body">`, so the rendered dialog is
// NOT a descendant of the mount element - it lands as a sibling appended
// directly to document.body. Assertions below therefore query
// document.body, not the returned mount element.
function mountLogin() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const appEmitter = mitt()
  const app = createApp({ render: () => h(Login) })
  app.config.globalProperties.emitter = appEmitter
  app.mount(el)
  appEmitter.emit('showLogin')
  return document.body
}

describe('Login social buttons', () => {
  beforeEach(() => {
    mockGetOAuthUrl.mockReset()
    mockAuth.mockReset()
    mockMe.mockReset()
    mockMe.mockRejectedValue({ response: { status: 401 } })
    vi.stubGlobal('localStorage', makeStorage())
    localStorage.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('renders a button per provider', async () => {
    const el = mountLogin()
    await flush()
    expect(el.querySelector('[data-testid="login-github"]')).not.toBeNull()
    expect(el.querySelector('[data-testid="login-google"]')).not.toBeNull()
  })

  it('sends the browser to the provider URL', async () => {
    mockGetOAuthUrl.mockResolvedValue('https://github.com/login/oauth/authorize?x=1')
    // jsdom does not implement navigation and window.location is not
    // configurable by default, so redefine it outright.
    Object.defineProperty(window, 'location', {
      value: { href: '', assign: vi.fn() },
      writable: true,
      configurable: true
    })

    const el = mountLogin()
    await flush()
    el.querySelector('[data-testid="login-github"]').click()
    await flush()

    expect(mockGetOAuthUrl).toHaveBeenCalledWith('github')
    expect(window.location.href).toBe('https://github.com/login/oauth/authorize?x=1')
  })

  it('does not write the token to localStorage on local login', async () => {
    mockAuth.mockResolvedValue({ data: { token: 'jwt-abc' } })

    const el = mountLogin()
    await flush()
    // Login.vue has no <form> - login() is bound to @click on this button.
    el.querySelector('.fx-btn-primary').click()
    await flush()

    expect(mockAuth).toHaveBeenCalled() // proves login() actually ran
    expect(localStorage.getItem('token')).toBeNull()
  })
})
