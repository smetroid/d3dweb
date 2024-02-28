<template>
  <v-card
    tile
    class="pa-0 ma-0 d-flex" >
    <v-expand-transition>
      <v-card
        v-show="expand"
        class="pa-0 ma-0 transparent"
        width="100%"
        >
        <v-card 
          outlined
          class="pa-0 ma-0 d-flex transparent" >
          <v-card 
            outlined
            width="50%"
            class="pa-0 ma-0 transparent pitch-mixin2"
            data-augmented-ui="">
            <v-card 
              outlined
              class="pa-0 ma-0 transparent">
              <span class="justify-center d-flex">SAMUS <pre> </pre>
                <span v-if="diagramInfo.id"
                  class="justify-center d-flex green--text">
                  (Authenticated)
                </span>
              </span>  
              <v-divider
                color="" 
              />
              <v-row class="ma-0 pa-0 justify-space-around">
                <v-card
                  outlined
                  class="transparent justify-space-around d-flex">
                  <v-card
                    outlined
                    class="transparent justify-center">
                    <span class="justify-center d-flex">
                      Diagram Info
                    </span>
                    <v-divider
                    color=""
                    />
                    <v-card
                      outlined
                      class="transparent">
                      <span>Name :</span> <br/><span class="green--text"> {{ diagramInfo.name }} </span><br/>
                      <span text-sm>Description:</span>
                      <span class="green--text"> {{ diagramInfo.description }} </span><br/>
                      <span>ID:</span><span class="green--text"> {{ diagramInfo.id }} </span><br/>
                    </v-card>
                  </v-card>
                  <v-card
                    outlined
                    class="transparent justify-center">
                    <span class="justify-center d-flex">
                      Actions
                    </span>
                    <v-divider color=""></v-divider>
                    <v-card outlined class="transparent"
                      ref="helper" v-for="helper in samus"
                      :key="helper.title">
                      <span text-sm>{{ helper.title }}:</span><span class="green--text"> {{ helper.shortcut }} </span><br/>
                    </v-card>
                  </v-card>
                  <v-card
                    outlined
                    class="transparent justify-center">
                    <span class="justify-center d-flex">
                      Other
                    </span>
                    <v-divider
                      color=""
                    />
                    <v-card 
                      outlined 
                      class="transparent"
                      ref="helper" v-for="helper in other"
                      :key="helper.title">
                      <span text-sm>{{ helper.title }}:</span><span class="green--text"> {{ helper.shortcut }} </span><br/>
                    </v-card>
                  </v-card>
                </v-card>
              </v-row>
            </v-card>
          </v-card>
          <v-divider
            vertical
            color=""
            class="ma-1"
          />
          <v-card
            outlined
            width="50%"
            class="pa-0 ma-0 transparent pitch-mixin2"
            data-augmented-ui="">
            <span class="text-sm justify-center d-flex">
              SHORTCUTS
            </span>
            <v-divider
              color=""
              />
            <v-row class="ma-0 pa-0 justify-space-around">
              <v-card
                outlined
                class="transparent justify-center">
                <span class="text-sm justify-center d-flex">
                  Actions
                </span>
                <v-divider
                  color=""
                />
                <v-card
                  outlined
                  class="transparent"
                  ref="helper" v-for="helper in actions"
                  :key="helper.title">
                  <span text-sm>{{ helper.title }}:</span><span class="green--text"> {{ helper.shortcut }} </span><br/>
                </v-card>
              </v-card>
              <v-card
                outlined
                class="transparent">
                <span class="text-sm justify-center d-flex">
                  Dagre
                </span>
                <v-divider
                  color=""
                />
                <v-card 
                  outlined 
                  class="transparent"
                  ref="helper" v-for="helper in dagre"
                  :key="helper.title">
                  <span text-sm>{{ helper.title }}:</span><span class="green--text"> {{ helper.shortcut }} </span><br/>
                </v-card>
              </v-card>
              <v-card
                outlined
                class="transparent">
                <span class="text-sm justify-center d-flex">
                  Zoom
                </span>
                <v-divider
                  color=""
                />
                <v-card
                  outlined
                  class="transparent"
                  ref="helper" v-for="helper in zoom"
                  :key="helper.title">
                  <span text-sm>{{ helper.title }}:</span><span class="green--text"> {{ helper.shortcut }} </span><br/>
                </v-card>
              </v-card>
            </v-row>
          </v-card>
        </v-card>
      </v-card>
    </v-expand-transition>
  </v-card>
