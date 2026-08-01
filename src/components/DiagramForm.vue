<template>
  <v-dialog
    class="mx-auto text-indigo"
    @keyup.alt.s="updateNode()"
    @keyup.meta.s="updateNode()"
    @keyup.ctrl.c="close()"
    @keyup.meta.c="close()"
    @keydown.esc="keyPress($event)"
    scrollable
    v-model="diagramModal"
    max-width="600">
    <focus-trap v-model:active="diagramModal">
      <div id="trapDiv" tabindex="0" class="trap is-active">
        <v-card class="text-primary">
          <v-card-title class="bg-primary d-flex justify-center">
            <b v-if="update">Update Diagram</b>
            <b v-else>Create New Diagram</b>
          </v-card-title>
          <v-card-text color="text-primary">
            <v-form>
              <v-text-field label="ID" readonly v-model="id" type="textfield" />
              <v-text-field label="Diagram Name" v-model="name" />
              <v-textarea
                label="Diagram Description"
                v-model="description"
                hint="Enter a description for the new diagram"
                rows="2" row-height="10"
              />
              <v-select
                label="Layout Engine"
                v-model="layoutMode"
                :items="layoutModeOptions"
              />

              <template v-if="layoutMode === 'dagre'">
                <v-select
                  label="Rank Direction"
                  v-model="dagreOpts.rankdir"
                  :items="rankdirOptions"
                  auto-select-first
                />
                <v-text-field label="Rank Separation" v-model="dagreOpts.ranksep" type="number" />
                <v-text-field label="Node Separation" v-model="dagreOpts.nodesep" type="number" />
                <v-select
                  label="Ranker"
                  v-model="dagreOpts.ranker"
                  :items="['network-simplex', 'tight-tree', 'longest-path']"
                />
              </template>

              <template v-if="layoutMode === 'fcose'">
                <v-text-field label="Ideal Edge Length" v-model="fcoseOpts.idealEdgeLength" type="number" />
                <v-text-field label="Node Repulsion" v-model="fcoseOpts.nodeRepulsion" type="number" />
                <v-text-field label="Gravity" v-model="fcoseOpts.gravity" type="number" />
                <v-text-field label="Iterations" v-model="fcoseOpts.numIter" type="number" />
              </template>

              <template v-if="layoutMode === 'cola'">
                <v-text-field label="Edge Length" v-model="colaOpts.edgeLength" type="number" />
                <v-text-field label="Node Spacing" v-model="colaOpts.nodeSpacing" type="number" />
                <v-select
                  label="Flow Direction"
                  v-model="colaOpts.flow"
                  :items="[{title: 'None', value: null}, {title: 'Horizontal (x)', value: 'x'}, {title: 'Vertical (y)', value: 'y'}]"
                  item-title="title"
                  item-value="value"
                />
                <v-text-field label="Max Simulation Time (ms)" v-model="colaOpts.maxSimulationTime" type="number" />
              </template>
              <v-textarea
                label="JSON Diagram"
                v-model="jsonDiagram"
                hint="JSON Data of the Diagram"
                rows="5"
                row-height="50"
              />
            </v-form>
          </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn
              v-if="update"
              variant="tonal"
              density="comfortable"
              @click="updateLocalDiagram()">
              Update ({{ shortcutLabels.save }})
            </v-btn>
            <v-btn
              v-else
              variant="outlined"
              class="text-green"
              density="comfortable"
              @click="create()">
              Create ({{ shortcutLabels.save }})
            </v-btn>
            <v-btn
              variant="outlined"
              class="text-red"
              density="comfortable"
              @click="close()">
              Cancel ({{ shortcutLabels.close }})
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </focus-trap>
  </v-dialog>
</template>

<script>
import cytoscape from 'cytoscape'
import { markRaw } from 'vue'
import D3Util from '@/helpers/D3Util.js'
import CytoscapeGraph from '@/helpers/CytoscapeGraph.js'
import { cytoscapeToGraphlib, graphlibToCytoscape, isGraphlibFormat } from '@/helpers/graphlibMigration.js'
import D3DApi from '@/services/api'

