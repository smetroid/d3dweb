// The share JWT an anonymous recipient gets from a share link. It is NOT a
// session token: the session lives in an httpOnly cookie that nothing here can
// read. JoinView stores this one under `shareToken`.
//
// This module exists so api.js can ask which diagram a share token is bound to
// without importing session.js, which imports api.js — that cycle is why the
// decoding lives here rather than alongside isShareSession().
const STORAGE_KEY = 'shareToken'

// The share JWT's claims, or {} when there is none or it does not parse. The
// signature is not checked and cannot be: the signing key is the server's.
// Nothing here is a security decision — the API re-validates every token. This
// only decides which requests are worth attaching it to.
export function shareClaims() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(atob(raw.split('.')[1]))
  } catch {
    return {}
  }
}

// The raw token, but only when it really is a share JWT. A corrupt or
// unexpected value under this key must never go out as a Bearer credential.
function validShareToken() {
  if (shareClaims().iss !== 'd3d-share') return null
  return localStorage.getItem(STORAGE_KEY) || null
}

// The share token, only if it was minted for `dagId`.
//
// The binding matters as much as the route scoping. A signed-in owner holding
// a stale share token for diagram A who opens their own diagram B would have
// it attached to GET /dag/B — a share-accessible route — and the API's
// ShareResourceBinding would reject the request 403, because the token is
// bound to A. Their session cookie is right there in the same request, but the
// header is checked first, so it never gets read.
export function shareTokenForDag(dagId) {
  if (!dagId) return null
  const token = validShareToken()
  if (!token) return null
  return shareClaims().dag_id === String(dagId) ? token : null
}

// The share token for a share-accessible route that carries no diagram id —
// GET /menus is the only one. There is nothing to bind against, and an
// anonymous recipient has no session cookie, so the token is all they have.
export function shareTokenForUnboundRoute() {
  return validShareToken()
}
