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

  it('returns the configured absolute API base', () => {
    expect(D3Util.serverUrl()).toBe('http://localhost:3001')
  })

  it('ignores a stored setting pointing at the legacy API origin', () => {
    // Cookie auth is scoped to the API host, so a saved cross-site base must lose.
    mockGet.mockReturnValue({ serverUrl: 'https://d3d-api.vercel.app' })
    expect(D3Util.serverUrl()).toBe('http://localhost:3001')
  })

  it('still honours a self-hosted override', () => {
    mockGet.mockReturnValue({ serverUrl: 'https://api.internal.example/' })
    expect(D3Util.serverUrl()).toBe('https://api.internal.example')
  })
})
