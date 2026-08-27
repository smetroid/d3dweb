import { describe, it, expect } from 'vitest'
import { serverErrorMessage } from './apiErrors.js'

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
