/**
 * Compute a subgraph cluster from a graphlib JSON diagram.
 *
 * depth < 0  → undirected connected component from rootIds
 * depth === 0 → directed descendants only (follow edges forward from rootIds)
 * depth > 0  → N-hop undirected BFS from rootIds
 *
 * Parent containers of included nodes are always added (without pulling siblings).
 */
export function computeCluster(diagramJSON, rootIds, depth = -1) {
  const { options, nodes, edges } = diagramJSON

  // Build lookup maps
  const nodeMap = new Map(nodes.map((n) => [n.v, n]))
  const fwd = new Map() // v → [w, ...]
  const bwd = new Map() // w → [v, ...]
  for (const n of nodes) {
    fwd.set(n.v, [])
    bwd.set(n.v, [])
  }
  for (const e of edges) {
    fwd.get(e.v)?.push(e.w)
    bwd.get(e.w)?.push(e.v)
  }

  const included = new Set()

  if (depth < 0) {
    // Undirected component BFS
    const queue = [...rootIds]
    for (const r of queue) included.add(r)
    while (queue.length) {
      const cur = queue.shift()
      const neighbours = [...(fwd.get(cur) ?? []), ...(bwd.get(cur) ?? [])]
      for (const nb of neighbours) {
        if (!included.has(nb)) {
          included.add(nb)
          queue.push(nb)
        }
      }
    }
  } else if (depth === 0) {
    // Directed descendants BFS (forward only)
    const queue = [...rootIds]
    for (const r of queue) included.add(r)
    while (queue.length) {
      const cur = queue.shift()
      for (const nb of fwd.get(cur) ?? []) {
        if (!included.has(nb)) {
          included.add(nb)
          queue.push(nb)
        }
      }
    }
  } else {
    // N-hop undirected BFS
    const dist = new Map(rootIds.map((r) => [r, 0]))
    const queue = [...rootIds]
    for (const r of rootIds) included.add(r)
    while (queue.length) {
      const cur = queue.shift()
      const d = dist.get(cur)
      if (d >= depth) continue
      const neighbours = [...(fwd.get(cur) ?? []), ...(bwd.get(cur) ?? [])]
      for (const nb of neighbours) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1)
          included.add(nb)
          queue.push(nb)
        }
      }
    }
  }

  // Add parent containers (ancestors) of included nodes without pulling siblings
  const toAdd = []
  for (const id of included) {
    let node = nodeMap.get(id)
    while (node?.parent && !included.has(node.parent)) {
      toAdd.push(node.parent)
      node = nodeMap.get(node.parent)
    }
  }
  for (const id of toAdd) included.add(id)

  // Build result nodes (preserving parent only if parent is also included)
  const resultNodes = []
  for (const id of included) {
    const n = nodeMap.get(id)
    if (!n) continue
    const entry = { v: n.v, value: n.value }
    if (n.parent && included.has(n.parent)) entry.parent = n.parent
    resultNodes.push(entry)
  }

  // Build result edges (both endpoints must be included)
  const resultEdges = edges.filter((e) => included.has(e.v) && included.has(e.w))

  return { options, nodes: resultNodes, edges: resultEdges }
}

/**
 * Merge clusterJSON into currentJSON.
 * Nodes with conflicting IDs are remapped to <id>_2, _3, … etc.
 * Edge endpoints and parent references are updated to match remapped IDs.
 */
export function mergeClusterInto(currentJSON, clusterJSON) {
  const existingIds = new Set(currentJSON.nodes.map((n) => n.v))

  // Build remap table for cluster nodes whose IDs conflict
  const remap = new Map()
  for (const n of clusterJSON.nodes) {
    if (existingIds.has(n.v)) {
      const newId = uniqueId(n.v, existingIds)
      remap.set(n.v, newId)
      existingIds.add(newId)
    }
  }

  const resolve = (id) => remap.get(id) ?? id

  // Cluster nodes with remapped IDs (skip nodes already present with same id and no remap)
  const clusterNodes = clusterJSON.nodes
    .filter((n) => remap.has(n.v) || !currentJSON.nodes.some((e) => e.v === n.v))
    .map((n) => {
      const entry = { v: resolve(n.v), value: n.value }
      if (n.parent) entry.parent = resolve(n.parent)
      return entry
    })

  const clusterEdges = clusterJSON.edges.map((e) => ({
    ...e,
    v: resolve(e.v),
    w: resolve(e.w)
  }))

  return {
    options: currentJSON.options,
    nodes: [...currentJSON.nodes, ...clusterNodes],
    edges: [...currentJSON.edges, ...clusterEdges]
  }
}

function uniqueId(base, existingIds) {
  let n = 2
  while (existingIds.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}
