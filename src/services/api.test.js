import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() }
}))

vi.mock('@/helpers/D3Util', () => ({
  default: { serverUrl: () => '/api', debug: false }
}))

// `create` is itself a vi.fn() (not a plain arrow) so tests can assert on the
// options axios.create() was called with (baseURL / withCredentials / the
// conditional share-token header), while every method under test still gets
// the same `http` object back to drive its get/post/... expectations.
const { http, mockCreate } = vi.hoisted(() => {
  const http = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
  const mockCreate = vi.fn(() => http)
  return { http, mockCreate }
})

vi.mock('axios', () => ({
  default: { create: mockCreate }
}))

import api from '@/services/api'

// A minimal working localStorage: the cookie-auth api() factory still reads
// `shareToken` on every call (share links have no session cookie), so this
// can't be dropped even though the per-request `token` it used to read is
// gone. localStorage isn't a real global under the `node` test environment
// this file runs in, so it's stubbed per the file's existing pattern.
function stubLocalStorage() {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k) => (store.has(k) ? store.get(k) : null)),
    setItem: vi.fn((k, v) => store.set(k, String(v))),
    removeItem: vi.fn((k) => store.delete(k))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  http.get.mockResolvedValue({ data: {} })
  http.post.mockResolvedValue({ data: {} })
  http.patch.mockResolvedValue({ data: {} })
  http.put.mockResolvedValue({ data: {} })
  http.delete.mockResolvedValue({ data: {} })
  stubLocalStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api error contract — methods reject on HTTP errors', () => {
  it('auth() resolves with the axios response on success', async () => {
    const response = { data: { token: 'jwt' }, status: 200 }
    http.post.mockResolvedValueOnce(response)
    await expect(api.auth('u', 'p')).resolves.toBe(response)
    expect(http.post).toHaveBeenCalledWith('/auth/login', { username: 'u', password: 'p' })
  })

  it('auth() rejects on HTTP errors instead of resolving the error object', async () => {
    const err = new Error('401 Unauthorized')
    http.post.mockRejectedValueOnce(err)
    await expect(api.auth('u', 'bad')).rejects.toBe(err)
  })

  it('postDiagram() resolves with the response whose body is the new id', async () => {
    const response = { data: 'dag-123', status: 201 }
    http.post.mockResolvedValueOnce(response)
    await expect(api.postDiagram({ name: 'x' })).resolves.toBe(response)
  })

  it('postDiagram() rejects on HTTP errors', async () => {
    const err = new Error('500')
    http.post.mockRejectedValueOnce(err)
    await expect(api.postDiagram({ name: 'x' })).rejects.toBe(err)
  })

  it('updateDiagram() rejects on HTTP errors', async () => {
    const err = new Error('400')
    http.post.mockRejectedValueOnce(err)
    await expect(api.updateDiagram({ id: 'dag-1' })).rejects.toBe(err)
  })

  it('getDiagrams() returns the response body', async () => {
    const body = { dags: [{ id: 'dag-1' }] }
    http.get.mockResolvedValueOnce({ data: body })
    await expect(api.getDiagrams()).resolves.toEqual(body)
  })

  it('getDiagrams() rejects on HTTP errors', async () => {
    http.get.mockRejectedValueOnce(new Error('403'))
    await expect(api.getDiagrams()).rejects.toBeTruthy()
  })

  it('getHistory() rejects on HTTP errors so callers can degrade gracefully', async () => {
    http.get.mockRejectedValueOnce(new Error('offline'))
    await expect(api.getHistory('dag-1')).rejects.toBeTruthy()
  })

  it('restoreHistory() rejects on HTTP errors so failures are not mistaken for success', async () => {
    const err = new Error('409')
    http.post.mockRejectedValueOnce(err)
    await expect(api.restoreHistory('dag-1', 'h-1')).rejects.toBe(err)
  })

  it('createShare() returns the response body', async () => {
    const body = { token: 'share-jwt' }
    http.post.mockResolvedValueOnce({ data: body })
    await expect(api.createShare('dag-1', { role: 'view' })).resolves.toEqual(body)
  })

  it('exchangeShare() rejects on network/HTTP errors', async () => {
    const err = new Error('503')
    http.get.mockRejectedValueOnce(err)
    await expect(api.exchangeShare('t')).rejects.toBe(err)
  })
})

