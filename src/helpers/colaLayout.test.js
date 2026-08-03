import { describe, it, expect } from 'vitest'
import GraphModel from '@/helpers/GraphModel.js'
import { buildColaConfig, translateConstraints, runColaLayout, enforceConstraints, iterationsFor } from '@/helpers/colaLayout.js'

function makeModel(elements) {
  return new GraphModel(elements)
}

describe('buildColaConfig', () => {
  it('maps nodes to cola nodes with card sizes', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
      { group: 'nodes', data: { id: 'b', label: 'B' } },
    ])
    const config = buildColaConfig(model, {})
    expect(config.nodes).toHaveLength(2)
    expect(config.nodes[0]).toMatchObject({ id: 'a', width: 40, height: 18 })
    expect(config.links).toHaveLength(0)
    expect(config.avoidOverlaps).toBe(true)
    expect(config.flow).toBeNull()
  })

  it('maps edges to links with edgeLength', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'nodes', data: { id: 'b' } },
      { group: 'edges', data: { id: 'e1', source: 'a', target: 'b' } },
    ])
    const config = buildColaConfig(model, { edgeLength: 150 })
    expect(config.links).toMatchObject([{ source: 0, target: 1, length: 150, edgeId: 'e1' }])
  })

  it('drops self-loops and dangling endpoints', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'edges', data: { id: 'loop', source: 'a', target: 'a' } },
      { group: 'edges', data: { id: 'dangling', source: 'a', target: 'ghost' } },
    ])
    const config = buildColaConfig(model, {})
    expect(config.links).toHaveLength(0)
  })

  it('builds compound groups from parent links, preserving nesting', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'p1' } },
      { group: 'nodes', data: { id: 'p2' } },
      { group: 'nodes', data: { id: 'c1', parent: 'p1' } },
      { group: 'nodes', data: { id: 'c2', parent: 'p1' } },
      { group: 'nodes', data: { id: 'g1', parent: 'p2' } },
    ])
    const config = buildColaConfig(model, { nodeSpacing: 25 })
    expect(config.groups).toHaveLength(2)
    const p1 = config.groups.find(g => g.id === 'p1')
    const p2 = config.groups.find(g => g.id === 'p2')
    expect(p1.leaves).toEqual([2, 3])
    expect(p1.groups).toHaveLength(0)
    expect(p2.leaves).toEqual([4])
    expect(p2.groups).toHaveLength(0)
  })

  it('maps flow to {axis, minSeparation}', () => {
    const model = makeModel([{ group: 'nodes', data: { id: 'a' } }])
    const config = buildColaConfig(model, { flow: 'y', nodeSpacing: 14 })
    expect(config.flow).toEqual({ axis: 'y', minSeparation: 14 })
  })

  it('resolves string ids in constraints to indices', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'nodes', data: { id: 'b' } },
    ])
    const config = buildColaConfig(model, {}, [
      { type: 'alignment', axis: 'x', offsets: [{ node: 'a', offset: 0 }, { node: 'b', offset: 0 }] },
      { axis: 'y', left: 'a', right: 'b', gap: 60 },
    ])
    expect(config.constraints[0].offsets).toEqual([
      { node: 0, offset: 0 },
      { node: 1, offset: 0 },
    ])
    expect(config.constraints[1]).toEqual({ axis: 'y', left: 0, right: 1, gap: 60 })
  })
})

describe('translateConstraints', () => {
  const idToIndex = new Map([['a', 0], ['b', 1]])

  it('passes through numeric references', () => {
    const out = translateConstraints([{ type: 'alignment', axis: 'x', offsets: [{ node: 1, offset: 5 }] }], idToIndex)
    expect(out[0].offsets[0].node).toBe(1)
  })

  it('drops alignment constraints referencing missing nodes', () => {
    const out = translateConstraints([{ type: 'alignment', axis: 'x', offsets: [{ node: 'ghost', offset: 0 }] }], idToIndex)
    expect(out).toHaveLength(0)
  })

  it('drops separation constraints with a missing endpoint', () => {
    const out = translateConstraints([{ axis: 'x', left: 'a', right: 'ghost', gap: 10 }], idToIndex)
    expect(out).toHaveLength(0)
  })

  it('handles non-array constraints', () => {
    expect(translateConstraints(null, idToIndex)).toHaveLength(0)
    expect(translateConstraints(undefined, idToIndex)).toHaveLength(0)
  })
})

describe('iterationsFor', () => {
  it('clamps the budget to [20, 400]', () => {
    expect(iterationsFor(10).all).toBeGreaterThanOrEqual(0)
    const huge = iterationsFor(999999)
    expect(huge.initial + huge.structural + huge.all).toBeLessThanOrEqual(400)
    const small = iterationsFor(100)
    expect(small.initial + small.structural + small.all).toBeGreaterThanOrEqual(20)
  })

  it('always keeps gridSnap at 0', () => {
    expect(iterationsFor(1500).gridSnap).toBe(0)
  })
})

