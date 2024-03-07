<script setup>
//import { RouterLink, RouterView } from 'vue-router'
import DagreGraphLib from './components/DagreGraphLib.vue'
//import HelloWorld from './components/HelloWorld.vue'
//import * as Velocity from 'velocity-animate'
import D3Util from './services/D3Util.js'
import MenuKeys from './helpers/MenuKeys.js'
import MenuLinks from './helpers/MenuLinks.js'
import Settings from './components/Settings.vue'
import D3DFooter from './components/Helper.vue'
//import D3DFooter from './components/Footer.vue'
//import Login from './components/Login.vue'
//import DiagramList from './components/DiagramList.vue'
import DagreLib from './helpers/DagreLib.vue'
import * as DagreD3 from 'dagre-d3'
import D3VimApi from './services/api/SamusApi.js'
import DiagramForm from './components/DiagramForm.vue'

// Theme specific
import { useTheme } from 'vuetify'

const theme = useTheme()

//making sure theme selection stays with the app after reloading
function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
</script>
<template>
    <v-layout class="rounded rounded-md">
      <!--
      <v-card
        class="mx-auto"
        max-width="500"
        >
        <v-card-text class="pa-1 mb-n4">
          <v-alert
            v-model="successMessage"
            dismissible
            normal
            dense
            outlined
            transition="fade-transition"
            type="success"
            >
            <span class="pa-1 mt-2" v-html="alertMessage"></span>
          </v-alert>
          <v-alert
            v-model="errorMessage"
            dismissible
            normal
            dense
            transition="fade-transition"
            outlined
            text
            type="error"
            >
            <span v-html="alertMessage"></span>
          </v-alert>
          <v-alert
            v-model="infoMessage"
            dismissible
            normal
            dense
            transition="fade-transition"
            outlined
            color="yellow"
            text
            type="info"
            >
            <span v-html="alertMessage"></span>
          </v-alert>
        </v-card-text>
      </v-card>
    -->
      <v-main class="align-center justify-center">
            <DagreGraphLib
              :active="active"
              :dagre-lib="dagreLib"
            />
            <DiagramForm
              :active="active"
              :diagramInfo="dagreLib"
            />
            <Settings
              v-if="active === 'Settings'"
              :active="active"
            />
            <!--
            <DiagramForm
              v-if="active === 'Save Changes' || active === 'Edit'"
              :active="active"
              :diagramInfo="dagreLib"
            />
            -->
      </v-main>
      <!--
        NOTE: app - in the footer makes the footer to stay at the bottom 
      -->
      <v-footer
        app
        class="pa-1 mr-0">
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
                              :key="i" href="#" @click="d3Action(item.title)"
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
                  <span class="text-decoration-underline font-weight-bold" color="secondary">A</span>
                  <span class="font-weight-bold">ctions</span>
                  <div
                    width="99%"
                    height="100%"
                    @keydown.stop.prevent="menu($event, $refs.actionsMenu)"
                    @keypress.stop.prevent="menu($event, $refs.actionsMenu)">
                    <focus-trap 
                      v-model:active="showActionsMenu"
                      :initial-focus="()=>$refs.menuActionsDiv"
                      >
                      <div id="trap" ref="menuActionsDiv" tabindex="0">
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
                              :key="i" href="#" @click="d3Action(item.title)"
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
                    <D3DFooter
                      :expand="settings.showHelpPane"
                      :diagramInfo="dagreLib"
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
    </v-layout>
</template>

