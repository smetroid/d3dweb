<template>
  <div
    @keydown.prevent="keyPress($event)"
  >
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
          SelectedNodes: {{ selectedNodes }} <br>
          SelectedEdges: {{ selectedEdges }} <br>
          DoubleSelection: {{ doubleSelection }} <br>
          FocusedEdgeID: {{ focusedEdgeId }} <br>
          FocusedNodeID: {{ focusedNodeId }} <br>
          Hints: {{ hints }} <br>
          FocusedIndex: {{ focusedIndex }} <br>
          EdgesOrNodes: {{ edgeOrNode }} <br>
        </div>

        <!-- Three.js mounts its CSS3D + WebGL canvases here -->
        <div
          ref="threeContainer"
          tabindex="0"
          class="three-container"
          @mousedown="$event.currentTarget.focus(); $event.preventDefault()"
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

        <div v-if="graphEmpty" class="graph-empty-hint">
          Empty diagram —
          press <span class="kbd">n</span> to create a node
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
    </Teleport>
  </div>
</template>

<script>
import D3Util from '@/helpers/D3Util'
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer'
import { markRaw } from 'vue'
import D3EdgeForm from '@/components/D3EdgeForm.vue'
import D3NodeForm from '@/components/D3NodeForm.vue'
import Hints from '@/helpers/Hints.js'
import AltKeys from '@/helpers/AltKeys.js'
import OtherKeys from '@/helpers/OtherKeys.js'

