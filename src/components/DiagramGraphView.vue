<template>
  <div @keydown.prevent="keyPress($event)">
    <FocusTrap
      v-model:active="trapGraph"
      :escapeDeactivates="false"
      :delayInitialFocus="true"
      :initial-focus="() => $refs.threeContainer"
      ref="graphTrap"
    >
      <div id="trap" ref="trapDiv" class="trap is-active">
        <div v-if="diagramInfo" class="d3d-info">
          <h1>D3DInfo:</h1>
          SelectedNodes: {{ selectedNodes }} <br />
          SelectedEdges: {{ selectedEdges }} <br />
          DoubleSelection: {{ doubleSelection }} <br />
          FocusedEdgeID: {{ focusedEdgeId }} <br />
          FocusedNodeID: {{ focusedNodeId }} <br />
          Hints: {{ hints }} <br />
          FocusedIndex: {{ focusedIndex }} <br />
          EdgesOrNodes: {{ edgeOrNode }} <br />
        </div>

        <!-- Three.js mounts its CSS3D + WebGL canvases here -->
        <div
          ref="threeContainer"
          tabindex="0"
          class="three-container"
          @mousedown="_onContainerMousedown"
          @focusout="onContainerFocusOut"
        />

        <div v-if="!graphEmpty" class="fx-viewport-hud">
          <span class="fx-vp-item">
            <span class="fx-vp-k">ZOOM</span>
            <span class="fx-vp-v">{{ zoomDisplay }}</span>
          </span>
          <span class="fx-vp-sep">·</span>
          <span class="fx-vp-item">
            <span class="fx-vp-v">{{ nodeCount }}</span>
            <span class="fx-vp-k">N</span>
          </span>
          <span class="fx-vp-sep">·</span>
          <span class="fx-vp-item">
            <span class="fx-vp-v">{{ edgeCount }}</span>
            <span class="fx-vp-k">E</span>
          </span>
        </div>

        <div v-if="hasPeers" class="collab-peers-hud">
          <span
            v-for="(peer, cid) in peers"
            :key="cid"
            class="peer-avatar"
            :style="{ background: peer.color }"
            :title="peer.displayName"
            >{{ initials(peer.displayName) }}</span
          >
        </div>

        <div v-if="isViewOnly" class="view-only-badge">VIEW ONLY</div>
        <div v-if="embedMode" class="embed-fork-bar">
          <button
            v-if="loggedIn"
            class="embed-fork-btn"
            title="Save a copy to your account"
            @click="$emit('fork-embed')"
          >
            Fork to my account
          </button>
          <span v-else class="embed-login-hint">
            <a href="#" @click.prevent="$emit('embed-login')">Log in</a> to fork this diagram
          </span>
        </div>

        <div v-if="graphEmpty" class="graph-empty-hint">
          Empty diagram — press <span class="kbd">n</span> to create a node
          <span class="sep">·</span>
          <span class="kbd">/</span> for help
        </div>
      </div>
    </FocusTrap>

    <Teleport to="body">
      <transition name="fx-scrim">
        <div v-if="openSheet" class="fx-scrim" @click="cancelForm()"></div>
      </transition>
      <transition name="fx-panel">
        <div v-if="openSheet" class="fx-hud-stage">
          <D3EdgeForm
            v-if="active === 'Add Edge' || active === 'Edit Edge'"
            :active="active"
            :d3Data="d3Data"
          />
          <D3NodeForm
            v-if="active === 'Add Node' || active === 'Edit Node'"
            :key="active"
            :active="active"
            :d3Data="d3Data"
          />
        </div>
      </transition>
      <transition name="fx-scrim">
        <div v-if="showHistory" class="fx-scrim" @click="showHistory = false"></div>
      </transition>
      <transition name="fx-panel">
        <div v-if="showHistory" class="fx-hud-stage">
          <HistoryPanel
            :dagId="(modifier?.value ?? modifier)?.d3dInfo?.id || 'unsaved'"
            @close="showHistory = false"
            @restored="onHistoryRestored"
          />
        </div>
      </transition>
      <transition name="fx-scrim">
        <div v-if="showShare" class="fx-scrim" @click="showShare = false"></div>
      </transition>
      <transition name="fx-panel">
        <div v-if="showShare" class="fx-hud-stage">
          <ShareDialog
            :dagId="(modifier?.value ?? modifier)?.d3dInfo?.id"
            :graphlibJson="graphlibJson"
            @close="showShare = false"
          />
        </div>
      </transition>
      <transition name="fx-scrim">
        <div v-if="showElementShare" class="fx-scrim" @click="_closeElementShare()"></div>
      </transition>
      <transition name="fx-panel">
        <div v-if="showElementShare" class="fx-hud-stage">
          <ElementShareDialog
            :dagId="(modifier?.value ?? modifier)?.d3dInfo?.id"
            :selectedNodeIds="selectedNodeIds"
            @close="_closeElementShare()"
          />
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import D3Util from '@/helpers/D3Util'
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer'
import { modelToGraphlib } from '@/helpers/graphlibMigration'
import { markRaw } from 'vue'
import D3EdgeForm from '@/components/D3EdgeForm.vue'
import D3NodeForm from '@/components/D3NodeForm.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ShareDialog from '@/components/ShareDialog.vue'
import ElementShareDialog from '@/components/ElementShareDialog.vue'
import Hints from '@/helpers/Hints.js'
import AltKeys from '@/helpers/AltKeys.js'
import OtherKeys from '@/helpers/OtherKeys.js'
import * as collab from '@/services/collab'
import { resolveGraphKey } from '@/helpers/GraphKeys.js'

