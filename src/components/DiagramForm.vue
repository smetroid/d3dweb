<template>
  <Teleport to="body">
    <transition name="fx-scrim">
      <div
        v-if="diagramModal"
        class="fx-scrim"
        @click="close()"
      ></div>
    </transition>
    <transition name="fx-dialog">
      <div
        v-if="diagramModal"
        class="fx-dialog-stage"
      >
        <focus-trap
          v-model:active="diagramModal"
          class="trap is-active"
        >
          <div
            tabindex="0"
            class="fx-dialog"
            @keydown.esc="close()"
            @keyup.alt.s="saveAction()"
            @keyup.meta.s="saveAction()"
            @keyup.ctrl.c="close()"
            @keyup.meta.c="close()"
          >
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
                >✕</button>
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
                  <span class="fx-readout-v">COLA</span>
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
                    <input class="fx-input" type="text" v-model="name" placeholder="Name this diagram" />
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

                <label class="fx-field fx-field-full">
                  <span class="fx-label">Layout Engine <em class="fx-opt">read-only</em></span>
                  <input class="fx-input fx-input-static" type="text" readonly :value="'Cola'" />
                </label>

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
                  <label class="fx-field">
                    <span class="fx-label">Flow Direction</span>
                    <div class="fx-select">
                      <button
                        type="button"
                        class="fx-select-trigger"
                        @click.stop="toggleSel('flow')"
                      >{{ flowLabel }}<span class="fx-caret">▾</span></button>
                      <transition name="fx-drop">
                        <ul v-if="openSel === 'flow'" class="fx-options">
                          <li
                            v-for="opt in flowOptions"
                            :key="opt.label"
                            class="fx-option"
                            :class="{ 'fx-option-active': colaOpts.flow === opt.value }"
                            @click="pickFlow(opt.value)"
                          >{{ opt.label }}</li>
                        </ul>
                      </transition>
                    </div>
                  </label>
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
                >Update <span class="fx-kbd">{{ shortcutLabels.save }}</span></button>
                <button
                  v-else
                  type="button"
                  class="fx-btn fx-btn-primary"
                  @click="create()"
                >Create <span class="fx-kbd">{{ shortcutLabels.save }}</span></button>
                <button
                  type="button"
                  class="fx-btn fx-btn-ghost"
                  @click="close()"
                >Cancel <span class="fx-kbd">{{ shortcutLabels.close }}</span></button>
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
import GraphModel from '@/helpers/GraphModel.js'
import DiagramGraph from '@/helpers/DiagramGraph.js'
import { modelToGraphlib, graphlibToModel, isGraphlibFormat } from '@/helpers/graphlibMigration.js'
import D3DApi from '@/services/api'

