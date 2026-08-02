import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import fcose from 'cytoscape-fcose'
import cola from 'cytoscape-cola'
import D3Util from '@/helpers/D3Util'
import VueCookies from 'vue-cookies'
import { cytoscapeToGraphlib } from '@/helpers/graphlibMigration'
import { buildStyle } from '@/helpers/cytoscapeStyle'

cytoscape.use(dagre)
cytoscape.use(fcose)
cytoscape.use(cola)

export default class CytoscapeGraph {
  constructor(d3dInfo, emitter) {
    this.d3dInfo = d3dInfo
    this.emitter = emitter
    this.cy = d3dInfo.diagram          // cytoscape instance (headless; mounted by CytoscapeGraphView)
    this.diagram = d3dInfo.diagram     // alias kept for backward compat
    this.cy.style(buildStyle())        // native DOM-renderer stylesheet
    this.selectedNodes = []
    this.doubleSelection = []
    this.selectedEdges = []
    this.focusedIndex = null

    // Layout options — read/written by DiagramForm
    const settings = VueCookies.get('settings') || D3Util.appDefaults()
    this.layoutMode = d3dInfo.layoutMode || settings.defaultLayoutMode || 'dagre'  // 'dagre' | 'fcose' | 'cola'
    this.dagreOpts = Object.assign({
      rankdir: settings.defaultRankDir || 'TB',
      ranksep: settings.defaultRankSep !== undefined ? Number(settings.defaultRankSep) : 100,
      nodesep: settings.defaultNodeSep !== undefined ? Number(settings.defaultNodeSep) : 80,
      ranker:  settings.defaultRanker || 'network-simplex',
    }, d3dInfo.dagreOpts)
    this.fcoseOpts = Object.assign({
      idealEdgeLength: settings.defaultFcoseIdealEdgeLength !== undefined ? Number(settings.defaultFcoseIdealEdgeLength) : 50,
      nodeRepulsion:   settings.defaultFcoseNodeRepulsion !== undefined ? Number(settings.defaultFcoseNodeRepulsion) : 4500,
      gravity:         settings.defaultFcoseGravity !== undefined ? Number(settings.defaultFcoseGravity) : 0.25,
      numIter:         settings.defaultFcoseNumIter !== undefined ? Number(settings.defaultFcoseNumIter) : 2500,
    }, d3dInfo.fcoseOpts)
    this.colaOpts  = Object.assign({
      edgeLength:        settings.defaultColaEdgeLength !== undefined ? Number(settings.defaultColaEdgeLength) : 80,
      nodeSpacing:       settings.defaultColaNodeSpacing !== undefined ? Number(settings.defaultColaNodeSpacing) : 10,
      flow:              settings.defaultColaFlow !== undefined ? settings.defaultColaFlow : null,
      avoidOverlap:      settings.defaultColaAvoidOverlap !== undefined ? Boolean(settings.defaultColaAvoidOverlap) : true,
      maxSimulationTime: settings.defaultColaMaxSimulationTime !== undefined ? Number(settings.defaultColaMaxSimulationTime) : 1500,
    }, d3dInfo.colaOpts)

    // Keep legacy aliases so existing save/load code still works
    this.rankdir = this.dagreOpts.rankdir
    this.ranksep = this.dagreOpts.ranksep
    this.nodesep = this.dagreOpts.nodesep
  }

  // ─── Convenience counts (replaces diagram.nodeCount() / edgeCount()) ─────────

  nodeCount() {
    return this.cy.nodes().length
  }

  edgeCount() {
    return this.cy.edges().length
  }

  // ─── Node CRUD ────────────────────────────────────────────────────────────────

  addNode(data) {
    const id = D3Util.randomId()
    const nodeData = {
      id,
      label:       data.nodeLabel  || 'Node',
      shape:       data.nodeShape  || 'rectangle',
      textHalign:  data.textHalign || 'center',
      textValign:  data.textValign || 'top',
      style:       data.style,
    }
    if (data.parentNode) {
      nodeData.parent = data.parentNode
    }
    this.cy.add({ group: 'nodes', data: nodeData })
    this.redraw()
    return id
  }

