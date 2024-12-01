<script setup>
import DagreGraphLib from '@/components/DagreGraphLib.vue'
import D3Util from '@/helpers/D3Util.js'
import MenuKeys from '@/helpers/MenuKeys.js'
import MenuLinks from '@/helpers/MenuLinks.js'
import Settings from '@/components/Settings.vue'
import HelperPane from '@/components/Helper.vue'
import * as DagreD3 from 'dagre-d3'
import DiagramForm from '@/components/DiagramForm.vue'
import DiagramModifier from '@/helpers/DiagramModifier.js'
import DiagramList from '@/components/DiagramList.vue'
import Login from '@/components/Login.vue'
import { computed } from 'vue'
import D3DApi from '@/services/api'

/*
// Theme specific
import { useTheme } from 'vuetify'

const theme = useTheme()

//making sure theme selection stays with the app after reloading
function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
*/
</script>
<template>
  <v-app app>
    <!--
    TODO: move this to use a sheet, in order to allow to close the alert.  Currently the diagram is preventing closing the alert
    -->
    <v-card-text
      class="mx-auto"
      max-width="500"
      >
      <v-alert
        v-model="successMessage"
        closable
        variant="outlined"
        type="success"
        >
        <span v-html="alertMessage"></span>
      </v-alert>
      <v-alert
        v-model="errorMessage"
        closable
        variant="outlined"
        type="error"
        >
        <span v-html="alertMessage"></span>
      </v-alert>
      <v-alert
        v-model="infoMessage"
        closable
        variant="outlined"
        type="info"
        >
        <span v-html="alertMessage"></span>
      </v-alert>
    </v-card-text>
    <v-main app>
      <!--
      <DagreOtherKeys
        :d3dInfo="d3dInfo"
      />
      -->
      <DagreGraphLib class=""
        :active="active"
      />
      <DiagramForm
        :active="active"
      />
      <Settings
        :active="active"
        :d3dInfo="d3dInfo"
      />
      <DiagramList
        :active="active"
      />
      <Login
        :active="active"
      />
    </v-main>
    <!--
      NOTE: app - in the footer makes the footer to stay at the bottom
    -->
    <v-footer
      app
      class="pa-1 mr-0"
      >
      <v-row>
        <v-card
          color="primary"
          width="100%"
          >
          <v-container>
            <v-row
              align="center"
              justify="center"
              class="justify-space-around"
              >
              <div>
                <span class="text-button font-weight-bold">ACTIVE:</span><span class=""> {{ active }} </span>
              </div>
              <div>
                <span class="text-button font-weight-bold">DEFAULT HINT:</span><span class=""> Open Read Only</span><br/>
              </div>
              <div class="d-flex">
                <span class="font-weight-bold">Help Pane:</span>
                <v-btn
                  variant="outlined"
                  density="compact"
                  class="">/</v-btn>
              </div>
              <div class="d-flex">
                <span class="text-decoration-underline font-weight-bold">T</span><span class="font-weight-bold">oggle:</span>
                <v-btn
                  variant="outlined"
                  density="compact"
                  @click="toggleTheme()">
                  <v-icon icon="mdi-theme-light-dark"></v-icon>
                </v-btn>
              </div>
              <div class="d-flex">
                <span class="text-decoration-underline font-weight-bold" color="secondary">M</span>
                <span class="font-weight-bold">enu:</span>
                <div
                  width="99%"
                  height="100%"
                  @keydown.stop.prevent="menu($event, $refs.menu)"
                  @keypress.stop.prevent="menu($event, $refs.menu)">
                  <focus-trap
                    v-model:active="showMenu"
                    :initial-focus="()=>$refs.menuDiv"
                    >
                    <div id="trap" ref="menuDiv" tabindex="0">
                      <v-menu
                        ref="speedDial"
                        v-model="showMenu"
                        >
                        <template v-slot:activator="{ props }">
                          <v-btn
                            density="compact"
                            v-bind="props"
                            variant="outlined">
                          <v-icon v-if="showMenu">
                            mdi-close
                          </v-icon>
                          <v-icon v-else>
                            mdi-menu
                          </v-icon>
                          </v-btn>
                        </template>
                        <v-list
                          nav
                          density="compact"
                          class="text-primary"
                        >
                          <v-list-item
                            ref="menu"
                            color="secondary"
                            v-for="(item, i) in menuLinks"
                            :active="currentMenuLink == item.title?true:false"
                            :key="i"
                            :href="'#'+item.title"
                            @click="d3Action(item.title)"
                            >
                            <template v-slot:prepend>
                              <v-icon :icon="item.icon"></v-icon>
                            </template>
                            <v-list-item-title >
                              {{ item.title }}
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </focus-trap>
                </div>
              </div>
              <div class="d-flex">
                <span
                class="text-decoration-underline font-weight-bold" color="secondary">A</span>
                <span class="font-weight-bold">ctions:</span>
                <div
                  width="99%"
                  height="100%"
                  @keydown.stop.prevent="menu($event, $refs.actionsMenu)"
                  @keypress.stop.prevent="menu($event, $refs.actionsMenu)">
                  <focus-trap
                    v-model:active="showActionsMenu"
                    :initial-focus="()=>$refs.menuActionsDiv"
                    >
                    <div
                      id="trap"
                      ref="menuActionsDiv"
                      tabindex="0"
                      >
                      <v-menu
                        ref="speedDial"
                        v-model="showActionsMenu"
                        >
                        <template v-slot:activator="{ props }">
                          <v-btn
                            density="compact"
                            v-bind="props"
                            variant="outlined">
                          <v-icon v-if="showActionsMenu">
                            mdi-close
                          </v-icon>
                          <v-icon v-else>
                            mdi-menu
                          </v-icon>
                          </v-btn>
                        </template>
                        <v-list
                          nav
                          density="compact"
                          class="text-primary"
                        >
                          <v-list-item
                            ref="actionsMenu"
                            color="secondary"
                            v-for="(item, i) in actionLinks"
                            :active="currentMenuLink == item.title?true:false"
                            :key="i"
                            :href="'#'+item.title"
                            @click="d3Action(item.title)"
                            >
                            <template v-slot:prepend>
                              <v-icon :icon="item.icon"></v-icon>
                            </template>
                            <v-list-item-title >
                              {{ item.title }}
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </focus-trap>
                </div>
              </div>
              </v-row>
              <v-row>
                <v-card
                  width="100%"
                >
                  <HelperPane
                    :expand="showHelpPane"
                    :diagramInfo="d3dInfo"
                  />
                </v-card>
              </v-row>
              <!--
              <v-row>
                <v-col class="text-center w-100 bg-grey-lighten-1" cols="12">
                    {{ new Date().getFullYear() }} — <strong>D3D</strong>
                </v-col>
              </v-row>
              -->
          </v-container>
        </v-card>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  components: {DagreGraphLib, Settings, DiagramForm, HelperPane, Login},
  data () {
    return {
      active: "D3Dagre", //Default active component
      showMenu: false,
      showActionsMenu: false,
      showHelpPane: true,
      showDiagramForm: false,
      successfull: null,
      alertMessage: null,
      showSettingsModal: null,
      successMessage: false,
      errorMessage: false,
      infoMessage: false,
      fab: false,
      gNavMenu: null,
      currentMenuLink: null,
      response: 'loading',
      loaded: false,
      actionLinks:[
        {'icon':'mdi-shape-square-plus','title':'Add Node'},
        {'icon':'mdi-file-edit-outline','title':'Edit Node'},
        {'icon':'mdi-selection-ellipse-remove','title':'Delete Node'},
        {'icon':'mdi-selection','title':'Select Node'},
        {'icon':'mdi-shape-oval-plus','title':'Add Edge'},
        {'icon':'mdi-file-edit-outline','title':'Edit Edge'},
        {'icon':'mdi-selection-remove','title':'Delete Edge'},
        {'icon':'mdi-selection','title':'Select Edges'}
      ],
      menuLinks: [
        {'icon':'mdi-login','title':'Login'},
        {'icon':'mdi-cog-outline','title':'D3D Settings'},
        {'icon':'mdi-open-in-new','title':'New Diagram'},
        {'icon':'mdi-open-in-app','title':'Open Diagram'},
        {'icon':'mdi-pencil','title':'Edit Diagram'},
        {'icon':'mdi-content-save-outline','title':'Save Changes'},
      ],
      d3dInfo: {},
      modifier: {},
    }
  },
  provide() {
    return {
      modifier: computed(() => this.modifier)
    }
  },
  mounted () {
    try{
      console.log('App mounted')

      /*!SECTION - Setting application defaults based on cookie settings */
      if (this.$cookies.get('settings')) {
        this.$vuetify.theme.name = this.$cookies.get('settings').defaultTheme
        this.showHelpPane = this.$cookies.get('settings')['showHelpPane']
      }

      if (localStorage.getItem('token')) {
        this.loadFromServer()
      } else {
        this.loadDiagram()
      }

    } catch (error) {
      console.log(error)
      this.emitter.emit('newDiagram')
    }

    /*!SECTION Emitter section, is a way for child components to 
    * communicate with their parent
    */
    /*NOTE - Alert messages
    /*TODO - Move this to it's own Component, and keep the App.vue cleaner
    */
    this.emitter.on('appMessage', (data) => {
      if (D3Util.debug) {
        console.log(data)
        console.log(data.message)
        /*NOTE -
        it appears like the api response has the status attribute in different
        locations
        data.result.status is a login api call return
        data.status is a vue app message and post responses
        */
        //console.log(data.result.status)
      }

      let common = '<br />Message will be removed in 5 seconds <br />'
      if (data.status == 'info') {
        this.infoMessage = true
      } else if ((data.status == 'success')
        || (data.status >= '200' && data.status < '300')
        || (data.result.status >= '200' && data.result.status < '300')) {
        this.successMessage = true
      } else if ((data.status == 'error') || (data.result.status != '200')) {
        this.errorMessage = true
      }

      //this.alertMessage = data.message + '<br />Status: ' +data.result.status + common
      this.alertMessage = data.message + common
    })

    /*NOTE - modifer object from when creating a new diagram */
    this.emitter.on('updateModifier', (newModifier) => {
      console.log('modifier update')
      this.modifier = newModifier
      this.d3dInfo = newModifier.d3dInfo
    })

    /*NOTE - Help Pane toggle
    */
    this.emitter.on('showHelp', () => {
      this.showHelpPane = !this.showHelpPane
    })

    /*NOTE - Handle the default active section/component
    */
    this.emitter.on('changeActive', (menu) => {
      if (D3Util.debug) {
        console.log(menu)
      }
      if (menu === undefined){
        this.active = 'D3Dagre'
      } else {
        this.active = menu
        //this.showMenu = true
        //  this.$nextTick(function(){
        //    console.log('next tick')
        //    this.menuTrap = true
        //    console.log(this.menuTrap)
        //  })
      }
    })

    this.emitter.on('updateDiagramInfo', (payload) => {
       console.log('Updating Diagram Info')
       this.d3dInfo.id = payload.id
       this.d3dInfo.name = payload.name
       this.d3dInfo.description = payload.description
     })

    this.emitter.on('openDiagram', (id) => {
      console.log('Message to open diagram received')
      console.log(id)
      // this.id = id
      if (localStorage.getItem('token')) {
        this.loadFromServer(id)
      } else {
        this.loadDiagram(id)
      }
    })

    this.emitter.on('toggleTheme', () => {
      console.log(this)
      this.toggleTheme()
    })
     // this.$root.$on('newDiagram', () => {
     //   console.log('Message to create a new diagram received')
     //   // this.id = id
     //   this.newDiagram()
     // })
  },
  updated () {
    // console.log('component updated')
    // console.log(this.d3dInfo)
  },
  methods: {
    toggleTheme () {
      this.$vuetify.theme.global.name = this.$vuetify.theme.global.current.dark ? 'light' : 'dark'
    },
    loadDiagram (id) {
      /*!SECTION - Logic to load a previously working diagram, or 
      * continue to work on a previously temporary item
      * 1. Load the last working item if it exists
      */
      let localDiagramInfo = null
      if (id) {
        localDiagramInfo = D3Util.getLocalItem(id)
        /**NOTE - setting the LastLocallySavedItemId will
         * allow the application to open the last opened
         * item when re-rendering
         */
        this.$cookies.set('LastLocallySavedItemId', id)
      } else {
        let diagramId = this.$cookies.get('LastLocallySavedItemId')
        if (diagramId) {
          localDiagramInfo = D3Util.getLocalItem(diagramId)
          id = diagramId
        } else {
          // get the last temporary saved working item
          localDiagramInfo = D3Util.getTempDiagram()
        }
      }

      if (D3Util.debug) {
        console.log(localDiagramInfo)
        console.log(id)
      }

      let g = new DagreD3.graphlib.json.read(JSON.parse(localDiagramInfo.diagram))

      this.d3dInfo = localDiagramInfo
      this.d3dInfo.id = id
      this.d3dInfo.diagram = g

      /**NOTE - this.modifier is the main object used by all other components files */
      this.modifier = new DiagramModifier(this.d3dInfo, this.emitter)
      this.modifier.redraw(g)
      console.log(this.modifier)

    },
    loadFromServer: async function (id) {
      let serverDiagramInfo = null
      if (id) {
        serverDiagramInfo = await D3DApi.getDiagram(id)
        /**NOTE - setting the LastLocallySavedItemId will
         * allow the application to open the last opened
         * item when re-rendering
         */
        this.$cookies.set('LastLocallySavedItemId', id)
      } else {
        let diagramId = this.$cookies.get('LastLocallySavedItemId')
        if (diagramId) {
          /*TODO - address errors from the api 400s or 500s */
          serverDiagramInfo = await D3DApi.getDiagram(diagramId)
          id = diagramId
        } else {
          // get the last temporary saved working item
          serverDiagramInfo = D3Util.getTempDiagram()
        }
      }

      if (D3Util.debug) {
        console.log(serverDiagramInfo)
        console.log(id)
      }

      try {
        let g = new DagreD3.graphlib.json.read(JSON.parse(serverDiagramInfo.diagram))

        this.d3dInfo = serverDiagramInfo
        this.d3dInfo.id = id
        this.d3dInfo.diagram = g

        /**NOTE - this.modifier is the main object used by all other components files */
        this.modifier = new DiagramModifier(this.d3dInfo, this.emitter)

        /** dagre-d3 has some issues clearing clusters*/
        this.modifier.clearCluster()

        this.modifier.redraw(g)
        console.log(this.modifier)

      } catch (error) {
        this.emitter.emit('appMessage',
          {
            message: 'Unable to load saved diagram, resetting last saved id', result: error
          })
        this.$cookies.remove('LastLocallySavedItemId')

        console.log(error)
      }

    },
    openMenu (){
        console.log(this.active)
        this.active = "Menu"
    },
    successToggle () {
      console.log('success toggle')
    },
    loadingComplete () {
      this.$root.$emit('loadingComplete', this.options, this.id)
    },
    d3Action: async function(event) {
      // Clear the acions menu
      //this.$root.$emit('drawerAction')
      //this.hints = D3Util.removeHints(this.hints)
      //this.d3ActionsTrap = false
      MenuLinks.Click(event, this)
    },
    liSelectionK (selectList, liSelected) {
      var li = liSelected
      var selectLi = null
      if (li === null) {
        selectLi = selectList.length - 1
      } else {
        this.prevLiSelected = D3Util.mod(li, selectList.length)
        li = li - 1
        selectLi = D3Util.mod(li, selectList.length)
      }
      return selectLi
    },
    liSelectionJ (selectList, liSelected) {
      var li = liSelected
      var selectLi = null
      if (li === null) {
        selectLi = 0
      } else {
        li = li + 1
        selectLi = D3Util.mod(li, selectList.length)
      }
      return selectLi
    },
    menu(event){
      MenuKeys.menuAction(event.key, this)
    },
     selectionBool (index) {
       console.log(this.menuLinks[index].title)
       this.currentMenuLink = this.menuLinks[index].title
     },
     //saveChanges: async function(){
     // /*
     //   1. Open Diagram form
     //   2. Use the last samus.lastUpdated localStorage as data to save
     // */
     // this.emitter.emit('SaveDiagram')
     //  //let localData = D3Util.getLocal()
     //  //let id = localData.id // means data has been saved to server
     //  //let id = this.d3dInfo.id
     //  //var auth = D3Util.auth()
     //  //if (id && auth) {
     //  //  var result = await D3VimApi.updateDiagram(app.d3dInfo, app)
     //  //  return result
     //  //} else if (auth){
     //  //console.log('id is empty')
     //  //this.active = "New"
     //  //} else {
     //     /**
     //      * broken was causing a lot of confusion
     //      * need to rethink the approach to saving locally if 
     //      * not logged in or authenticated
     //      */
     //    // var common = D3Util.commonMsg
     //    this.emitter.emit('appMessage', true, 'Changes are being saved to localStorage, please consider creating an account or login to save remotely to the server', '')
     //    // this is not needed
     //    //D3Util.saveLocal(data)
     //  //}
     //},
  },
  computed: {
  },
  watch: {
    active: function () {
      console.log('app.root.activewindow')
    //  console.log(this.activeWindow)
      this.showMenu = this.active === "Menu"?true:false
      this.showActionsMenu = this.active === "Actions Menu"?true:false
    },
    successMessage: function () {
      setTimeout( ()=> {
        this.successMessage = false
      },5000)
    },
    errorMessage: function () {
      setTimeout( ()=> {
        this.errorMessage = false
      },5000)
    },
    infoMessage: function () {
      setTimeout( ()=> {
        this.infoMessage = false
      },3000 )
    }
  }
}
</script>

