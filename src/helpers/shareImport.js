// Imports a shared cluster as a new diagram, for every surface that offers a
// "New diagram" button: the share page, the catalog's preview dialog, and the
// catalog cards themselves.
//
// Stops short of navigating. The caller owns that — routing needs its own
// $router, and leaving it out keeps this testable without one.
import api from '@/services/api'
import { serverErrorMessage } from '@/helpers/apiErrors'
import { stashPendingCluster } from '@/helpers/pendingCluster'

// → { ok: true } | { ok: false, error }
export async function importShareAsDiagram(shareId) {
  let result
  try {
    result = await api.importElementShare(shareId)
  } catch (err) {
    console.error('[shareImport] importElementShare failed:', err)
    return { ok: false, error: serverErrorMessage(err, 'Import failed') }
  }

  // POST /element-shares/:id/import records the import and returns the cluster;
  // it does not create a diagram server-side, so there is no id to navigate to.
  const cluster = result?.cluster
  if (!cluster) return { ok: false, error: serverErrorMessage(result, 'Import failed') }

  if (!stashPendingCluster(cluster, 'new')) {
    return { ok: false, error: 'Could not open the cluster — session storage is unavailable.' }
  }

  return { ok: true }
}