  updateNode(data, id) {
    console.log('[CytoscapeGraph] updateNode called', { id, nodeLabel: data.nodeLabel, shape: data.nodeShape, data })
    const node = this.cy.getElementById(id)
    if (node.empty()) {
      console.warn('[CytoscapeGraph] updateNode target node was empty/not found', id)
      return
    }

    node.data({
      label:      data.nodeLabel,
      shape:      data.nodeShape,
      textHalign: data.textHalign || 'center',
      textValign: data.textValign || 'top',
      style:      data.style,
    })

    if (data.parentNode) {
      node.move({ parent: data.parentNode })
    } else {
      const currentParent = node.data('parent')
      if (currentParent) {
        node.move({ parent: null })
      }
    }
    this.redraw()
  }

  _detachChildren(node) {
    if (node.isParent()) {
      node.children().move({ parent: null })
    }
  }

  deleteNode(id) {
    try {
      const node = this.cy.getElementById(id)
      if (node.empty()) return false
      this._detachChildren(node)
      node.remove()
      this.redraw()
      return true
    } catch (err) {
      console.error('deleteNode failed', err)
      return false
    }
  }

  deleteNodes(nodeIndices) {
    nodeIndices.forEach(index => {
      const id = this.getNodeId(index)
      if (id) {
        const node = this.cy.getElementById(id)
        this._detachChildren(node)
        node.remove()
      }
    })
    this.redraw()
    return []
  }

  copyNode(data, parentId) {
    const copy = {
      nodeLabel:  data.label,
      nodeShape:  data.shape,
      textHalign: data.textHalign || 'center',
      textValign: data.textValign || 'top',
      style:      data.style,
    }
    if (parentId) copy.parentNode = parentId
    return this.addNode(copy)
  }

  createCopyV2(id) {
    const node = this.cy.getElementById(id)
    const newId = this.copyNode(node.data())
    node.children().forEach(child => this.createCopy(child.id(), newId))
  }

  createCopy(id, parentId) {
    const node = this.cy.getElementById(id)
    const newId = this.copyNode(node.data(), parentId)
    node.children().forEach(child => this.createCopy(child.id(), newId))
  }

  getChildren(id) {
    return this.cy.getElementById(id).children().map(n => n.id())
  }

  getParent(id) {
    return this.cy.getElementById(id).parent().id()
  }

  // ─── Edge CRUD ────────────────────────────────────────────────────────────────

  addEdge(data) {
    const nodeIds = this.cy.nodes().map(n => n.id())
    const label = data.edgeLabel || ' '

    if (this.doubleSelection.length === 0) {
      const source = nodeIds[this.selectedNodes[0]]
      const target = nodeIds[this.selectedNodes[1]]
      if (source && target) {
        this._addEdgeElement(source, target, data, label)
      }
    } else {
      const headId = nodeIds[this.doubleSelection[0]]
      this.selectedNodes.forEach(nodeIndex => {
        const targetId = nodeIds[nodeIndex]
        if (headId && targetId) {
          this._addEdgeElement(headId, targetId, data, label)
        }
      })
    }
    this.selectedNodes = []
    this.redraw()
  }

  _addEdgeElement(source, target, data, label) {
    this.cy.add({
      group: 'edges',
      data: {
        id:             D3Util.randomId(),
        source,
        target,
        label,
        arrowheadStyle: data.edgeArrowHeadStyle,
        arrowhead:      data.edgeArrowHead,
      }
    })
  }

  updateEdge(data, id) {
    const edge = this.cy.getElementById(id)
    if (!edge.empty()) {
      edge.data({
        label:          data.edgeLabel || ' ',
        arrowheadStyle: data.edgeArrowHeadStyle,
        arrowhead:      data.edgeArrowHead,
      })
    }
    this.selectedNodes = []
    this.redraw()
  }

  deleteEdge(id) {
    // Accepts string edge ID or legacy {v, w} object
    const edge = this._resolveEdge(id)
    if (edge && !edge.empty()) {
      edge.remove()
      this.redraw()
    }
  }