export default {
  name: 'DiagramGraphView',
  props: ['active'],
  inject: ['modifier'],
  components: { D3NodeForm, D3EdgeForm },
  data() {
    return {
      edgeOrNode:      'nodes',
      focusedIndex:    null,
      trapGraph:       true,
      focusedEdgeId:   null,
      focusedNodeId:   null,
      hintKeysReplaced: '',
      hints:           {},
      d3Data:          {},
      diagramInfo:     false,
      selectedNodes:   [],
      selectedEdges:   [],
      doubleSelection: [],
      openSheet:       false,
      escCount:        0,
      threeDRenderer:  null,
      graphEmpty:      false,
      zoomLevel:       1,
      nodeCount:       0,
      edgeCount:       0,
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
    this.emitter.on('d3ResetValues', () => this.resetValues())
    this.emitter.on('scene-updated', ({ count, nodes, edges }) => {
      this.graphEmpty = count === 0
      this.nodeCount  = nodes || 0
      this.edgeCount  = edges || 0
    })
    this.emitter.on('viewport-changed', ({ zoom }) => { this.zoomLevel = zoom })

    this.emitter.on('setSheetToFalse', () => {
      this.openSheet = false
      this.threeDRenderer?.zoomOut()
      this._clearMultiSelection()
      setTimeout(() => this.emitter.emit('changeActive'), 300)
    })

    this.emitter.on('edgeOrNode', (selection) => {
      if (selection === 'Select Edges')     this.edgeOrNode = 'edges'
      else if (selection === 'Select Node') this.edgeOrNode = 'nodes'
    })
  },
  beforeUnmount() {
    if (this.threeDRenderer) this.threeDRenderer.teardown()
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
    // active view (and no edit sheet is open), restore it so the keyboard
    // shortcuts keep working after any mouse/trackpad interaction.
    onContainerFocusOut() {
      if (
        this.active === 'Graph' &&
        !this.openSheet &&
        document.activeElement === document.body
      ) {
        this.$refs.threeContainer?.focus({ preventScroll: true })
      }
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
      const mod = this.modifier?.value ?? this.modifier
      if (!mod) return
      const isNode = which === 'nodes'
      const id = isNode ? this.focusedNodeId : this.focusedEdgeId
      const data = id ? (isNode ? mod.getNodeData(id) : mod.getEdgeData(id)) : null
      if (!data?.id) {
        this.emitter.emit('appMessage', {
          message: `Focus a ${isNode ? 'node' : 'edge'} first (j/k to navigate) to edit it`,
          status: 'info',
        })
        return
      }
      this.d3Data = data
      this.emitter.emit('changeActive', isNode ? 'Edit Node' : 'Edit Edge')
      this.openSheet = true
    },

    hintSelection(data) {
      if (D3Util.debug) console.log('hintSelection', data)

      // data is the node-card HTML element; its nodeId is on dataset
      const nodeId = data?.dataset?.nodeId
      if (!nodeId) return

      const mod = this.modifier?.value ?? this.modifier
      // If the element stores edge info (v+w) treat as edge, else as node
      if (data.dataset?.edgeSource && data.dataset?.edgeTarget) {
        this.d3Data = mod.getEdgeData(data.id)
        this.emitter.emit('changeActive', 'Edit Edge')
      } else {
        this.d3Data = mod.getNodeData(nodeId)
        this.emitter.emit('changeActive', 'Edit Node')
      }
      this.openSheet = true
    },

    keyPress(event) {
      // Ignore keystrokes typed into form fields (forms handle their own keys)
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Ignore modifier-only, navigation and function keys (not shortcuts)
      const ignored = ['Alt', 'Control', 'Meta', 'Shift', 'CapsLock', 'Tab',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace',
        'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'ContextMenu',
        'NumLock', 'ScrollLock', 'PrintScreen', 'Pause', 'Unidentified']
      if (ignored.includes(event.key) || event.key.startsWith('F')) return

      const mod = this.modifier?.value ?? this.modifier
      if (!mod || typeof mod.redraw !== 'function') return

      mod.focusedIndex   = this.focusedIndex
      mod.selectedNodes  = this.selectedNodes
      mod.doubleSelection = this.doubleSelection
      mod.selectedEdges  = this.selectedEdges

      if (D3Util.debug) console.log('keyPress', event)

      if (Object.keys(this.hints).length > 1) {
        const hints = new Hints()
        hints.data             = this.hints
        hints.hintKeysReplaced = this.hintKeysReplaced
        const data = hints.followLinks(event)

        if (Object.keys(data.hints).length > 1) {
          this.hints           = data.hints
          this.hintKeysReplaced = data.hintKeys
        } else {
          if (event.key !== 'Escape') {
            this.hintSelection(data.hints[data.hintKeys])
          }
          this.hints           = {}
          this.hintKeysReplaced = ''
          hints.removeHints(data.hints)
        }
      } else if (event.altKey === true || event.metaKey === true) {
        const altKeys = new AltKeys(this.emitter, mod)
        const reset   = altKeys.key(event.key, this)
        if (reset) this.resetValues()
      } else {
        const otherKeys = new OtherKeys(this.emitter, mod, this._onHintBadgeClick)
        const result    = otherKeys.defaultActions(
          event.key, this.edgeOrNode, this.focusedNodeId, this.focusedEdgeId
        )

        if (D3Util.debug) console.log('keyPress result', result)

        if (event.key === 'e') {
          if (!result) return
          this.d3Data    = result
          this.openSheet = true
        }

        if (event.key === 'd') {
          this._clearMultiSelection()
        }

        if (result) {
          if (event.key === 'x') {
            if (this.edgeOrNode === 'nodes') {
              const ok = mod.deleteNode(this.focusedNodeId)
              if (ok) this.focusedNodeId = null
              else this.emitter.emit('appMessage', { message: 'Unable to delete node', status: 'info' })
            } else {
              const ok = mod.deleteEdge(this.focusedEdgeId)
              if (ok) this.focusedEdgeId = null
              else this.emitter.emit('appMessage', { message: 'Unable to delete edge', status: 'info' })
            }
          } else if (event.key === 'f') {
            this.hints = result.hints
          } else if (event.key === 'Enter') {
            this.selectedNodes   = result.selectedNodes
            this.doubleSelection = result.doubleSelection
            mod.selectedNodes    = result.selectedNodes
            mod.doubleSelection  = result.doubleSelection
            this._syncSelectionCrosshairs()
          } else if (event.key === 'Escape') {
            if (this.escCount >= 2) this.resetValues()
            else this.escCount++
          } else if (event.key === 'y') {
            mod.createCopyV2(this.focusedNodeId)
          } else {
            if (this.edgeOrNode === 'nodes')      this.focusedNodeId = result.nodesId
            else if (this.edgeOrNode === 'edges') this.focusedEdgeId = result.edgesId
            this.focusedIndex = result.index
          }
        }
      }
    },

    _clearMultiSelection() {
      this.selectedNodes   = []
      this.selectedEdges   = []
      this.doubleSelection = []
      this.threeDRenderer?.clearSelectionCrosshairs()
      const mod = this.modifier?.value ?? this.modifier
      if (mod) {
        mod.selectedNodes    = []
        mod.doubleSelection  = []
        mod.selectedEdges    = []
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
      this.selectedNodes   = []
      this.selectedEdges   = []
      this.doubleSelection = []
      this.focusedIndex    = null
      this.focusedEdgeId   = null
      this.focusedNodeId   = null
      this.escCount        = 0
      if (mod) mod.redraw()
      this.emitter.emit('changeActive')
    },

    // Resolve Enter-selected node indices to ids and tell the renderer to
    // draw a crosshair over each selected node.
    _syncSelectionCrosshairs() {
      const mod = this.modifier?.value ?? this.modifier
      if (!mod || !this.threeDRenderer) return
      const ids  = (this.selectedNodes || []).map(i => mod.getNodeId(i)).filter(Boolean)
      const dIds = (this.doubleSelection || []).map(i => mod.getNodeId(i)).filter(Boolean)
      this.threeDRenderer.setSelectedNodes(ids, dIds)
    },
  },
  computed: {
    zoomDisplay() {
      return (this.zoomLevel || 1).toFixed(2) + '×'
    },
  },
  watch: {
    // When App.vue replaces the modifier (new diagram opened), reconnect renderer
    modifier: {
      handler(newMod) {
        const mod = newMod?.value ?? newMod
        if (mod && typeof mod.redraw === 'function' && this.threeDRenderer) {
          mod.renderer = this.threeDRenderer
          mod.redraw()
        }
      },
      deep: false,
    },
    active(val) {
      if (this.escCount === 3) {
        this.selectedNodes   = []
        this.selectedEdges   = []
        this.focusedIndex    = null
        this.focusedEdgeId   = null
        this.focusedNodeId   = null
        this.escCount        = 0
      } else {
        this.escCount++
      }
      this.trapGraph = val === 'Graph'

      const isEdit = val === 'Add Node' || val === 'Edit Node' ||
                     val === 'Add Edge' || val === 'Edit Edge'
      this.openSheet = isEdit
      if (isEdit) {
        this.$nextTick(() => this.threeDRenderer?.zoomTo(this.d3Data?.id))
      }
    },
  },
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
  background-image: radial-gradient(circle, rgba(var(--fx-muted), 0.22) 1px, transparent 1px);
  background-size: 28px 28px;
  background-position: 0 0;
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
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 4px 8px;
  font-size: 11px;
  pointer-events: none;
}

h1, h2 { font-weight: normal; }
</style>
