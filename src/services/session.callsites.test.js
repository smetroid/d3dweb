import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

// collab.js is the one sanctioned holdout: WebSocket auth needs a ticket
// endpoint that is deliberately out of scope. See the spec's Deferred section.
const FILES = [
  'src/services/api.js',
  'src/helpers/D3Util.js',
  'src/helpers/DiagramGraph.js',
  'src/App.vue',
  'src/components/DiagramList.vue',
  'src/components/DiagramGraphView.vue',
  'src/components/Login.vue'
]

describe('session migration', () => {
  it.each(FILES)('%s does not read the session token from localStorage', (file) => {
    const source = readFileSync(file, 'utf-8')
    expect(source).not.toMatch(/localStorage\.(get|set|remove)Item\(\s*['"]token['"]/)
  })

  // Only these two must be free of hand-rolled JWT decoding. DiagramGraph.js and
  // DiagramGraphView.vue legitimately decode the SHARE token (kept in localStorage
  // under 'shareToken' by design, readable by design) to detect a view-only share
  // recipient. The session token is what may never be decoded again — and it cannot
  // be, since it is httpOnly and the assertion above proves nothing reads its key.
  it.each(['src/services/api.js', 'src/helpers/D3Util.js'])(
    '%s does not decode a JWT by hand',
    (file) => {
      expect(readFileSync(file, 'utf-8')).not.toMatch(/atob\(/)
    }
  )

  it('D3Util.logout() calls the API so the httpOnly cookie is actually cleared', async () => {
    const logout = vi.fn().mockResolvedValue({})
    vi.doMock('@/services/api', () => ({ default: { logout } }))
    // logout() also clears a stray shareToken (see C3); this environment's
    // 'node' test runner has no bare localStorage global, so stub it —
    // same pattern as the other localStorage-touching tests in this repo.
    vi.stubGlobal('localStorage', { removeItem: vi.fn(), getItem: vi.fn(() => null) })
    const { default: D3Util } = await import('@/helpers/D3Util')
    await D3Util.logout()
    expect(logout).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