export default {
  name: 'DiagramForm',
  props: ['active'],
  inject: ['modifier'],
  data() {
    return {
      id:          null,
      diagram:     null,    // GraphModel
      username:    '',
      created:     null,
      name:        'New diagram default name',
      description: 'New diagram default description',
      diagramModal: false,
      update:      null,
      layoutMode: 'cola',
      colaOpts:  this.defaultColaOpts(),
      colaConstraintsText: '[]',
      colaConstraints: [],
      jsonDiagram: null,
      openSel:     null,
      flowOptions: [
        { label: 'None',            value: null },
        { label: 'Horizontal (x)',  value: 'x' },
        { label: 'Vertical (y)',    value: 'y' },
      ],
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    flowLabel() {
      const opt = this.flowOptions.find(o => o.value === this.colaOpts.flow)
      return opt ? opt.label : 'None'
    },
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)

    this.emitter.on('saveDiagram', () => {
      this.setDiagramInfo()
      const mod = this._mod()
      if (mod?.d3dInfo?.id) {
        if (D3Util.auth()) this.updateServerDiagram()
        else               this.updateLocalDiagram()
      } else {
        this.diagramModal = true
      }
    })

    this.emitter.on('editDiagram', () => {
      this.diagramModal = true
      this.update       = this.diagramModal
      this.setDiagramInfo()
    })

    this.emitter.on('newDiagram', () => this.newDiagram())
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },

  methods: {
    _mod() {
      // Handle both raw and ComputedRef injection
      return this.modifier?.value ?? this.modifier
    },

    toggleSel(key) {
      this.openSel = this.openSel === key ? null : key
    },

    pickFlow(val) {
      this.colaOpts.flow = val
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
      const defaults = D3Util.appDefaults()
      return {
        edgeLength:        defaults.defaultColaEdgeLength,
        nodeSpacing:       defaults.defaultColaNodeSpacing,
        flow:              defaults.defaultColaFlow,
        avoidOverlap:      defaults.defaultColaAvoidOverlap,
        maxSimulationTime: defaults.defaultColaMaxSimulationTime,
      }
    },

    newDiagram() {
      this.$cookies.remove('LastLocallySavedItemId')

      const settings = this.$cookies.get('settings') || D3Util.appDefaults()
      const defaults = D3Util.appDefaults()
      this.layoutMode = 'cola'
      this.colaOpts = {
        edgeLength:        settings.defaultColaEdgeLength !== undefined ? Number(settings.defaultColaEdgeLength) : defaults.defaultColaEdgeLength,
        nodeSpacing:       settings.defaultColaNodeSpacing !== undefined ? Number(settings.defaultColaNodeSpacing) : defaults.defaultColaNodeSpacing,
        flow:              settings.defaultColaFlow !== undefined ? settings.defaultColaFlow : defaults.defaultColaFlow,
        avoidOverlap:      settings.defaultColaAvoidOverlap !== undefined ? Boolean(settings.defaultColaAvoidOverlap) : defaults.defaultColaAvoidOverlap,
        maxSimulationTime: settings.defaultColaMaxSimulationTime !== undefined ? Number(settings.defaultColaMaxSimulationTime) : defaults.defaultColaMaxSimulationTime,
      }
      this.colaConstraintsText = '[]'
      this.colaConstraints = []

      const model = markRaw(new GraphModel([
        { group: 'nodes', data: { id: 'first', label: 'first node', shape: 'rectangle' } }
      ]))
      model.colaConstraints = this.colaConstraints

      const d3dInfo = {
        id:          null,
        diagram:     model,
        name:        D3Util.tempInfo().name,
        description: D3Util.tempInfo().description,
        layoutMode:  this.layoutMode,
        colaOpts:    { ...this.colaOpts },
        colaConstraints: this.colaConstraints,
      }

      this._newModifier(d3dInfo)
    },

    setDiagramInfo(newDiagram) {
      const mod  = this._mod()
      const info = mod?.d3dInfo || {}

      this.id          = newDiagram ? this.id          : info.id
      this.name        = newDiagram ? this.name        : info.name
      this.description = newDiagram ? this.description : info.description
      this.diagram     = newDiagram ? this.diagram     : info.diagram
      this.created     = newDiagram ? this.created     : info.created

      if (this.diagram) {
        const json       = modelToGraphlib(this.diagram)
        this.jsonDiagram = JSON.stringify(json, null, 2)
      }

      // Layout options live on the modifier
      this.layoutMode = mod?.layoutMode || 'cola'
      if (mod?.colaOpts)  this.colaOpts  = { ...mod.colaOpts }
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

      const json    = modelToGraphlib(this.diagram)
      const payload = {
        name:        this.name,
        description: this.description,
        diagram:     JSON.stringify(json),
        created:     this.created,
        updated:     new Date().toISOString(),
      }

      if (D3Util.auth()) {
        const result = await D3DApi.postDiagram(payload)
        if (Object.prototype.hasOwnProperty.call(result, 'data')) {
          this.id = result.data
          this.$cookies.set('LastLocallySavedItemId', this.id)
          this.emitter.emit('appMessage', { message: 'New diagram successfully created', result })
          this.emitter.emit('updateDiagramInfo', this)
        } else {
          this.emitter.emit('appMessage', { message: 'Failed to create diagram', result })
        }
      } else {
        const id = D3Util.createLocalEntry({ name: this.name, description: this.description, diagram: this.diagram })
        this.id  = id
        this.emitter.emit('appMessage', { message: 'Changes saved to local storage', status: 'info' })
        this.emitter.emit('updateDiagramInfo', this)
      }

      this.close()
    },

    _applyLayoutOptions() {
      const mod = this._mod()
      if (mod) {
        mod.layoutMode = this.layoutMode
        mod.colaOpts   = { ...this.colaOpts }
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
        id:          this.id,
        name:        this.name,
        description: this.description,
        created:     this.created,
        layoutMode:  this.layoutMode,
        colaOpts:    { ...this.colaOpts },
        colaConstraints: this.colaConstraints,
      }

      const model = this._modelFromJson()
      if (!model) return

      d3dInfo.diagram = model
      this._newModifier(d3dInfo)

      D3Util.updateLocalEntry({
        id:          this.id,
        name:        this.name,
        description: this.description,
        diagram:     this.diagram,
        created:     this.created,
      })
      this.close()
    },

    async updateServerDiagram() {
      const d3dInfo = {
        id:          this.id,
        name:        this.name,
        description: this.description,
        created:     this.created,
        layoutMode:  this.layoutMode,
        colaOpts:    { ...this.colaOpts },
        colaConstraints: this.colaConstraints,
      }

      const model = this._modelFromJson()
      if (!model) return

      d3dInfo.diagram = model
      this._newModifier(d3dInfo)

      const json        = modelToGraphlib(this.diagram)
      const updatedData = {
        id:          this.id,
        name:        this.name,
        description: this.description,
        diagram:     JSON.stringify(json),
        updated:     new Date().toISOString(),
        created:     this.created,
      }

      const response = await D3DApi.updateDiagram(updatedData)
      if (Object.prototype.hasOwnProperty.call(response, 'data')) {
        this.emitter.emit('appMessage', { message: 'Diagram saved', result: response })
      } else {
        this.emitter.emit('appMessage', { message: 'Failed to save diagram', result: response })
      }
      this.emitter.emit('changeActive')
      this.close()
    },

    // Parse the edited JSON (may be graphlib or cytoscape elements format)
    _modelFromJson() {
      try {
        const parsed = JSON.parse(this.jsonDiagram)
        const model = markRaw(isGraphlibFormat(parsed) ? graphlibToModel(parsed) : new GraphModel(parsed))
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
    },
  },
}
</script>

<style scoped></style>
