import { describe, it, expect, vi } from 'vitest'
import cytoscape from 'cytoscape'
import CytoscapeGraph from '@/helpers/CytoscapeGraph.js'
import { SCALE } from '@/helpers/ThreeDRenderer.js'

vi.mock('vue-cookies', () => ({
  default: { get: () => null, set: () => {}, config: () => {} },
}))

vi.stubGlobal('localStorage', {
  store: new Map(),
  getItem(key) { return this.store.get(key) ?? null },
  setItem(key, value) { this.store.set(key, String(value)) },
  removeItem(key) { this.store.delete(key) },
})

function makeGraph(nodeCount = 6) {
  const elements = Array.from({ length: nodeCount }, (_, i) => ({
    data: { id: `n${i}`, label: `Node ${i}` },
  }))
  const cy = cytoscape({ headless: true, styleEnabled: true, elements })
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
  const graph = new CytoscapeGraph({ diagram: cy, name: 'test' }, { emit: vi.fn() })
  graph.renderer = renderer
  return { cy, renderer, graph }
}

function distances(positions) {
  return [...positions.values()].map(p => Math.hypot(p.x, p.y, p.z))
}

describe('counts', () => {
  it('reports node and edge counts', () => {
    const { cy, graph } = makeGraph(3)
    cy.add({ group: 'edges', data: { id: 'e1', source: 'n0', target: 'n1' } })
    expect(graph.nodeCount()).toBe(3)
    expect(graph.edgeCount()).toBe(1)
  })
})

describe('node CRUD', () => {
  it('adds a node with mapped data', () => {
    const { cy, graph, renderer } = makeGraph(2)
    const id = graph.addNode({ nodeLabel: 'Brand New', nodeShape: 'ellipse' })
    expect(cy.nodes()).toHaveLength(3)
    expect(graph.getNodeData(id).nodeLabel).toBe('Brand New')
    expect(renderer.updateScene).toHaveBeenCalled()
  })

  it('updates an existing node', () => {
    const { graph } = makeGraph(1)
    graph.updateNode({ nodeLabel: 'Renamed' }, 'n0')
    expect(graph.getNodeData('n0').label).toBe('Renamed')
  })

  it('deletes a node by id', () => {
    const { cy, graph } = makeGraph(2)
    graph.deleteNode('n0')
    expect(cy.nodes()).toHaveLength(1)
    expect(cy.getElementById('n0').empty()).toBe(true)
  })

  it('detaches children before deleting a parent', () => {
    const { cy, graph } = makeGraph(3)
    cy.getElementById('n2').move({ parent: 'n0' })
    graph.deleteNode('n0')
    expect(cy.getElementById('n0').empty()).toBe(true)
    expect(cy.getElementById('n2').empty()).toBe(false)
    expect(cy.getElementById('n2').parent().empty()).toBe(true)
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
    const { cy, graph } = makeGraph(3)
    graph.selectedNodes = [0, 2]
    graph.addEdge({ edgeLabel: 'connects', edgeArrowHead: 'vee' })
    const edges = cy.edges()
    expect(edges).toHaveLength(1)
    expect(edges[0].source().id()).toBe('n0')
    expect(edges[0].target().id()).toBe('n2')
    expect(graph.getEdgeData(edges[0].id()).edgeLabel).toBe('connects')
  })

  it('updates edge data', () => {
    const { cy, graph } = makeGraph(2)
    cy.add({ group: 'edges', data: { id: 'e1', source: 'n0', target: 'n1', label: 'old' } })
    graph.updateEdge({ edgeLabel: 'new', edgeArrowHead: 'vee' }, 'e1')
    expect(cy.getElementById('e1').data('label')).toBe('new')
  })

  it('deletes an edge by id or by {v, w}', () => {
    const { cy, graph } = makeGraph(2)
    cy.add({ group: 'edges', data: { id: 'e1', source: 'n0', target: 'n1', label: 'x' } })
    graph.deleteEdge('e1')
    expect(cy.edges()).toHaveLength(0)
  })
})

describe('_runLayout cluster handling', () => {
  function spyLayout(cy) {
    const spy = vi.spyOn(cy, 'layout')
    spy.mockReturnValue({ run: vi.fn() })
    return spy
  }

  it('uses dagre for plain graphs', () => {
    const { cy, graph } = makeGraph(3)
    const spy = spyLayout(cy)
    graph._runLayout()
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0][0].name).toBe('dagre')
  })

  it('falls back to fcose when the graph has compound parents', () => {
    const { cy, graph } = makeGraph(3)
    cy.getElementById('n1').move({ parent: 'n0' })
    const spy = spyLayout(cy)
    graph._runLayout()
    expect(spy.mock.calls[0][0].name).toBe('fcose')
  })

  it('respects an explicit fcose choice', () => {
    const { cy, graph } = makeGraph(3)
    graph.layoutMode = 'fcose'
    const spy = spyLayout(cy)
    graph._runLayout()
    expect(spy.mock.calls[0][0].name).toBe('fcose')
  })

  it('respects an explicit cola choice even with clusters', () => {
    const { cy, graph } = makeGraph(3)
    cy.getElementById('n1').move({ parent: 'n0' })
    graph.layoutMode = 'cola'
    const spy = spyLayout(cy)
    graph._runLayout()
    expect(spy.mock.calls[0][0].name).toBe('cola')
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
    const { cy, graph } = makeGraph(nodeCount)
    for (let i = 0; i < nodeCount - 1; i++) {
      cy.add({ group: 'edges', data: { id: `e${i}`, source: `n${i}`, target: `n${i + 1}` } })
    }
    return { cy, graph }
  }

  it('flattens nodes into depth layers by rank', () => {
    const { graph } = makeLayeredGraph(8)
    const positions = graph._hierarchyPositions(graph.cy.nodes())
    expect(positions.size).toBe(8)
    const layers = [...positions.values()].map(p => p.z)
    expect(new Set(layers).size).toBeGreaterThan(1)
    layers.forEach(z => expect(z).toBeLessThanOrEqual(0))
    expect(layers.every(z => z % 120 === 0)).toBe(true)
  })

  it('scales x/y to world units', () => {
    const { graph } = makeLayeredGraph(8)
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
