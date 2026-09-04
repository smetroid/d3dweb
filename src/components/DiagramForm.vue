<template>
  <Teleport to="body">
    <transition name="fx-scrim">
      <div v-if="diagramModal" class="fx-scrim" @click="close()"></div>
    </transition>
    <transition name="fx-dialog">
      <div v-if="diagramModal" class="fx-dialog-stage">
        <focus-trap v-model:active="diagramModal" class="trap is-active">
          <div tabindex="0" class="fx-dialog" @keydown="onKeydown($event)" @keyup="onKeyup($event)">
            <div class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip" :class="update ? 'fx-chip-edit' : 'fx-chip-add'">
                    {{ update ? 'UPDATE' : 'CREATE' }}
                  </span>
                  <h2 class="fx-title">DIAGRAM</h2>
                </div>
                <button
                  type="button"
                  class="fx-close"
                  aria-label="Close diagram form"
                  @click="close()"
                >
                  ✕
                </button>
              </header>

              <div class="fx-readout">
                <span class="fx-readout-kv fx-readout-wide">
                  <span class="fx-readout-k">ID</span>
                  <span class="fx-readout-v">{{ id || 'unsaved' }}</span>
                </span>
                <span class="fx-readout-kv">
                  <span class="fx-readout-k">MODE</span>
                  <span class="fx-readout-v">{{ update ? 'UPDATE' : 'NEW' }}</span>
                </span>
                <span class="fx-readout-kv">
                  <span class="fx-readout-k">ENGINE</span>
                  <span class="fx-readout-v">{{ layoutMode.toUpperCase() }}</span>
                </span>
              </div>

              <div class="fx-panel-body">
                <div class="fx-grid">
                  <label class="fx-field">
                    <span class="fx-label">ID <em class="fx-opt">read-only</em></span>
                    <input class="fx-input fx-input-static" type="text" readonly :value="id" />
                  </label>
                  <label class="fx-field">
                    <span class="fx-label">Diagram Name</span>
                    <input
                      class="fx-input"
                      type="text"
                      v-model="name"
                      placeholder="Name this diagram"
                    />
                  </label>
                </div>

                <label class="fx-field fx-field-full">
                  <span class="fx-label">Diagram Description</span>
                  <textarea
                    class="fx-input fx-textarea"
                    v-model="description"
                    rows="2"
                    placeholder="Enter a description for the new diagram"
                  ></textarea>
                </label>

                <div class="fx-field fx-field-full">
                  <span class="fx-label">Layout Engine</span>
                  <div class="fx-select">
                    <button
                      type="button"
                      class="fx-select-trigger"
                      @click.stop="toggleSel('layout')"
                      @keydown.down.prevent="openAndFocus('layout', $event)"
                    >
                      {{ layoutLabel }}<span class="fx-caret">▾</span>
                    </button>
                    <transition name="fx-drop">
                      <ul v-if="openSel === 'layout'" class="fx-options">
                        <li
                          v-for="opt in layoutOptions"
                          :key="opt.value"
                          tabindex="0"
                          class="fx-option"
                          :class="{ 'fx-option-active': layoutMode === opt.value }"
                          @click="pickLayout(opt.value)"
                          @keydown.enter.prevent="pickLayout(opt.value)"
                          @keydown.space.prevent="pickLayout(opt.value)"
                          @keydown.up.prevent="focusPrev($event)"
                          @keydown.down.prevent="focusNext($event)"
                          @keydown.k.prevent="focusPrev($event)"
                          @keydown.j.prevent="focusNext($event)"
                          @keydown.esc.stop="closeSel($event)"
                        >
                          {{ opt.label }}
                        </li>
                      </ul>
                    </transition>
                  </div>
                </div>

                <!-- Cola layout options -->
                <template v-if="layoutMode === 'cola'">
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Edge Length</span>
                      <input class="fx-input" type="number" v-model="colaOpts.edgeLength" />
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Node Spacing</span>
                      <input class="fx-input" type="number" v-model="colaOpts.nodeSpacing" />
                    </label>
                  </div>

                  <div class="fx-grid">
                    <div class="fx-field">
                      <span class="fx-label">Flow Direction</span>
                      <div class="fx-select">
                        <button
                          type="button"
                          class="fx-select-trigger"
                          @click.stop="toggleSel('flow')"
                          @keypress.stop=""
                          @keydown.down.prevent="openAndFocus('flow', $event)"
                        >
                          {{ flowLabel }}<span class="fx-caret">▾</span>
                        </button>
                        <transition name="fx-drop">
                          <ul v-if="openSel === 'flow'" class="fx-options">
                            <li
                              v-for="opt in flowOptions"
                              :key="opt.label"
                              tabindex="0"
                              class="fx-option"
                              :class="{ 'fx-option-active': colaOpts.flow === opt.value }"
                              @click="pickFlow(opt.value)"
                              @keydown.enter.prevent="pickFlow(opt.value)"
                              @keydown.space.prevent="pickFlow(opt.value)"
                              @keydown.up.prevent="focusPrev($event)"
                              @keydown.down.prevent="focusNext($event)"
                              @keydown.k.prevent="focusPrev($event)"
                              @keydown.j.prevent="focusNext($event)"
                              @keydown.esc.stop="closeSel($event)"
                            >
                              {{ opt.label }}
                            </li>
                          </ul>
                        </transition>
                      </div>
                    </div>
                    <label class="fx-field">
                      <span class="fx-label">Max Simulation Time <em class="fx-opt">ms</em></span>
                      <input class="fx-input" type="number" v-model="colaOpts.maxSimulationTime" />
                    </label>
                  </div>

                  <label class="fx-field fx-field-full">
                    <span class="fx-label">Cola Constraints <em class="fx-opt">JSON</em></span>
                    <textarea
                      class="fx-input fx-textarea"
                      v-model="colaConstraintsText"
                      rows="4"
                      placeholder='Array of cola constraints: [{"type":"alignment","axis":"y","offsets":[{"node":"id","offset":0}]}, {"axis":"x","left":"id","right":"id","gap":50}]'
                    ></textarea>
                  </label>
                </template>

                <!-- CoSE layout options -->
                <template v-if="layoutMode === 'cose'">
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Node Repulsion</span>
                      <input class="fx-input" type="number" v-model="coseOpts.nodeRepulsion" />
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Ideal Edge Length</span>
                      <input class="fx-input" type="number" v-model="coseOpts.idealEdgeLength" />
                    </label>
                  </div>
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Gravity</span>
                      <input class="fx-input" type="number" step="0.1" v-model="coseOpts.gravity" />
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Node Overlap</span>
                      <input class="fx-input" type="number" v-model="coseOpts.nodeOverlap" />
                    </label>
                  </div>
                </template>

                <!-- Breadth First layout options -->
                <template v-if="layoutMode === 'breadthfirst'">
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Spacing Factor</span>
                      <input
                        class="fx-input"
                        type="number"
                        step="0.1"
                        v-model="breadthfirstOpts.spacingFactor"
                      />
                    </label>
                    <div class="fx-field">
                      <span class="fx-label">Options</span>
                      <label class="fx-check-row">
                        <input type="checkbox" v-model="breadthfirstOpts.directed" />
                        <span>Directed</span>
                      </label>
                      <label class="fx-check-row">
                        <input type="checkbox" v-model="breadthfirstOpts.circle" />
                        <span>Circle layout</span>
                      </label>
                    </div>
                  </div>
                </template>

                <!-- Grid layout options -->
                <template v-if="layoutMode === 'grid'">
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Spacing Factor</span>
                      <input
                        class="fx-input"
                        type="number"
                        step="0.1"
                        v-model="gridOpts.spacingFactor"
                      />
                    </label>
                    <div class="fx-field">
                      <span class="fx-label">Options</span>
                      <label class="fx-check-row">
                        <input type="checkbox" v-model="gridOpts.avoidOverlap" />
                        <span>Avoid Overlap</span>
                      </label>
                    </div>
                  </div>
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Rows <em class="fx-opt">optional</em></span>
                      <input
                        class="fx-input"
                        type="number"
                        v-model="gridOpts.rows"
                        placeholder="auto"
                      />
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Cols <em class="fx-opt">optional</em></span>
                      <input
                        class="fx-input"
                        type="number"
                        v-model="gridOpts.cols"
                        placeholder="auto"
                      />
                    </label>
                  </div>
                </template>

                <!-- Circle layout options -->
                <template v-if="layoutMode === 'circle'">
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Spacing Factor</span>
                      <input
                        class="fx-input"
                        type="number"
                        step="0.1"
                        v-model="circleOpts.spacingFactor"
                      />
                    </label>
                    <div class="fx-field">
                      <span class="fx-label">Options</span>
                      <label class="fx-check-row">
                        <input type="checkbox" v-model="circleOpts.clockwise" />
                        <span>Clockwise</span>
                      </label>
                    </div>
                  </div>
                </template>

                <!-- Concentric layout options -->
                <template v-if="layoutMode === 'concentric'">
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Spacing Factor</span>
                      <input
                        class="fx-input"
                        type="number"
                        step="0.1"
                        v-model="concentricOpts.spacingFactor"
                      />
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Min Node Spacing</span>
                      <input
                        class="fx-input"
                        type="number"
                        v-model="concentricOpts.minNodeSpacing"
                      />
                    </label>
                  </div>
                  <div class="fx-grid">
                    <div class="fx-field">
                      <span class="fx-label">Options</span>
                      <label class="fx-check-row">
                        <input type="checkbox" v-model="concentricOpts.clockwise" />
                        <span>Clockwise</span>
                      </label>
                      <label class="fx-check-row">
                        <input type="checkbox" v-model="concentricOpts.equidistant" />
                        <span>Equidistant</span>
                      </label>
                    </div>
                  </div>
                </template>

                <!-- Dagre layout options -->
                <template v-if="layoutMode === 'dagre'">
                  <div class="fx-grid">
                    <div class="fx-field">
                      <span class="fx-label">Rank Direction</span>
                      <div class="fx-select">
                        <button
                          type="button"
                          class="fx-select-trigger"
                          @click.stop="toggleSel('dagreRankDir')"
                          @keydown.down.prevent="openAndFocus('dagreRankDir', $event)"
                        >
                          {{ dagreRankDirLabel }}<span class="fx-caret">▾</span>
                        </button>
                        <transition name="fx-drop">
                          <ul v-if="openSel === 'dagreRankDir'" class="fx-options">
                            <li
                              v-for="opt in dagreRankDirOptions"
                              :key="opt.value"
                              tabindex="0"
                              class="fx-option"
                              :class="{ 'fx-option-active': dagreOpts.rankDir === opt.value }"
                              @click="pickDagreRankDir(opt.value)"
                              @keydown.enter.prevent="pickDagreRankDir(opt.value)"
                              @keydown.space.prevent="pickDagreRankDir(opt.value)"
                              @keydown.up.prevent="focusPrev($event)"
                              @keydown.down.prevent="focusNext($event)"
                              @keydown.k.prevent="focusPrev($event)"
                              @keydown.j.prevent="focusNext($event)"
                              @keydown.esc.stop="closeSel($event)"
                            >
                              {{ opt.label }}
                            </li>
                          </ul>
                        </transition>
                      </div>
                    </div>
                    <div class="fx-field">
                      <span class="fx-label">Ranker</span>
                      <div class="fx-select">
                        <button
                          type="button"
                          class="fx-select-trigger"
                          @click.stop="toggleSel('dagreRanker')"
                          @keydown.down.prevent="openAndFocus('dagreRanker', $event)"
                        >
                          {{ dagreOpts.ranker }}<span class="fx-caret">▾</span>
                        </button>
                        <transition name="fx-drop">
                          <ul v-if="openSel === 'dagreRanker'" class="fx-options">
                            <li
                              v-for="opt in dagreRankerOptions"
                              :key="opt.value"
                              tabindex="0"
                              class="fx-option"
                              :class="{ 'fx-option-active': dagreOpts.ranker === opt.value }"
                              @click="pickDagreRanker(opt.value)"
                              @keydown.enter.prevent="pickDagreRanker(opt.value)"
                              @keydown.space.prevent="pickDagreRanker(opt.value)"
                              @keydown.up.prevent="focusPrev($event)"
                              @keydown.down.prevent="focusNext($event)"
                              @keydown.k.prevent="focusPrev($event)"
                              @keydown.j.prevent="focusNext($event)"
                              @keydown.esc.stop="closeSel($event)"
                            >
                              {{ opt.label }}
                            </li>
                          </ul>
                        </transition>
                      </div>
                    </div>
                  </div>
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Node Sep</span>
                      <input class="fx-input" type="number" v-model="dagreOpts.nodeSep" />
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Rank Sep</span>
                      <input class="fx-input" type="number" v-model="dagreOpts.rankSep" />
                    </label>
                  </div>
                  <div class="fx-grid">
                    <label class="fx-field">
                      <span class="fx-label">Edge Sep</span>
                      <input class="fx-input" type="number" v-model="dagreOpts.edgeSep" />
                    </label>
                  </div>
                </template>

                <label class="fx-field fx-field-full">
                  <span class="fx-label">JSON Diagram</span>
                  <textarea
                    class="fx-input fx-textarea"
                    v-model="jsonDiagram"
                    rows="5"
                    placeholder="JSON Data of the Diagram"
                  ></textarea>
                </label>
              </div>

              <footer class="fx-panel-actions">
                <button
                  v-if="update"
                  type="button"
                  class="fx-btn fx-btn-primary"
                  @click="updateLocalDiagram()"
                >
                  Update <span class="fx-kbd">{{ shortcutLabels.save }}</span>
                </button>
                <button v-else type="button" class="fx-btn fx-btn-primary" @click="create()">
                  Create <span class="fx-kbd">{{ shortcutLabels.save }}</span>
                </button>
                <button type="button" class="fx-btn fx-btn-ghost" @click="close()">
                  Cancel <span class="fx-kbd">{{ shortcutLabels.close }}</span>
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
import { markRaw } from 'vue'
import D3Util from '@/helpers/D3Util.js'
import Shortcuts from '@/helpers/Shortcuts.js'
import GraphModel from '@/helpers/GraphModel.js'
import DiagramGraph from '@/helpers/DiagramGraph.js'
import { modelToGraphlib, graphlibToModel, isGraphlibFormat } from '@/helpers/graphlibMigration.js'
import D3DApi from '@/services/api'
import { hasServerAccess } from '@/services/session'
import { clearHistory } from '@/services/localHistory.js'

