/**
 * Converts the persisted graphlib JSON format to/from a GraphModel.
 * The wire format is unchanged from the old dagre-d3 app:
 *
 *   { options: { directed, compound, constraints? }, nodes: [{v, value, parent?}], edges: [{v, w, value}] }
 *
 * so old saved diagrams, the server and localStorage payloads all keep
 * working. Legacy cytoscape elements-array payloads are also accepted on load.
 */
import GraphModel from '@/helpers/GraphModel'

/**
 * Build a GraphModel from a graphlib JSON object.
 */
export function graphlibToModel(graphlibJson) {
  const elements = []
  for (const node of graphlibJson.nodes || []) {
    const data = { id: node.v, ...node.value }
    if (node.parent != null) {
      data.parent = node.parent
    }
    elements.push({ group: 'nodes', data })
  }
  for (const edge of graphlibJson.edges || []) {
    elements.push({
      group: 'edges',
      data: {
        id: edge.value?.id || `${edge.v}->${edge.w}`,
        source: edge.v,
        target: edge.w,
        ...edge.value
      }
    })
  }
  return new GraphModel(elements)
}

/**
 * Serialize a GraphModel back to the graphlib JSON format.
 * Carries cola constraints through in options.constraints.
 */
export function modelToGraphlib(model) {
  const nodes = model.nodes().map((n) => {
    const value = { ...n.data() }
    const pos = n.position()
    if (pos && (pos.x !== 0 || pos.y !== 0)) {
      value._x = pos.x
      value._y = pos.y
    }
    const entry = { v: n.id(), value }
    delete entry.value.id
    if (value.parent != null) {
      entry.parent = value.parent
    }
    delete entry.value.parent
    return entry
  })

  const edges = model.edges().map((e) => {
    const value = { ...e.data() }
    const entry = { v: e.data('source'), w: e.data('target'), value }
    delete entry.value.source
    delete entry.value.target
    return entry
  })

  const options = { directed: true, multigraph: false, compound: true }
  const constraints = model.colaConstraints
  if (Array.isArray(constraints) && constraints.length) {
    options.constraints = constraints
  }

  return { options, nodes, edges }
}

/**
 * Detects whether a parsed JSON object is graphlib format.
 * Cytoscape format is an array; graphlib format is an object with a `nodes` key.
 */
export function isGraphlibFormat(parsed) {
  return !!(
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    Array.isArray(parsed.nodes)
  )
}