// Register dagre plugin for diagrams created here
export default {
  name: 'DiagramForm',
  props: ['active'],
  inject: ['modifier'],
  data() {
    return {
      id:          null,
      diagram:     null,    // cytoscape instance
      username:    '',
      created:     null,
      name:        'New diagram default name',
      description: 'New diagram default description',
      diagramModal: false,
      update:      null,
      layoutMode: 'dagre',
      layoutModeOptions: ['dagre', 'fcose', 'cola'],
      rankdirOptions: ['TB', 'BT', 'LR', 'RL'],
      dagreOpts: { rankdir: 'TB', ranksep: 50, nodesep: 10, ranker: 'network-simplex' },
      fcoseOpts: { idealEdgeLength: 50, nodeRepulsion: 4500, gravity: 0.25, numIter: 2500 },
      colaOpts:  { edgeLength: 80, nodeSpacing: 10, flow: null, avoidOverlap: true, maxSimulationTime: 1500 },
      jsonDiagram: null,
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
  },
  mounted() {
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

  methods: {
    _mod() {
      // Handle both raw and ComputedRef injection
      return this.modifier?.value ?? this.modifier
    },

    newDiagram() {
      this.$cookies.remove('LastLocallySavedItemId')

      const cy = markRaw(cytoscape({
        headless: true,
        elements: [
          { group: 'nodes', data: { id: 'first', label: 'first node', shape: 'rectangle' } }
        ]
      }))

      const d3dInfo = {
        id:          null,
        diagram:     cy,
        name:        D3Util.tempInfo().name,
        description: D3Util.tempInfo().description,
        layoutMode:  this.layoutMode,
        dagreOpts:   { ...this.dagreOpts },
        fcoseOpts:   { ...this.fcoseOpts },
        colaOpts:    { ...this.colaOpts },
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
        const json       = cytoscapeToGraphlib(this.diagram)
        this.jsonDiagram = JSON.stringify(json, null, 2)
      }

      // Layout options live on the modifier
      this.layoutMode = mod?.layoutMode || 'dagre'
      if (mod?.dagreOpts) this.dagreOpts = { ...mod.dagreOpts }
      if (mod?.fcoseOpts) this.fcoseOpts = { ...mod.fcoseOpts }
      if (mod?.colaOpts)  this.colaOpts  = { ...mod.colaOpts }
    },

    async create() {
      this.setDiagramInfo(true)
      this._applyLayoutOptions()

      const json    = cytoscapeToGraphlib(this.diagram)
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
        mod.dagreOpts  = { ...this.dagreOpts }
        mod.fcoseOpts  = { ...this.fcoseOpts }
        mod.colaOpts   = { ...this.colaOpts }
        // Keep legacy aliases in sync
        mod.rankdir = this.dagreOpts.rankdir
        mod.ranksep = Number(this.dagreOpts.ranksep)
        mod.nodesep = Number(this.dagreOpts.nodesep)
      }
    },

    updateLocalDiagram() {
      const d3dInfo = {
        id:          this.id,
        name:        this.name,
        description: this.description,
        created:     this.created,
        layoutMode:  this.layoutMode,
        dagreOpts:   { ...this.dagreOpts },
        fcoseOpts:   { ...this.fcoseOpts },
        colaOpts:    { ...this.colaOpts },
      }

      // Parse the edited JSON (may be graphlib or cytoscape format)
      try {
        const parsed   = JSON.parse(this.jsonDiagram)
        const elements = isGraphlibFormat(parsed) ? graphlibToCytoscape(parsed) : parsed
        this.diagram   = markRaw(cytoscape({ headless: true, elements }))
      } catch (e) {
        console.error('JSON parse failed', e)
        return
      }

      d3dInfo.diagram = this.diagram
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
        dagreOpts:   { ...this.dagreOpts },
        fcoseOpts:   { ...this.fcoseOpts },
        colaOpts:    { ...this.colaOpts },
      }

      try {
        const parsed   = JSON.parse(this.jsonDiagram)
        const elements = isGraphlibFormat(parsed) ? graphlibToCytoscape(parsed) : parsed
        this.diagram   = markRaw(cytoscape({ headless: true, elements }))
      } catch (e) {
        console.error('JSON parse failed', e)
        return
      }

      d3dInfo.diagram = this.diagram
      this._newModifier(d3dInfo)

      const json        = cytoscapeToGraphlib(this.diagram)
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

    _newModifier(d3dInfo) {
      const newMod = markRaw(new CytoscapeGraph(d3dInfo, this.emitter))
      // ThreeDRenderer will be reconnected automatically by CytoscapeGraphView watcher
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
