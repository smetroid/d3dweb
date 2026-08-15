/**
 * GraphModel — the app's own graph data structure.
 *
 * Replaces the headless cytoscape instance that used to live in
 * d3dInfo.diagram. Nodes and edges are stored as plain, insertion-ordered
 * arrays; the model exposes a small cytoscape-shaped facade (nodes()/
 * edges()/getElementById()/position()/data()/…) so the Three.js renderer,
 * the edit forms and the 3-D layout code keep working unchanged.
 *
 * Node  record: { id, data: { id, label, shape, parent?, … }, x, y, width, height }
 * Edge  record: { id, source, target, data: { id, source, target, label, … } }
 */
import D3Util from '@/helpers/D3Util'

// CSS cards are min 80×36px; SCALE=2 maps CSS px → layout units. These are the
// sizes cola uses for overlap-avoidance.
export const CARD_W = 40 // 80px / SCALE
export const CARD_H = 18 // 36px / SCALE

// Optional styling fields whose empty value means "use the theme default". They
// are stored as undefined so cytoscape's bare [attr] selectors (which match any
// value that is not undefined) fall back to the theme instead of mapping an
// empty string onto a style property.
export const NODE_OPTIONAL_FIELDS = [
  'bgColor',
  'borderColor',
  'borderWidth',
  'fontSize',
  'iconSet',
  'iconName',
  'iconPosition',
  'iconSize',
  'iconColor'
]

export const EDGE_OPTIONAL_FIELDS = [
  'arrowheadStyle',
  'arrowhead',
  'sourceArrowhead',
  'edgeWidth',
  'edgeColor',
  'edgeLineStyle',
  'edgeCurve',
  'edgeOpacity',
  'iconSet',
  'iconName',
  'iconPosition',
  'iconSize',
  'iconColor'
]

export function normalizeOptionalFields(data, fields) {
  for (const key of fields) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      data[key] = undefined
    }
  }
  return data
}

const EMPTY = Object.freeze({
  empty() {
    return true
  },
  nonempty() {
    return false
  },
  remove() {
    return this
  },
  data() {
    return undefined
  },
  position() {
    return undefined
  },
  id() {
    return undefined
  },
  isParent() {
    return false
  },
  parent() {
    return new Collection([])
  },
  children() {
    return new Collection([])
  },
  move() {
    return this
  },
  source() {
    return undefined
  },
  target() {
    return undefined
  }
})

/**
 * Collection behaves like a cytoscape collection: array indexing, length,
 * map/filter/forEach, first() (returns a single-element collection),
 * id()/data()/position()/move() delegating to the first element.
 */
class Collection extends Array {
  constructor(items = []) {
    super()
    for (const item of items) this.push(item)
  }

  // .map()/.filter() on a Collection should return plain arrays, never
  // re-enter this constructor (which can't take a numeric length).
  static get [Symbol.species]() {
    return Array
  }

  first() {
    return this.length ? new Collection([this[0]]) : new Collection([])
  }

  toArray() {
    return Array.from(this)
  }

  empty() {
    return this.length === 0
  }

  nonempty() {
    return this.length > 0
  }

  id() {
    return this[0]?.id()
  }

  data(key) {
    return this[0]?.data(key)
  }

  position() {
    return this[0]?.position()
  }

  move(moveArgs) {
    this.forEach((item) => item?.move?.(moveArgs))
    return this
  }
}

class NodeFacade {
  constructor(model, node) {
    this._model = model
    this._node = node
  }

  id() {
    return this._node.id
  }

  data() {
    if (arguments.length === 0) return this._node.data
    if (typeof arguments[0] === 'object') {
      Object.assign(this._node.data, arguments[0])
      return this
    }
    return this._node.data[arguments[0]]
  }

  position() {
    if (arguments.length === 0) return { x: this._node.x, y: this._node.y }
    const p = arguments[0]
    this._node.x = p.x
    this._node.y = p.y
    return this
  }

  isParent() {
    return this._model._hasChildren(this._node.id)
  }

  children() {
    return this._model._childrenOf(this._node.id)
  }

  parent() {
    return this._model._parentOf(this._node.id)
  }

  move(moveArgs) {
    if (moveArgs && moveArgs.parent) this._node.data.parent = moveArgs.parent
    else delete this._node.data.parent
    return this
  }

  remove() {
    this._model.removeNode(this._node.id)
  }

  empty() {
    return false
  }

  nonempty() {
    return true
  }
}

class EdgeFacade {
  constructor(model, edge) {
    this._model = model
    this._edge = edge
  }

