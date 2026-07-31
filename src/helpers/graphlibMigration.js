/**
 * Converts graphlib JSON format (dagre-d3) to Cytoscape elements array.
 * Handles both formats transparently so old saved diagrams load correctly.
 *
 * graphlib format:
 *   { options: {}, nodes: [{v, value, parent?}], edges: [{v, w, value}] }
 *
 * cytoscape format:
 *   [{group:'nodes', data:{id,...}}, {group:'edges', data:{id,source,target,...}}]
 */
export function graphlibToCytoscape(graphlibJson) {
  const elements = []
  let edgeCounter = 0

  for (const node of graphlibJson.nodes || []) {
    const data = { id: node.v, ...node.value }
    if (node.parent != null) {
      data.parent = node.parent
    }
    elements.push({ group: 'nodes', data })
  }

  for (const edge of graphlibJson.edges || []) {
    const id = edge.value?.id || `e_${edge.v}_${edge.w}_${edgeCounter++}`
    elements.push({
      group: 'edges',
      data: {
        id,
        source: edge.v,
        target: edge.w,
        ...edge.value
      }
    })
  }

  return elements
}

/**
 * Serializes a Cytoscape instance back to the graphlib JSON format
 * so existing server/localStorage payloads remain compatible.
 */
export function cytoscapeToGraphlib(cy) {
  const nodes = cy.nodes().map(n => {
    const value = { ...n.data() }
    const entry = { v: n.id(), value }
    delete entry.value.id
    if (entry.value.parent != null) {
      entry.parent = entry.value.parent
    }
    delete entry.value.parent
    return entry
  })

  const edges = cy.edges().map(e => {
    const value = { ...e.data() }
    const entry = { v: e.data('source'), w: e.data('target'), value }
    delete entry.value.source
    delete entry.value.target
    return entry
  })

  return {
    options: { directed: true, multigraph: false, compound: true },
    nodes,
    edges
  }
}

/**
 * Detects whether a parsed JSON object is graphlib format.
 * Cytoscape format is an array; graphlib format is an object with a `nodes` key.
 */
export function isGraphlibFormat(parsed) {
  return !!(parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.nodes))
}
