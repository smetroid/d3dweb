import { describe, it, expect, vi } from 'vitest'
import GraphModel from '@/helpers/GraphModel.js'
import DiagramGraph from '@/helpers/DiagramGraph.js'

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
    group: 'nodes',
    data: { id: `n${i}`, label: `Node ${i}` },
  }))
  const model = new GraphModel(elements)
  const renderer = {
    updateScene:    vi.fn(),
    selectNode:     vi.fn(),
    deselectNode:   vi.fn(),
    selectEdge:     vi.fn(),
    deselectEdge:   vi.fn(),
    getNodeElement: vi.fn(() => null),
    resetCamera:    vi.fn(),
  }
  const graph = new DiagramGraph({ diagram: model, name: 'test' }, { emit: vi.fn() })
  graph.renderer = renderer
  return { model, renderer, graph }
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

describe('redraw', () => {
  it('calls renderer.updateScene with the model and colaOpts', () => {
    const { graph, renderer } = makeGraph(3)
    graph.redraw()
    expect(renderer.updateScene).toHaveBeenCalledWith(
      graph.cy,
      expect.objectContaining({ colaOpts: graph.colaOpts })
    )
  })

  it('passes pan/zoom options through without redrawing the graph', () => {
    const { graph, renderer } = makeGraph(3)
    graph.redraw({ pan: 'Down' })
    expect(renderer.updateScene).toHaveBeenCalledWith(
      graph.cy,
      expect.objectContaining({ pan: 'Down' })
    )
  })

  it('no-ops when there is no renderer', () => {
    const { graph } = makeGraph(3)
    graph.renderer = null
    expect(() => graph.redraw()).not.toThrow()
  })
})