<style scoped>

/*
.primary--text {
  color: red;
}

.transparent {
  background-color: transparent;
}
*/

.pitch-mixin {
  width: 100%;
  --aug-b-extend1: 1%;

  --aug-border-all: 1px;

  --aug-inlay-all: 1px;
  --aug-border-bg: green ;
  /*--aug-inlay-bg: radial-gradient(green, black);*/
  --aug-inlay-opacity: 0.1;
}

.pitch-mixin2 {
  width: 100%;
  --aug-tr: 25px;
  --aug-b-extend1: 10%;

  --aug-border-all: 1px;

  --aug-inlay-all: 1px;
  --aug-border-bg: green;
  /*--aug-inlay-bg: radial-gradient(green, black);*/
  --aug-inlay-opacity: 0.1;
}

.pitch-mixin3 {
  --aug-b-extend1: 50%;

  --aug-border-all: 0px;

  --aug-inlay-all: 1px;
  --aug-border-bg: green;
  /*--aug-inlay-bg: radial-gradient(green, black);*/
  --aug-inlay-opacity: 0.1;
}

/* Rules for sizing the icon. */
/*
.material-icons-.md-18 { font-size: 18px; }
.material-icons.md-24 { font-size: 24px; }
.material-icons.md-36 { font-size: 36px; }
.material-icons-outlined.md-48 { font-size: 48px; }
.material-icons-outlined.md-48 { font-size: 48px; }
.material-icons-outlined.md-64 { font-size: 64px; }
*/

/* Rules for using icons as black on a light background. */
/*
.material-icons.md-dark { color: rgba(0, 0, 0, 0.54); }
.material-icons.md-dark.md-inactive { color: rgba(0, 0, 0, 0.26); }
*/

/* Rules for using icons as white on a dark background. */
/*
.material-icons.md-light { color: rgba(255, 255, 255, 1); }
.material-icons.md-light.md-inactive { color: rgba(255, 255, 255, 0.3); }
.material-icons.orange600 { color: #FB8C00; }
*/


</style>

<style src='./assets/css/d3d.css'></style>
<!--
<link href='https://fonts.googleapis.com/css?family=Material+Icons' rel='stylesheet'/>
<link href='https://fonts.googleapis.com/css?family=Lato:300,400,700' rel='stylesheet' type='text/css'/>
<style src='./assets/css/parallax.css'></link>
<style src='../node_modules/augmented-ui/augmented-ui.min.css'>
-->
