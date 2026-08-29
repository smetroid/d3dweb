import { reactive } from 'vue'
import api from '@/services/api'

// The session JWT lives in an httpOnly cookie, so nothing here can read it.
// This store is the app's only source of identity: every "who am I" and "am I
// signed in" question reads it instead of decoding a token.
export const session = reactive({
  user: null, // {username, displayName, email, provider} or null
  loaded: false // true once the first loadSession() has settled
})

// loadSession asks the server who the cookie belongs to. A 401 is the normal
// signed-out answer, not a failure, so callers get null rather than a throw
// and the app falls back to LocalStorage mode exactly as it does when logged
// out today.
export async function loadSession() {
  try {
    const response = await api.me()
    session.user = response?.data?.user ?? null
  } catch {
    session.user = null
  } finally {
    session.loaded = true
  }
  return session.user
}

// setSession records a user we already have — after login, the server hands
// the account back in the response, so there is no need to re-fetch it.
export function setSession(user) {
  session.user = user ?? null
  session.loaded = true
}

export function clearSession() {
  session.user = null
}

export function isAuthenticated() {
  return session.user !== null
}
