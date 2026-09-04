<template>
  <div class="auth-callback">
    <p v-if="pending" class="auth-callback__status">Signing you in…</p>
    <div v-else class="auth-callback__error">
      <p>{{ error }}</p>
      <a href="/">Try again</a>
    </div>
  </div>
</template>

<script>
import api from '@/services/api'
import { setSession, clearShareToken } from '@/services/session'

// Handles the OAuth redirect so no other view needs to know the flow exists.
// The provider sends the browser here with ?code&state; we hand both to the
// backend, which validates the state, exchanges the code, and sets the
// session cookie.
export default {
  name: 'AuthCallback',
  data() {
    return {
      pending: true,
      error: ''
    }
  },
  async mounted() {
    const { code, state, provider } = this.$route.query

    if (!code || !state || !provider) {
      this.fail('Could not sign you in — the provider did not complete the request.')
      return
    }

    try {
      const response = await api.socialCallback({ code, state, provider })
      setSession(response.data.user)
      // A leftover shareToken from an earlier share visit would otherwise
      // keep winning over this new session cookie on every request (see
      // api.js's Authorization header) and even lock the account out of
      // /auth/me — clear it now that a real session exists.
      clearShareToken()
      // App.vue's mounted() already ran during the full-page load onto this
      // route, before the session cookie existed, and router.replace() below
      // is a client-side nav that does not remount it. Without this emit the
      // shell never learns a user signed in: no username, no logout button,
      // no inbox count, until a manual reload. See Login.vue's login(),
      // which emits the same event on the local-login path.
      this.emitter.emit('authChanged')
      this.$router.replace('/')
    } catch {
      // The state is single-use and expires in ten minutes, so a stale or
      // replayed callback lands here. Retrying from the top is the fix.
      this.fail('Could not sign you in — the login attempt expired or was invalid.')
    }
  },
  methods: {
    fail(message) {
      this.error = message
      this.pending = false
    }
  }
}
</script>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.auth-callback__error {
  text-align: center;
}
</style>
