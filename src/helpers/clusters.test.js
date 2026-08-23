import { describe, it, expect } from 'vitest'
import { computeCluster, mergeClusterInto } from './clusters.js'

// graphlib JSON format: {options, nodes:[{v, value, parent?}], edges:[{v, w, value}]}
function makeGraph(nodes, edges = [], options = {}) {
  return {
    options: { directed: true, multigraph: false, compound: true, ...options },
    nodes: nodes.map((n) =>
      typeof n === 'string'
        ? { v: n, value: {} }
        : { v: n.v, value: n.value ?? {}, ...(n.parent ? { parent: n.parent } : {}) }
    ),
    edges: edges.map((e) => ({ v: e[0], w: e[1], value: e[2] ?? {} }))
  }
}

// ─── computeCluster ───────────────────────────────────────────────────────────

describe('computeCluster – depth -1 (undirected component)', () => {
  it('returns only the root node when it has no edges', () => {
    const g = makeGraph(['a', 'b', 'c'])
    const result = computeCluster(g, ['a'], -1)
    expect(result.nodes.map((n) => n.v).sort()).toEqual(['a'])
    expect(result.edges).toEqual([])
  })

  it('returns connected component for a simple chain', () => {
    const g = makeGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'b'],
        ['b', 'c']
      ]
    )
    const result = computeCluster(g, ['a'], -1)
    expect(result.nodes.map((n) => n.v).sort()).toEqual(['a', 'b', 'c'])
    expect(result.edges).toHaveLength(2)
  })

  it('treats edges as undirected so upstream nodes are included', () => {
    const g = makeGraph(
      ['a', 'b', 'c'],
      [
        ['b', 'a'],
        ['b', 'c']
      ]
    )
    const result = computeCluster(g, ['a'], -1)
    expect(result.nodes.map((n) => n.v).sort()).toEqual(['a', 'b', 'c'])
  })

  it('multi-root expands from all roots simultaneously', () => {
    const g = makeGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'b'],
        ['c', 'd']
      ]
    )
    const result = computeCluster(g, ['a', 'c'], -1)
    expect(result.nodes.map((n) => n.v).sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('computeCluster – depth 0 (directed descendants only)', () => {
  it('returns only root and its direct/transitive successors', () => {
    const g = makeGraph(
      ['root', 'child', 'grandchild', 'upstream'],
      [
        ['upstream', 'root'],
        ['root', 'child'],
        ['child', 'grandchild']
      ]
    )
    const result = computeCluster(g, ['root'], 0)
    const ids = result.nodes.map((n) => n.v).sort()
    expect(ids).toContain('root')
    expect(ids).toContain('child')
    expect(ids).toContain('grandchild')
    expect(ids).not.toContain('upstream')
  })
})

describe('computeCluster – depth N (N-hop undirected)', () => {
  it('depth 1 returns root plus immediate neighbours', () => {
    const g = makeGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['b', 'd']
      ]
    )
    const result = computeCluster(g, ['a'], 1)
    const ids = result.nodes.map((n) => n.v).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('depth 2 reaches two hops', () => {
    const g = makeGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd']
      ]
    )
    const result = computeCluster(g, ['a'], 2)
    const ids = result.nodes.map((n) => n.v).sort()
    expect(ids).toEqual(['a', 'b', 'c'])
  })
})

describe('computeCluster – compound nodes', () => {
  it('includes parent containers of included nodes without pulling in siblings', () => {
    const g = makeGraph([
      { v: 'parent' },
      { v: 'child1', parent: 'parent' },
      { v: 'child2', parent: 'parent' }
    ])
    const result = computeCluster(g, ['child1'], 0)
    const ids = result.nodes.map((n) => n.v).sort()
    expect(ids).toContain('parent')
    expect(ids).toContain('child1')
    expect(ids).not.toContain('child2')
  })

  it('preserves parent reference on nodes in result', () => {
    const g = makeGraph([{ v: 'p' }, { v: 'c', parent: 'p' }], [])
    const result = computeCluster(g, ['c'], -1)
    const child = result.nodes.find((n) => n.v === 'c')
    expect(child.parent).toBe('p')
  })
})

