import Shortcuts from '@/helpers/Shortcuts.js'

// Resolves a graph-view keydown event to an action using the user's shortcut
// bindings. Returns an action descriptor or null when the event does not
// trigger any graph action. The caller (DiagramGraphView) owns state changes;
// this module owns "which action fired".
//
// Action descriptors:
//   { action: 'menu' | 'actionsMenu' | 'help' | 'toggleTheme' }
//   { action: 'addNode' }                      { action: 'addEdge' }
//   { action: 'edit', data, mode }             { action: 'delete' }
//   { action: 'copy' }                         { action: 'history' }
//   { action: 'share' }
//   { action: 'close' }                        { action: 'select' }
//   { action: 'selectNodes' }                  { action: 'selectEdges' }
//   { action: 'cycleCurveStyle' }
//   { action: 'nav', direction: 'j'|'k'|'h'|'l' }
//   { action: 'showHints' }

const NAV_DIRECTIONS = {
  navDown: 'j',
  navUp: 'k',
  navLeft: 'h',
  navRight: 'l'
}

export function resolveGraphKey(event, ctx) {
  const { modifier, edgeOrNode, focusedNodeId, focusedEdgeId } = ctx
  const S = Shortcuts

  if (S.matches(event, 'menu')) return { action: 'menu' }
  if (S.matches(event, 'actionsMenu')) return { action: 'actionsMenu' }
  if (S.matches(event, 'help')) return { action: 'help' }
  if (S.matches(event, 'toggleTheme')) return { action: 'toggleTheme' }
  if (S.matches(event, 'addNode')) return { action: 'addNode' }
  if (S.matches(event, 'addEdge')) return { action: 'addEdge' }

  if (S.matches(event, 'editElement')) {
    if (edgeOrNode === 'edges') {
      if (!focusedEdgeId || !modifier) return null
      return { action: 'edit', data: modifier.getEdgeData(focusedEdgeId), mode: 'Edit Edge' }
    }
    if (!focusedNodeId || !modifier) return null
    return { action: 'edit', data: modifier.getNodeData(focusedNodeId), mode: 'Edit Node' }
  }

  if (S.matches(event, 'deleteElement')) return { action: 'delete' }
  if (S.matches(event, 'copyNode')) return { action: 'copy' }
  if (S.matches(event, 'selectNodes')) return { action: 'selectNodes' }
  if (S.matches(event, 'selectEdges')) return { action: 'selectEdges' }
  if (S.matches(event, 'history')) return { action: 'history' }
  if (S.matches(event, 'share')) return { action: 'share' }
  if (S.matches(event, 'cycleCurveStyle')) return { action: 'cycleCurveStyle' }
  if (S.matches(event, 'shareSelection')) return { action: 'shareSelection' }
  if (S.matches(event, 'close')) return { action: 'close' }
  if (S.matches(event, 'select')) return { action: 'select' }
  if (S.matches(event, 'showHints')) return { action: 'showHints' }

  for (const [navId, direction] of Object.entries(NAV_DIRECTIONS)) {
    if (S.matches(event, navId)) return { action: 'nav', direction }
  }

  return null
}

export default { resolve: resolveGraphKey }
