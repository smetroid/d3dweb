<template>
  <div>
  <v-dialog ref="login" v-model="loginModal" max-width="500" @keydown.esc="common($event)">
    <focus-trap v-model="enableTrap">
      <div id="trapDiv" tabindex="-1" class="trap is-active">
        <v-card id="loginCard" class="mx-auto">
          <v-card-title class="headline">
            <v-row justify="center">
              <b>Login</b>
            </v-row>
          </v-card-title>
          <v-card-text class="blue-grey darken-4">
            <v-container>
              <v-form>
                <v-row>
                  <v-col sm="3">
                    <span class="samus__label">Username:</span>
                  </v-col>
                  <v-text-field v-model="username" placeholder="" />
                </v-row>
                <v-row>
                  <v-col sm="3">
                    <span class="samus__label">Password:</span>
                  </v-col>
                  <v-text-field v-model="password" type="password"
                    placeholder="" />
                </v-row>
              </v-form>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-btn dense
              class="ma-2" outlined color="green"
              @click="login()">Login</v-btn>
            <v-spacer></v-spacer>
            <v-btn dense class="ma-2" outlined color="red"
              @click="close()">Close</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </focus-trap>
  </v-dialog>
  </div>
</template>
<script>
import D3VimApi from '@/services/api/SamusApi'
import D3Util from '@/services/D3Util'
export default {
  name: 'Login',
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
      showAlert: null,
      loginModal: false
    }
  },
  mounted () {
    console.log('active window watch')
    console.log(this.active)
    this.loginModal = this.active == "Login"?true:false
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
    this.$root.$on('showLogin', () => {
      this.enableTrap = true
      this.loginModal = true
    })
  },
  methods: {
    login: async function () {
      var result = await D3VimApi.auth(this.username, this.password)

      if (D3Util.debug) {
        console.log(result)
      }
      this.showAlert = true

      if (Object.prototype.hasOwnProperty.call(result, 'data')) {
        this.common()
        this.$root.$emit('appMessage', true, 'Successfully Authenticated', result)
      } else {
        this.$root.$emit('appMessage', false, 'Failed to Authenticate', result)
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
      this.$root.$emit('changeActive')
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
