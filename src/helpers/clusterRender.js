// Draws a shared cluster into a CytoscapeRenderer. Shared by the preview
// (ClusterGraphPreview) and the thumbnail renderer (shareThumbnails), so the
// rule for honouring an author's saved layout lives in exactly one place.
import { graphlibToModel } from '@/helpers/graphlibMigration'

// GraphModel parks a node at the origin when the share carries no _x/_y for it.
// One placed node is enough to treat the cluster as laid out — a diagram whose
// author never moved anything has them all at 0,0.
function hasSavedPositions(model) {
  return model.nodes().some((n) => {
    const p = n.position()
    return p && (p.x !== 0 || p.y !== 0)
  })
}

// Resolves once the scene has settled, so a caller can safely snapshot it.
// Safe to call against a torn-down renderer: updateScene and fitToContent both
// bail when cy is gone.
export function drawCluster(renderer, cluster) {
  const model = graphlibToModel(cluster)

  if (hasSavedPositions(model)) {
    // Draw the diagram the way its author arranged it — {layout: false}
    // applies the stored positions and skips the layout pass entirely.
    renderer.updateScene(model, { layout: false })
    renderer.fitToContent()
    return Promise.resolve(model)
  }

  // Never positioned (or saved before positions were stored): every node sits
  // at the origin, so a layout has to place them. No animation — nobody saw the
  // starting arrangement to be animated away from.
  return Promise.resolve(renderer.updateScene(model, { animate: false })).then(() => {
    renderer.fitToContent()
    return model
  })
}
