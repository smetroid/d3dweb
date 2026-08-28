// Thumbnails for shared clusters, drawn by one offscreen renderer.
//
// The catalog and the inbox both list shares by the dozen. Giving every row its
// own live cytoscape instance would mean a canvas per row, so instead a single
// hidden renderer draws each share in turn and hands back a PNG data URI. Rows
// hold an <img>; only one cytoscape instance exists at a time.
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer'
import { drawCluster } from '@/helpers/clusterRender'

const THUMB_W = 320
const THUMB_H = 200

let host = null
let renderer = null
const cache = new Map() // share id → data URI
const inFlight = new Map() // share id → Promise
let queue = Promise.resolve()

function ensureRenderer() {
  if (renderer) return renderer

  host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  // Parked offscreen rather than display:none — a hidden element has no size,
  // and cytoscape would snapshot a blank canvas.
  host.style.cssText = `position:absolute;left:-9999px;top:0;width:${THUMB_W}px;height:${THUMB_H}px;pointer-events:none;`
  document.body.appendChild(host)

  // No emitter: nothing should hear this renderer's node-click or scene-updated.
  renderer = new CytoscapeRenderer(host, null)
  renderer.init()
  return renderer
}

// Resolves to a data URI, or null when the scene could not be exported. Repeat
// requests for a share are served from cache, and simultaneous ones share a
// single render.
export function renderThumbnail(key, cluster) {
  if (cache.has(key)) return Promise.resolve(cache.get(key))
  if (inFlight.has(key)) return inFlight.get(key)

  // One renderer means renders cannot overlap: a second scene drawn mid-flight
  // would land in the first share's snapshot.
  const job = queue.then(async () => {
    const target = ensureRenderer()
    await drawCluster(target, cluster)
    const uri = target.toPNG({ maxWidth: THUMB_W, maxHeight: THUMB_H })
    if (uri) cache.set(key, uri)
    return uri ?? null
  })

  // The queue has to survive a failed render, or one broken share would strand
  // every thumbnail queued behind it.
  queue = job.then(
    () => {},
    () => {}
  )

  const tracked = job.finally(() => inFlight.delete(key))
  inFlight.set(key, tracked)
  return tracked
}

// Drops the cache and the offscreen renderer. For tests, and for anywhere the
// app wants the memory back.
export function resetThumbnails() {
  cache.clear()
  inFlight.clear()
  queue = Promise.resolve()
  renderer?.teardown()
  renderer = null
  host?.remove()
  host = null
}
