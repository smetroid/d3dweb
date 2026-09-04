import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockMe } = vi.hoisted(() => ({ mockMe: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { me: mockMe } }))

import {
  session,
  loadSession,
  setSession,
  clearSession,
  isAuthenticated,
  isShareSession
} from '@/services/session'

const alice = { username: 'alice', displayName: 'Alice', provider: 'local' }

describe('session', () => {
  beforeEach(() => {
    mockMe.mockReset()
    clearSession()
    session.loaded = false
  })

  it('starts signed out', () => {
    expect(session.user).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('hydrates from /auth/me', async () => {
    mockMe.mockResolvedValue({ data: { user: alice } })
    const user = await loadSession()
    expect(user).toEqual(alice)
    expect(session.user).toEqual(alice)
    expect(session.loaded).toBe(true)
    expect(isAuthenticated()).toBe(true)
  })

  it('treats a 401 as signed out rather than an error', async () => {
    mockMe.mockRejectedValue({ response: { status: 401 } })
    await expect(loadSession()).resolves.toBeNull()
    expect(session.user).toBeNull()
    expect(session.loaded).toBe(true)
  })

  it('marks itself loaded even when the network fails', async () => {
    mockMe.mockRejectedValue(new Error('offline'))
    await loadSession()
    expect(session.loaded).toBe(true)
    expect(isAuthenticated()).toBe(false)
  })

  it('setSession populates without a request', () => {
    setSession(alice)
    expect(mockMe).not.toHaveBeenCalled()
    expect(isAuthenticated()).toBe(true)
  })

  it('clearSession signs out', () => {
    setSession(alice)
    clearSession()
    expect(session.user).toBeNull()
  })
})

// This environment's 'node' test runner has no bare localStorage global
// (Node's own experimental localStorage shadows it), so stub it — same
// pattern as session.callsites.test.js and JoinView.test.js.
function makeStorage() {
  const store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    }
  }
}

describe('isShareSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is true when a shareToken is stored', () => {
    const storage = makeStorage()
    storage.setItem('shareToken', 'share-jwt-123')
    vi.stubGlobal('localStorage', storage)
    expect(isShareSession()).toBe(true)
  })

  it('is false without a shareToken', () => {
    vi.stubGlobal('localStorage', makeStorage())
    expect(isShareSession()).toBe(false)
  })
})
