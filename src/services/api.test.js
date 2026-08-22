import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() }
}))

const { http } = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('axios', () => ({
  default: { create: () => http }
}))

import D3DApi from '@/services/api'

describe('api error contract — methods reject on HTTP errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('auth() resolves with the axios response on success', async () => {
    const response = { data: { token: 'jwt' }, status: 200 }
    http.post.mockResolvedValueOnce(response)
    await expect(D3DApi.auth('u', 'p')).resolves.toBe(response)
    expect(http.post).toHaveBeenCalledWith('/auth/login', { username: 'u', password: 'p' })
  })

  it('auth() rejects on HTTP errors instead of resolving the error object', async () => {
    const err = new Error('401 Unauthorized')
    http.post.mockRejectedValueOnce(err)
    await expect(D3DApi.auth('u', 'bad')).rejects.toBe(err)
  })

  it('postDiagram() resolves with the response whose body is the new id', async () => {
    const response = { data: 'dag-123', status: 201 }
    http.post.mockResolvedValueOnce(response)
    await expect(D3DApi.postDiagram({ name: 'x' })).resolves.toBe(response)
  })

  it('postDiagram() rejects on HTTP errors', async () => {
    const err = new Error('500')
    http.post.mockRejectedValueOnce(err)
    await expect(D3DApi.postDiagram({ name: 'x' })).rejects.toBe(err)
  })

  it('updateDiagram() rejects on HTTP errors', async () => {
    const err = new Error('400')
    http.post.mockRejectedValueOnce(err)
    await expect(D3DApi.updateDiagram({ id: 'dag-1' })).rejects.toBe(err)
  })

  it('getDiagrams() returns the response body', async () => {
    const body = { dags: [{ id: 'dag-1' }] }
    http.get.mockResolvedValueOnce({ data: body })
    await expect(D3DApi.getDiagrams()).resolves.toEqual(body)
  })

  it('getDiagrams() rejects on HTTP errors', async () => {
    http.get.mockRejectedValueOnce(new Error('403'))
    await expect(D3DApi.getDiagrams()).rejects.toBeTruthy()
  })

  it('getHistory() rejects on HTTP errors so callers can degrade gracefully', async () => {
    http.get.mockRejectedValueOnce(new Error('offline'))
    await expect(D3DApi.getHistory('dag-1')).rejects.toBeTruthy()
  })

  it('restoreHistory() rejects on HTTP errors so failures are not mistaken for success', async () => {
    const err = new Error('409')
    http.post.mockRejectedValueOnce(err)
    await expect(D3DApi.restoreHistory('dag-1', 'h-1')).rejects.toBe(err)
  })

  it('createShare() returns the response body', async () => {
    const body = { token: 'share-jwt' }
    http.post.mockResolvedValueOnce({ data: body })
    await expect(D3DApi.createShare('dag-1', { role: 'view' })).resolves.toEqual(body)
  })

  it('exchangeShare() rejects on network/HTTP errors', async () => {
    const err = new Error('503')
    http.get.mockRejectedValueOnce(err)
    await expect(D3DApi.exchangeShare('t')).rejects.toBe(err)
  })
})

describe('api null fallback contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getDiagram() resolves null on failure (loadFromServer relies on this)', async () => {
    http.get.mockRejectedValueOnce(new Error('404'))
    await expect(D3DApi.getDiagram('missing')).resolves.toBeNull()
  })

  it('getDiagram() returns the body on success', async () => {
    const body = { diagram: '{}' }
    http.get.mockResolvedValueOnce({ data: body })
    await expect(D3DApi.getDiagram('dag-1')).resolves.toEqual(body)
  })
})