function _decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

function _isViewOnly() {
  const claims = _decodeJwt(localStorage.getItem('token') || '')
  return claims.iss === 'd3d-share' && claims.role !== 'edit'
}

const _PEER_COLORS = ['#ef5350', '#ab47bc', '#29b6f6', '#26a69a', '#ffb300', '#66bb6a']
function _sessionColor() {
  const id = sessionStorage.getItem('d3d_collab_client_id') || ''
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return _PEER_COLORS[Math.abs(h) % _PEER_COLORS.length]
}

export default {
  name: 'DiagramGraphView',
  props: ['active', 'embedMode', 'loggedIn'],
  emits: ['fork-embed', 'embed-login'],
  inject: ['modifier'],
  components: { D3NodeForm, D3EdgeForm, HistoryPanel, ShareDialog, ElementShareDialog },
  data() {
    return {
      edgeOrNode: 'nodes',
      focusedIndex: null,
      trapGraph: true,
      focusedEdgeId: null,
      focusedNodeId: null,
      hintKeysReplaced: '',
      hints: {},
      d3Data: {},
      diagramInfo: false,
      selectedNodes: [],
      selectedEdges: [],
      doubleSelection: [],
      openSheet: false,
      paletteOpen: false,
      escCount: 0,
      threeDRenderer: null,
      graphEmpty: false,
      zoomLevel: 1,
      nodeCount: 0,
      edgeCount: 0,
      peers: {},
      collabStatus: 'disconnected',
      showHistory: false,
      showShare: false,
      showElementShare: false
    }
  },
  mounted() {
    const settings = this.$cookies.get('settings')
    if (settings) {
      this.diagramInfo = settings['d3dInfo']
    }

    // Initialise Three.js renderer and attach to the current modifier
    this._initRenderer()

    this.emitter.on('node-click', this._onNodeClick)
    this.emitter.on('editNode', () => this._openEdit('nodes'))
    this.emitter.on('editEdge', () => this._openEdit('edges'))
    this.emitter.on('shareSelection', () => this._openElementShare())
    this.emitter.on('d3ResetValues', () => this.resetValues())
    this.emitter.on('scene-updated', ({ count, nodes, edges }) => {
      this.graphEmpty = count === 0
      this.nodeCount = nodes || 0
      this.edgeCount = edges || 0
    })
    this.emitter.on('viewport-changed', ({ zoom }) => {
      this.zoomLevel = zoom
    })

    this.emitter.on('setSheetToFalse', () => {
      this.openSheet = false
      this.threeDRenderer?.zoomOut()
      this._clearMultiSelection()
      setTimeout(() => this.emitter.emit('changeActive'), 300)
    })

    this.emitter.on('edgeOrNode', (selection) => {
      if (selection === 'Select Edges' || selection === 'Select Node') {
        this._setMode(selection === 'Select Edges' ? 'edges' : 'nodes')
      }
    })

    // The command palette steals focus; release the graph trap so the two
    // don't fight over focus, then re-arm it on close (only if still Graph).
    // track paletteOpen so onContainerFocusOut never yanks focus back while
    // the palette owns it.
    this.emitter.on('paletteOpen', () => {
      this.paletteOpen = true
      this.trapGraph = false
    })
    this.emitter.on('paletteClose', () => {
      this.paletteOpen = false
      if (this.active === 'Graph') this.trapGraph = true
    })

    if (import.meta.env.VITE_COLLAB_ENABLED === 'true') {
      collab.onStatusChange((s) => {
        this.collabStatus = s
      })
      collab.onPresence((msg) => {
        this.peers = { ...this.peers, [msg.clientId]: msg }
        this.threeDRenderer?.setPeerSelections(this.peers)
      })
      collab.onDiagramUpdated((msg) => {
        this.emitter.emit('diagram:updated-remote', msg)
      })
    }
  },
  beforeUnmount() {
    if (this.threeDRenderer) this.threeDRenderer.teardown()
    if (import.meta.env.VITE_COLLAB_ENABLED === 'true') collab.disconnect()
  },
  methods: {
    _initRenderer() {
      const container = this.$refs.threeContainer
      if (!container) return

      if (!this.threeDRenderer) {
        this.threeDRenderer = markRaw(new CytoscapeRenderer(container, this.emitter))
        this.threeDRenderer.init()
      }

      // Connect to modifier if it is already a DiagramGraph
      const mod = this.modifier?.value ?? this.modifier
      if (mod && typeof mod.redraw === 'function') {
        mod.renderer = this.threeDRenderer
        mod.redraw()
      }
    },

    // Cytoscape blurs the container on every mousedown (blurActiveDomElement),
    // which drops focus to <body> without firing a focusin, so the focus trap
    // can't pull it back. When focus is lost entirely while the graph is the
    // active view (no edit sheet is open), restore it so the keyboard
    // shortcuts keep working after any mouse/trackpad interaction.
    //
    // Two safeguards against focus loops:
    //  - skip entirely while the command palette is open (it owns focus), and
    //  - defer the refocus to a macrotask: calling el.focus() synchronously
    //    inside the el's own focusout handler while focus moved to <body>
    //    recurses in Chromium and blows the stack.
    onContainerFocusOut() {
      if (
        this.active !== 'Graph' ||
        this.openSheet ||
        this.paletteOpen ||
        document.activeElement !== document.body
      )
        return
      const el = this.$refs.threeContainer
      if (!el) return
      setTimeout(() => {
        if (
          this.active !== 'Graph' ||
          this.openSheet ||
          this.paletteOpen ||
          document.activeElement !== document.body ||
          document.activeElement === el
        )
          return
        el.focus({ preventScroll: true })
      }, 0)
    },

    _onHintBadgeClick(event) {
      event.preventDefault()
      const anchor = event.currentTarget?.parentElement
      const hints = new Hints()
      hints.data = this.hints
      hints.removeHints(this.hints)
      this.hints = {}
      this.hintKeysReplaced = ''
      if (anchor) this.hintSelection(anchor)
    },

    _onNodeClick(nodeId) {
      const mod = this.modifier?.value ?? this.modifier
      if (!mod) return
      const data = mod.getNodeData(nodeId)
      if (D3Util.debug) console.log('[node-click]', nodeId, data)
      this.d3Data = data
      this.focusedNodeId = nodeId
      this.threeDRenderer?.setFocusedNode(nodeId)
      this.emitter.emit('changeActive', 'Edit Node')
      this.openSheet = true
    },

    // Actions-menu "Edit Node"/"Edit Edge" — mirrors the 'e' keyboard shortcut:
    // populate from the currently focused element and only open the form when
    // there is something to edit.
    _openEdit(which) {
      if (_isViewOnly()) return
      const mod = this.modifier?.value ?? this.modifier
      if (!mod) return
      const isNode = which === 'nodes'
      const id = isNode ? this.focusedNodeId : this.focusedEdgeId
      const data = id ? (isNode ? mod.getNodeData(id) : mod.getEdgeData(id)) : null
      if (!data?.id) {
        this.emitter.emit('appMessage', {
          message: `Focus a ${isNode ? 'node' : 'edge'} first (j/k to navigate) to edit it`,
          status: 'info'
        })
        return
      }
      this.d3Data = data
      this.emitter.emit('changeActive', isNode ? 'Edit Node' : 'Edit Edge')
      this.openSheet = true
    },

    hintSelection(data) {
      if (_isViewOnly()) return
      if (D3Util.debug) console.log('hintSelection', data)
      const mod = this.modifier?.value ?? this.modifier
      if (!mod) return

      // Edge hint anchor (cytoscape edge midpoint)
      if (data.dataset?.type === 'edge') {
        const edgeId = data.dataset.edgeId
        if (!edgeId) return
        this.d3Data = mod.getEdgeData(edgeId)
        this.focusedEdgeId = edgeId
        this.emitter.emit('changeActive', 'Edit Edge')
        this.openSheet = true
        return
      }

      // Node hint anchor
      const nodeId = data?.dataset?.nodeId
      if (!nodeId) return

      if (data.dataset?.edgeSource && data.dataset?.edgeTarget) {
        this.d3Data = mod.getEdgeData(data.id)
        this.emitter.emit('changeActive', 'Edit Edge')
      } else {
        this.d3Data = mod.getNodeData(nodeId)
        this.focusedNodeId = nodeId
        this.threeDRenderer?.setFocusedNode(nodeId)
        this.emitter.emit('changeActive', 'Edit Node')
      }
      this.openSheet = true
    },

    keyPress(event) {
      // When the element-share dialog is open, let it own all keys
      if (this.showElementShare) {
        if (event.key === 'Escape') this._closeElementShare()
        return
      }

      // Ignore keystrokes typed into form fields (forms handle their own keys)
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // View-only share links: block all mutating operations
      if (_isViewOnly()) {
        const mutatingKeys = ['e', 'x', 'S', 'a', 'n']
        if (event.altKey || event.metaKey || mutatingKeys.includes(event.key)) return
      }

      // Ignore modifier-only, navigation and function keys (not shortcuts)
      const ignored = [
        'Alt',
        'Control',
        'Meta',
        'Shift',
        'CapsLock',
        'Tab',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Backspace',
        'Delete',
        'Home',
        'End',
        'PageUp',
        'PageDown',
        'ContextMenu',
        'NumLock',
        'ScrollLock',
        'PrintScreen',
        'Pause',
        'Unidentified'
      ]
      if (ignored.includes(event.key) || event.key.startsWith('F')) return

      const mod = this.modifier?.value ?? this.modifier
      if (!mod || typeof mod.redraw !== 'function') return

      mod.focusedIndex = this.focusedIndex
      mod.selectedNodes = this.selectedNodes
      mod.doubleSelection = this.doubleSelection
      mod.selectedEdges = this.selectedEdges

      if (D3Util.debug) console.log('keyPress', event)

      if (Object.keys(this.hints).length >= 1) {
        const hints = new Hints()
        hints.data = this.hints
        hints.hintKeysReplaced = this.hintKeysReplaced
        const data = hints.followLinks(event)

        if (Object.keys(data.hints).length > 1) {
          this.hints = data.hints
          this.hintKeysReplaced = data.hintKeys
        } else {
          if (event.key !== 'Escape') {
            const target = data.hints[data.hintKeys]
            if (target) this.hintSelection(target)
          }
          this.hints = {}
          this.hintKeysReplaced = ''
          hints.removeHints(data.hints)
        }
      } else {
        const graph = resolveGraphKey(event, {
          modifier: mod,
          edgeOrNode: this.edgeOrNode,
          focusedNodeId: this.focusedNodeId,
          focusedEdgeId: this.focusedEdgeId
        })

        if (D3Util.debug) console.log('keyPress result', graph)

        if (!graph) {
          if (event.altKey === true || event.metaKey === true) {
            const altKeys = new AltKeys(this.emitter, mod)
            const reset = altKeys.key(event.key, this)
            if (reset) this.resetValues()
          }
          return
        }

        switch (graph.action) {
          case 'menu':
            this.emitter.emit('changeActive', 'Menu')
            break
          case 'help':
            this.emitter.emit('showHelp')
            break
          case 'actionsMenu':
            this.emitter.emit('changeActive', 'Actions Menu')
            break
          case 'toggleTheme':
            this.emitter.emit('toggleTheme')
            break
          case 'addNode':
            mod.addNode(D3Util.defaultNodeValues())
            break
          case 'addEdge':
            mod.addEdge(D3Util.defaultEdgeValues())
            this._clearMultiSelection()
            break
          case 'edit':
            this.d3Data = graph.data
            this.emitter.emit('changeActive', graph.mode)
            this.openSheet = true
            break
          case 'share':
            if (mod?.d3dInfo?.id) this.showShare = true
            break
          case 'shareSelection':
            this._openElementShare()
            break
          case 'delete':
            if (this.edgeOrNode === 'nodes') {
              const ok = mod.deleteNode(this.focusedNodeId)
              if (ok) this.focusedNodeId = null
              else
                this.emitter.emit('appMessage', {
                  message: 'Unable to delete node',
                  status: 'info'
                })
            } else {
              const ok = mod.deleteEdge(this.focusedEdgeId)
              if (ok) this.focusedEdgeId = null
              else
                this.emitter.emit('appMessage', {
                  message: 'Unable to delete edge',
                  status: 'info'
                })
            }
            break
          case 'copy':
            mod.createCopyV2(this.focusedNodeId)
            break
          case 'showHints':
            this.hints = new OtherKeys(this.emitter, mod, this._onHintBadgeClick).F(this.edgeOrNode)
            break
          case 'select': {
            const sel = new OtherKeys(this.emitter, mod, this._onHintBadgeClick)
            sel.focusedIndex = this.focusedIndex
            sel.focusedNodeId = this.focusedNodeId
            sel.focusedEdgeId = this.focusedEdgeId
            const selection = sel.enter(this.edgeOrNode)
            this.selectedNodes = selection.selectedNodes
            this.doubleSelection = selection.doubleSelection
            mod.selectedNodes = selection.selectedNodes
            mod.doubleSelection = selection.doubleSelection
            this._syncSelectionCrosshairs()
            break
          }
          case 'selectNodes':
          case 'selectEdges': {
            const mode = graph.action === 'selectEdges' ? 'edges' : 'nodes'
            if (this._setMode(mode)) {
              this.emitter.emit('appMessage', {
                message:
                  mode === 'edges'
                    ? 'Selecting edges — j/k/h/l to focus, Enter to select'
                    : 'Selecting nodes — j/k/h/l to focus, Enter to select',
                status: 'info'
              })
            }
            break
          }
          case 'cycleCurveStyle': {
            if (this.edgeOrNode === 'edges' && this.focusedEdgeId) {
              const next = mod.cycleEdgeCurve(this.focusedEdgeId)
              if (next) {
                this.emitter.emit('appMessage', { message: `Curve: ${next}`, status: 'info' })
              }
            } else {
              this.emitter.emit('appMessage', {
                message: 'Focus an edge first (Shift+E, then j/k) to cycle its curve style',
                status: 'info'
              })
            }
            break
          }
          case 'history':
            if (mod) this.showHistory = true
            break
          case 'close':
            if (this.escCount >= 2) this.resetValues()
            else this.escCount++
            break
          case 'nav': {
            const nav = new OtherKeys(this.emitter, mod, this._onHintBadgeClick)
            nav.focusedIndex = this.focusedIndex
            nav.focusedNodeId = this.focusedNodeId
            nav.focusedEdgeId = this.focusedEdgeId
            const selectedId = nav._navigate(graph.direction, this.edgeOrNode)
            if (this.edgeOrNode === 'nodes') this.focusedNodeId = selectedId
            else this.focusedEdgeId = selectedId
            this.focusedIndex = nav.focusedIndex
            break
          }
        }
      }
    },

    _onContainerMousedown(event) {
      event.currentTarget.focus()
      event.preventDefault()
    },

    // Shared by the Actions Menu and the selectNodes/selectEdges shortcuts.
    // Returns true only when the mode actually changed, and resets the focus
    // index since it refers to a position in the previous element list.
    _setMode(mode) {
      if (this.edgeOrNode === mode) return false
      this.edgeOrNode = mode
      this.focusedIndex = null
      return true
    },

    initials(name) {
      return (name || '?')
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    },

    _openElementShare() {
      const mod = this.modifier?.value ?? this.modifier
      if (!mod?.d3dInfo?.id) return
      const focused = this.edgeOrNode === 'edges' ? this.focusedEdgeId : this.focusedNodeId
      if (!focused) {
        this.emitter.emit('appMessage', {
          message: 'Focus a node or edge first (hjkl), then press Shift+O to share',
          status: 'info'
        })
        return
      }
      this.showElementShare = true
    },

    _closeElementShare() {
      this.showElementShare = false
    },

    onHistoryRestored(payload) {
      this.showHistory = false
      if (payload?.source === 'local') {
        this.emitter.emit('diagram:restore-local', payload.snapshot)
        return
      }
      const mod = this.modifier?.value ?? this.modifier
      const id = mod?.d3dInfo?.id
      if (id) this.emitter.emit('diagram:reload', id)
    },

    _clearMultiSelection() {
      this.selectedNodes = []
      this.selectedEdges = []
      this.doubleSelection = []
      this.threeDRenderer?.clearSelectionCrosshairs()
      const mod = this.modifier?.value ?? this.modifier
      if (mod) {
        mod.selectedNodes = []
        mod.doubleSelection = []
        mod.selectedEdges = []
      }
    },

    cancelForm() {
      this.emitter.emit('setSheetToFalse')
    },

    resetValues() {
      const mod = this.modifier?.value ?? this.modifier
      if (mod) {
        if (this.focusedNodeId) mod.removeNodeSelectionById(this.focusedNodeId)
        if (this.focusedEdgeId) mod.removeEdgeSelectionById(this.focusedEdgeId)
      }
      this.threeDRenderer?.clearSelectionCrosshairs()
      this.selectedNodes = []
      this.selectedEdges = []
      this.doubleSelection = []
      this.focusedIndex = null
      this.focusedEdgeId = null
      this.focusedNodeId = null
      this.escCount = 0
      if (mod) mod.redraw()
      this.emitter.emit('changeActive')
    },

    // Resolve Enter-selected node indices to ids and tell the renderer to
    // draw a crosshair over each selected node.
    _syncSelectionCrosshairs() {
      const mod = this.modifier?.value ?? this.modifier
      if (!mod || !this.threeDRenderer) return
      const ids = (this.selectedNodes || []).map((i) => mod.getNodeId(i)).filter(Boolean)
      const dIds = (this.doubleSelection || []).map((i) => mod.getNodeId(i)).filter(Boolean)
      this.threeDRenderer.setSelectedNodes(ids, dIds)
    }
  },
  computed: {
    zoomDisplay() {
      return (this.zoomLevel || 1).toFixed(2) + '×'
    },
    hasPeers() {
      return Object.keys(this.peers).length > 0
    },
    isViewOnly() {
      return !!this.embedMode || _isViewOnly()
    },
    graphlibJson() {
      const mod = this.modifier?.value ?? this.modifier
      return mod?.cy ? modelToGraphlib(mod.cy) : null
    },
    selectedNodeIds() {
      if (this.edgeOrNode === 'edges') {
        return this.focusedEdgeId ? [this.focusedEdgeId] : []
      }
      return this.focusedNodeId ? [this.focusedNodeId] : []
    }
  },
  watch: {
    // When App.vue replaces the modifier (new diagram opened), reconnect renderer
    modifier: {
      handler(newMod) {
        const mod = newMod?.value ?? newMod
        if (mod && typeof mod.redraw === 'function' && this.threeDRenderer) {
          mod.renderer = this.threeDRenderer
          const noLayout = mod._noLayout
          mod._noLayout = false
          mod.redraw(noLayout ? { layout: false } : {})
        }
        if (import.meta.env.VITE_COLLAB_ENABLED === 'true') {
          collab.disconnect()
          this.peers = {}
          const id = mod?.d3dInfo?.id
          if (id) collab.connect(id)
        }
      },
      deep: false
    },
    focusedNodeId(id) {
      if (import.meta.env.VITE_COLLAB_ENABLED !== 'true') return
      const payload = _decodeJwt(localStorage.getItem('token') || '')
      collab.sendPresence({
        displayName:
          localStorage.getItem('d3d_anon_name') || payload.username || payload.sub || 'Guest',
        color: _sessionColor(),
        selection: id ? [id] : []
      })
    },
    active(val) {
      if (this.escCount === 3) {
        this.selectedNodes = []
        this.selectedEdges = []
        this.focusedIndex = null
        this.focusedEdgeId = null
        this.focusedNodeId = null
        this.escCount = 0
      } else {
        this.escCount++
      }
      this.trapGraph = val === 'Graph'

      const isEdit =
        val === 'Add Node' || val === 'Edit Node' || val === 'Add Edge' || val === 'Edit Edge'
      this.openSheet = isEdit
      if (isEdit) {
        this.$nextTick(() => this.threeDRenderer?.zoomTo(this.d3Data?.id))
      }
    }
  }
}
</script>

