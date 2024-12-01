<template>
  <div>
  <v-dialog
    ref="login"
    v-model="loginModal"
    max-width="500"
    @keydown.esc="common($event)"
    opacity="0"
    >
    <focus-trap
      v-model:active="loginModal">
      <div
        id="trapDiv"
        tabindex="-1"
        class="trap is-active">
        <v-card
          class="text-primary">
          <v-card-title
            class="bg-primary d-flex justify-center">
              <b>Login</b>
          </v-card-title>
          <v-card-text class="blue-grey darken-4">
            <v-container>
              <v-form>
                <v-row>
                  <v-col>
                    <v-text-field
                      v-model="username"
                      label="Username"
                      placeholder="" />
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      v-model="password"
                      label="Password"
                      type="password"
                      placeholder="" />
                  </v-col>
                </v-row>
              </v-form>
            </v-container>
          </v-card-text>
          <v-card-actions
            class="bg-primary"
          >
            <v-btn
              class="bg-green"
              variant="outlined"
              @click="login()">Login</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              class="bg-red"
              variant="outlined"
              @click="close()">Close</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </focus-trap>
  </v-dialog>
  </div>
</template>
<script>
import D3DApi from '@/services/api'
import D3Util from '@/helpers/D3Util'
export default {
  name: 'SiteLogin',
  props: ['active'],
  data () {
    return {
      options: [],
      gNavLi: null,
      loginFormIsActive: null,
      username: '',
      enableTrap: false,
      password: null,
      //authInfo: null,
      authError: null,
      //alertMessage: null,
      loginModal: false
    }
  },
  mounted () {
    console.log('active window watch')
    console.log(this.active)
    //this.loginModal = this.active == "Login"?true:false
    this.$nextTick(function(){
      console.log('loginTrap active')
      this.enableTrap = this.loginModal
    })
    // if (D3Util.debug) {
    //   localStorage.getItem('token')
    // }

    // if (localStorage.getItem('token') == null) {
    //   D3VimApi.auth()
    //   this.visible = true
    // } else {
    //   this.visible = false
    // }
    this.emitter.on('showLogin', () => {
      this.loginModal = true
      //this.enableTrap = true
    })
  },
  methods: {
    login: async function () {
      var result = await D3DApi.auth(this.username, this.password)

      if (D3Util.debug) {
        console.log(result)
      }
      if (Object.prototype.hasOwnProperty.call(result, 'data')) {
        this.common()
        this.emitter.emit('appMessage',
          { message: 'Successfully Authenticated',
            result: result
          })

        // move this to a http-only secure cookie, instead of saving the cookie in localstorage
        localStorage.setItem('token', JSON.stringify(result.data.token).replace(/"/g, ''))
      } else {
        this.emitter.emit('appMessage', {message: 'Failed to Authenticate', result: result})
      }
    },
    close () {
      console.log('Close method')
      this.common()
      //this.authInfo = false
      //this.alertMessage = false
      // this.$root.$emit('d3DagreActivate')
      // this.$root.$emit('showForm', 'node')
    },
    common (){
      this.loginModal = false
      //this.loginTrapActive = false
      this.emitter.emit('changeActive')
    }
  },
  watch: {
    active: function() {
    //   console.log('active window watch')
    //   this.loginModal = this.active == "Login"?true:false
    //   this.$nextTick(function(){
    //     console.log('loginTrap active')
    //     this.enableTrap = this.loginModal
    //   })
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
