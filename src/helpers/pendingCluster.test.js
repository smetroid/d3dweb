// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { stashPendingCluster, takePendingCluster } from '@/helpers/pendingCluster'

const CLUSTER = { nodes: [{ v: 'n1', value: {} }], edges: [] }

beforeEach(() => sessionStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('pendingCluster', () => {
  it('round-trips a cluster and its mode', () => {
    expect(stashPendingCluster(CLUSTER, 'merge')).toBe(true)
    expect(takePendingCluster()).toEqual({ mode: 'merge', cluster: CLUSTER })
  })

  it('returns null when nothing is stashed', () => {
    expect(takePendingCluster()).toBeNull()
  })

  // A handoff applies once; a second trip through the app must not re-apply it.
  it('consumes the cluster on read', () => {
    stashPendingCluster(CLUSTER, 'new')
    takePendingCluster()
    expect(takePendingCluster()).toBeNull()
  })

  // Anything but an explicit merge opens a new diagram, so a corrupted or
  // absent mode can never silently rewrite the diagram already open.
  it('falls back to the new-diagram mode for an unknown mode', () => {
    stashPendingCluster(CLUSTER, 'nonsense')
    expect(takePendingCluster().mode).toBe('new')
  })

  it('discards corrupt stored data instead of throwing', () => {
    sessionStorage.setItem('d3d_pending_cluster', '{not json')
    expect(takePendingCluster()).toBeNull()
  })

  it('discards a payload with no cluster', () => {
    sessionStorage.setItem('d3d_pending_cluster', JSON.stringify({ mode: 'merge' }))
    expect(takePendingCluster()).toBeNull()
  })

  it('reports failure when storage is unavailable', () => {
    // jsdom's sessionStorage is a Proxy that ignores instance/prototype spies,
    // so replace the global outright.
    vi.stubGlobal('sessionStorage', {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      getItem: () => null,
      removeItem: () => {}
    })
    expect(stashPendingCluster(CLUSTER, 'new')).toBe(false)
  })
})
