import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockMe } = vi.hoisted(() => ({ mockMe: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { me: mockMe } }))

import { session, loadSession, setSession, clearSession, isAuthenticated } from '@/services/session'

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