<style scoped>
.three-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  outline: none;
  background-color: rgb(var(--fx-glass-bottom));
  background-image: radial-gradient(circle, rgba(var(--fx-muted), 0.22) 1px, transparent 1px);
  background-repeat: repeat;
  background-size: 28px 28px;
  background-position: 0 0;
}

:global(.v-theme--light .three-container) {
  background-image: radial-gradient(circle, rgba(var(--fx-muted), 0.55) 1px, transparent 1px);
}

.fx-viewport-hud {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: rgba(var(--fx-glass-bottom), 0.82);
  border: 1px solid rgba(var(--fx-accent), 0.28);
  border-radius: 5px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.fx-vp-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.fx-vp-k {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--fx-ink-dim));
}

.fx-vp-v {
  font-size: 11px;
  color: rgb(var(--fx-ink));
}

.fx-vp-sep {
  color: rgb(var(--fx-ink-dim));
  opacity: 0.5;
}

.graph-empty-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  padding: 10px 18px;
  border-radius: 10px;
  background: rgba(var(--v-theme-surface), 0.7);
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.kbd {
  display: inline-block;
  padding: 1px 7px;
  margin: 0 2px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.4);
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-family: monospace;
  font-size: 12px;
}

.sep {
  margin: 0 6px;
  opacity: 0.5;
}

.d3d-info {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 4px 8px;
  font-size: 11px;
  pointer-events: none;
}

h1,
h2 {
  font-weight: normal;
}

.collab-peers-hud {
  position: absolute;
  top: 10px;
  left: 12px;
  z-index: 6;
  display: flex;
  gap: 6px;
  pointer-events: none;
}

.peer-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.05em;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  cursor: default;
}

.view-only-badge {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 6;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.embed-fork-bar {
  /* Fixed + raised above the app footer (which overlays the bottom-right
     corner and hides this bar when pinned to the container edge). */
  position: fixed;
  bottom: 60px;
  right: 12px;
  z-index: 210;
  display: flex;
  align-items: center;
  gap: 8px;
}

.embed-fork-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.6);
  background: rgba(var(--fx-glass-bottom), 0.9);
  color: rgb(var(--fx-ink));
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: background 0.15s;
}

.embed-fork-btn:hover {
  background: rgba(var(--fx-accent), 0.2);
}

.embed-login-hint {
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  color: rgba(var(--fx-ink), 0.7);
  background: rgba(var(--fx-glass-bottom), 0.85);
  padding: 6px 12px;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.embed-login-hint a {
  color: rgb(var(--fx-accent));
  text-decoration: none;
}
</style>
