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

// A share JWT shaped like the real thing: the middle segment is the base64
// payload api.js decodes to learn which diagram the token is bound to.
function shareJwt({ dagId, role = 'view', iss = 'd3d-share' }) {
  const payload = btoa(JSON.stringify({ iss, dag_id: dagId, role, jti: 'jti-' + dagId }))
  return `header.${payload}.signature`
}

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

  // Authorization lives in the axios.create() config, not in a per-call argument,
  // so this must assert on mockCreate. Asserting on http.get's arguments would pass
  // vacuously — an unconditional header at api.js:18 would go undetected.
  it('creates the client with no Authorization header when there is no share token', async () => {
    await api.getDiagrams()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  // Anonymous share recipients have no session cookie — their share JWT is the
  // only thing authenticating them, and it travels in this header. But it goes
  // out only on the routes the API will actually accept it on, and only for
  // the diagram it was minted for. See the "share token scoping" block below.
  it('sends the share token as a Bearer header on the diagram it was minted for', async () => {
    localStorage.setItem('shareToken', shareJwt({ dagId: 'dag-1' }))
    await api.getDiagram('dag-1')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        withCredentials: true,
        headers: { Authorization: 'Bearer ' + shareJwt({ dagId: 'dag-1' }) }
      })
    )
    localStorage.removeItem('shareToken')
  })

  it('me() calls /auth/me', async () => {
    await api.me()
    expect(http.get).toHaveBeenCalledWith('/auth/me')
  })

  // C3 residue: a signed-in user who also has a stale `shareToken` (e.g. they
  // opened a colleague's share link after logging in) must not have that
  // token attached to /auth/me — the backend's TokenLookup checks the
  // Authorization header before the session cookie, so sending it here would
  // resolve the share token's jti instead of the user's session, /auth/me
  // would 401, and the app would wrongly conclude the user signed out.
  // Authorization lives in the axios.create() config, not a per-call argument
  // — see the vacuousness note above the sibling test — so this asserts on
  // mockCreate, not on http.get's arguments.
  it('me() sends no Authorization header even when a share token is stored alongside a session', async () => {
    localStorage.setItem('shareToken', 'share-jwt-1')
    await api.me()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
    localStorage.removeItem('shareToken')
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

// ── Share token scoping ──────────────────────────────────────────────────────
//
// The API accepts a d3d-share token on exactly five routes — GET /dag/:dag,
// POST /dag/:dag/update, GET /dag/:dag/history, GET /dag/:dag/ws and
// GET /menus — and binds it to the diagram it was minted for. Everywhere else
// it is rejected outright as a session credential.
//
// That matters here because TokenLookup checks the Authorization header
// *before* the session cookie, so a share token in the header wins over a
// perfectly good session. Attaching it indiscriminately (the old behaviour)
// meant a signed-in user who opened any share link then 401'd on ~35 routes
// and 403'd on their own other diagrams, permanently — nothing clears
// shareToken but login and logout. So the default is now "no share header",
// and it is attached only where the API will honor it.
describe('share token scoping', () => {
  const dagToken = () => shareJwt({ dagId: 'dag-1' })

  it('does not attach the share token to /dags, which rejects it as a session credential', async () => {
    localStorage.setItem('shareToken', dagToken())
    await api.getDiagrams()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  it('does not attach the share token to a diagram it was not minted for', async () => {
    localStorage.setItem('shareToken', dagToken())
    await api.getDiagram('dag-2')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  it('attaches the share token to the history of the diagram it was minted for', async () => {
    localStorage.setItem('shareToken', dagToken())
    await api.getHistory('dag-1')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer ' + dagToken() } })
    )
  })

  it('does not attach the share token to the history of another diagram', async () => {
    localStorage.setItem('shareToken', dagToken())
    await api.getHistory('dag-2')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  it('attaches an edit share token to that diagram update', async () => {
    localStorage.setItem('shareToken', shareJwt({ dagId: 'dag-1', role: 'edit' }))
    await api.updateDiagram({ id: 'dag-1', diagram: '{}' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' + shareJwt({ dagId: 'dag-1', role: 'edit' }) }
      })
    )
  })

  it('does not attach an edit share token to a different diagram update', async () => {
    localStorage.setItem('shareToken', shareJwt({ dagId: 'dag-1', role: 'edit' }))
    await api.updateDiagram({ id: 'dag-2', diagram: '{}' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  // /menus carries no diagram id but is share-accessible, so an anonymous
  // recipient needs the token here or the menu request authenticates nothing.
  it('attaches the share token to /menus, which is share-accessible but has no diagram id', async () => {
    localStorage.setItem('shareToken', dagToken())
    await api.getOptions()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer ' + dagToken() } })
    )
  })

  // The routes a signed-in user hits constantly. Each one 401s if a stale
  // share token rides along, which is the outage this scoping prevents.
  it.each([
    ['postDiagram', () => api.postDiagram({ name: 'x' })],
    ['deleteDiagram', () => api.deleteDiagram('dag-1')],
    ['setDiagramPublic', () => api.setDiagramPublic('dag-1', true)],
    ['restoreHistory', () => api.restoreHistory('dag-1', 'h-1')],
    ['createShare', () => api.createShare('dag-1', {})],
    ['listInbox', () => api.listInbox()],
    ['listCompanies', () => api.listCompanies()],
    ['me', () => api.me()]
  ])('does not attach the share token to %s', async (_name, call) => {
    localStorage.setItem('shareToken', dagToken())
    await call()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  // Defence in depth: a token that is not a d3d-share JWT at all (corrupt,
  // truncated, or some other issuer) must never be broadcast as a Bearer
  // credential just because it happens to sit under the shareToken key.
  it.each([
    ['a non-JWT string', 'not-a-jwt'],
    ['a JWT with an unexpected issuer', shareJwt({ dagId: 'dag-1', iss: 'd3d-element-share' })],
    ['an empty string', '']
  ])('does not attach %s', async (_name, stored) => {
    localStorage.setItem('shareToken', stored)
    await api.getDiagram('dag-1')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })
})
