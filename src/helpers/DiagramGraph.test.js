import { describe, it, expect, vi } from 'vitest'
import GraphModel from '@/helpers/GraphModel.js'
import DiagramGraph from '@/helpers/DiagramGraph.js'

vi.mock('vue-cookies', () => ({
  default: { get: () => null, set: () => {}, config: () => {} }
}))

vi.stubGlobal('localStorage', {
  store: new Map(),
  getItem(key) {
    return this.store.get(key) ?? null
  },
  setItem(key, value) {
    this.store.set(key, String(value))
  },
  removeItem(key) {
    this.store.delete(key)
  }
})

function makeGraph(nodeCount = 6) {
  const elements = Array.from({ length: nodeCount }, (_, i) => ({
    group: 'nodes',
    data: { id: `n${i}`, label: `Node ${i}` }
  }))
  const model = new GraphModel(elements)
  const renderer = {
    updateScene: vi.fn(),
    selectNode: vi.fn(),
    deselectNode: vi.fn(),
    selectEdge: vi.fn(),
    deselectEdge: vi.fn(),
    getNodeElement: vi.fn(() => null),
    resetCamera: vi.fn()
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

  it('adds a node with the cytoscape style data fields', () => {
    const { graph } = makeGraph(1)
    const id = graph.addNode({
      nodeLabel: 'Styled',
      nodeShape: 'diamond',
      bgColor: '#ff0000',
      borderColor: '#00ff00',
      borderWidth: 3,
      fontSize: 18
    })
    const data = graph.getNodeData(id)
    expect(data.nodeShape).toBe('diamond')
    expect(data.bgColor).toBe('#ff0000')
    expect(data.borderColor).toBe('#00ff00')
    expect(data.borderWidth).toBe(3)
    expect(data.fontSize).toBe(18)

    const cyData = graph.cy.getElementById(id).data()
    expect(cyData.nodeShape).toBe('diamond')
    expect(cyData.bgColor).toBe('#ff0000')
    expect(cyData.borderColor).toBe('#00ff00')
    expect(cyData.borderWidth).toBe(3)
    expect(cyData.fontSize).toBe(18)
  })

  it('migrates a legacy SVG fill style into bgColor and keeps the style field', () => {
    const { model, graph } = makeGraph(0)
    const id = model.addNode({ label: 'Old', style: 'fill: #5f9488' })
    // Direct model writes keep the legacy style (rendered via the renderer's
    // fillColor path); getNodeData lifts the fill for the form.
    expect(graph.getNodeData(id).bgColor).toBe('#5f9488')
    expect(graph.cy.getElementById(id).data('style')).toBe('fill: #5f9488')

    const id2 = graph.addNode({ nodeLabel: 'Old2', style: 'fill: #5f9488' })
    expect(graph.cy.getElementById(id2).data('bgColor')).toBe('#5f9488')
    expect(graph.cy.getElementById(id2).data('style')).toBe('fill: #5f9488')

    graph.updateNode({ nodeLabel: 'Edited', bgColor: '#00ff00' }, id)
    expect(graph.cy.getElementById(id).data('bgColor')).toBe('#00ff00')
    expect(graph.cy.getElementById(id).data('style')).toBeUndefined()
  })

  it('updates node style fields and omits emptied optional fields', () => {
    const { graph } = makeGraph(1)
    graph.updateNode({ nodeLabel: 'Styled', bgColor: '#123456', borderWidth: 2 }, 'n0')
    expect(graph.getNodeData('n0').bgColor).toBe('#123456')
    expect(graph.getNodeData('n0').borderWidth).toBe(2)

    graph.updateNode({ nodeLabel: 'Styled', bgColor: '', borderWidth: null }, 'n0')
    expect(graph.cy.getElementById('n0').data('bgColor')).toBeUndefined()
    expect(graph.cy.getElementById('n0').data('borderWidth')).toBeUndefined()
    expect(graph.getNodeData('n0').bgColor).toBeFalsy()
    expect(graph.getNodeData('n0').borderWidth).toBeUndefined()
  })

  it('redraws with layout disabled so edits do not re-run the layout', () => {
    const { graph, renderer } = makeGraph(1)
    graph.updateNode({ nodeLabel: 'Renamed' }, 'n0')
    expect(renderer.updateScene).toHaveBeenCalledWith(
      graph.cy,
      expect.objectContaining({ layout: false })
    )
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

  it('adds and updates the common cytoscape edge settings', () => {
    const { graph } = makeGraph(2)
    graph.selectedNodes = [0, 1]
    graph.addEdge({
      edgeLabel: 'connects',
      edgeArrowHead: 'vee',
      edgeArrowHeadStyle: 'hollow',
      sourceArrowhead: 'circle',
      edgeWidth: 4,
      edgeColor: '#ff00aa',
      edgeLineStyle: 'dashed',
      edgeCurve: 'straight',
      edgeOpacity: 0.5
    })
    const eid = graph.cy.edges()[0].id()
    const data = graph.getEdgeData(eid)
    expect(data.edgeArrowHead).toBe('vee')
    expect(data.edgeArrowHeadStyle).toBe('hollow')
    expect(data.sourceArrowhead).toBe('circle')
    expect(data.edgeWidth).toBe(4)
    expect(data.edgeColor).toBe('#ff00aa')
    expect(data.edgeLineStyle).toBe('dashed')
    expect(data.edgeCurve).toBe('straight')
    expect(data.edgeOpacity).toBe(0.5)

    graph.updateEdge({ edgeLabel: 'renamed', edgeColor: '' }, eid)
    expect(graph.getEdgeData(eid).edgeColor).toBeUndefined()
    expect(graph.getEdgeData(eid).edgeLabel).toBe('renamed')
  })

  it('deletes an edge by id or by {v, w}', () => {
    const { model, graph } = makeGraph(2)
    model.addEdge({ source: 'n0', target: 'n1', label: 'x' })
    graph.deleteEdge({ v: 'n0', w: 'n1' })
    expect(model.edges()).toHaveLength(0)
  })
})

describe('empty optional fields', () => {
  it('stores empty optional edge fields as undefined on add', () => {
    const { graph } = makeGraph(2)
    graph.selectedNodes = [0, 1]
    graph.addEdge({
      edgeLabel: 'connects',
      edgeArrowHead: '',
      edgeArrowHeadStyle: '',
      sourceArrowhead: '',
      edgeWidth: null,
      edgeColor: '',
      edgeLineStyle: '',
      edgeCurve: '',
      edgeOpacity: null
    })
    const eid = graph.cy.edges()[0].id()
    const data = graph.getEdgeData(eid)
    expect(data.edgeArrowHead).toBeUndefined()
    expect(data.edgeArrowHeadStyle).toBeUndefined()
    expect(data.sourceArrowhead).toBeUndefined()
    expect(data.edgeWidth).toBeUndefined()
    expect(data.edgeColor).toBeUndefined()
    expect(data.edgeLineStyle).toBeUndefined()
    expect(data.edgeCurve).toBeUndefined()
    expect(data.edgeOpacity).toBeUndefined()
    expect(data.edgeLabel).toBe('connects')
  })

  it('normalizes empty optional fields in loaded model edges', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
      { group: 'nodes', data: { id: 'b', label: 'B' } },
      {
        group: 'edges',
        data: {
          id: 'ab',
          source: 'a',
          target: 'b',
          edgeColor: '',
          sourceArrowhead: '',
          edgeWidth: null
        }
      }
    ])
    expect(model.getElementById('ab').data('edgeColor')).toBeUndefined()
    expect(model.getElementById('ab').data('sourceArrowhead')).toBeUndefined()
    expect(model.getElementById('ab').data('edgeWidth')).toBeUndefined()
  })

  it('normalizes empty optional fields in loaded model nodes', () => {
    const model = new GraphModel([
      {
        group: 'nodes',
        data: {
          id: 'n',
          label: 'N',
          bgColor: '',
          borderColor: '',
          borderWidth: null,
          fontSize: null
        }
      }
    ])
    expect(model.getElementById('n').data('bgColor')).toBeUndefined()
    expect(model.getElementById('n').data('borderColor')).toBeUndefined()
    expect(model.getElementById('n').data('borderWidth')).toBeUndefined()
    expect(model.getElementById('n').data('fontSize')).toBeUndefined()
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

describe('proximity selection', () => {
  it('selects the nearest node in a direction and returns its id and index', () => {
    const { renderer, graph } = makeGraph(3)
    renderer.nearestElementId = vi.fn(() => 'n2')
    const res = graph.selectNodeProximity('l', 'n0')
    expect(renderer.nearestElementId).toHaveBeenCalledWith({
      direction: 'l',
      fromId: 'n0',
      kind: 'nodes'
    })
    expect(renderer.deselectNode).toHaveBeenCalledWith('n0')
    expect(renderer.selectNode).toHaveBeenCalledWith('n2')
    expect(res).toEqual({ id: 'n2', index: 2 })
  })

  it('selects the nearest edge in a direction', () => {
    const { model, renderer, graph } = makeGraph(2)
    model.addEdge({ source: 'n0', target: 'n1', label: 'a' })
    model.addEdge({ source: 'n1', target: 'n0', label: 'b' })
    renderer.nearestElementId = vi.fn(() => model.edges()[1].id())
    const res = graph.selectEdgeProximity('j', model.edges()[0].id())
    expect(renderer.deselectEdge).toHaveBeenCalledWith(model.edges()[0].id())
    expect(res).toEqual({ id: model.edges()[1].id(), index: 1 })
  })

  it('returns null when there is no focused id or renderer support', () => {
    const { renderer, graph } = makeGraph(3)
    expect(graph.selectNodeProximity('l', null)).toBeNull()
    delete renderer.nearestElementId
    expect(graph.selectNodeProximity('l', 'n0')).toBeNull()
  })

  it('returns null when the renderer cannot resolve a neighbor', () => {
    const { renderer, graph } = makeGraph(3)
    renderer.nearestElementId = vi.fn(() => null)
    expect(graph.selectNodeProximity('l', 'n0')).toBeNull()
  })
})

describe('layout opts initialization', () => {
  it('reads layoutMode from d3dInfo when provided', () => {
    const model = new GraphModel([{ group: 'nodes', data: { id: 'n0', label: 'N' } }])
    const graph = new DiagramGraph(
      { diagram: model, name: 'test', layoutMode: 'dagre' },
      { emit: vi.fn() }
    )
    expect(graph.layoutMode).toBe('dagre')
  })

  it('defaults layoutMode to cola when not in d3dInfo or settings', () => {
    const { graph } = makeGraph(1)
    expect(graph.layoutMode).toBe('cola')
  })

  it('seeds per-layout opts from app defaults when not stored in d3dInfo', () => {
    const { graph } = makeGraph(1)
    expect(graph.coseOpts.nodeRepulsion).toBe(400000)
    expect(graph.coseOpts.idealEdgeLength).toBe(100)
    expect(graph.dagreOpts.rankDir).toBe('TB')
    expect(graph.dagreOpts.ranker).toBe('network-simplex')
    expect(graph.breadthfirstOpts.directed).toBe(true)
    expect(graph.gridOpts.spacingFactor).toBe(1.5)
    expect(graph.circleOpts.clockwise).toBe(true)
    expect(graph.concentricOpts.equidistant).toBe(false)
  })

  it('merges stored d3dInfo coseOpts over defaults', () => {
    const model = new GraphModel([{ group: 'nodes', data: { id: 'n0', label: 'N' } }])
    const graph = new DiagramGraph(
      {
        diagram: model,
        name: 'test',
        layoutMode: 'cose',
        coseOpts: { nodeRepulsion: 999000 }
      },
      { emit: vi.fn() }
    )
    expect(graph.layoutMode).toBe('cose')
    expect(graph.coseOpts.nodeRepulsion).toBe(999000)
    expect(graph.coseOpts.idealEdgeLength).toBe(100)
  })

  it('merges stored d3dInfo dagreOpts over defaults', () => {
    const model = new GraphModel([{ group: 'nodes', data: { id: 'n0', label: 'N' } }])
    const graph = new DiagramGraph(
      {
        diagram: model,
        name: 'test',
        layoutMode: 'dagre',
        dagreOpts: { rankDir: 'LR', nodeSep: 80 }
      },
      { emit: vi.fn() }
    )
    expect(graph.dagreOpts.rankDir).toBe('LR')
    expect(graph.dagreOpts.nodeSep).toBe(80)
    expect(graph.dagreOpts.rankSep).toBe(50)
  })
})

describe('setLayoutMode', () => {
  it('updates this.layoutMode so the next redraw uses the new layout', () => {
    const { graph, renderer } = makeGraph(2)
    expect(graph.layoutMode).toBe('cola')
    graph.setLayoutMode('dagre')
    expect(graph.layoutMode).toBe('dagre')
    expect(renderer.updateScene).toHaveBeenCalledWith(
      graph.cy,
      expect.objectContaining({ layoutMode: 'dagre' })
    )
  })
})

describe('redraw with layout opts', () => {
  it('passes layoutMode and all per-layout opts to updateScene', () => {
    const model = new GraphModel([{ group: 'nodes', data: { id: 'n0', label: 'N' } }])
    const renderer = {
      updateScene: vi.fn(),
      selectNode: vi.fn(),
      deselectNode: vi.fn(),
      selectEdge: vi.fn(),
      deselectEdge: vi.fn(),
      getNodeElement: vi.fn(() => null),
      resetCamera: vi.fn()
    }
    const graph = new DiagramGraph(
      { diagram: model, name: 'test', layoutMode: 'dagre', dagreOpts: { rankDir: 'LR' } },
      { emit: vi.fn() }
    )
    graph.renderer = renderer
    graph.redraw()
    expect(renderer.updateScene).toHaveBeenCalledWith(
      graph.cy,
      expect.objectContaining({
        layoutMode: 'dagre',
        dagreOpts: expect.objectContaining({ rankDir: 'LR' }),
        coseOpts: expect.any(Object),
        breadthfirstOpts: expect.any(Object),
        gridOpts: expect.any(Object),
        circleOpts: expect.any(Object),
        concentricOpts: expect.any(Object)
      })
    )
  })
})

describe('icon round-trip on nodes', () => {
  it('stores icon fields when addNode is called with icon data', () => {
    const { graph } = makeGraph(0)
    const id = graph.addNode({
      nodeLabel: 'Server',
      nodeShape: 'rectangle',
      iconSet: 'mdi',
      iconName: 'mdi-server',
      iconPosition: 'left',
      iconSize: 20,
      iconColor: '#ff0000'
    })
    const d = graph.getNodeData(id)
    expect(d.iconSet).toBe('mdi')
    expect(d.iconName).toBe('mdi-server')
    expect(d.iconPosition).toBe('left')
    expect(d.iconSize).toBe(20)
    expect(d.iconColor).toBe('#ff0000')
  })

  it('updates icon fields via updateNode', () => {
    const { graph } = makeGraph(1)
    graph.updateNode(
      {
        nodeLabel: 'Updated',
        iconSet: 'mdi',
        iconName: 'mdi-account',
        iconPosition: 'above',
        iconSize: null,
        iconColor: ''
      },
      'n0'
    )
    const d = graph.getNodeData('n0')
    expect(d.iconSet).toBe('mdi')
    expect(d.iconName).toBe('mdi-account')
    expect(d.iconPosition).toBe('above')
    expect(d.iconSize).toBeUndefined()
    expect(d.iconColor).toBeUndefined()
  })

  it('copies icon fields via copyNode', () => {
    const { graph } = makeGraph(1)
    graph.updateNode(
      { nodeLabel: 'Orig', iconSet: 'mdi', iconName: 'mdi-home', iconPosition: 'only' },
      'n0'
    )
    const srcData = graph.cy.getElementById('n0').data()
    const newId = graph.copyNode(srcData)
    const d = graph.getNodeData(newId)
    expect(d.iconSet).toBe('mdi')
    expect(d.iconName).toBe('mdi-home')
    expect(d.iconPosition).toBe('only')
  })

  it('clears icon when updateNode sends empty iconSet', () => {
    const { graph } = makeGraph(1)
    graph.updateNode(
      { nodeLabel: 'X', iconSet: 'mdi', iconName: 'mdi-account', iconPosition: 'left' },
      'n0'
    )
    graph.updateNode({ nodeLabel: 'X', iconSet: '', iconName: '', iconPosition: 'left' }, 'n0')
    const d = graph.getNodeData('n0')
    expect(d.iconSet).toBeUndefined()
    expect(d.iconName).toBeUndefined()
  })
})

describe('icon round-trip on edges', () => {
  it('stores icon fields when an edge is added', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
      { group: 'nodes', data: { id: 'b', label: 'B' } }
    ])
    const graph = new DiagramGraph({ diagram: model, name: 'test' }, { emit: vi.fn() })
    graph.renderer = { updateScene: vi.fn(), selectNode: vi.fn(), deselectNode: vi.fn() }
    graph.selectedNodes = [0, 1]
    graph.addEdge({
      edgeLabel: 'link',
      iconSet: 'material-symbols',
      iconName: 'bolt',
      iconPosition: 'only'
    })
    const edges = model.edges()
    expect(edges.length).toBe(1)
    const d = graph.getEdgeData(edges[0].id())
    expect(d.iconSet).toBe('material-symbols')
    expect(d.iconName).toBe('bolt')
    expect(d.iconPosition).toBe('only')
  })
})
