<template>
  <div class="join-screen">
    <div class="join-card">
      <div v-if="error" class="join-error">
        <p class="join-error-msg">{{ error }}</p>
        <a href="/" class="join-home-link">Go to home</a>
      </div>
      <div v-else class="join-loading">Opening shared diagram…</div>
    </div>
  </div>
</template>

<script>
function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export default {
  name: 'JoinView',
  data() {
    return { error: null }
  },
  mounted() {
    const token = this.$route.params.token
    if (!token) {
      this.error = 'Invalid share link.'
      return
    }

    const claims = decodeJwt(token)
    if (!claims || claims.iss !== 'd3d-share') {
      this.error = 'This link is not a valid share link.'
      return
    }

    const dagId = claims.dag_id
    if (!dagId) {
      this.error = 'Share link is missing diagram information.'
      return
    }

    const exp = claims.exp ? claims.exp * 1000 : null
    if (exp && Date.now() > exp) {
      this.error = 'This share link has expired.'
      return
    }

    // Store share token and target diagram, then redirect to the main app.
    localStorage.setItem('token', token)
    this.$cookies.set('LastLocallySavedItemId', dagId)
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

.join-home-link {
  font-size: 12px;
  color: inherit;
  opacity: 0.6;
  text-decoration: underline;
}
</style>
