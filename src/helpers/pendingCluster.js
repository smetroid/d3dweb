// Handoff for a cluster that has to be applied by the editor.
//
// /catalog and /element-share/:token render *instead of* the editor (see
// FULLSCREEN_ROUTES), so their "New diagram" and "Merge here" buttons have no
// diagram to act on. They park the cluster here and navigate back to "/", where
// App.vue picks it up and applies it. sessionStorage rather than an in-memory
// handoff so a full page load on the way back still works.
const KEY = 'd3d_pending_cluster'

// mode: 'new' opens the cluster as a fresh diagram, 'merge' folds it into
// whatever diagram the app currently has open.
export function stashPendingCluster(cluster, mode) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ mode, cluster }))
    return true
  } catch {
    // Private mode or a quota wall — the caller stays put and reports failure
    // rather than navigating to an app that has nothing to apply.
    return false
  }
}

// Reading consumes: a handoff applies once, and a stale cluster must not
// clobber the diagram on some later visit to the app.
export function takePendingCluster() {
  let raw = null
  try {
    raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.cluster) return null
    return { mode: parsed.mode === 'merge' ? 'merge' : 'new', cluster: parsed.cluster }
  } catch {
    return null
  }
}
