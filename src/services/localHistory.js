/**
 * Browser-local diagram history.
 *
 * Keeps a capped list of snapshots per diagram in localStorage so the History
 * panel can revert to earlier states without the RethinkDB-backed server.
 * Snapshots are the same graphlib JSON the server/local entries store, so a
 * restored snapshot can be fed straight through the normal load path.
 */

const PREFIX = 'd3d.history.'
const UNSAVED_KEY = 'unsaved'
const MAX_SNAPSHOTS = 50
const MIN_SNAPSHOT_GAP_MS = 3000

function historyKey(diagramId) {
  return PREFIX + (diagramId || UNSAVED_KEY)
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('localHistory read failed', err)
    return []
  }
}

function write(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch (err) {
    // Quota exceeded — drop the oldest snapshot and retry once.
    if (list.length > 1) {
      list.shift()
      try {
        localStorage.setItem(key, JSON.stringify(list))
        return
      } catch (e) {
        /* still too big — give up quietly */
      }
    }
    console.error('localHistory write failed', err)
  }
}

function snapshotId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

/**
 * Append a snapshot for the diagram. Returns the new snapshot count, or 0 when
 * the snapshot was skipped (identical to the last one, or within the min gap).
 */
export function pushSnapshot(diagramId, { name, description, diagram, savedBy } = {}) {
  const key = historyKey(diagramId)
  const list = read(key)

  const last = list[list.length - 1]
  if (last) {
    if (last.diagram === diagram) return 0
    const gap = Date.now() - new Date(last.savedAt).getTime()
    if (gap < MIN_SNAPSHOT_GAP_MS) return 0
  }

  const entry = {
    id: snapshotId(),
    savedAt: new Date().toISOString(),
    name,
    description,
    savedBy,
    diagram
  }
  list.push(entry)
  while (list.length > MAX_SNAPSHOTS) list.shift()
  write(key, list)
  return list.length
}

/** Snapshot list for the panel — heavy diagram payloads stripped. */
export function getHistory(diagramId) {
  return read(historyKey(diagramId)).map((e) => {
    const meta = { ...e }
    delete meta.diagram
    return meta
  })
}

/** Full snapshot (including diagram JSON) for restore, or null. */
export function getSnapshot(diagramId, snapshotId) {
  const entry = read(historyKey(diagramId)).find((e) => e.id === snapshotId)
  return entry || null
}

export function clearHistory(diagramId) {
  try {
    localStorage.removeItem(historyKey(diagramId))
  } catch (err) {
    console.error('localHistory clear failed', err)
  }
}

export function historyKeyFor(diagramId) {
  return historyKey(diagramId)
}
