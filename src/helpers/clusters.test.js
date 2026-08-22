import { describe, it, expect } from 'vitest'
import { computeCluster, mergeClusterInto } from '@/helpers/clusters'

// A→B→C in one component; D is disconnected.
const simpleGraph = JSON.stringify({
  options: { directed: true, compound: true },
  nodes: [
    { v: 'A', value: { label: 'A' } },
    { v: 'B', value: { label: 'B' } },
    { v: 'C', value: { label: 'C' } },
    { v: 'D', value: { label: 'D' } }
  ],
  edges: [
    { v: 'A', w: 'B', value: {} },
    { v: 'B', w: 'C', value: {} }
  ]
})

function nodeIds(result) {
  return result.nodes.map((n) => n.v).sort()
}

// ── computeCluster ────────────────────────────────────────────────────────────

describe('computeCluster depth -1 (whole component)', () => {
  it('returns A,B,C when starting from A', () => {
    const result = computeCluster(simpleGraph, ['A'], -1)
    expect(nodeIds(result)).toEqual(['A', 'B', 'C'])
  })

  it('returns A,B,C when starting from middle node B', () => {
    const result = computeCluster(simpleGraph, ['B'], -1)
    expect(nodeIds(result)).toEqual(['A', 'B', 'C'])
  })

  it('returns full graph when roots span both components', () => {
    const result = computeCluster(simpleGraph, ['A', 'D'], -1)
    expect(nodeIds(result)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('includes only edges between selected nodes', () => {
    const result = computeCluster(simpleGraph, ['A'], -1)
    expect(result.edges).toHaveLength(2)
  })
})

describe('computeCluster depth 0 (roots + descendants)', () => {
  it('returns A,B,C from root A (directed traversal)', () => {
    const result = computeCluster(simpleGraph, ['A'], 0)
    expect(nodeIds(result)).toEqual(['A', 'B', 'C'])
  })

  it('returns only C when starting from leaf C', () => {
    const result = computeCluster(simpleGraph, ['C'], 0)
    expect(nodeIds(result)).toEqual(['C'])
    expect(result.edges).toHaveLength(0)
  })
})

describe('computeCluster depth N (N-hop undirected BFS)', () => {
  it('depth 1 from B reaches A and C', () => {
    const result = computeCluster(simpleGraph, ['B'], 1)
    expect(nodeIds(result)).toEqual(['A', 'B', 'C'])
  })

  it('depth 1 from A reaches only B (C is 2 hops away)', () => {
    const result = computeCluster(simpleGraph, ['A'], 1)
    expect(nodeIds(result)).toEqual(['A', 'B'])
  })

  it('depth 2 from A reaches B and C', () => {
    const result = computeCluster(simpleGraph, ['A'], 2)
    expect(nodeIds(result)).toEqual(['A', 'B', 'C'])
  })
})

describe('computeCluster compound node handling', () => {
  const compoundGraph = JSON.stringify({
    nodes: [
      { v: 'container' },
      { v: 'child', parent: 'container' },
      { v: 'sibling', parent: 'container' },
      { v: 'other' }
    ],
    edges: [{ v: 'child', w: 'other', value: {} }]
  })

  it('includes parent container without pulling in siblings', () => {
    const result = computeCluster(compoundGraph, ['child'], -1)
    const ids = nodeIds(result)
    expect(ids).toContain('child')
    expect(ids).toContain('container')
    expect(ids).toContain('other')
    expect(ids).not.toContain('sibling')
  })
})

describe('computeCluster options preservation', () => {
  it('carries the options object through to the result', () => {
    const result = computeCluster(simpleGraph, ['A'], -1)
    expect(result.options).toEqual({ directed: true, compound: true })
  })

  it('handles diagram with no options field', () => {
    const g = JSON.stringify({ nodes: [{ v: 'X' }], edges: [] })
    const result = computeCluster(g, ['X'], -1)
    expect(result.nodes).toHaveLength(1)
  })
})

// ── mergeClusterInto ─────────────────────────────────────────────────────────

describe('mergeClusterInto non-conflicting nodes', () => {
  it('appends new nodes and edges without modification', () => {
    const current = JSON.stringify({ nodes: [{ v: 'X', value: {} }], edges: [] })
    const cluster = JSON.stringify({
      nodes: [
        { v: 'Y', value: {} },
        { v: 'Z', value: {} }
      ],
      edges: [{ v: 'Y', w: 'Z', value: {} }]
    })
    const result = JSON.parse(mergeClusterInto(current, cluster))
    expect(nodeIds(result)).toEqual(['X', 'Y', 'Z'])
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]).toMatchObject({ v: 'Y', w: 'Z' })
  })
})

describe('mergeClusterInto conflicting node IDs', () => {
  it('remaps conflicting IDs so both nodes survive', () => {
    const current = JSON.stringify({ nodes: [{ v: 'n1', value: {} }], edges: [] })
    const cluster = JSON.stringify({
      nodes: [{ v: 'n1', value: { label: 'from-cluster' } }],
      edges: []
    })
    const result = JSON.parse(mergeClusterInto(current, cluster))
    expect(result.nodes).toHaveLength(2)
    const imported = result.nodes.find((n) => n.value?.label === 'from-cluster')
    expect(imported).toBeDefined()
    expect(imported.v).not.toBe('n1')
  })

  it('updates edge endpoints when their node IDs are remapped', () => {
    const current = JSON.stringify({ nodes: [{ v: 'n1', value: {} }], edges: [] })
    const cluster = JSON.stringify({
      nodes: [
        { v: 'n1', value: {} },
        { v: 'n2', value: {} }
      ],
      edges: [{ v: 'n1', w: 'n2', value: {} }]
    })
    const result = JSON.parse(mergeClusterInto(current, cluster))
    const ids = result.nodes.map((n) => n.v)
    const edge = result.edges[0]
    expect(ids).toContain(edge.v)
    expect(ids).toContain(edge.w)
  })

  it('updates parent references when the parent is remapped', () => {
    const current = JSON.stringify({ nodes: [{ v: 'box', value: {} }], edges: [] })
    const cluster = JSON.stringify({
      nodes: [
        { v: 'box', value: { label: 'cluster-box' } },
        { v: 'inner', parent: 'box', value: {} }
      ],
      edges: []
    })
    const result = JSON.parse(mergeClusterInto(current, cluster))
    const inner = result.nodes.find((n) => n.v === 'inner')
    expect(inner.parent).not.toBe('box')
    const remappedParent = result.nodes.find((n) => n.v === inner.parent)
    expect(remappedParent).toBeDefined()
    expect(remappedParent.value?.label).toBe('cluster-box')
  })
})

describe('mergeClusterInto return format', () => {
  it('returns a valid JSON string', () => {
    const current = JSON.stringify({ nodes: [], edges: [] })
    const cluster = JSON.stringify({ nodes: [{ v: 'A' }], edges: [] })
    const result = mergeClusterInto(current, cluster)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('preserves options from the current diagram', () => {
    const current = JSON.stringify({
      options: { directed: true },
      nodes: [],
      edges: []
    })
    const cluster = JSON.stringify({ nodes: [{ v: 'A' }], edges: [] })
    const result = JSON.parse(mergeClusterInto(current, cluster))
    expect(result.options).toEqual({ directed: true })
  })
})