describe('computeCluster – options and value preservation', () => {
  it('copies options from the source graph', () => {
    const g = makeGraph(['a'], [], { directed: true, compound: false })
    const result = computeCluster(g, ['a'], -1)
    expect(result.options.directed).toBe(true)
    expect(result.options.compound).toBe(false)
  })

  it('preserves node value objects', () => {
    const g = makeGraph([{ v: 'a', value: { label: 'Alpha', color: 'red' } }])
    const result = computeCluster(g, ['a'], -1)
    expect(result.nodes[0].value).toEqual({ label: 'Alpha', color: 'red' })
  })
})

// ─── mergeClusterInto ─────────────────────────────────────────────────────────

describe('mergeClusterInto – non-conflicting IDs', () => {
  it('adds cluster nodes that do not exist in current graph', () => {
    const current = makeGraph(['x'])
    const cluster = makeGraph(['a', 'b'], [['a', 'b']])
    const result = mergeClusterInto(current, cluster)
    const ids = result.nodes.map((n) => n.v).sort()
    expect(ids).toEqual(['a', 'b', 'x'])
  })

  it('adds cluster edges to the merged graph', () => {
    const current = makeGraph(['x'])
    const cluster = makeGraph(['a', 'b'], [['a', 'b']])
    const result = mergeClusterInto(current, cluster)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]).toMatchObject({ v: 'a', w: 'b' })
  })

  it('does not duplicate nodes that already exist', () => {
    const current = makeGraph(['a', 'x'])
    const cluster = makeGraph(['a', 'b'], [['a', 'b']])
    const result = mergeClusterInto(current, cluster)
    const ids = result.nodes.map((n) => n.v)
    expect(ids.filter((id) => id === 'a')).toHaveLength(1)
  })
})

describe('mergeClusterInto – ID conflict remapping', () => {
  it('remaps a cluster node ID that conflicts with an existing node', () => {
    const current = makeGraph(['a'])
    const cluster = makeGraph(['a', 'b'], [['a', 'b']])
    const result = mergeClusterInto(current, cluster)
    const ids = result.nodes.map((n) => n.v)
    // 'a' from cluster should be remapped to something like 'a_2'
    expect(ids).toContain('a')
    expect(ids.some((id) => id.startsWith('a_'))).toBe(true)
  })

  it('remaps edge endpoints when a node ID is remapped', () => {
    const current = makeGraph(['a'])
    const cluster = makeGraph(['a', 'b'], [['a', 'b']])
    const result = mergeClusterInto(current, cluster)
    const remappedA = result.nodes.find((n) => n.v !== 'a' && n.v.startsWith('a_'))?.v
    expect(result.edges.some((e) => e.v === remappedA && e.w === 'b')).toBe(true)
  })

  it('remaps parent references when the parent node ID is remapped', () => {
    const current = makeGraph(['p'])
    const cluster = makeGraph([{ v: 'p' }, { v: 'c', parent: 'p' }])
    const result = mergeClusterInto(current, cluster)
    const child = result.nodes.find((n) => n.v === 'c')
    expect(child?.parent).not.toBe('p')
    expect(child?.parent).toMatch(/^p_/)
  })
})

describe('mergeClusterInto – output format', () => {
  it('returns a valid graphlib JSON object with options, nodes, edges', () => {
    const current = makeGraph(['x'])
    const cluster = makeGraph(['a'])
    const result = mergeClusterInto(current, cluster)
    expect(result).toHaveProperty('options')
    expect(result).toHaveProperty('nodes')
    expect(result).toHaveProperty('edges')
    expect(Array.isArray(result.nodes)).toBe(true)
    expect(Array.isArray(result.edges)).toBe(true)
  })

  it('preserves existing nodes and edges unchanged', () => {
    const current = makeGraph(['x', 'y'], [['x', 'y']])
    const cluster = makeGraph(['a'])
    const result = mergeClusterInto(current, cluster)
    expect(result.edges.some((e) => e.v === 'x' && e.w === 'y')).toBe(true)
  })
})
