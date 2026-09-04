import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DiagramList from '@/components/DiagramList.vue'
import { setSession, clearSession } from '@/services/session'

// DiagramList is a large Vuetify component (v-data-table, dialogs, focus trap)
// that no existing test mounts. Following DiagramGraphView.shareGate.test.js,
// these call the real computed/methods off the compiled options object with a
// minimal fake `this` — the same production code, without the mounting cost.
//
// What is pinned here is which backing store the component chooses. Every
// server call it makes — GET /dags, DELETE /dag/:id — returns or mutates the
// caller's OWN diagrams and is rejected for share tokens by the API. So the
// question is "is there a session", not "is there any server access at all":
//
//   * asking hasServerAccess() sends share recipients to routes that 401 and
//     surface as an error instead of a list;
//   * gating on !isShareSession() instead pushes a signed-in user who merely
//     opened a share link into LocalStorage, hiding their real diagrams.
//
// Both were live defects. isAuthenticated() is the predicate that is right in
// all four combinations of (session, share token), which is what these cover.

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() }
}))

vi.mock('@/services/api', () => ({
  default: { getDiagrams: vi.fn(), deleteDiagram: vi.fn() }
}))

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

const user = { username: 'alice', displayName: 'Alice' }

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage())
  clearSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
  vi.clearAllMocks()
})

const storageType = () => DiagramList.computed.storageType.call({})

describe('DiagramList storage mode', () => {
  it('uses the server for a signed-in user', () => {
    setSession(user)
    expect(storageType()).toBe('Server')
  })

  it('uses LocalStorage when signed out', () => {
    expect(storageType()).toBe('LocalStorage')
  })

  it('uses LocalStorage for a share recipient, who has no diagrams of their own on the server', () => {
    localStorage.setItem('shareToken', 'share-jwt')
    expect(storageType()).toBe('LocalStorage')
  })

  // The regression that gating on !isShareSession() would have introduced: a
  // signed-in user who opens a share link still has their own session, and
  // must keep seeing their own diagrams.
  it('still uses the server for a signed-in user who has also opened a share link', () => {
    setSession(user)
    localStorage.setItem('shareToken', 'share-jwt')
    expect(storageType()).toBe('Server')
  })
})

describe('DiagramList delete routing', () => {
  function fakeThis() {
    return {
      selectedRowId: 'dag-1',
      diagrams: [],
      getDiagrams: vi.fn(),
      getLocalDiagrams: vi.fn()
    }
  }

  it('deletes on the server for a signed-in user holding a stale share token', async () => {
    setSession(user)
    localStorage.setItem('shareToken', 'share-jwt')
    const ctx = fakeThis()
    DiagramList.methods.deleteItem.call(ctx, { id: 'dag-1' })
    expect(ctx.getDiagrams).toHaveBeenCalled()
    expect(ctx.getLocalDiagrams).not.toHaveBeenCalled()
  })

  // DELETE /dag/:id is not share-accessible; routing a share recipient there
  // would 401 and silently fail to delete anything.
  it('deletes locally for a share recipient', () => {
    localStorage.setItem('shareToken', 'share-jwt')
    const ctx = fakeThis()
    DiagramList.methods.deleteItem.call(ctx, { id: 'dag-1' })
    expect(ctx.getLocalDiagrams).toHaveBeenCalled()
    expect(ctx.getDiagrams).not.toHaveBeenCalled()
  })
})
