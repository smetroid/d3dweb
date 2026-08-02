/**
 * colaLayout — webcola integration.
 *
 * Builds a webcola configuration from the GraphModel (plain node/link arrays,
 * compound "groups" from parent links, optional user constraints) and runs the
 * layout synchronously, writing the resulting x/y back onto the model.
 */
import { Layout } from 'webcola'
import { CARD_W, CARD_H } from '@/helpers/GraphModel'

const DEFAULT_EDGE_LENGTH = 80
const DEFAULT_NODE_SPACING = 10

/**
 * Translate a colaOpts object + user constraint list into a webcola config.
 * Pure (no side effects) so it can be unit-tested without running the layout.
 */
export function buildColaConfig(model, colaOpts = {}, constraints = []) {
  const nodes = model.nodes().toArray()
  const idToIndex = new Map(nodes.map((n, i) => [n.id(), i]))

  const colaNodes = nodes.map((n, i) => {
    const pos = n.position() || { x: 0, y: 0 }
    return {
      index: i,
      id: n.id(),
      x: pos.x || 0,
      y: pos.y || 0,
      width: CARD_W,
      height: CARD_H,
    }
  })

  const links = []
  model.edges().forEach(edge => {
    const source = idToIndex.get(edge.data('source'))
    const target = idToIndex.get(edge.data('target'))
    // Self-loops and dangling endpoints are skipped — the renderer draws
    // self-loops independently of the layout.
    if (source === undefined || target === undefined || source === target) return
    links.push({ source, target, length: Number(colaOpts.edgeLength) || DEFAULT_EDGE_LENGTH })
  })

  const groups = buildGroups(model, colaOpts)
  const flow = colaOpts.flow
    ? { axis: colaOpts.flow, minSeparation: Number(colaOpts.nodeSpacing) || DEFAULT_NODE_SPACING }
    : null

  return {
    nodes: colaNodes,
    links,
    groups,
    flow,
    constraints: translateConstraints(constraints, idToIndex),
    avoidOverlaps: colaOpts.avoidOverlap !== false,
    iterations: iterationsFor(colaOpts.maxSimulationTime),
  }
}

/**
 * Run the layout synchronously and write positions back onto the model.
 * Returns the number of nodes laid out.
 */
export function runColaLayout(model, colaOpts = {}, constraints = []) {
  const config = buildColaConfig(model, colaOpts, constraints)
  if (config.nodes.length === 0) return 0

  const layout = new Layout()
  layout
    .nodes(config.nodes)
    .links(config.links)
    .avoidOverlaps(config.avoidOverlaps)
    .handleDisconnected(true)
    .size([0, 0])
  if (config.groups.length) layout.groups(config.groups)
  if (config.flow) layout.flowLayout(config.flow.axis, config.flow.minSeparation)
  if (config.constraints.length) layout.constraints(config.constraints)

  const { iterations } = config
  layout.start(iterations.initial, iterations.structural, iterations.all, iterations.gridSnap, false, true)

  config.nodes.forEach(node => {
    model.setPosition(node.id, node.x, node.y)
  })

  return config.nodes.length
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function buildGroups(model, colaOpts) {
  const nodes = model.nodes().toArray()
  const padding = Number(colaOpts.nodeSpacing) || DEFAULT_NODE_SPACING

  const parentIds = [...new Set(nodes.map(n => n.data('parent')).filter(Boolean))]
  if (parentIds.length === 0) return []

  const groups = parentIds.map(pid => ({ id: pid, padding, leaves: [], groups: [] }))
  const groupIndex = new Map(groups.map((g, i) => [g.id, i]))

  nodes.forEach((node, i) => {
    const parent = node.data('parent')
    if (!parent) return
    const group = groups[groupIndex.get(parent)]
    if (group) group.leaves.push(i)
  })

  // Nested groups: a parent node that is itself a child of another parent.
  groups.forEach(group => {
    const parentNode = nodes.find(n => n.id() === group.id)
    const grandparent = parentNode?.data('parent')
    const container = grandparent ? groups[groupIndex.get(grandparent)] : null
    if (container) container.groups.push(groupIndex.get(group.id))
  })

  return groups
}

/**
 * Map user-facing constraints onto webcola's DSL. Node references may be ids
 * (strings) or node-array indices (numbers).
 *
 * Supported shapes (webcola v3.4.0):
 *   { type: 'alignment', axis: 'x' | 'y', offsets: [{ node, offset }, …] }
 *   { axis: 'x' | 'y', left, right, gap }   (separation; type optional)
 */
export function translateConstraints(constraints, idToIndex) {
  if (!Array.isArray(constraints)) return []
  const resolve = ref => (typeof ref === 'string' ? idToIndex.get(ref) : ref)

  return constraints
    .map(constraint => {
      if (!constraint || typeof constraint !== 'object') return constraint
      const out = { ...constraint }

      if (constraint.type === 'alignment' && Array.isArray(constraint.offsets)) {
        out.offsets = constraint.offsets.map(offset => ({
          ...offset,
          node: resolve(offset.node),
        }))
      }

      if (constraint.left !== undefined && constraint.right !== undefined) {
        out.left = resolve(constraint.left)
        out.right = resolve(constraint.right)
      }

      return out
    })
    .filter(constraint => {
      // Drop constraints whose referenced nodes no longer exist
      if (constraint?.type === 'alignment' && Array.isArray(constraint.offsets)) {
        return constraint.offsets.every(o => o.node !== undefined)
      }
      if (constraint && (constraint.left !== undefined || constraint.right !== undefined)) {
        return constraint.left !== undefined && constraint.right !== undefined
      }
      return true
    })
}

export function iterationsFor(maxSimulationTime) {
  // Total synchronous iteration budget grows with the (optional) time budget.
  // Keep the layout snappy even for large graphs; results converge in-place.
  const ms = Number(maxSimulationTime) || 1500
  const total = Math.min(Math.max(Math.round(ms / 25), 20), 400)
  return {
    initial:  Math.round(total * 0.25),   // unconstrained — let the graph untangle
    structural: Math.round(total * 0.35),  // structural (user) constraints
    all:      total - Math.round(total * 0.6), // all constraints incl. overlap
    gridSnap: 0,
  }
}
