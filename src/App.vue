<script setup>
import DiagramGraphView from '@/components/DiagramGraphView.vue'
import D3Util from '@/helpers/D3Util.js'
import MenuLinks from '@/helpers/MenuLinks.js'
import CommandPalette from '@/components/CommandPalette.vue'
import Settings from '@/components/Settings.vue'
import HelperPane from '@/components/Helper.vue'
import GraphModel from '@/helpers/GraphModel.js'
import DiagramGraph from '@/helpers/DiagramGraph.js'
import { graphlibToModel, isGraphlibFormat } from '@/helpers/graphlibMigration.js'
import { migrateDiagramPayload } from '@/helpers/legacyMigration.js'
import DiagramForm from '@/components/DiagramForm.vue'
import DiagramList from '@/components/DiagramList.vue'
import Login from '@/components/Login.vue'
import { computed, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import D3DApi from '@/services/api'

const route = useRoute()

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
    <RouterView
      v-if="
        route.name === 'collab-poc' || route.name === 'collab-cyto-poc' || route.name === 'join'
      "
    />
    <v-main app v-else>
      <Teleport to="body">
        <div class="fx-toast-stack">
          <TransitionGroup name="fx-toast">
            <div
              v-for="toast in toasts"
              :key="toast.id"
              class="fx-toast"
              :class="`fx-toast-${toast.status}`"
              @click="dismissToast(toast.id)"
            >
              <span class="fx-toast-icon">{{
                toast.status === 'success' ? '✓' : toast.status === 'error' ? '✗' : 'i'
              }}</span>
              <span class="fx-toast-msg" v-html="toast.message"></span>
              <button class="fx-toast-close" @click.stop="dismissToast(toast.id)">✕</button>
            </div>
          </TransitionGroup>
        </div>
      </Teleport>
      <!--
      <DagreOtherKeys
        :d3dInfo="d3dInfo"
      />
      -->
      <DiagramGraphView :active="active" />
      <DiagramForm :active="active" />
      <Settings :active="active" :d3dInfo="d3dInfo" />
      <DiagramList :active="active" />
      <Login :active="active" />
      <CommandPalette
        v-model:open="showCommandPalette"
        :commands="commands"
        :group="commandGroup"
        @run="runCommand"
      />
    </v-main>
    <!--
      NOTE: app - in the footer makes the footer to stay at the bottom
    -->
    <v-footer app class="pa-0">
      <div class="fx-nav">
        <div class="fx-nav-bar">
          <div class="fx-nav-readout">
            <span class="fx-nav-key">ACTIVE</span>
            <span class="fx-nav-val">{{ active }}</span>
          </div>
          <div class="fx-nav-readout">
            <span class="fx-nav-key">DEFAULT HINT</span>
            <span class="fx-nav-val">Open Read Only</span>
          </div>
          <div class="fx-nav-readout">
            <span class="fx-nav-key">HELP</span>
            <button
              type="button"
              class="fx-nav-btn"
              title="Toggle Help Pane (/)"
              @click="emitter.emit('showHelp')"
            >
              <span class="fx-nav-letter">/</span>
            </button>
          </div>
          <div class="fx-nav-readout">
            <span class="fx-nav-key">THEME</span>
            <button
              type="button"
              class="fx-nav-btn"
              title="Toggle Theme (T)"
              @click="toggleTheme()"
            >
              <span class="fx-nav-letter">T</span>
            </button>
          </div>
          <div class="fx-nav-readout">
            <span class="fx-nav-key">MENU</span>
            <button
              type="button"
              class="fx-nav-btn"
              title="Command Palette — Menu (M)"
              @click="openCommandPalette('Menu')"
            >
              <span class="fx-nav-letter">M</span>
            </button>
          </div>
          <div class="fx-nav-readout">
            <span class="fx-nav-key">ACTIONS</span>
            <button
              type="button"
              class="fx-nav-btn"
              title="Command Palette — Actions (A)"
              @click="openCommandPalette('Actions')"
            >
              <span class="fx-nav-letter">A</span>
            </button>
          </div>
          <div class="fx-nav-readout">
            <span class="fx-nav-key">COMMAND</span>
            <button
              type="button"
              class="fx-nav-btn"
              title="Command Palette (⌘K / Ctrl+K)"
              @click="openCommandPalette()"
            >
              <span class="fx-nav-letter">⌘K</span>
            </button>
          </div>
        </div>

        <HelperPane :expand="showHelpPane" :diagramInfo="d3dInfo" />
      </div>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  components: { DiagramGraphView, Settings, DiagramForm, HelperPane, Login, CommandPalette },
  data() {
    return {
      active: 'Graph', //Default active component
      showCommandPalette: false,
      commandGroup: null,
      showHelpPane: false,
      showDiagramForm: false,
      toasts: [],
      response: 'loading',
      loaded: false,
      actionLinks: [
        { icon: 'mdi-shape-square-plus', title: 'Add Node', shortcut: 'N' },
        { icon: 'mdi-file-edit-outline', title: 'Edit Node', shortcut: 'E' },
        { icon: 'mdi-selection-ellipse-remove', title: 'Delete Node', shortcut: 'X' },
        { icon: 'mdi-selection', title: 'Select Node' },
        { icon: 'mdi-shape-oval-plus', title: 'Add Edge', shortcut: 'D' },
        { icon: 'mdi-file-edit-outline', title: 'Edit Edge', shortcut: 'E' },
        { icon: 'mdi-selection-remove', title: 'Delete Edge', shortcut: 'X' },
        { icon: 'mdi-selection', title: 'Select Edges' }
      ],
      menuLinks: [
        { icon: 'mdi-login', title: 'Login' },
        { icon: 'mdi-cog-outline', title: 'D3D Settings' },
        {
          icon: 'mdi-open-in-new',
          title: 'New Diagram',
          shortcut: (D3Util.isMac() ? '⌥' : 'Alt+') + 'N'
        },
        {
          icon: 'mdi-open-in-app',
          title: 'Open Diagram',
          shortcut: (D3Util.isMac() ? '⌥' : 'Alt+') + 'O'
        },
        {
          icon: 'mdi-pencil',
          title: 'Edit Diagram',
          shortcut: (D3Util.isMac() ? '⌥' : 'Alt+') + 'E'
        },
        {
          icon: 'mdi-content-save-outline',
          title: 'Save Changes',
          shortcut: (D3Util.isMac() ? '⌥' : 'Alt+') + 'S'
        }
      ],
      d3dInfo: {},
      modifier: {}
    }
  },
  provide() {
    return {
      modifier: computed(() => this.modifier)
    }
  },
  mounted() {
    try {
      console.log('App mounted')

      /*!SECTION - Setting application defaults based on cookie settings */
      if (this.$cookies.get('settings')) {
        this.$vuetify.theme.name = this.$cookies.get('settings').defaultTheme
        this.showHelpPane = this.$cookies.get('settings')['showHelpPane']
      }
      this.syncThemeAttr()
      this.emitter.emit('themeChanged')

      if (D3Util.auth()) {
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
      if (D3Util.debug) console.log(data)
      let status = 'info'
      if (data.status === 'success') {
        status = 'success'
      } else if (data.status === 'error') {
        status = 'error'
      } else if (data.status === 'info') {
        status = 'info'
      } else if (data.result?.status) {
        const s = Number(data.result.status)
        if (s >= 200 && s < 300) status = 'success'
        else if (s >= 400) status = 'error'
      }
      const id = Date.now() + Math.random()
      this.toasts.push({ id, message: data.message, status })
      const timeout = status === 'error' ? 8000 : status === 'success' ? 4000 : 3000
      setTimeout(() => this.dismissToast(id), timeout)
    })

    this.emitter.on('settingsChanged', () => {
      const settings = this.$cookies.get('settings')
      if (settings) {
        if (settings.defaultTheme) this.$vuetify.theme.global.name = settings.defaultTheme
        if (settings.showHelpPane !== undefined) this.showHelpPane = Boolean(settings.showHelpPane)
        this.syncThemeAttr()
      }
      this.emitter.emit('themeChanged')
      if (this.modifier && typeof this.modifier.redraw === 'function') {
        this.modifier.redraw()
      }
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
      if (menu === undefined) {
        this.active = 'Graph'
      } else if (menu === 'Menu' || menu === 'Actions Menu') {
        // M / A open the command palette, scoped to that group
        this.openCommandPalette(menu === 'Menu' ? 'Menu' : 'Actions')
      } else {
        this.active = menu
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

    this.emitter.on('diagram:reload', (id) => {
      if (id) this.loadFromServer(id)
    })

    let _remoteReloadTimer = null
    this.emitter.on('diagram:updated-remote', () => {
      clearTimeout(_remoteReloadTimer)
      _remoteReloadTimer = setTimeout(() => {
        const id = this.d3dInfo?.id
        if (id) this.loadFromServer(id)
      }, 2000)
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

    /*NOTE - Global command palette shortcut (⌘K / Ctrl+K).
     * Capture phase + stopPropagation so the graph's own key handling
     * (⌘K would otherwise pan the viewport) never sees the event.
     */
    window.addEventListener('keydown', this.onGlobalKeydown, true)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onGlobalKeydown, true)
  },
  updated() {
    // console.log('component updated')
    // console.log(this.d3dInfo)
  },
  methods: {
    onGlobalKeydown(event) {
      const mod = event.metaKey || event.ctrlKey

      // ⌘K / Ctrl+K — toggle the command palette
      if (mod && event.key === 'k') {
        event.preventDefault()
        event.stopPropagation()
        if (this.showCommandPalette) this.closeCommandPalette()
        else this.openCommandPalette()
        return
      }

      // Alt/⌥ menu shortcuts — skip when palette is open or a text field has focus
      if (event.altKey && !mod && !this.showCommandPalette) {
        const tag = event.target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return
        const actionMap = {
          KeyN: 'New Diagram',
          KeyO: 'Open Diagram',
          KeyE: 'Edit Diagram',
          KeyS: 'Save Changes'
        }
        const action = actionMap[event.code]
        if (action) {
          event.preventDefault()
          event.stopPropagation()
          this.d3Action(action)
        }
      }
    },
    dismissToast(id) {
      const idx = this.toasts.findIndex((t) => t.id === id)
      if (idx !== -1) this.toasts.splice(idx, 1)
    },
    toggleTheme() {
      const next = this.$vuetify.theme.global.current.dark ? 'light' : 'dark'
      this.$vuetify.theme.global.name = next
      // Persist the choice so it survives a refresh
      try {
        const settings = this.$cookies.get('settings') || {}
        settings.defaultTheme = next
        this.$cookies.set('settings', settings)
      } catch (e) {
        /* settings unavailable — ignore */
      }
      // Sync data-theme before themeChanged so renderers read the new CSS vars
      this.syncThemeAttr()
      this.emitter.emit('themeChanged')
    },
    syncThemeAttr() {
      if (typeof document === 'undefined') return
      document.documentElement.setAttribute(
        'data-theme',
        this.$vuetify.theme.global.name === 'dark' ? 'dark' : 'light'
      )
    },
    loadDiagram(id) {
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

      if (!localDiagramInfo) {
        const model = markRaw(new GraphModel([]))
        model.colaConstraints = []
        this.d3dInfo = {
          id: D3Util.randomId(),
          name: '',
          description: '',
          created: new Date().toISOString(),
          diagram: model,
          colaConstraints: []
        }
        this.modifier = markRaw(new DiagramGraph(this.d3dInfo, this.emitter))
        this.emitter.emit('newDiagram')
        return
      }

      const parsed = migrateDiagramPayload(JSON.parse(localDiagramInfo.diagram))
      const model = markRaw(
        isGraphlibFormat(parsed) ? graphlibToModel(parsed) : new GraphModel(parsed)
      )
      model.colaConstraints = parsed.options?.constraints || []

      this.d3dInfo = localDiagramInfo
      this.d3dInfo.id = id
      this.d3dInfo.diagram = model
      this.d3dInfo.colaConstraints = model.colaConstraints

      this.modifier = markRaw(new DiagramGraph(this.d3dInfo, this.emitter))
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
        const parsed = migrateDiagramPayload(JSON.parse(serverDiagramInfo.diagram))
        const model = markRaw(
          isGraphlibFormat(parsed) ? graphlibToModel(parsed) : new GraphModel(parsed)
        )
        model.colaConstraints = parsed.options?.constraints || []

        this.d3dInfo = serverDiagramInfo
        this.d3dInfo.id = id
        this.d3dInfo.diagram = model
        this.d3dInfo.colaConstraints = model.colaConstraints

        this.modifier = markRaw(new DiagramGraph(this.d3dInfo, this.emitter))
        console.log(this.modifier)
      } catch (error) {
        this.emitter.emit('appMessage', {
          message: 'Unable to load saved diagram, resetting last saved id',
          result: error
        })
        this.$cookies.remove('LastLocallySavedItemId')

        console.log(error)
      }
    },
    successToggle() {
      console.log('success toggle')
    },
    loadingComplete() {
      this.$root.$emit('loadingComplete', this.options, this.id)
    },
    openCommandPalette(group) {
      this.commandGroup = group || null
      this.showCommandPalette = true
    },
    closeCommandPalette() {
      this.showCommandPalette = false
      this.commandGroup = null
    },
    runCommand(cmd) {
      this.closeCommandPalette()
      this.d3Action(cmd.title)
    },
    d3Action: async function (event) {
      MenuLinks.Click(event, this)
    }
  },
  computed: {
    commands() {
      return [
        ...this.menuLinks.map((l) => ({ ...l, group: 'Menu' })),
        ...this.actionLinks.map((l) => ({ ...l, group: 'Actions' }))
      ]
    }
  },
  watch: {
    // Drive the graph trap's release/re-arm from a single source so every
    // close path (Escape, overlay click, click-outside, run, ⌘K toggle) is
    // covered, not just the M/A/⌘K buttons.
    showCommandPalette(open) {
      if (open) {
        this.emitter.emit('paletteOpen')
      } else {
        // Wait a tick so the palette's focus trap has deactivated (and any
        // active-state watchers have settled) before the graph re-arms.
        this.$nextTick(() => this.emitter.emit('paletteClose'))
      }
    },

    active: function () {
      console.log('app.root.activewindow')
      if (this.active === 'Menu' || this.active === 'Actions Menu') {
        this.openCommandPalette(this.active === 'Menu' ? 'Menu' : 'Actions')
      }
    },

    '$vuetify.theme.global.name': function () {
      this.syncThemeAttr()
    }
  }
}
</script>

<style scoped>
.fx-toast-stack {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
}

.fx-toast {
  pointer-events: all;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-width: 220px;
  max-width: 380px;
  border-radius: 8px;
  background: rgba(var(--fx-glass-bottom), 0.94);
  border: 1px solid rgba(var(--fx-accent), 0.3);
  backdrop-filter: blur(14px);
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: rgb(var(--fx-ink));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28);
  cursor: pointer;
}

.fx-toast-success {
  border-color: rgba(38, 166, 154, 0.55);
}
.fx-toast-error {
  border-color: rgba(239, 83, 80, 0.55);
}
.fx-toast-info {
  border-color: rgba(var(--fx-accent), 0.45);
}

.fx-toast-icon {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  width: 16px;
  text-align: center;
}

.fx-toast-success .fx-toast-icon {
  color: #26a69a;
}
.fx-toast-error .fx-toast-icon {
  color: #ef5350;
}
.fx-toast-info .fx-toast-icon {
  color: rgb(var(--fx-accent));
}

.fx-toast-msg {
  flex: 1;
  line-height: 1.45;
  letter-spacing: 0.02em;
}

.fx-toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgb(var(--fx-ink-dim));
  font-size: 11px;
  cursor: pointer;
  padding: 0 0 0 8px;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.fx-toast-close:hover {
  opacity: 1;
}

.fx-toast-enter-active {
  transition:
    transform 0.22s ease-out,
    opacity 0.22s ease-out;
}
.fx-toast-leave-active {
  transition:
    transform 0.18s ease-in,
    opacity 0.18s ease-in;
}
.fx-toast-enter-from,
.fx-toast-leave-to {
  transform: translateX(115%);
  opacity: 0;
}

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
  --aug-border-bg: green;
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

<!--
<link href='https://fonts.googleapis.com/css?family=Material+Icons' rel='stylesheet'/>
<link href='https://fonts.googleapis.com/css?family=Lato:300,400,700' rel='stylesheet' type='text/css'/>
<style src='./assets/css/parallax.css'></link>
<style src='../node_modules/augmented-ui/augmented-ui.min.css'>
-->