  deleteEdges(edgeIndices) {
    edgeIndices.forEach(index => {
      const id = this.getEdgeId(index)
      if (id) this.cy.getElementById(id).remove()
    })
    this.selectedEdges = []
    this.redraw()
  }

  _resolveEdge(id) {
    if (!id) return null
    if (typeof id === 'string') return this.cy.getElementById(id)
    if (id.v && id.w) {
      return this.cy.edges(`[source = "${id.v}"][target = "${id.w}"]`).first()
    }
    return null
  }

  // ─── Data accessors ───────────────────────────────────────────────────────────

  getNodeData(id) {
    if (!id) return null
    const node = this.cy.getElementById(id)
    if (!node || node.empty()) return null
    const data = node.data()
    const SHAPE_ALIASES = { rect: 'rectangle', circle: 'ellipse' }
    const shape = SHAPE_ALIASES[data.shape] || data.shape
    return {
      ...data,
      nodeLabel:  data.label,
      nodeShape:  shape,
      textHalign: data.textHalign || 'center',
      textValign: data.textValign || 'top',
      id,
    }
  }

  getEdgeData(id) {
    const edge = this._resolveEdge(id)
    if (!edge || edge.empty()) return null
    const data = edge.data()
    return {
      ...data,
      edgeLabel:          data.label,
      edgeArrowHeadStyle: data.arrowheadStyle,
      edgeArrowHead:      data.arrowhead,
      id:                 edge.id(),
    }
  }

  // ─── Index-based accessors (j/k navigation) ──────────────────────────────────

  getNodeId(index) {
    const nodes = this.cy.nodes()
    return (index >= 0 && index < nodes.length) ? nodes[index].id() : null
  }

  getEdgeId(index) {
    const edges = this.cy.edges()
    return (index >= 0 && index < edges.length) ? edges[index].id() : null
  }

  // Returns the cytoscape node element (the DOM renderer draws to canvas,
  // so there is no per-node HTML element anymore).
  getNode(index) {
    const nodes = this.cy.nodes()
    return (index >= 0 && index < nodes.length) ? nodes[index] : null
  }

  getNodeById(id) {
    if (!id) return null
    const node = this.cy.getElementById(id)
    return node.empty() ? null : node
  }

  getEdge() {
    return null
  }

  getEdgeById() {
    return null
  }

  // ─── Visual selection (drives the Cytoscape stylesheet classes) ───────────────

  selectNode(index) {
    const id = this.getNodeId(index)
    if (id) this.cy.getElementById(id).addClass('selected')
    return id
  }

  removeSelection(index) {
    const id = this.getNodeId(index)
    if (id) this.cy.getElementById(id).removeClass('selected')
  }

  removeNodeSelectionById(id) {
    if (id) this.cy.getElementById(id).removeClass('selected active_node d_active_node')
  }

  selectEdge(index) {
    const id = this.getEdgeId(index)
    if (id) this.cy.getElementById(id).addClass('selected')
    return id
  }

  removeEdgeSelection(index) {
    const id = this.getEdgeId(index)
    if (id) this.cy.getElementById(id).removeClass('selected')
  }

  removeEdgeSelectionById(id) {
    const resolved = typeof id === 'string' ? this.cy.getElementById(id) : this._resolveEdge(id)
    if (resolved && !resolved.empty()) resolved.removeClass('selected')
  }

  // ─── Layout & render ──────────────────────────────────────────────────────────

  redraw(options = {}) {
    if (options.pan) {
      this._pan(options.pan)
      return
    }
    if (options.zoom) {
      this._zoom(options.zoom)
      return
    }

    this._runLayout()
    this.emitter?.emit('scene-updated', { count: this.nodeCount() })
    this._saveTempDiagram()
  }

  // ─── Camera / viewport (drives the Cytoscape viewport) ───────────────────────

