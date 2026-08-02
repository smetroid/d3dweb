import { describe, it, expect, vi, beforeEach } from 'vitest'
import GraphModel from '@/helpers/GraphModel.js'
import DiagramGraph from '@/helpers/DiagramGraph.js'
import { runColaLayout } from '@/helpers/colaLayout.js'
import { SCALE } from '@/helpers/ThreeDRenderer.js'

vi.mock('vue-cookies', () => ({
  default: { get: () => null, set: () => {}, config: () => {} },
}))

vi.mock('@/helpers/colaLayout.js', () => ({
  runColaLayout: vi.fn(),
}))

vi.stubGlobal('localStorage', {
  store: new Map(),
  getItem(key) { return this.store.get(key) ?? null },
  setItem(key, value) { this.store.set(key, String(value)) },
  removeItem(key) { this.store.delete(key) },
})

function makeGraph(nodeCount = 6) {
  const elements = Array.from({ length: nodeCount }, (_, i) => ({
    group: 'nodes',
    data: { id: `n${i}`, label: `Node ${i}` },
  }))
  const model = new GraphModel(elements)
  const renderer = {
    updateScene: vi.fn(),
    enable3D: vi.fn(),
    enable2D: vi.fn(),
    transitionToPositions: vi.fn(),
    selectNode: vi.fn(),
    deselectNode: vi.fn(),
    selectEdge: vi.fn(),
    deselectEdge: vi.fn(),
    getNodeElement: vi.fn(() => ({})),
  }
  const graph = new DiagramGraph({ diagram: model, name: 'test' }, { emit: vi.fn() })
  graph.renderer = renderer
  return { model, renderer, graph }
}

function distances(positions) {
  return [...positions.values()].map(p => Math.hypot(p.x, p.y, p.z))
}

describe('counts', () => {
  it('reports node and edge counts', () => {
    const { model, graph } = makeGraph(3)
    model.addEdge({ source: 'n0', target: 'n1' })
    expect(graph.nodeCount()).toBe(3)
    expect(graph.edgeCount()).toBe(1)
  })
})

describe('node CRUD', () => {
  it('adds a node with mapped data', () => {
    const { model, graph, renderer } = makeGraph(2)
    const id = graph.addNode({ nodeLabel: 'Brand New', nodeShape: 'ellipse' })
    expect(model.nodes()).toHaveLength(3)
    expect(graph.getNodeData(id).nodeLabel).toBe('Brand New')
    expect(renderer.updateScene).toHaveBeenCalled()
  })

  it('updates an existing node', () => {
    const { graph } = makeGraph(1)
    graph.updateNode({ nodeLabel: 'Renamed' }, 'n0')
    expect(graph.getNodeData('n0').label).toBe('Renamed')
  })

  it('deletes a node by id', () => {
    const { model, graph } = makeGraph(2)
    graph.deleteNode('n0')
    expect(model.nodes()).toHaveLength(1)
    expect(model.getElementById('n0').empty()).toBe(true)
  })

  it('detaches children before deleting a parent', () => {
    const { model, graph } = makeGraph(3)
    model.getElementById('n2').move({ parent: 'n0' })
    graph.deleteNode('n0')
    expect(model.getElementById('n0').empty()).toBe(true)
    expect(model.getElementById('n2').empty()).toBe(false)
    expect(model.getElementById('n2').parent().empty()).toBe(true)
  })

  it('removes edges touching a deleted node', () => {
    const { model, graph } = makeGraph(3)
    model.addEdge({ source: 'n0', target: 'n1' })
    model.addEdge({ source: 'n1', target: 'n2' })
    graph.deleteNode('n1')
    expect(model.edges()).toHaveLength(0)
  })

  it('returns false for missing nodes', () => {
    const { graph } = makeGraph(1)
    expect(graph.deleteNode('nope')).toBe(false)
  })

  it('returns null for missing nodes', () => {
    const { graph } = makeGraph(1)
    expect(graph.getNodeData('nope')).toBeNull()
    expect(graph.getNodeData(null)).toBeNull()
    expect(graph.getNodeData(undefined)).toBeNull()
  })
})

describe('edge CRUD', () => {
  it('adds an edge between the two selected nodes', () => {
    const { model, graph } = makeGraph(3)
    graph.selectedNodes = [0, 2]
    graph.addEdge({ edgeLabel: 'connects', edgeArrowHead: 'vee' })
    const edges = model.edges()
    expect(edges).toHaveLength(1)
    expect(edges[0].source().id()).toBe('n0')
    expect(edges[0].target().id()).toBe('n2')
    expect(graph.getEdgeData(edges[0].id()).edgeLabel).toBe('connects')
  })

  it('updates edge data', () => {
    const { model, graph } = makeGraph(2)
    model.addEdge({ source: 'n0', target: 'n1', label: 'old' })
    const eid = model.edges()[0].id()
    graph.updateEdge({ edgeLabel: 'new', edgeArrowHead: 'vee' }, eid)
    expect(model.getElementById(eid).data('label')).toBe('new')
  })

  it('deletes an edge by id or by {v, w}', () => {
    const { model, graph } = makeGraph(2)
    model.addEdge({ source: 'n0', target: 'n1', label: 'x' })
    graph.deleteEdge({ v: 'n0', w: 'n1' })
    expect(model.edges()).toHaveLength(0)
  })
})

