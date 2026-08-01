const MIGRATION_FLAG = 'd3d.legacyMigrated_v1'

const SHAPE_MAP = { rect: 'rectangle', circle: 'ellipse' }

const CLUSTER_POS_MAP = {
  top:         { textHalign: 'center', textValign: 'top' },
  bottom:      { textHalign: 'center', textValign: 'bottom' },
  topLeft:     { textHalign: 'left',   textValign: 'top' },
  topRight:    { textHalign: 'right',  textValign: 'top' },
  bottomLeft:  { textHalign: 'left',   textValign: 'bottom' },
  bottomRight: { textHalign: 'right',  textValign: 'bottom' },
}

const ARROWHEAD_MAP = { normal: 'triangle', undirected: 'none' }
const ARROW_STYLE_MAP = { solid: 'filled' }

function migrateNode(nodeValue) {
  if (!nodeValue) return

  if (nodeValue.shape && SHAPE_MAP[nodeValue.shape]) {
    nodeValue.shape = SHAPE_MAP[nodeValue.shape]
  }

  if (nodeValue.clusterLabelPos) {
    const mapped = CLUSTER_POS_MAP[nodeValue.clusterLabelPos]
    if (mapped) {
      nodeValue.textHalign = mapped.textHalign
      nodeValue.textValign = mapped.textValign
    }
    delete nodeValue.clusterLabelPos
  }

  delete nodeValue.labelType
}

function migrateEdge(edgeValue) {
  if (!edgeValue) return

  if (edgeValue.arrowhead && ARROWHEAD_MAP[edgeValue.arrowhead]) {
    edgeValue.arrowhead = ARROWHEAD_MAP[edgeValue.arrowhead]
  }

  if (edgeValue.arrowheadStyle && ARROW_STYLE_MAP[edgeValue.arrowheadStyle]) {
    edgeValue.arrowheadStyle = ARROW_STYLE_MAP[edgeValue.arrowheadStyle]
  }

  delete edgeValue.labelType
}

/**
 * Migrate a parsed graphlib JSON object in place.
 * Handles both graphlib format ({ nodes, edges, options }) and
 * cytoscape elements array format ([{ group, data }]).
 */
export function migrateDiagramPayload(parsed) {
  if (!parsed) return parsed

  if (Array.isArray(parsed)) {
    // Cytoscape elements array
    for (const el of parsed) {
      if (el.group === 'nodes') migrateNode(el.data)
      else if (el.group === 'edges') migrateEdge(el.data)
    }
  } else if (parsed.nodes) {
    // Graphlib format
    for (const node of parsed.nodes || []) migrateNode(node.value)
    for (const edge of parsed.edges || []) migrateEdge(edge.value)
    if (parsed.options) delete parsed.options.multigraph
  }

  return parsed
}

function migrateLocalStorageEntry(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const entry = JSON.parse(raw)
    if (!entry?.diagram) return

    const parsed = typeof entry.diagram === 'string'
      ? JSON.parse(entry.diagram)
      : entry.diagram

    migrateDiagramPayload(parsed)
    entry.diagram = JSON.stringify(parsed)
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (err) {
    console.warn(`legacyMigration: skipped "${key}"`, err)
  }
}

/**
 * Run once per browser — walks all D3D* and samus.lastUpdated localStorage
 * entries and migrates them to current field names.
 * Guarded by a flag so it never runs twice.
 */
export function runLegacyMigrationOnce() {
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && (k.startsWith('D3D') || k === 'samus.lastUpdated')) {
      keys.push(k)
    }
  }

  for (const k of keys) migrateLocalStorageEntry(k)

  // Also strip d3Line from the settings cookie if present
  try {
    const raw = document.cookie
      .split('; ')
      .find(r => r.startsWith('settings='))
    if (raw) {
      const settings = JSON.parse(decodeURIComponent(raw.split('=')[1]))
      if ('d3Line' in settings) {
        delete settings.d3Line
        document.cookie = `settings=${encodeURIComponent(JSON.stringify(settings))};path=/`
      }
    }
  } catch (_) { /* cookie not present or malformed — ignore */ }

  localStorage.setItem(MIGRATION_FLAG, '1')
  console.log('[legacyMigration] completed')
}