  _pan(direction) {
    const delta = 80
    const pans = {
      Down:  { x: 0,      y: -delta },
      Up:    { x: 0,      y:  delta },
      Left:  { x:  delta, y: 0 },
      Right: { x: -delta, y: 0 },
    }
    const pan = pans[direction]
    if (pan) this.cy.panBy(pan)
  }

  _zoom(direction) {
    const factor = direction === 'In' ? 1.43 : 0.7
    this.cy.zoom(Math.min(Math.max(this.cy.zoom() * factor, 0.1), 10))
  }

  // Fit + centre the whole graph in the viewport
  fitGraph() {
    this.cy.fit(undefined, 40)
    this.cy.center()
  }

  // id: node id (string), edge id (string) or legacy {v, w} edge object
  zoomTo(id) {
    if (!id) return
    let eles = null
    if (typeof id === 'string') {
      const el = this.cy.getElementById(id)
      if (!el.empty()) eles = el
    } else if (id.v && id.w) {
      eles = this.cy.edges(`[source = "${id.v}"][target = "${id.w}"]`)
    }
    if (!eles || eles.empty()) return
    this.cy.animate({ fit: { eles, padding: 80 }, duration: 500, easing: 'ease-out' })
  }

  // Re-apply the theme-derived stylesheet (e.g. after light/dark toggle)
  refreshStyle() {
    this.cy.style(buildStyle())
  }

  _runLayout() {
    let name = this.layoutMode === 'fcose' ? 'fcose'
             : this.layoutMode === 'cola'  ? 'cola'
             : 'dagre'

    // cytoscape-dagre supports compound (parent-child) graphs natively.
    // Node sizes come from the stylesheet (see cytoscapeStyle.js), which the
    // layouts read so nodes space out to avoid card overlap.

    let layoutOptions
    if (name === 'dagre') {
      const o = this.dagreOpts
      layoutOptions = {
        name,
        animate: false,
        rankDir:  o.rankdir,
        rankSep:  Number(o.ranksep),
        nodeSep:  Number(o.nodesep),
        ranker:   o.ranker || 'network-simplex',
      }
    } else if (name === 'fcose') {
      const o = this.fcoseOpts
      layoutOptions = {
        name,
        animate: false,
        randomize:      false,
        idealEdgeLength: Number(o.idealEdgeLength),
        nodeRepulsion:   Number(o.nodeRepulsion),
        gravity:         Number(o.gravity),
        numIter:         Number(o.numIter),
      }
    } else {
      const o = this.colaOpts
      layoutOptions = {
        name,
        animate:           false,
        edgeLengthVal:     Number(o.edgeLength),
        nodeSpacing:       Number(o.nodeSpacing),
        avoidOverlap:      o.avoidOverlap,
        maxSimulationTime: Number(o.maxSimulationTime),
        ...(o.flow ? { flow: { axis: o.flow, minSeparation: Number(o.nodeSpacing) } } : {}),
      }
    }

    try {
      this.cy.layout(layoutOptions).run()
    } catch (err) {
      console.error('Layout failed, falling back to preset', err)
      this.cy.layout({ name: 'preset' }).run()
    }
  }

  _saveTempDiagram() {
    try {
      const json = cytoscapeToGraphlib(this.cy)
      const created = new Date()
      const updatedData = {
        created:     created.toISOString(),
        updated:     created.toISOString(),
        name:        this.d3dInfo.name        || D3Util.tempInfo().name,
        description: this.d3dInfo.description || D3Util.tempInfo().description,
        diagram:     JSON.stringify(json),
      }
      localStorage.setItem('samus.lastUpdated', JSON.stringify(updatedData))
    } catch (err) {
      console.error('saveTempDiagram failed', err)
    }
  }

  // ─── Misc helpers (kept for backward compat) ─────────────────────────────────

  arrayRemove(arr, value) {
    return arr.filter(el => el !== value)
  }

  clearCluster() {
    // No-op: Cytoscape handles compound nodes without DOM hacks
  }

  listEdges() {
    this.cy.edges().forEach(e => console.log(e.id(), e.data()))
  }

  reset() {
    this.fitGraph()
  }
}