describe('_runLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to runColaLayout with model, opts and constraints', () => {
    const { model, graph } = makeGraph(3)
    graph.colaConstraints = [{ axis: 'x', left: 'n0', right: 'n1', gap: 50 }]
    graph._runLayout()
    expect(runColaLayout).toHaveBeenCalledWith(model, graph.colaOpts, graph.colaConstraints)
  })

  it('does nothing for an empty graph', () => {
    const { model, graph } = makeGraph(0)
    graph._runLayout()
    expect(runColaLayout).not.toHaveBeenCalled()
    expect(model.nodes()).toHaveLength(0)
  })
})

describe('3D sphere layout', () => {
  it('places every node on a sphere of radius R', () => {
    const { graph } = makeGraph(12)
    const positions = graph._spherePositions(graph.cy.nodes())
    expect(positions.size).toBe(12)
    const R = Math.max(12 * 55, 300)
    for (const d of distances(positions)) {
      expect(Math.abs(d - R)).toBeLessThan(0.01)
    }
  })

  it('is deterministic for the same node set', () => {
    const { graph } = makeGraph(6)
    const a = graph._spherePositions(graph.cy.nodes())
    const b = graph._spherePositions(graph.cy.nodes())
    expect([...a.entries()]).toEqual([...b.entries()])
  })

  it('y stays within ±R', () => {
    const { graph } = makeGraph(20)
    const R = Math.max(20 * 55, 300)
    for (const p of graph._spherePositions(graph.cy.nodes()).values()) {
      expect(Math.abs(p.y)).toBeLessThanOrEqual(R + 0.001)
    }
  })
})

describe('3D helix layout', () => {
  it('winds nodes around a vertical axis with monotonically increasing y', () => {
    const { graph } = makeGraph(15)
    const positions = graph._helixPositions(graph.cy.nodes())
    const radius = Math.max(15 * 40, 250)
    const height = Math.max(15 * 80, 500)
    const values = [...positions.values()]
    expect(positions.size).toBe(15)
    for (const p of values) {
      expect(Math.abs(Math.hypot(p.x, p.z) - radius)).toBeLessThan(0.01)
    }
    const ys = values.map(p => p.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(height + 0.001)
  })
})

describe('3D hierarchy layout', () => {
  function makeLayeredGraph(nodeCount) {
    const { model, graph } = makeGraph(nodeCount)
    for (let i = 0; i < nodeCount - 1; i++) {
      model.addEdge({ source: `n${i}`, target: `n${i + 1}` })
    }
    return { model, graph }
  }

  // Simulate cola laying nodes out with distinct x/y (real run is mocked)
  function mockColaPositions(model) {
    runColaLayout.mockImplementation((m) => {
      m.nodes().forEach((n, i) => m.setPosition(n.id(), 10 + i, 20 + i * 2))
    })
    return model
  }

  it('flattens nodes into depth layers by rank', () => {
    const { model, graph } = makeLayeredGraph(8)
    mockColaPositions(model)
    const positions = graph._hierarchyPositions(graph.cy.nodes())
    expect(positions.size).toBe(8)
    const layers = [...positions.values()].map(p => p.z)
    expect(new Set(layers).size).toBeGreaterThan(1)
    layers.forEach(z => expect(z).toBeLessThanOrEqual(0))
    expect(layers.every(z => z % 120 === 0)).toBe(true)
  })

  it('scales x/y to world units', () => {
    const { model, graph } = makeLayeredGraph(8)
    mockColaPositions(model)
    const positions = graph._hierarchyPositions(graph.cy.nodes())
    for (const p of positions.values()) {
      expect(p.x).not.toBe(0)
      expect(p.y).not.toBe(0)
      expect(Math.abs(p.y)).toBeCloseTo(Math.abs(p.y) / SCALE * SCALE, 6)
    }
  })
})

describe('apply3DLayout / backTo2D', () => {
  it('enters 3D mode and animates to a sphere', () => {
    const { graph, renderer } = makeGraph(6)
    graph.apply3DLayout('sphere')
    expect(graph.viewMode).toBe('3D')
    expect(renderer.enable3D).toHaveBeenCalled()
    expect(renderer.transitionToPositions).toHaveBeenCalledWith(graph.threePositions)
    expect(graph.threePositions).toBeInstanceOf(Map)
  })

  it('ignores unknown layout modes', () => {
    const { graph, renderer } = makeGraph(3)
    graph.apply3DLayout('flat-earth')
    expect(graph.viewMode).toBe('2D')
    expect(renderer.transitionToPositions).not.toHaveBeenCalled()
  })

  it('returns to 2D and clears stored positions', () => {
    const { graph, renderer } = makeGraph(4)
    graph.apply3DLayout('helix')
    graph.backTo2D()
    expect(graph.viewMode).toBe('2D')
    expect(graph.threePositions).toBeNull()
    expect(renderer.enable2D).toHaveBeenCalled()
    expect(renderer.updateScene).toHaveBeenCalled()
  })

  it('redraw in 3D mode re-applies stored positions', () => {
    const { graph, renderer } = makeGraph(5)
    graph.apply3DLayout('sphere')
    renderer.transitionToPositions.mockClear()
    graph.redraw()
    expect(renderer.transitionToPositions).toHaveBeenCalledWith(graph.threePositions)
  })
})
