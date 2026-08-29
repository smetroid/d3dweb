// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('vue-cookies', () => ({ default: { get: mockGet } }))

import D3Util from '@/helpers/D3Util'

describe('D3Util.serverUrl', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockReturnValue(null)
  })

  it('resolves a relative base against the page origin', () => {
    expect(D3Util.serverUrl()).toBe(window.location.origin + '/api')
  })

  it('ignores a stored setting pointing at the legacy API origin', () => {
    // Cookie auth only works same-origin, so a saved cross-site base must lose.
    mockGet.mockReturnValue({ serverUrl: 'https://d3d-api.vercel.app' })
    expect(D3Util.serverUrl()).toBe(window.location.origin + '/api')
  })

  it('still honours a self-hosted override', () => {
    mockGet.mockReturnValue({ serverUrl: 'https://api.internal.example/' })
    expect(D3Util.serverUrl()).toBe('https://api.internal.example')
  })
})