export default {
  name: 'DiagramForm',
  props: ['active'],
  inject: ['modifier'],
  data() {
    return {
      id: null,
      diagram: null,
      username: '',
      created: null,
      name: 'New diagram default name',
      description: 'New diagram default description',
      diagramModal: false,
      update: null,
      layoutMode: 'cola',
      colaOpts: this.defaultColaOpts(),
      colaConstraintsText: '[]',
      colaConstraints: [],
      coseOpts: this.defaultCoseOpts(),
      breadthfirstOpts: this.defaultBreadthfirstOpts(),
      gridOpts: this.defaultGridOpts(),
      circleOpts: this.defaultCircleOpts(),
      concentricOpts: this.defaultConcentricOpts(),
      dagreOpts: this.defaultDagreOpts(),
      jsonDiagram: null,
      openSel: null,
      flowOptions: [
        { label: 'None', value: null },
        { label: 'Horizontal (x)', value: 'x' },
        { label: 'Vertical (y)', value: 'y' }
      ],
      dagreRankDirOptions: [
        { label: 'Top → Bottom', value: 'TB' },
        { label: 'Bottom → Top', value: 'BT' },
        { label: 'Left → Right', value: 'LR' },
        { label: 'Right → Left', value: 'RL' }
      ],
      dagreRankerOptions: [
        { label: 'Network Simplex', value: 'network-simplex' },
        { label: 'Tight Tree', value: 'tight-tree' },
        { label: 'Longest Path', value: 'longest-path' }
      ]
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    flowLabel() {
      const opt = this.flowOptions.find((o) => o.value === this.colaOpts.flow)
      return opt ? opt.label : 'None'
    },
    layoutOptions() {
      return D3Util.layoutOptions()
    },
    layoutLabel() {
      const opt = this.layoutOptions.find((o) => o.value === this.layoutMode)
      return opt ? opt.label : this.layoutMode
    },
    dagreRankDirLabel() {
      const opt = this.dagreRankDirOptions.find((o) => o.value === this.dagreOpts.rankDir)
      return opt ? opt.label : this.dagreOpts.rankDir
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)

    this.emitter.on('saveDiagram', () => {
      this.setDiagramInfo()
      const mod = this._mod()
      if (mod?.d3dInfo?.id) {
        if (hasServerAccess()) this.updateServerDiagram()
        else this.updateLocalDiagram()
      } else {
        this.diagramModal = true
      }
    })

    this.emitter.on('editDiagram', () => {
      this.diagramModal = true
      this.update = this.diagramModal
      this.setDiagramInfo()
    })

    this.emitter.on('newDiagram', () => this.newDiagram())
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },

  methods: {
    _mod() {
      return this.modifier?.value ?? this.modifier
    },

    onKeydown(event) {
      if (Shortcuts.matches(event, 'close')) {
        event.preventDefault()
        this.close()
      }
    },

    onKeyup(event) {
      if (event.repeat) return
      if (Shortcuts.matches(event, 'save')) {
        event.preventDefault()
        this.saveAction()
      }
    },

    toggleSel(key) {
      this.openSel = this.openSel === key ? null : key
    },

    openAndFocus(key, event) {
      if (this.openSel !== key) this.openSel = key
      this.$nextTick(() => {
        const container = event.currentTarget.closest('.fx-select')
        const ul = container?.querySelector('.fx-options')
        if (ul) {
          const target = ul.querySelector('.fx-option-active') || ul.querySelector('.fx-option')
          if (target) target.focus()
        }
      })
    },

    focusPrev(event) {
      const prev = event.target.previousElementSibling
      if (prev) prev.focus()
      else event.target.closest('.fx-options')?.lastElementChild?.focus()
    },

    focusNext(event) {
      const next = event.target.nextElementSibling
      if (next) next.focus()
      else event.target.closest('.fx-options')?.firstElementChild?.focus()
    },

    closeSel(event) {
      this.openSel = null
      event.target.closest('.fx-select')?.querySelector('.fx-select-trigger')?.focus()
    },

    pickFlow(val) {
      this.colaOpts.flow = val
      this.openSel = null
    },

    pickLayout(val) {
      this.layoutMode = val
      this.openSel = null
    },

    pickDagreRankDir(val) {
      this.dagreOpts.rankDir = val
      this.openSel = null
    },

    pickDagreRanker(val) {
      this.dagreOpts.ranker = val
      this.openSel = null
    },

    onDocClick() {
      this.openSel = null
    },

    saveAction() {
      if (this.update) this.updateLocalDiagram()
      else this.create()
    },

    defaultColaOpts() {
      const d = D3Util.appDefaults()
      return {
        edgeLength: d.defaultColaEdgeLength,
        nodeSpacing: d.defaultColaNodeSpacing,
        flow: d.defaultColaFlow,
        avoidOverlap: d.defaultColaAvoidOverlap,
        maxSimulationTime: d.defaultColaMaxSimulationTime,
        gravity: d.defaultColaGravity
      }
    },

    defaultCoseOpts() {
      const d = D3Util.appDefaults()
      return {
        nodeRepulsion: d.defaultCoseNodeRepulsion,
        idealEdgeLength: d.defaultCoseIdealEdgeLength,
        gravity: d.defaultCoseGravity,
        nodeOverlap: d.defaultCoseNodeOverlap
      }
    },

    defaultBreadthfirstOpts() {
      const d = D3Util.appDefaults()
      return {
        directed: d.defaultBreadthfirstDirected,
        circle: d.defaultBreadthfirstCircle,
        spacingFactor: d.defaultBreadthfirstSpacingFactor
      }
    },

    defaultGridOpts() {
      const d = D3Util.appDefaults()
      return {
        spacingFactor: d.defaultGridSpacingFactor,
        avoidOverlap: d.defaultGridAvoidOverlap,
        rows: d.defaultGridRows,
        cols: d.defaultGridCols
      }
    },

    defaultCircleOpts() {
      const d = D3Util.appDefaults()
      return {
        spacingFactor: d.defaultCircleSpacingFactor,
        clockwise: d.defaultCircleClockwise
      }
    },

    defaultConcentricOpts() {
      const d = D3Util.appDefaults()
      return {
        spacingFactor: d.defaultConcentricSpacingFactor,
        minNodeSpacing: d.defaultConcentricMinNodeSpacing,
        clockwise: d.defaultConcentricClockwise,
        equidistant: d.defaultConcentricEquidistant
      }
    },

    defaultDagreOpts() {
      const d = D3Util.appDefaults()
      return {
        rankDir: d.defaultDagreRankDir,
        nodeSep: d.defaultDagreNodeSep,
        rankSep: d.defaultDagreRankSep,
        edgeSep: d.defaultDagreEdgeSep,
        ranker: d.defaultDagreRanker
      }
    },

    newDiagram() {
      this.$cookies.remove('LastLocallySavedItemId')
      clearHistory(null)

      const settings = this.$cookies.get('settings') || D3Util.appDefaults()
      const defaults = D3Util.appDefaults()

      this.layoutMode = settings.defaultLayoutMode || defaults.defaultLayoutMode

      this.colaOpts = {
        edgeLength:
          settings.defaultColaEdgeLength !== undefined
            ? Number(settings.defaultColaEdgeLength)
            : defaults.defaultColaEdgeLength,
        nodeSpacing:
          settings.defaultColaNodeSpacing !== undefined
            ? Number(settings.defaultColaNodeSpacing)
            : defaults.defaultColaNodeSpacing,
        flow:
          settings.defaultColaFlow !== undefined
            ? settings.defaultColaFlow
            : defaults.defaultColaFlow,
        avoidOverlap:
          settings.defaultColaAvoidOverlap !== undefined
            ? Boolean(settings.defaultColaAvoidOverlap)
            : defaults.defaultColaAvoidOverlap,
        maxSimulationTime:
          settings.defaultColaMaxSimulationTime !== undefined
            ? Number(settings.defaultColaMaxSimulationTime)
            : defaults.defaultColaMaxSimulationTime,
        gravity:
          settings.defaultColaGravity !== undefined
            ? Number(settings.defaultColaGravity)
            : defaults.defaultColaGravity
      }
      this.colaConstraintsText = '[]'
      this.colaConstraints = []

      this.coseOpts = {
        nodeRepulsion:
          settings.defaultCoseNodeRepulsion !== undefined
            ? Number(settings.defaultCoseNodeRepulsion)
            : defaults.defaultCoseNodeRepulsion,
        idealEdgeLength:
          settings.defaultCoseIdealEdgeLength !== undefined
            ? Number(settings.defaultCoseIdealEdgeLength)
            : defaults.defaultCoseIdealEdgeLength,
        gravity:
          settings.defaultCoseGravity !== undefined
            ? Number(settings.defaultCoseGravity)
            : defaults.defaultCoseGravity,
        nodeOverlap:
          settings.defaultCoseNodeOverlap !== undefined
            ? Number(settings.defaultCoseNodeOverlap)
            : defaults.defaultCoseNodeOverlap
      }
      this.breadthfirstOpts = {
        directed:
          settings.defaultBreadthfirstDirected !== undefined
            ? Boolean(settings.defaultBreadthfirstDirected)
            : defaults.defaultBreadthfirstDirected,
        circle:
          settings.defaultBreadthfirstCircle !== undefined
            ? Boolean(settings.defaultBreadthfirstCircle)
            : defaults.defaultBreadthfirstCircle,
        spacingFactor:
          settings.defaultBreadthfirstSpacingFactor !== undefined
            ? Number(settings.defaultBreadthfirstSpacingFactor)
            : defaults.defaultBreadthfirstSpacingFactor
      }
      this.gridOpts = {
        spacingFactor:
          settings.defaultGridSpacingFactor !== undefined
            ? Number(settings.defaultGridSpacingFactor)
            : defaults.defaultGridSpacingFactor,
        avoidOverlap:
          settings.defaultGridAvoidOverlap !== undefined
            ? Boolean(settings.defaultGridAvoidOverlap)
            : defaults.defaultGridAvoidOverlap,
        rows:
          settings.defaultGridRows !== undefined
            ? settings.defaultGridRows
            : defaults.defaultGridRows,
        cols:
          settings.defaultGridCols !== undefined
            ? settings.defaultGridCols
            : defaults.defaultGridCols
      }
      this.circleOpts = {
        spacingFactor:
          settings.defaultCircleSpacingFactor !== undefined
            ? Number(settings.defaultCircleSpacingFactor)
            : defaults.defaultCircleSpacingFactor,
        clockwise:
          settings.defaultCircleClockwise !== undefined
            ? Boolean(settings.defaultCircleClockwise)
            : defaults.defaultCircleClockwise
      }
      this.concentricOpts = {
        spacingFactor:
          settings.defaultConcentricSpacingFactor !== undefined
            ? Number(settings.defaultConcentricSpacingFactor)
            : defaults.defaultConcentricSpacingFactor,
        minNodeSpacing:
          settings.defaultConcentricMinNodeSpacing !== undefined
            ? Number(settings.defaultConcentricMinNodeSpacing)
            : defaults.defaultConcentricMinNodeSpacing,
        clockwise:
          settings.defaultConcentricClockwise !== undefined
            ? Boolean(settings.defaultConcentricClockwise)
            : defaults.defaultConcentricClockwise,
        equidistant:
          settings.defaultConcentricEquidistant !== undefined
            ? Boolean(settings.defaultConcentricEquidistant)
            : defaults.defaultConcentricEquidistant
      }
      this.dagreOpts = {
        rankDir:
          settings.defaultDagreRankDir !== undefined
            ? settings.defaultDagreRankDir
            : defaults.defaultDagreRankDir,
        nodeSep:
          settings.defaultDagreNodeSep !== undefined
            ? Number(settings.defaultDagreNodeSep)
            : defaults.defaultDagreNodeSep,
        rankSep:
          settings.defaultDagreRankSep !== undefined
            ? Number(settings.defaultDagreRankSep)
            : defaults.defaultDagreRankSep,
        edgeSep:
          settings.defaultDagreEdgeSep !== undefined
            ? Number(settings.defaultDagreEdgeSep)
            : defaults.defaultDagreEdgeSep,
        ranker:
          settings.defaultDagreRanker !== undefined
            ? settings.defaultDagreRanker
            : defaults.defaultDagreRanker
      }

      const model = markRaw(
        new GraphModel([
          { group: 'nodes', data: { id: 'first', label: 'first node', shape: 'rectangle' } }
        ])
      )
      model.colaConstraints = this.colaConstraints

      const d3dInfo = {
        id: null,
        diagram: model,
        name: D3Util.tempInfo().name,
        description: D3Util.tempInfo().description,
        layoutMode: this.layoutMode,
        colaOpts: { ...this.colaOpts },
        colaConstraints: this.colaConstraints,
        coseOpts: { ...this.coseOpts },
        breadthfirstOpts: { ...this.breadthfirstOpts },
        gridOpts: { ...this.gridOpts },
        circleOpts: { ...this.circleOpts },
        concentricOpts: { ...this.concentricOpts },
        dagreOpts: { ...this.dagreOpts }
      }

      this._newModifier(d3dInfo)
    },

    setDiagramInfo(newDiagram) {
      const mod = this._mod()
      const info = mod?.d3dInfo || {}

      this.id = newDiagram ? this.id : info.id
      this.name = newDiagram ? this.name : info.name
      this.description = newDiagram ? this.description : info.description
      this.diagram = newDiagram ? this.diagram : info.diagram
      this.created = newDiagram ? this.created : info.created

      if (this.diagram) {
        const json = modelToGraphlib(this.diagram)
        this.jsonDiagram = JSON.stringify(json, null, 2)
      }

      this.layoutMode = mod?.layoutMode || 'cola'
      if (mod?.colaOpts) this.colaOpts = { ...mod.colaOpts }
      if (mod?.coseOpts) this.coseOpts = { ...mod.coseOpts }
      if (mod?.breadthfirstOpts) this.breadthfirstOpts = { ...mod.breadthfirstOpts }
      if (mod?.gridOpts) this.gridOpts = { ...mod.gridOpts }
      if (mod?.circleOpts) this.circleOpts = { ...mod.circleOpts }
      if (mod?.concentricOpts) this.concentricOpts = { ...mod.concentricOpts }
      if (mod?.dagreOpts) this.dagreOpts = { ...mod.dagreOpts }

      const constraints = mod?.cy?.colaConstraints ?? mod?.colaConstraints ?? []
      this.colaConstraints = Array.isArray(constraints) ? constraints : []
      this.colaConstraintsText = JSON.stringify(this.colaConstraints, null, 2)
    },

    _parseConstraints() {
      try {
        const parsed = JSON.parse(this.colaConstraintsText || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        console.error('Cola constraints JSON parse failed', e)
        return null
      }
    },

    async create() {
      this.setDiagramInfo(true)
      this._applyLayoutOptions()

      const json = modelToGraphlib(this.diagram)
      const payload = {
        name: this.name,
        description: this.description,
        diagram: JSON.stringify(json),
        created: this.created,
        updated: new Date().toISOString()
      }

      if (hasServerAccess()) {
        try {
          const result = await D3DApi.postDiagram(payload)
          this.id = result.data
          this.$cookies.set('LastLocallySavedItemId', this.id)
          this.emitter.emit('appMessage', {
            message: 'New diagram successfully created',
            status: 'success'
          })
          this.emitter.emit('updateDiagramInfo', this)
        } catch (err) {
          console.error('failed to create diagram', err)
          this.emitter.emit('appMessage', { message: 'Failed to create diagram', status: 'error' })
        }
      } else {
        const id = D3Util.createLocalEntry({
          name: this.name,
          description: this.description,
          diagram: this.diagram
        })
        this.id = id
        this.emitter.emit('appMessage', {
          message: 'Changes saved to local storage',
          status: 'info'
        })
        this.emitter.emit('updateDiagramInfo', this)
      }

      this.close()
    },

    _applyLayoutOptions() {
      const mod = this._mod()
      if (mod) {
        mod.layoutMode = this.layoutMode
        mod.colaOpts = { ...this.colaOpts }
        mod.coseOpts = { ...this.coseOpts }
        mod.breadthfirstOpts = { ...this.breadthfirstOpts }
        mod.gridOpts = { ...this.gridOpts }
        mod.circleOpts = { ...this.circleOpts }
        mod.concentricOpts = { ...this.concentricOpts }
        mod.dagreOpts = { ...this.dagreOpts }
        const constraints = this._parseConstraints()
        if (constraints !== null) {
          this.colaConstraints = constraints
          this.colaConstraintsText = JSON.stringify(constraints, null, 2)
        }
        mod.colaConstraints = this.colaConstraints
        if (mod.cy) mod.cy.colaConstraints = this.colaConstraints
      }
    },

    updateLocalDiagram() {
      const d3dInfo = {
        id: this.id,
        name: this.name,
        description: this.description,
        created: this.created,
        layoutMode: this.layoutMode,
        colaOpts: { ...this.colaOpts },
        colaConstraints: this.colaConstraints,
        coseOpts: { ...this.coseOpts },
        breadthfirstOpts: { ...this.breadthfirstOpts },
        gridOpts: { ...this.gridOpts },
        circleOpts: { ...this.circleOpts },
        concentricOpts: { ...this.concentricOpts },
        dagreOpts: { ...this.dagreOpts }
      }

      const model = this._modelFromJson()
      if (!model) return

      d3dInfo.diagram = model
      this._newModifier(d3dInfo)

      D3Util.updateLocalEntry({
        id: this.id,
        name: this.name,
        description: this.description,
        diagram: this.diagram,
        created: this.created
      })
      this.close()
    },

    async updateServerDiagram() {
      const d3dInfo = {
        id: this.id,
        name: this.name,
        description: this.description,
        created: this.created,
        layoutMode: this.layoutMode,
        colaOpts: { ...this.colaOpts },
        colaConstraints: this.colaConstraints,
        coseOpts: { ...this.coseOpts },
        breadthfirstOpts: { ...this.breadthfirstOpts },
        gridOpts: { ...this.gridOpts },
        circleOpts: { ...this.circleOpts },
        concentricOpts: { ...this.concentricOpts },
        dagreOpts: { ...this.dagreOpts }
      }

      const model = this._modelFromJson()
      if (!model) return

      d3dInfo.diagram = model
      this._newModifier(d3dInfo)

      const json = modelToGraphlib(this.diagram)
      const updatedData = {
        id: this.id,
        name: this.name,
        description: this.description,
        diagram: JSON.stringify(json),
        updated: new Date().toISOString(),
        created: this.created
      }

      try {
        await D3DApi.updateDiagram(updatedData)
        this.emitter.emit('appMessage', { message: 'Diagram saved', status: 'success' })
        this.emitter.emit('changeActive')
        this.close()
      } catch (err) {
        console.error('failed to save diagram', err)
        // Keep the form open — closing here would discard the user's edits.
        this.emitter.emit('appMessage', { message: 'Failed to save diagram', status: 'error' })
      }
    },

    _modelFromJson() {
      try {
        const parsed = JSON.parse(this.jsonDiagram)
        const model = markRaw(
          isGraphlibFormat(parsed) ? graphlibToModel(parsed) : new GraphModel(parsed)
        )
        model.colaConstraints = this.colaConstraints
        this.diagram = model
        return model
      } catch (e) {
        console.error('JSON parse failed', e)
        return null
      }
    },

    _newModifier(d3dInfo) {
      const newMod = markRaw(new DiagramGraph(d3dInfo, this.emitter))
      this.emitter.emit('updateModifier', newMod)
    },

    close() {
      this.diagramModal = false
      this.emitter.emit('changeActive')
    }
  }
}
</script>

<style scoped>
.fx-check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 13px;
  color: rgb(var(--fx-ink));
}
.fx-check-row input[type='checkbox'] {
  accent-color: rgb(var(--fx-accent));
  width: 14px;
  height: 14px;
  cursor: pointer;
}
</style>
