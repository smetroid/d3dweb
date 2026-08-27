import { describe, it, expect } from 'vitest'
import {
  buildShareRequest,
  audienceLabel,
  depthOptions,
  depthLabel,
  serverErrorMessage,
  shareUrl,
  validateRootIds
} from './elementShareHelpers.js'

describe('validateRootIds', () => {
  it('returns error when list is empty', () => {
    const result = validateRootIds([])
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/select/i)
  })

  it('returns valid for a non-empty list', () => {
    expect(validateRootIds(['a']).valid).toBe(true)
    expect(validateRootIds(['a', 'b']).valid).toBe(true)
  })

  it('deduplicates ids', () => {
    const result = validateRootIds(['a', 'a', 'b'])
    expect(result.valid).toBe(true)
    expect(result.ids).toEqual(['a', 'b'])
  })
})

describe('buildShareRequest', () => {
  const base = {
    rootIds: ['node1'],
    audience: { kind: 'public' },
    depth: -1,
    expDays: 7
  }

  it('returns a well-formed request for public audience', () => {
    const req = buildShareRequest(base)
    expect(req.rootIds).toEqual(['node1'])
    expect(req.audience).toEqual({ kind: 'public', ids: [] })
    expect(req.depth).toBe(-1)
    expect(req.expDays).toBe(7)
    expect(req.title).toBe('')
    expect(req.catalog).toBe(false)
  })

  it('includes audience ids array for company audience', () => {
    const req = buildShareRequest({ ...base, audience: { kind: 'company', id: 'c1' } })
    expect(req.audience).toEqual({ kind: 'company', ids: ['c1'] })
  })

  it('includes audience ids array for group audience', () => {
    const req = buildShareRequest({ ...base, audience: { kind: 'group', id: 'g1' } })
    expect(req.audience).toEqual({ kind: 'group', ids: ['g1'] })
  })

  it('includes audience ids array for user audience', () => {
    const req = buildShareRequest({ ...base, audience: { kind: 'user', id: 'alice' } })
    expect(req.audience).toEqual({ kind: 'user', ids: ['alice'] })
  })

  it('uses depth 0 for directed descendants', () => {
    const req = buildShareRequest({ ...base, depth: 0 })
    expect(req.depth).toBe(0)
  })

  it('uses positive depth for hop-limited sharing', () => {
    const req = buildShareRequest({ ...base, depth: 3 })
    expect(req.depth).toBe(3)
  })

  it('passes title and catalog through', () => {
    const req = buildShareRequest({ ...base, title: 'My share', catalog: true })
    expect(req.title).toBe('My share')
    expect(req.catalog).toBe(true)
  })
})

describe('audienceLabel', () => {
  it('returns "Public" for public audience', () => {
    expect(audienceLabel({ kind: 'public' })).toBe('Public')
  })

  it('returns "Only me" for user audience without id', () => {
    expect(audienceLabel({ kind: 'user' })).toBe('Only me')
  })

  it('returns user id label when id is set', () => {
    expect(audienceLabel({ kind: 'user', id: 'alice' })).toBe('User: alice')
  })

  it('returns company label', () => {
    expect(audienceLabel({ kind: 'company', id: 'Acme' })).toBe('Company: Acme')
  })

  it('returns group label', () => {
    expect(audienceLabel({ kind: 'group', id: 'Eng' })).toBe('Group: Eng')
  })
})

describe('depthOptions', () => {
  it('returns an array of options with value and label', () => {
    const opts = depthOptions()
    expect(Array.isArray(opts)).toBe(true)
    expect(opts.length).toBeGreaterThan(0)
    for (const o of opts) {
      expect(o).toHaveProperty('value')
      expect(o).toHaveProperty('label')
    }
  })

  it('includes options for -1, 0, and at least one positive hop count', () => {
    const opts = depthOptions()
    const values = opts.map((o) => o.value)
    expect(values).toContain(-1)
    expect(values).toContain(0)
    expect(values.some((v) => v > 0)).toBe(true)
  })
})

describe('depthLabel', () => {
  it('describes depth -1 as the full component', () => {
    expect(depthLabel(-1)).toMatch(/component|full|all/i)
  })

  it('describes depth 0 as descendants', () => {
    expect(depthLabel(0)).toMatch(/descend/i)
  })

  it('describes positive depth in hops', () => {
    expect(depthLabel(1)).toMatch(/1.hop|1 hop/i)
    expect(depthLabel(3)).toMatch(/3.hop|3 hop/i)
  })
})

describe('shareUrl', () => {
  it('builds a URL with the token', () => {
    const url = shareUrl('mytoken', 'https://app.example.com')
    expect(url).toContain('mytoken')
    expect(url).toContain('https://app.example.com')
  })

  it('includes /element-share/ path segment', () => {
    const url = shareUrl('tok', 'https://app.example.com')
    expect(url).toMatch(/\/element-share\//)
  })

  it('uses window.location.origin when no base provided', () => {
    const url = shareUrl('tok')
    expect(url).toContain('tok')
    expect(typeof url).toBe('string')
  })
})

describe('serverErrorMessage', () => {
  // The API reports failures as {status: "error", message: "..."} — see
  // models.StatusResponse — so reading `error` always yielded undefined and
  // hid the real cause behind the generic fallback.
  it('reads message from an Axios error response body', () => {
    const err = {
      response: { data: { status: 'error', message: 'diagram has no content' } }
    }
    expect(serverErrorMessage(err, 'fallback')).toBe('diagram has no content')
  })

  it('reads message from a plain response body', () => {
    const body = { status: 'error', message: 'rootIds is required' }
    expect(serverErrorMessage(body, 'fallback')).toBe('rootIds is required')
  })

  it('still accepts an `error` field', () => {
    expect(serverErrorMessage({ error: 'nope' }, 'fallback')).toBe('nope')
  })

  it('falls back when the response carries no message', () => {
    expect(serverErrorMessage({ response: { data: {} } }, 'fallback')).toBe('fallback')
    expect(serverErrorMessage({ status: 'error' }, 'fallback')).toBe('fallback')
    expect(serverErrorMessage(undefined, 'fallback')).toBe('fallback')
  })

  it('falls back for a network error rather than leaking "Network Error"', () => {
    expect(serverErrorMessage(new Error('Network Error'), 'fallback')).toBe('fallback')
  })

  it('falls back when the body is not JSON', () => {
    const err = { response: { data: '<html>502 Bad Gateway</html>' } }
    expect(serverErrorMessage(err, 'fallback')).toBe('fallback')
  })

  it('ignores a blank message', () => {
    expect(serverErrorMessage({ message: '   ' }, 'fallback')).toBe('fallback')
  })
})