describe('api null fallback contract', () => {
  it('getDiagram() resolves null on failure (loadFromServer relies on this)', async () => {
    http.get.mockRejectedValueOnce(new Error('404'))
    await expect(api.getDiagram('missing')).resolves.toBeNull()
  })

  it('getDiagram() returns the body on success', async () => {
    const body = { diagram: '{}' }
    http.get.mockResolvedValueOnce({ data: body })
    await expect(api.getDiagram('dag-1')).resolves.toEqual(body)
  })
})

// ── Element Shares ─────────────────────────────────────────────────────────────

describe('createElementShare', () => {
  it('POSTs to /dag/:dagId/elements/shares with auth and returns data', async () => {
    http.post.mockResolvedValue({ data: { status: 'ok', id: 'es-1' } })
    const req = { rootIds: ['n1'], depth: -1, audience: { kind: 'public', ids: [] } }
    const result = await api.createElementShare('dag-1', req)
    expect(http.post).toHaveBeenCalledWith('/dag/dag-1/elements/shares', req)
    expect(result).toEqual({ status: 'ok', id: 'es-1' })
  })
})

describe('exchangeElementShare', () => {
  it('GETs /element-shares/exchange with token as query param (no auth header)', async () => {
    http.get.mockResolvedValue({ data: { status: 'ok', cluster: {} } })
    const result = await api.exchangeElementShare('my-jwt')
    expect(http.get).toHaveBeenCalledWith('/element-shares/exchange', {
      params: { token: 'my-jwt' }
    })
    expect(result.status).toBe('ok')
  })
})

describe('getElementShare', () => {
  it('GETs /element-shares/:id with auth', async () => {
    http.get.mockResolvedValue({ data: { id: 'es-1', cluster: {} } })
    const result = await api.getElementShare('es-1')
    expect(http.get).toHaveBeenCalledWith('/element-shares/es-1')
    expect(result.id).toBe('es-1')
  })
})

describe('revokeElementShare', () => {
  it('POSTs to /element-shares/:id/revoke with auth', async () => {
    http.post.mockResolvedValue({ data: { status: 'ok' } })
    await api.revokeElementShare('es-1')
    expect(http.post).toHaveBeenCalledWith('/element-shares/es-1/revoke', {})
  })
})

describe('importElementShare', () => {
  it('POSTs to /element-shares/:id/import with auth and returns cluster', async () => {
    const payload = { status: 'ok', cluster: { nodes: [], edges: [] } }
    http.post.mockResolvedValue({ data: payload })
    const result = await api.importElementShare('es-1')
    expect(http.post).toHaveBeenCalledWith('/element-shares/es-1/import', {})
    expect(result.cluster).toBeDefined()
  })
})

describe('listInbox', () => {
  it('GETs /shares/inbox with auth and returns array', async () => {
    http.get.mockResolvedValue({ data: { status: 'ok', shares: [{ id: 'es-1' }] } })
    const result = await api.listInbox()
    expect(http.get).toHaveBeenCalledWith('/shares/inbox')
    expect(result).toHaveLength(1)
  })
})

describe('getCatalog', () => {
  it('GETs /catalog with no auth and returns array', async () => {
    http.get.mockResolvedValue({ data: { status: 'ok', items: [{ id: 'es-1' }] } })
    const result = await api.getCatalog()
    expect(http.get).toHaveBeenCalledWith('/catalog', { params: {} })
    expect(result).toHaveLength(1)
  })

  it('passes limit as query param when provided', async () => {
    http.get.mockResolvedValue({ data: { status: 'ok', items: [] } })
    await api.getCatalog(20)
    expect(http.get).toHaveBeenCalledWith('/catalog', { params: { limit: 20 } })
  })
})

// ── Companies ─────────────────────────────────────────────────────────────────

describe('createCompany', () => {
  it('POSTs to /companies with name and auth', async () => {
    http.post.mockResolvedValue({ data: { id: 'co-1', name: 'Acme' } })
    const result = await api.createCompany('Acme')
    expect(http.post).toHaveBeenCalledWith('/companies', { name: 'Acme' })
    expect(result.name).toBe('Acme')
  })
})

describe('listCompanies', () => {
  it('GETs /companies with auth', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'co-1' }] })
    const result = await api.listCompanies()
    expect(http.get).toHaveBeenCalledWith('/companies')
    expect(result).toHaveLength(1)
  })
})

