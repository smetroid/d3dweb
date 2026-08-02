import { describe, it, expect, vi } from 'vitest'
import cytoscape from 'cytoscape'
import CytoscapeGraph from '@/helpers/CytoscapeGraph.js'

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
  const graph = new CytoscapeGraph({ diagram: cy, name: 'test' }, { emit: vi.fn() })
  return { cy, graph }
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
    const { cy, graph } = makeGraph(2)
    const id = graph.addNode({ nodeLabel: 'Brand New', nodeShape: 'ellipse' })
    expect(cy.nodes()).toHaveLength(3)
    expect(graph.getNodeData(id).nodeLabel).toBe('Brand New')
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

  it('uses dagre even when the graph has compound parents', () => {
    const { cy, graph } = makeGraph(3)
    cy.getElementById('n1').move({ parent: 'n0' })
    const spy = spyLayout(cy)
    graph._runLayout()
    expect(spy.mock.calls[0][0].name).toBe('dagre')
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

  it('correctly formats and forwards camelCase rankSep and nodeSep layout options to cytoscape-dagre', () => {
    const { cy, graph } = makeGraph(3)
    graph.dagreOpts = { rankdir: 'LR', ranksep: 123, nodesep: 45, ranker: 'longest-path' }
    const spy = spyLayout(cy)
    graph._runLayout()
    expect(spy).toHaveBeenCalled()
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('dagre')
    expect(opts.rankDir).toBe('LR')
    expect(opts.rankSep).toBe(123)
    expect(opts.nodeSep).toBe(45)
    expect(opts.ranker).toBe('longest-path')
  })
})

describe('viewport controls (Cytoscape native)', () => {
  it('pans the viewport via cy.panBy', () => {
    const { cy, graph } = makeGraph(2)
    const spy = vi.spyOn(cy, 'panBy')
    graph.redraw({ pan: 'Left' })
    expect(spy).toHaveBeenCalledWith({ x: 80, y: 0 })
  })

  it('zooms in via cy.zoom', () => {
    const { cy, graph } = makeGraph(2)
    const before = cy.zoom()
    graph.redraw({ zoom: 'In' })
    expect(cy.zoom()).toBeGreaterThan(before)
  })

  it('runs the layout and reports scene-updated on a full redraw', () => {
    const { cy, graph } = makeGraph(2)
    const spy = vi.spyOn(cy, 'layout')
    spy.mockReturnValue({ run: vi.fn() })
    graph.redraw()
    expect(spy).toHaveBeenCalled()
    expect(graph.emitter.emit).toHaveBeenCalledWith('scene-updated', { count: 2 })
  })

  it('centres on a node when zoomTo is called', () => {
    const { cy, graph } = makeGraph(3)
    const spy = vi.spyOn(cy, 'animate')
    graph.zoomTo('n1')
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0][0].fit.eles.id()).toBe('n1')
  })

  it('fits and centres the whole graph', () => {
    const { cy, graph } = makeGraph(3)
    const fit = vi.spyOn(cy, 'fit')
    const center = vi.spyOn(cy, 'center')
    graph.fitGraph()
    expect(fit).toHaveBeenCalled()
    expect(center).toHaveBeenCalled()
  })

  it('re-applies the stylesheet on refreshStyle', () => {
    const { cy, graph } = makeGraph(2)
    const spy = vi.spyOn(cy, 'style')
    graph.refreshStyle()
    expect(spy).toHaveBeenCalled()
  })
})

describe('selection classes', () => {
  it('selects nodes and edges via the selected class', () => {
    const { cy, graph } = makeGraph(3)
    cy.add({ group: 'edges', data: { id: 'e1', source: 'n0', target: 'n1' } })
    graph.selectNode(1)
    graph.selectEdge(0)
    expect(cy.getElementById('n1').hasClass('selected')).toBe(true)
    expect(cy.getElementById('e1').hasClass('selected')).toBe(true)
    graph.removeSelection(1)
    graph.removeEdgeSelection(0)
    expect(cy.getElementById('n1').hasClass('selected')).toBe(false)
    expect(cy.getElementById('e1').hasClass('selected')).toBe(false)
  })
})