  id() {
    return this._edge.id
  }

  data() {
    if (arguments.length === 0) return this._edge.data
    if (typeof arguments[0] === 'object') {
      Object.assign(this._edge.data, arguments[0])
      return this
    }
    return this._edge.data[arguments[0]]
  }

  source() {
    return this._model._nodeFacadeById(this._edge.data.source)
  }

  target() {
    return this._model._nodeFacadeById(this._edge.data.target)
  }

  remove() {
    this._model.removeEdge(this._edge.id)
  }

  empty() {
    return false
  }

  nonempty() {
    return true
  }
}

export default class GraphModel {
  constructor(elements = []) {
    this._nodes = [] // node records (insertion order)
    this._edges = [] // edge records (insertion order)
    this._nodeIndex = new Map() // id → node record
    this._edgeIndex = new Map() // id → edge record

    for (const el of elements || []) this._addElement(el)
  }

  // ─── Element list / lookup (cytoscape-compatible facade) ────────────────────

  nodes() {
    return new Collection(this._nodes.map((node) => new NodeFacade(this, node)))
  }

  edges() {
    return new Collection(this._edges.map((edge) => new EdgeFacade(this, edge)))
  }

  getElementById(id) {
    if (this._nodeIndex.has(id)) return new NodeFacade(this, this._nodeIndex.get(id))
    if (this._edgeIndex.has(id)) return new EdgeFacade(this, this._edgeIndex.get(id))
    return EMPTY
  }

  _nodeFacadeById(id) {
    const node = this._nodeIndex.get(id)
    return node ? new NodeFacade(this, node) : EMPTY
  }

  _hasChildren(parentId) {
    return this._nodes.some((node) => node.data.parent === parentId)
  }

  _childrenOf(parentId) {
    return new Collection(
      this._nodes
        .filter((node) => node.data.parent === parentId)
        .map((node) => new NodeFacade(this, node))
    )
  }

  _parentOf(nodeId) {
    const node = this._nodeIndex.get(nodeId)
    if (!node || !node.data.parent) return new Collection([])
    const parent = this._nodeIndex.get(node.data.parent)
    return parent ? new Collection([new NodeFacade(this, parent)]) : new Collection([])
  }

  // ─── Mutation (used by DiagramGraph) ─────────────────────────────────────────

  _addElement(el) {
    if (el?.group === 'edges') {
      const data = { ...el.data }
      normalizeOptionalFields(data, EDGE_OPTIONAL_FIELDS)
      const edge = { id: data.id, source: data.source, target: data.target, data }
      this._edges.push(edge)
      this._edgeIndex.set(edge.id, edge)
    } else {
      const data = { id: el?.data?.id || D3Util.randomId(), ...el?.data }
      const x = typeof data._x === 'number' ? data._x : 0
      const y = typeof data._y === 'number' ? data._y : 0
      delete data._x
      delete data._y
      normalizeOptionalFields(data, NODE_OPTIONAL_FIELDS)
      const node = { id: data.id, data, x, y, width: CARD_W, height: CARD_H }
      this._nodes.push(node)
      this._nodeIndex.set(node.id, node)
    }
  }

  addNode(data) {
    const nodeData = {
      id: D3Util.randomId(),
      ...data
    }
    this._addElement({ group: 'nodes', data: nodeData })
    return nodeData.id
  }

  addEdge(data) {
    const edgeData = {
      id: D3Util.randomId(),
      source: data.source,
      target: data.target,
      ...data
    }
    this._addElement({ group: 'edges', data: edgeData })
    return edgeData.id
  }

  removeNode(id) {
    const node = this._nodeIndex.get(id)
    if (!node) return false
    this._nodeIndex.delete(id)
    this._nodes.splice(this._nodes.indexOf(node), 1)
    // cytoscape also removes every edge touching the removed node
    this._edges
      .filter((edge) => edge.source === id || edge.target === id)
      .forEach((edge) => this.removeEdge(edge.id))
    return true
  }

  removeEdge(id) {
    const edge = this._edgeIndex.get(id)
    if (!edge) return false
    this._edgeIndex.delete(id)
    this._edges.splice(this._edges.indexOf(edge), 1)
    return true
  }

  moveNode(id, parent) {
    const node = this._nodeIndex.get(id)
    if (!node) return
    if (parent) node.data.parent = parent
    else delete node.data.parent
  }

  setPosition(id, x, y) {
    const node = this._nodeIndex.get(id)
    if (!node) return
    node.x = x
    node.y = y
  }
}