describe('runColaLayout', () => {
  it('writes layout positions back onto the model', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'nodes', data: { id: 'b' } },
      { group: 'nodes', data: { id: 'c' } },
      { group: 'edges', data: { id: 'e1', source: 'a', target: 'b' } },
      { group: 'edges', data: { id: 'e2', source: 'b', target: 'c' } },
    ])
    const { count } = runColaLayout(model, { maxSimulationTime: 200 })
    expect(count).toBe(3)
    const positions = model.nodes().map(n => n.position())
    positions.forEach(p => {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    })
    // chain a→b→c should keep b between a and c along the connecting axis
    const [a, b, c] = positions
    const dist = p => p.x * p.x + p.y * p.y
    expect(dist(b)).toBeLessThanOrEqual(Math.max(dist(a), dist(c)) + 0.001)
  })

  it('returns 0 and does nothing for an empty model', () => {
    const model = makeModel([])
    expect(runColaLayout(model, {})).toBe(0)
  })

  it('runs with flow direction and user constraints without throwing', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'nodes', data: { id: 'b' } },
      { group: 'edges', data: { id: 'e1', source: 'a', target: 'b' } },
    ])
    const { count } = runColaLayout(model, { flow: 'y', maxSimulationTime: 200 }, [
      { type: 'alignment', axis: 'x', offsets: [{ node: 'a', offset: 0 }, { node: 'b', offset: 0 }] },
    ])
    expect(count).toBe(2)
    const [a, b] = model.nodes().map(n => n.position())
    // Aligned on x
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.001)
  })

  it('handles compound parent groups through cola without throwing', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'p' } },
      { group: 'nodes', data: { id: 'c1', parent: 'p' } },
      { group: 'nodes', data: { id: 'c2', parent: 'p' } },
    ])
    const { count } = runColaLayout(model, { maxSimulationTime: 200 })
    expect(count).toBe(3)
  })

  it('enforces a separation gap across disconnected components', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'nodes', data: { id: 'b' } },
      { group: 'nodes', data: { id: 'x' } },
    ])
    const { count } = runColaLayout(model, { flow: 'x', maxSimulationTime: 400 }, [
      { axis: 'x', left: 'a', right: 'x', gap: 60 },
    ])
    expect(count).toBe(3)
    const [a, , x] = model.nodes().map(n => n.position())
    // webcola's component packing would otherwise collapse this to ~1 node width
    expect(x.x - a.x).toBeGreaterThanOrEqual(60)
  })

  it('enforces an alignment constraint across disconnected components', () => {
    const model = makeModel([
      { group: 'nodes', data: { id: 'a' } },
      { group: 'nodes', data: { id: 'b' } },
      { group: 'nodes', data: { id: 'x' } },
    ])
    runColaLayout(model, { maxSimulationTime: 400 }, [
      { type: 'alignment', axis: 'x', offsets: [{ node: 'a', offset: 0 }, { node: 'x', offset: 0 }] },
    ])
    const [a, , x] = model.nodes().map(n => n.position())
    expect(Math.abs(a.x - x.x)).toBeLessThan(0.001)
  })
})

describe('enforceConstraints', () => {
  const makeNodes = () => [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 0, y: 0 },
    { id: 'x', x: 0, y: 0 },
  ]

  it('pushes the right node out to meet the separation gap', () => {
    const nodes = makeNodes()
    enforceConstraints(nodes, [{ axis: 'x', left: 0, right: 2, gap: 60 }])
    expect(nodes[2].x).toBe(60)
  })

  it('does not move nodes that already satisfy the gap', () => {
    const nodes = makeNodes()
    nodes[2].x = 80
    enforceConstraints(nodes, [{ axis: 'x', left: 0, right: 2, gap: 60 }])
    expect(nodes[2].x).toBe(80)
  })

  it('applies separation on the y axis too', () => {
    const nodes = makeNodes()
    enforceConstraints(nodes, [{ axis: 'y', left: 0, right: 2, gap: 30 }])
    expect(nodes[2].y).toBe(30)
  })

  it('sets aligned nodes to the first offset position', () => {
    const nodes = makeNodes()
    nodes[0].x = 10
    nodes[2].x = -40
    enforceConstraints(nodes, [
      { type: 'alignment', axis: 'x', offsets: [{ node: 0, offset: 0 }, { node: 2, offset: 0 }] },
    ])
    expect(nodes[2].x).toBe(10)
  })

  it('respects alignment offsets', () => {
    const nodes = makeNodes()
    nodes[0].y = 5
    enforceConstraints(nodes, [
      { type: 'alignment', axis: 'y', offsets: [{ node: 0, offset: 0 }, { node: 2, offset: 3 }] },
    ])
    expect(nodes[2].y).toBe(8)
  })

  it('ignores constraints referencing missing nodes', () => {
    const nodes = makeNodes()
    enforceConstraints(nodes, [
      { axis: 'x', left: 0, right: 9, gap: 60 },
      { type: 'alignment', axis: 'x', offsets: [{ node: 5, offset: 0 }] },
    ])
    expect(nodes.map(n => n.x)).toEqual([0, 0, 0])
  })
})