<script>
export default {
  name: 'App',
  components: {DagreGraphLib, Settings, DiagramForm, D3DFooter},
  data () {
    return {
      active: "D3Dagre", //Default active component
      showMenu: false,
      showActionsMenu: false,
      settings: {},
      //showHelp: true,
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
      diagram: 'loading',
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
        {'icon':'mdi-file-undo-outline','title':'Discard Changes'},
      ],
      dagreLib: {
        name: 'test',
        description: 'test',
        id: '12345'
      }
    }
  },
  mounted () {
    try{
      //console.log("app mounted")
      console.log('App mounted')

      if (this.$cookies.get('settings')) {
        this.$vuetify.theme.name = this.$cookies.get('settings').defaultTheme
      }

      /*!SECTION - Logic to load a previously working diagram, or 
      * continue to work on a previously temporary item
      * 1. Load the last working item if it exists
      */
      let localDiagramInfo = ""
      if (this.$cookies.get('LastLocallySavedItemId')) {
        let id = this.$cookies.get('LastLocallySavedItemId')
        localDiagramInfo = D3Util.getLocalItem(id)
      } else {
        // get the last temporary saved working item
        localDiagramInfo = D3Util.getTempDiagram()
      }

      if (D3Util.debug) {
        console.log(localDiagramInfo.diagram)
      }
      let g = new DagreD3.graphlib.json.read(JSON.parse(localDiagramInfo.diagram))

      /*NOTE - this is only needed for when a backend server is available
      */
      //if(localDiagramInfo.id && D3Util.auth === false){
      //  var message = 'id found, please login to save changes to <br />'
      //  message = message + 'server or replace local changes from server by selecting <br />'
      //  message = message + '\'Discard Changes\' from options menu'
      //  this.$root.$emit('appMessage', true, message)
      //}

      DagreLib.id = localDiagramInfo.id
      DagreLib.name = localDiagramInfo.name
      DagreLib.description = localDiagramInfo.description
      /*NOTE - this is particular dagre-d3 problem, which has been difficult to fix and troubleshoot
      * When you open one diagram with clusters, it renders properly
      * when you open a second diagram with clusters, the second 
      * diagram does not render the clusters properly
      * The dagre-d3 create-clusters.js file looks for all the clusters (d3.js clusters,) and if finds 
      * the old diagram (first diagram ) clusters which are no longer part of the second diagram 
      */
      DagreLib.diagram = DagreLib.redraw(g)
      DagreLib.json = localDiagramInfo.diagram
      this.dagreLib = DagreLib
      //this second render, fixes the cluster issues where the diagram does not render 
      //Temporary workaround
      this.dagreLib.redraw(this.dagreLib.diagram)
    } catch (error) {
      console.log('mounted catch')
      console.log(error)
      this.newDiagram()
    }
    // setting defaults on load or load from saved settings
    let settings = D3Util.appDefaults()
    if (this.$cookies.get('settings')) {
      //duplicate code between App.vue and Settings.vue ... how to fix?
      let setSettings = this.$cookies.get('settings')
      for (let key in setSettings) {
        if ((key === 'debug') || (key === 'helpPane') || (key === 'reset')) {
          setSettings[key] = Boolean(setSettings[key])
        }
      }
      this.settings = setSettings
    } else {
      console.log('setting defaults')
      settings = D3Util.appDefaults()
      this.$cookies.set('settings', settings)
    }

    /*!SECTION Emitter section, is a way for child components to 
    * communicate with their parent
    */
    /*NOTE - Alert messages
    /*TODO - Move this to it's own Component, and keep the App.vue cleaner
    */
    this.emitter.on('appMessage', (status, message, data) => {
      if (D3Util.debug) {
        console.log(status)
        console.log(message)
        console.log(data)
      }

      var common = ''
      if ((status == 'success') || (status === true)) {
        common = '<br /> Message will be removed in 5 seconds <br />'
        this.successMessage = true
      } else if (status == 'error') {
        this.errorMessage = true
        common = '<br /> Message will be removed in 5 seconds <br />'
      } else if (status == 'info'){
        this.infoMessage = true
        common = '</br> Message will be removed in 3 seconds <br /> Error:<br />'
      }
      this.alertMessage = message + common + data
    })


    /*NOTE - Help Pane toggle
    */
    this.emitter.on('showHelp', () => {
      this.settings.showHelpPane = !this.settings.showHelpPane
    })

    //this.$root.$on('showSettings', () => {
    //  console.log('Show settings form received')
    //  this.showSettingsModal = true
    //})
    //this.$root.$on('Alert', (data, alertType) => {
    //  console.log('alert message received')
    //  this.message = data
    //  if (alertType === 'successful') {
    //    this.successfull = true
    //    Velocity(this.$refs.alert, 'fadeOut',
    //      {delay: 1000,
    //        duration: 500,
    //        complete: function () {
    //          // this.successfull = null
    //          // this.message = null
    //        }
    //      })
    //  }
    //})

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

    this.emitter.on('updateDiagramInfo', (diagramInfo) => {
       console.log('diagramInfo')
       //DagreLib.id = id
       //DagreLib.name = name
       //DagreLib.description = description
       //DagreLib.diagram = DagreLib.redraw(g)
       /**JSON is provided during an open from the server, maybe I'll skip for now */
       // DagreLib.json = localDiagramInfo.diagram
       this.dagreLib = diagramInfo
     })

     /*Emit functions section*/
     this.emitter.on('openDiagram', (id) => {
       console.log('Message to open diagram received')
       console.log(id)
       // this.id = id
       this.loadFromServer(id)
     })
     // this.$root.$on('newDiagram', () => {
     //   console.log('Message to create a new diagram received')
     //   // this.id = id
     //   this.newDiagram()
     // })
  },
  updated () {
    // console.log('component updated')
    // console.log(this.dagreLib)
  },
  methods: {
    loadFromServer: async function (id) {
      console.log('loading from server')
      //var response = await this.getDiagram(id)
      var response = await D3VimApi.getDiagram(id)

      if (D3Util.debug) {
        console.log(response)
      }

      var g = new DagreD3.graphlib.json.read(JSON.parse(response.diagram))
      /** Setup cookie options */

      DagreLib.id = id
      DagreLib.diagram = DagreLib.redraw(g)
      DagreLib.description = response.description
      DagreLib.name = response.name
      DagreLib.created = response.created
      DagreLib.json = response.diagram
      this.dagreLib = DagreLib
    },
    newDiagram(){
      /**duplicate code 
       * need to move to Utilils or common file
       * maybe reference the DiagramForm, since it contains defaults
       */
      console.log('creating a new localDiagram')
      let g = new DagreD3.graphlib.Graph({"directed":true,"multigraph":true,"compound":true})
      g.setGraph({})
      g.graph().rankdir = 'TB'
      g.graph().ranksep = '50' 
      g.graph().nodesep = '10'
      g.setDefaultEdgeLabel(function () { return {} })
      g.setNode('first', {label: 'first node', id: 'first'})
      if (D3Util.debug) {
        console.log('newDiagram')
        console.log(g)
        console.log('newDiagram')
      }
      DagreLib.diagram = DagreLib.redraw(g)
      this.dagreLib = DagreLib
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
     //  //let id = this.dagreLib.id
     //  //var auth = D3Util.auth()
     //  //if (id && auth) {
     //  //  var result = await D3VimApi.updateDiagram(app.dagreLib, app)
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
    infoMessage: function () {
      setTimeout( ()=> {
        this.infoMessage = false
      },3000 )
    }
  }
}
</script>

<style scoped>

.primary--text {
  color: red;
}

.transparent {
  background-color: transparent;
}

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
*/
.material-icons-outlined.md-48 { font-size: 48px; }
.material-icons-outlined.md-64 { font-size: 64px; }

/* Rules for using icons as black on a light background. */
.material-icons.md-dark { color: rgba(0, 0, 0, 0.54); }
.material-icons.md-dark.md-inactive { color: rgba(0, 0, 0, 0.26); }

/* Rules for using icons as white on a dark background. */
.material-icons.md-light { color: rgba(255, 255, 255, 1); }
.material-icons.md-light.md-inactive { color: rgba(255, 255, 255, 0.3); }
.material-icons.orange600 { color: #FB8C00; }


</style>
<link href='https://fonts.googleapis.com/css?family=Material+Icons' rel='stylesheet'/>
<link href='https://fonts.googleapis.com/css?family=Lato:300,400,700' rel='stylesheet' type='text/css'/>
<style src='./assets/css/samus.css'></style>
<style src='./assets/css/parallax.css'></style>
<!--
<style src='../node_modules/augmented-ui/augmented-ui.min.css'></style>

-->
