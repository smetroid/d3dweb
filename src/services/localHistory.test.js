import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  pushSnapshot,
  getHistory,
  getSnapshot,
  clearHistory,
  historyKeyFor
} from '@/services/localHistory.js'

const store = new Map()

vi.stubGlobal('localStorage', {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  }
})

beforeEach(() => {
  store.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const payload = (label) => ({ name: 'D', description: 'x', diagram: JSON.stringify({ nodes: [{ v: 'n1', value: { label } }], edges: [] }) })

describe('pushSnapshot / getHistory', () => {
  it('appends a snapshot under the diagram key', () => {
    const count = pushSnapshot('dag-1', payload('a'))
    expect(count).toBe(1)

    const entries = getHistory('dag-1')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ savedAt: '2026-01-01T00:00:00.000Z' })
    expect(entries[0].diagram).toBeUndefined()
  })

  it('falls back to the unsaved key when diagramId is missing', () => {
    pushSnapshot(null, payload('a'))
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'))
    pushSnapshot(undefined, payload('b'))
    expect(getHistory(null)).toHaveLength(2)
    expect(historyKeyFor(null)).toBe('d3d.history.unsaved')
  })

  it('skips a snapshot identical to the last one', () => {
    pushSnapshot('dag-1', payload('a'))
    const count = pushSnapshot('dag-1', payload('a'))
    expect(count).toBe(0)
    expect(getHistory('dag-1')).toHaveLength(1)
  })

  it('skips snapshots within the min gap', () => {
    pushSnapshot('dag-1', payload('a'))
    vi.setSystemTime(new Date('2026-01-01T00:00:01Z'))
    const count = pushSnapshot('dag-1', payload('b'))
    expect(count).toBe(0)
    expect(getHistory('dag-1')).toHaveLength(1)
  })

  it('records a snapshot again after the min gap', () => {
    pushSnapshot('dag-1', payload('a'))
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'))
    const count = pushSnapshot('dag-1', payload('b'))
    expect(count).toBe(2)
  })

  it('caps the list at MAX_SNAPSHOTS and drops the oldest', () => {
    for (let i = 0; i < 60; i++) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, i * 4))
      pushSnapshot('dag-1', payload('node-' + i))
    }
    const entries = getHistory('dag-1')
    expect(entries).toHaveLength(50)
    expect(entries[0].diagram).toBeUndefined()
  })

  it('tolerates corrupt stored data', () => {
    store.set('d3d.history.dag-1', 'not json')
    expect(getHistory('dag-1')).toEqual([])
    expect(pushSnapshot('dag-1', payload('a'))).toBe(1)
  })
})

describe('getSnapshot', () => {
  it('returns the full payload for a known id', () => {
    pushSnapshot('dag-1', payload('a'))
    const entry = getHistory('dag-1')[0]
    const snap = getSnapshot('dag-1', entry.id)
    expect(snap.diagram).toContain('"label":"a"')
    expect(snap.name).toBe('D')
  })

  it('returns null for an unknown id', () => {
    pushSnapshot('dag-1', payload('a'))
    expect(getSnapshot('dag-1', 'nope')).toBeNull()
  })
})

describe('clearHistory', () => {
  it('removes the diagram history key', () => {
    pushSnapshot('dag-1', payload('a'))
    clearHistory('dag-1')
    expect(getHistory('dag-1')).toEqual([])
  })
})
