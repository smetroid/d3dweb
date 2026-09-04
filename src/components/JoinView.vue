<template>
  <div class="join-screen">
    <router-link to="/" class="join-back" data-testid="join-back">← Back to app</router-link>
    <div class="join-card">
      <div v-if="error" class="join-error">
        <p class="join-error-msg">{{ error }}</p>
      </div>
      <div v-else class="join-loading">Opening shared diagram…</div>
    </div>
  </div>
</template>

<script>
import api from '@/services/api'
import { serverErrorMessage } from '@/helpers/apiErrors'

export default {
  name: 'JoinView',
  data() {
    return { error: null }
  },
  async mounted() {
    const token = this.$route.params.token
    if (!token) {
      this.error = 'Invalid share link.'
      return
    }

    let data = null
    try {
      data = await api.exchangeShare(token)
    } catch (err) {
      console.error('share exchange failed', err)
      this.error = serverErrorMessage(err, 'Could not reach the server. Please try again later.')
      return
    }
    if (!data || data.status !== 'ok') {
      this.error = serverErrorMessage(data, 'Invalid, expired, or revoked share link.')
      return
    }

    // The share token is not a session token. The session lives in an httpOnly
    // cookie; keeping this under 'token' made the two indistinguishable.
    localStorage.setItem('shareToken', token)
    if (data.anonName) localStorage.setItem('d3d_anon_name', data.anonName)
    this.$cookies.set('LastLocallySavedItemId', data.dagId)
    window.location.href = '/'
  }
}
</script>

<style scoped>
.join-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-background, 255 255 255));
}

.join-card {
  padding: 32px 40px;
  border-radius: 12px;
  background: rgba(var(--fx-glass-bottom, 255 255 255), 0.9);
  border: 1px solid rgba(128, 128, 128, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  text-align: center;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.join-loading {
  font-size: 14px;
  color: #888;
}

.join-error-msg {
  font-size: 14px;
  color: #ef5350;
  margin-bottom: 16px;
}

.join-back {
  position: fixed;
  top: 20px;
  left: 24px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: inherit;
  opacity: 0.6;
  text-decoration: none;
  transition: opacity 0.12s;
}

.join-back:hover {
  opacity: 1;
}
</style>
