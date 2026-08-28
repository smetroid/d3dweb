// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { importShareAsDiagram } from '@/helpers/shareImport.js'

const { mockImport, mockStash } = vi.hoisted(() => ({ mockImport: vi.fn(), mockStash: vi.fn() }))

vi.mock('@/services/api', () => ({
  default: { importElementShare: mockImport }
}))

// The stash itself is covered by pendingCluster.test.js; what matters here is
// how its answer is handled.
vi.mock('@/helpers/pendingCluster', () => ({
  stashPendingCluster: mockStash
}))

const CLUSTER = { options: {}, nodes: [{ v: 'n1', value: {} }], edges: [] }

beforeEach(() => {
  mockImport.mockResolvedValue({ status: 'ok', cluster: CLUSTER })
  mockStash.mockReturnValue(true)
})

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('importShareAsDiagram', () => {
  it('imports the share by id', async () => {
    await importShareAsDiagram('es1')
    expect(mockImport).toHaveBeenCalledWith('es1')
  })

  // The editor applies the cluster on arrival; parking it is what makes the
  // trip back to the app open the diagram.
  it('parks the cluster for the editor to open as a new diagram', async () => {
    const result = await importShareAsDiagram('es1')

    expect(result.ok).toBe(true)
    expect(mockStash).toHaveBeenCalledWith(CLUSTER, 'new')
  })

  it("surfaces the server's message when the import is rejected", async () => {
    const err = new Error('Request failed with status code 401')
    err.response = { status: 401, data: { status: 'error', message: 'login required' } }
    mockImport.mockRejectedValue(err)

    const result = await importShareAsDiagram('es1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('login required')
  })

  it('falls back to a generic message when the server sends none', async () => {
    mockImport.mockRejectedValue(new Error('Network Error'))

    const result = await importShareAsDiagram('es1')

    expect(result.error).toBe('Import failed')
    expect(result.error).not.toContain('Network Error')
  })

  it('reports a response that carries no cluster', async () => {
    mockImport.mockResolvedValue({ status: 'error', message: 'share revoked' })

    const result = await importShareAsDiagram('es1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('share revoked')
  })

  // Private browsing or a full quota: navigating to an editor with nothing to
  // apply would look like the import silently did nothing.
  it('reports when the cluster cannot be parked', async () => {
    mockStash.mockReturnValue(false)

    const result = await importShareAsDiagram('es1')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/session storage/i)
  })
})
