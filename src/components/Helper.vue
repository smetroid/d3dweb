<template>
  <div class="d-flex" >
    <v-expand-transition>
      <v-card
        variant="text"
        v-show="expand"
        width="100%"
        color="primary"
        >
        <div class="d-flex" >
          <v-card 
            width="50%" 
            class="pa-1 ml-1 mr-1 pitch-mixin2" 
            variant="text"
            data-augmented-ui="">
              <span class="justify-center d-flex text-button font-weight-bold">
                D3D
                <span v-if="diagramInfo.id"
                  class="justify-center d-flex ">
                  (Diagram Saved)
                </span>
              </span>  
              <v-divider></v-divider>
              <div 
                class="d-flex">
                <v-card 
                  variant="text"
                  width="100%"
                  class="pa-3">
                  <span class="justify-center d-flex text-button font-weight-bold">
                    Diagram Info
                  </span>
                  <v-divider></v-divider>
                    <span class="font-weight-bold">ID :</span><span class=""> {{ diagramInfo.id }} </span><br/>
                    <span class="font-weight-bold">Name :</span> <br/><span class=""> {{ diagramInfo.name }} </span><br/>
                    <span class="font-weight-bold">Description:</span>
                    <span class=""> {{ diagramInfo.description }} </span><br/>
                </v-card>
                <v-divider vertical></v-divider>
                <v-card
                  variant="text"
                  width="100%"
                  class="pa-3">
                  <span class="justify-center d-flex text-button font-weight-bold">
                    Actions
                  </span>
                  <v-divider></v-divider>
                  <span 
                    ref="actions" 
                    v-for="helper in samus"
                    :key="helper.title">
                    <span class="font-weight-bold">
                      {{ helper.title }}: </span> 
                    <span>
                      {{ helper.shortcut }} 
                    </span><br/>
                  </span>
                  <v-divider></v-divider>
                  <span class="font-weight-bold">3D Layouts:</span><br/>
                  <span 
                    v-for="helper in layouts"
                    :key="helper.title">
                    <span class="font-weight-bold">
                      {{ helper.title }}: </span>
                    <span> {{ helper.shortcut }} </span><br/>
                  </span>
                </v-card>
                <v-divider vertical></v-divider>
                <v-card
                  variant="text"
                  width="100%"
                  class="pa-3">
                  <span class="justify-center d-flex text-button font-weight-bold">
                    Other
                  </span>
                  <v-divider></v-divider>
                  <span 
                    ref="other" v-for="helper in other"
                    :key="helper.title">
                    <span class="font-weight-bold">
                      {{ helper.title }}:</span>
                    <span> {{ helper.shortcut }} </span><br/>
                  </span>
                </v-card>
            </div>
          </v-card>
            <v-divider vertical></v-divider>
          <v-card
            variant="text"
            width="50%"
            class="pa-1 ml-1 pitch-mixin2 mr-1"
            data-augmented-ui="">
            <span class="justify-center d-flex text-button font-weight-bold">
              SHORTCUTS
            </span>
            <v-divider></v-divider>
            <div class="ml-1 mr-1 justify-space-around d-flex">
              <v-card
                variant="text"
                width="50%"
                class="pa-3">
                <span class="justify-center d-flex text-button font-weight-bold">
                  Actions
                </span>
                <v-divider></v-divider>
                  <span 
                    ref="d3actions" 
                    v-for="helper in actions"
                    :key="helper.title">
                    <span class="font-weight-bold">
                      {{ helper.title }}: </span>
                    <span> {{ helper.shortcut }} </span><br/>
                  </span>
              </v-card>
              <v-divider vertical></v-divider>
              <v-card
                variant="text"
                width="50%"
                class="pa-3">
                <span class="justify-center d-flex text-button font-weight-bold">
                  Selections
                </span>
                <v-divider></v-divider>
                <span
                  ref="helper" 
                  v-for="helper in selectionOptions"
                  :key="helper.title">
                  <span class="font-weight-bold">
                    {{ helper.title }}: </span>
                  <span> {{ helper.shortcut }} </span><br/>
                </span>
              </v-card>
              <v-divider vertical></v-divider>
              <v-card
                variant="text"
                width="50%"
                class="pa-3">
                <span class="justify-center d-flex text-button font-weight-bold">
                  Zoom
                </span>
                <v-divider></v-divider>
                <span 
                  ref="zoom" 
                  v-for="helper in zoom"
                  :key="helper.title">
                  <span class="font-weight-bold">
                    {{ helper.title }}: </span>
                  <span> {{ helper.shortcut }} </span><br/>
                </span>
              </v-card>
            </div>
          </v-card>
        </div>
      </v-card>
    </v-expand-transition>
  </div>
</template>
<script>
import D3Util from '@/helpers/D3Util.js'
//import D3VimApi from '@/services/api/SamusApi'
//import D3Util from '@/services/D3Util'
export default {
  name: 'D3DHelper',
  props:['expand','diagramInfo'],
  data () {
    return {
      // expand: true,
      active: 'hi!',
      options: [],
      gNavLi: null,
      loginFormIsActive: null,
      username: '',
      password: null,
      //authInfo: null,
      authError: null,
      //alertMessage: null,
      showAlert: null,
      loginModal: false,
      selectionOptions: [
        {"title": "Focus Node","shortcut": "j or k"},
        {"title": "Active 1", "shortcut": "enter"},
        {"title": "Active 2","shortcut": "enter enter"},
        {"title": "Hints","shortcut": "f"},
        {"title": "Change Focus","shortcut": "esc"},
      ],
      actions: [
        {"title": "Delete", "shortcut": "x"},
        {"title": "Read Only", "shortcut": "r"},
        {"title": "Edit","shortcut": "e"},
        {"title": "Create Node","shortcut": "n"},
        {"title": "Create Edge","shortcut": "d"},
      ],
      main: [
        'Diagram', 'Zoom','Dagre'
      ],
      other: [
        /*{"title": "Login", "shortcut": "Ctrl + l"}, */
        {"title": "Settings", "shortcut": "Ctrl + t"},
        {"title": "Hints", "shortcut": "f"},
      ],
      //auth:
    }
  },
  computed: {
    mod() {
      return D3Util.isMac() ? '⌘' : 'Alt'
    },
    zoom() {
      return [
        { title: 'Zoom In',     shortcut: `${this.mod} + =` },
        { title: 'Zoom Out',    shortcut: `${this.mod} + -` },
        { title: 'Pan Right',   shortcut: `${this.mod} + l` },
        { title: 'Pan Left',    shortcut: `${this.mod} + h` },
        { title: 'Pan Up',      shortcut: `${this.mod} + k` },
        { title: 'Pan Down',    shortcut: `${this.mod} + j` },
      ]
    },
    samus() {
      return [
        { title: 'New Diagram',  shortcut: `${this.mod} + n` },
        { title: 'Open Diagram', shortcut: `${this.mod} + o` },
        { title: 'Edit Diagram', shortcut: `${this.mod} + e` },
        { title: 'Save Diagram', shortcut: `${this.mod} + s` },
      ]
    },
    layouts() {
      return [
        { title: '2D Layout',     shortcut: `${this.mod} + 1` },
        { title: '3D Sphere',     shortcut: `${this.mod} + 2` },
        { title: '3D Helix',      shortcut: `${this.mod} + 3` },
        { title: '3D Hierarchy',  shortcut: `${this.mod} + 4` },
      ]
    },
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
  //    })
  //  },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