describe('addCompanyMember', () => {
  it('POSTs /companies/:id/members with userId and auth', async () => {
    http.post.mockResolvedValue({ data: { status: 'ok' } })
    await api.addCompanyMember('co-1', 'bob')
    expect(http.post).toHaveBeenCalledWith('/companies/co-1/members', { userId: 'bob' })
  })
})

describe('removeCompanyMember', () => {
  it('DELETEs /companies/:id/members/:userId with auth', async () => {
    http.delete.mockResolvedValue({ data: { status: 'ok' } })
    await api.removeCompanyMember('co-1', 'bob')
    expect(http.delete).toHaveBeenCalledWith('/companies/co-1/members/bob')
  })
})

describe('deleteCompany', () => {
  it('DELETEs /companies/:id with auth', async () => {
    http.delete.mockResolvedValue({ data: { status: 'ok' } })
    await api.deleteCompany('co-1')
    expect(http.delete).toHaveBeenCalledWith('/companies/co-1')
  })
})

// ── Groups ────────────────────────────────────────────────────────────────────

describe('createGroup', () => {
  it('POSTs to /companies/:id/groups with name and auth', async () => {
    http.post.mockResolvedValue({ data: { id: 'grp-1', name: 'Eng' } })
    const result = await api.createGroup('co-1', 'Eng')
    expect(http.post).toHaveBeenCalledWith('/companies/co-1/groups', { name: 'Eng' })
    expect(result.name).toBe('Eng')
  })
})

describe('listGroups', () => {
  it('GETs /companies/:id/groups with auth', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'grp-1' }] })
    const result = await api.listGroups('co-1')
    expect(http.get).toHaveBeenCalledWith('/companies/co-1/groups')
    expect(result).toHaveLength(1)
  })
})

describe('addGroupMember', () => {
  it('POSTs /groups/:id/members with userId and auth', async () => {
    http.post.mockResolvedValue({ data: { status: 'ok' } })
    await api.addGroupMember('grp-1', 'alice')
    expect(http.post).toHaveBeenCalledWith('/groups/grp-1/members', { userId: 'alice' })
  })
})

describe('removeGroupMember', () => {
  it('DELETEs /groups/:id/members/:userId with auth', async () => {
    http.delete.mockResolvedValue({ data: { status: 'ok' } })
    await api.removeGroupMember('grp-1', 'alice')
    expect(http.delete).toHaveBeenCalledWith('/groups/grp-1/members/alice')
  })
})

describe('deleteGroup', () => {
  it('DELETEs /groups/:id with auth', async () => {
    http.delete.mockResolvedValue({ data: { status: 'ok' } })
    await api.deleteGroup('grp-1')
    expect(http.delete).toHaveBeenCalledWith('/groups/grp-1')
  })
})

// ── Cookie auth migration ───────────────────────────────────────────────────
// Session auth now travels as an httpOnly cookie (withCredentials), not a
// Bearer header built from a localStorage token. The Authorization header is
// still used, but only to carry a share JWT for anonymous share recipients.
describe('api', () => {
  it('creates the client with credentials so the cookie is sent', async () => {
    await api.getDiagrams()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '/api', withCredentials: true })
    )
  })

  it('sends no Authorization header for a normal session', async () => {
    await api.getDiagrams()
    const [, options] = http.get.mock.calls[0]
    expect(options?.headers?.Authorization).toBeUndefined()
  })

  // Anonymous share recipients have no session cookie — their share JWT is the
  // only thing authenticating them, and it travels in this header.
  it('sends the share token as a Bearer header when one is stored', async () => {
    localStorage.setItem('shareToken', 'share-jwt-1')
    await api.getDiagrams()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        withCredentials: true,
        headers: { Authorization: 'Bearer share-jwt-1' }
      })
    )
    localStorage.removeItem('shareToken')
  })

  it('me() calls /auth/me', async () => {
    await api.me()
    expect(http.get).toHaveBeenCalledWith('/auth/me')
  })

  it('getOAuthUrl returns the url string', async () => {
    http.get.mockResolvedValue({ data: { url: 'https://github.com/login/oauth' } })
    await expect(api.getOAuthUrl('github')).resolves.toBe('https://github.com/login/oauth')
    expect(http.get).toHaveBeenCalledWith('/auth/github/url')
  })

  it('logout posts to /auth/logout', async () => {
    await api.logout()
    expect(http.post).toHaveBeenCalledWith('/auth/logout')
  })
})