</template>
<script>
//import D3VimApi from '@/services/api/SamusApi'
//import D3Util from '@/services/D3Util'
export default {
  name: 'Helper',
  props:['expand','diagramInfo'],
  data () {
    return {
      // expand: true,
      active: 'hi!',
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
      loginModal: false,
      zoom: [
        {"title": "Zoom In","shortcut": "Alt + ="},
        {"title": "Zoom Out", "shortcut": "Alt + -"},
        {"title": "Pan Right", "shortcut": "Alt + l"},
        {"title": "Pan Left","shortcut": "Alt + h"},
        {"title": "Pan Up","shortcut": "Alt + k"},
        {"title": "Pan Down","shortcut": "Alt + j"}
      ],
      dagre: [
        {"title": "Focus Node","shortcut": "j or k"},
        {"title": "Active 1", "shortcut": "Enter"},
        {"title": "Active 2","shortcut": "Enter Enter"},
        {"title": "Hints","shortcut": "f"},
        {"title": "Change Focus","shortcut": "Esc"},
      ],
      actions: [
        {"title": "Delete", "shortcut": "x"},
        {"title": "Read Only", "shortcut": "r"},
        {"title": "Edit","shortcut": "e"},
        {"title": "Create Node","shortcut": "Alt + n"},
        {"title": "Create Edge","shortcut": "Alt + d"},
      ],
      main: [
        'Diagram', 'Zoom','Dagre'
      ],
      samus: [
        {"title": "New Diagram", "shortcut": "Ctrl + n"},
        {"title": "Open Diagram", "shortcut": "Ctrl + o"},
        {"title": "Edit Diagram", "shortcut": "Ctrl + e"},
        {"title": "Save Diagram", "shortcut": "Ctrl + s"},
      ],
      other: [
        {"title": "Login", "shortcut": "Ctrl + l"},
        {"title": "Settings", "shortcut": "Ctrl + t"},
        {"title": "Hints", "shortcut": "f"},
      ],
      //auth:
    }
  },
  mounted () {
   // if (D3Util.debug) {
   //   localStorage.getItem('token')
   // }

   // if (localStorage.getItem('token') == null) {
   //   D3VimApi.auth()
   //   this.visible = true
   // } else {
   //   this.visible = false
   // }
   // this.$root.$on('showLogin', () => {
   //   this.enableTrap = true
   //   this.loginModal = true
   // })
  },
  updated() {
    console.log('Helper updated')
  },
  methods: {
  //  login: async function () {
  //    var result = await D3VimApi.auth(this.username, this.password)

  //    if (D3Util.debug) {
  //      console.log(result)
  //    }
  //    this.showAlert = true

  //    if (Object.prototype.hasOwnProperty.call(result, 'data')) {
  //      this.common()
  //      this.$root.$emit('appMessage', true, 'Successfully Authenticated', result)
  //    } else {
  //      this.$root.$emit('appMessage', false, 'Failed to Authenticate', result)
  //    }
  //  },
  //  close () {
  //    console.log('Close method')
  //    this.common()
  //    //this.authInfo = false
  //    //this.alertMessage = false
  //    // this.$root.$emit('d3DagreActivate')
  //    // this.$root.$emit('showForm', 'node')
  //  },
  //  common (){
  //    this.loginModal = false
  //    //this.loginTrapActive = false
  //    this.$root.$emit('changeActive')
  //  },
  //  auth () {
  //    return D3Util.auth
  //  }
  },
  watch: {
  //  active: function() {
  //    console.log('active window watch')
  //    this.loginModal = this.active == "Login"?true:false
  //    this.$nextTick(function(){
  //      console.log('loginTrap active')
  //      this.enableTrap = this.loginModal
  //    })
  //  },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
