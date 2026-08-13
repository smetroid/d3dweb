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
      loginModal: false
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
      var result = await D3DApi.auth(this.username, this.password)

      if (D3Util.debug) {
        console.log(result)
      }
      if (Object.prototype.hasOwnProperty.call(result, 'data')) {
        this.common()
        this.emitter.emit('appMessage', { message: 'Successfully Authenticated', result: result })

        // move this to a http-only secure cookie, instead of saving the cookie in localstorage
        localStorage.setItem('token', JSON.stringify(result.data.token).replace(/"/g, ''))
      } else {
        this.emitter.emit('appMessage', { message: 'Failed to Authenticate', result: result })
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
