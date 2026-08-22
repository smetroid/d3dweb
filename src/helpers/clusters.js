/**
 * Client-side cluster computation and merge helpers.
 *
 * computeCluster  — BFS over graphlib JSON for selection preview
 * mergeClusterInto — import a shared cluster into an existing diagram
 */

// ── computeCluster ────────────────────────────────────────────────────────────

/**
 * Compute a subgraph of `diagramJSON` rooted at `rootIds`.
 *
 * depth < 0  — whole connected component (undirected BFS)
 * depth === 0 — roots + all descendants (directed downward)
 * depth > 0  — N-hop undirected BFS
 *
 * Parent compound container nodes are always added without pulling siblings.
 *
 * @param {string} diagramJSON  Graphlib-serialised diagram
 * @param {string[]} rootIds    Starting node IDs
 * @param {number} depth        Traversal depth (-1 = full component)
 * @returns {{ options, nodes, edges }}
 */
export function computeCluster(diagramJSON, rootIds, depth = -1) {
  const g = JSON.parse(diagramJSON)
  const nodeMap = Object.fromEntries((g.nodes ?? []).map((n) => [n.v, n]))

  // Build adjacency lists.
  const undirected = {}
  const children = {}
  for (const e of g.edges ?? []) {
    ;(undirected[e.v] ??= []).push(e.w)
    ;(undirected[e.w] ??= []).push(e.v)
    ;(children[e.v] ??= []).push(e.w)
  }

  const visited = new Set()

  if (depth < 0) {
    // Whole connected component — undirected BFS.
    const queue = [...rootIds]
    rootIds.forEach((id) => visited.add(id))
    while (queue.length) {
      const cur = queue.shift()
      for (const nb of undirected[cur] ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb)
          queue.push(nb)
        }
      }
    }
  } else if (depth === 0) {
    // Roots + all descendants (directed).
    const queue = [...rootIds]
    rootIds.forEach((id) => visited.add(id))
    while (queue.length) {
      const cur = queue.shift()
      for (const ch of children[cur] ?? []) {
        if (!visited.has(ch)) {
          visited.add(ch)
          queue.push(ch)
        }
      }
    }
  } else {
    // N-hop undirected BFS.
    const queue = rootIds.map((id) => ({ id, hop: 0 }))
    rootIds.forEach((id) => visited.add(id))
    while (queue.length) {
      const { id: cur, hop } = queue.shift()
      if (hop >= depth) continue
      for (const nb of undirected[cur] ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb)
          queue.push({ id: nb, hop: hop + 1 })
        }
      }
    }
  }

  // Add ancestor container nodes without pulling in siblings.
  for (const id of [...visited]) {
    let cur = nodeMap[id]?.parent
    while (cur && !visited.has(cur)) {
      visited.add(cur)
      cur = nodeMap[cur]?.parent
    }
  }

  const nodes = [...visited].filter((id) => nodeMap[id]).map((id) => nodeMap[id])
  const edges = (g.edges ?? []).filter((e) => visited.has(e.v) && visited.has(e.w))

  return { options: g.options, nodes, edges }
}

// ── mergeClusterInto ─────────────────────────────────────────────────────────

/**
 * Merge `clusterJSON` into `currentJSON`, remapping any node IDs that already
 * exist in the current diagram to avoid collisions.
 *
 * @param {string} currentJSON  Graphlib JSON of the current diagram
 * @param {string} clusterJSON  Graphlib JSON of the imported cluster
 * @returns {string}            New graphlib JSON string with cluster merged in
 */
export function mergeClusterInto(currentJSON, clusterJSON) {
  const current = JSON.parse(currentJSON)
  const cluster = JSON.parse(clusterJSON)

  const existingIds = new Set((current.nodes ?? []).map((n) => n.v))

  // Build an ID remap for conflicting nodes.
  const idMap = {}
  for (const node of cluster.nodes ?? []) {
    if (existingIds.has(node.v)) {
      idMap[node.v] = uniqueId(node.v, existingIds)
    }
  }

  // Clone and remap cluster nodes.
  const remappedNodes = (cluster.nodes ?? []).map((n) => {
    const newId = idMap[n.v] ?? n.v
    existingIds.add(newId)
    const remapped = { ...n, v: newId }
    if (n.parent != null) {
      remapped.parent = idMap[n.parent] ?? n.parent
    }
    return remapped
  })

  // Remap edge endpoints.
  const remappedEdges = (cluster.edges ?? []).map((e) => ({
    ...e,
    v: idMap[e.v] ?? e.v,
    w: idMap[e.w] ?? e.w
  }))

  return JSON.stringify({
    options: current.options,
    nodes: [...(current.nodes ?? []), ...remappedNodes],
    edges: [...(current.edges ?? []), ...remappedEdges]
  })
}

/** Generate a unique ID by appending _2, _3, … until unused. */
function uniqueId(base, existingIds) {
  let n = 2
  let candidate = `${base}_${n}`
  while (existingIds.has(candidate)) {
    n++
    candidate = `${base}_${n}`
  }
  return candidate
}
