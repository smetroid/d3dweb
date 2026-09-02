<template>
  <Teleport to="body">
    <transition name="fx-scrim">
      <div v-if="loginModal" class="fx-scrim" @click="common()"></div>
    </transition>
    <transition name="fx-dialog">
      <div v-if="loginModal" class="fx-dialog-stage">
        <focus-trap v-model:active="loginModal" class="trap is-active">
          <div tabindex="0" class="fx-dialog" @keydown="onKeydown($event)" @keyup="onKeyup($event)">
            <div class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip fx-chip-edit">AUTH</span>
                  <h2 class="fx-title">LOGIN</h2>
                </div>
                <button type="button" class="fx-close" aria-label="Close login" @click="close()">
                  ✕
                </button>
              </header>

              <div class="fx-readout">
                <span class="fx-readout-kv fx-readout-wide">
                  <span class="fx-readout-k">REQUIRED</span>
                  <span class="fx-readout-v">Server authentication</span>
                </span>
                <span class="fx-readout-kv">
                  <span class="fx-readout-k">HOTKEY</span>
                  <span class="fx-readout-v">{{ shortcutLabels.login }}</span>
                </span>
              </div>

              <div class="fx-panel-body">
                <label class="fx-field fx-field-full">
                  <span class="fx-label">Username</span>
                  <input
                    class="fx-input"
                    type="text"
                    v-model="username"
                    placeholder="Enter your username"
                    @keydown.enter.prevent="login()"
                  />
                </label>
                <label class="fx-field fx-field-full">
                  <span class="fx-label">Password</span>
                  <input
                    class="fx-input"
                    type="password"
                    v-model="password"
                    placeholder="Enter your password"
                    @keydown.enter.prevent="login()"
                  />
                </label>
              </div>

              <footer class="fx-panel-actions">
                <button type="button" class="fx-btn fx-btn-primary" @click="login()">
                  Login <span class="fx-kbd">{{ shortcutLabels.login }}</span>
                </button>
                <button type="button" class="fx-btn fx-btn-ghost" @click="close()">
                  Close <span class="fx-kbd">{{ shortcutLabels.close }}</span>
                </button>
              </footer>

              <div class="login-divider"><span>or</span></div>

              <button
                type="button"
                class="fx-btn login-social"
                data-testid="login-github"
                @click="signInWith('github')"
              >
                Continue with GitHub
              </button>

              <button
                type="button"
                class="fx-btn login-social"
                data-testid="login-google"
                @click="signInWith('google')"
              >
                Continue with Google
              </button>

              <p v-if="socialError" class="login-error">{{ socialError }}</p>
            </div>
          </div>
        </focus-trap>
      </div>
    </transition>
  </Teleport>
</template>
<script>
import D3DApi from '@/services/api'
import D3Util from '@/helpers/D3Util'
import Shortcuts from '@/helpers/Shortcuts.js'
import { loadSession, clearShareToken } from '@/services/session'
export default {
  name: 'SiteLogin',
  props: ['active'],
  data() {
    return {
      options: [],
      gNavLi: null,
      loginFormIsActive: null,
      username: '',
      enableTrap: false,
      password: null,
      authError: null,
      loginModal: false,
      socialError: ''
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    }
  },
  mounted() {
    this.emitter.on('showLogin', () => {
      this.loginModal = true
    })
  },
  methods: {
    onKeydown(event) {
      if (Shortcuts.matches(event, 'close')) {
        event.preventDefault()
        this.close()
      }
    },
    onKeyup(event) {
      if (event.repeat) return
      if (Shortcuts.matches(event, 'login')) {
        event.preventDefault()
        this.login()
      }
    },
    login: async function () {
      try {
        var result = await D3DApi.auth(this.username, this.password)

        if (D3Util.debug) {
          console.log(result)
        }
        this.common()
        // A leftover shareToken from an earlier share visit would otherwise
        // keep winning over this new session cookie on every request (see
        // api.js's Authorization header) and even lock the account out of
        // /auth/me — clear it now that a real session exists.
        clearShareToken()
        // The backend now sets the session as an httpOnly cookie on local
        // login too, so there is nothing to store here. Fetch who we are
        // from the server instead of decoding the (no-longer-stored) token.
        await loadSession()
        this.emitter.emit('appMessage', {
          message: 'Successfully Authenticated',
          status: 'success'
        })
        this.emitter.emit('authChanged')
      } catch (err) {
        console.error('login failed', err)
        this.emitter.emit('appMessage', { message: 'Failed to Authenticate', status: 'error' })
      }
    },
    // Leaves the SPA entirely: the provider redirects back to /auth/callback,
    // which AuthCallback.vue picks up.
    async signInWith(provider) {
      this.socialError = ''
      try {
        window.location.href = await D3DApi.getOAuthUrl(provider)
      } catch {
        this.socialError = 'That sign-in option is unavailable right now.'
      }
    },
    close() {
      this.common()
    },
    common() {
      this.loginModal = false
      this.emitter.emit('changeActive')
    }
  }
}
</script>

<style scoped></style>
