<template>
  <v-dialog
    scrollable
    v-model="diagramModal"
    max-width="600">
    <!--
    <div 
      @keydown.esc="keyPress($event)"
      @keypress.stop.prevent="keyPress($event)"
    >
    -->
    <focus-trap
      v-model:active="diagramModal"
      >
      <div id="trapDiv" tabindex="0" class="trap is-active">
        <v-card
          class="text-primary"
          >
          <v-card-title
            class="bg-primary d-flex justify-center"
            >
            <b v-if="update">Update Diagram</b>
            <b v-else>Create New Diagram</b>
          </v-card-title>
          <v-card-text
            color="text-primary"
            class=""
            >
            <v-form>
              <v-text-field
                label="ID"
                readonly
                v-model="id"
                type="textfield"
                placeholder=""
                />
              <v-text-field
                label="Diagram Name"
                v-model="name"
                placeholder=""
                />
              <v-textarea
                label="Diagram Description"
                v-model="description"
                hint="Enter a decription for the new diagram"
                rows="2" row-height="10"
                >
              </v-textarea>
              <div class="d-flex justify-space-around">
                Options
                <v-switch
                  color="primary"
                  v-for="(v, k) in diagramDefaults"
                  :key="k"
                  :label="`${k}`"
                  :model-value="v"
                />
              </div>
              <v-select
                label="Rank Direction"
                v-model="rankdir"
                :items="rankdirOptions"
                item-value="key"
                item-text="value"
                auto-select-first
                />
              <v-text-field
                label="Rank Seperation"
                v-model="ranksep"
                placeholder=""
                />
              <v-text-field 
                label="Node Seperation"
                v-model="nodesep" 
                placeholder="" 
                />
                <!--
              <v-select 
                label="D3Line"
                v-model="edgeLine" 
                :items="edgeLineOptions"
                item-value="key"
                item-text="value"
                />
                -->
              <v-textarea
                label="JSON Diagram"
                v-model="jsonDiagram"
                hint="JSON Data of the Diagram"
                rows="5"
                row-height="50"
                />
            </v-form>
          </v-card-text>
          <v-card-actions
            class="text-primary bg-primary d-flex justify-center justify-space-around"
            >
            <v-btn
              v-if="update"
              variant="outlined"
              class="bg-green"
              @click="updateLocalDiagram()">
              Update
            </v-btn>
            <v-btn 
              v-else
              variant="outlined"
              class="bg-green"
              @click="create()">
              Create
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              variant="outlined"
              class="bg-red"
              @click="close()">
              Cancel
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </focus-trap>
  </v-dialog>
</template>
<script>
import D3Util from '@/helpers/D3Util.js'
import * as DagreD3 from 'dagre-d3'
import DiagramModifier from '@/helpers/DiagramModifier.js'
//import VueCookies from 'vue-cookies'
export default {
  name: 'DiagramForm',
  props: ['active'],
  inject: ['modifier'],
  data () {
    return {
      id: null,
      diagram: null,
      username: '',
      created:null,
      name: 'New diagram default name',
      description: 'New diagram default description',
      diagramModal: false,
      update: null,
      diagramOptions: [],
      diagramDefaults: {
        'directed': true,
        "multigraph": true,
        "compound": true,
      },
      rankdir: 'TB',
      rankdirOptions: [
        'TB',
        'BT',
        'LR',
        'RL',
      ],
      graphAlign: [
        'UL',
        'UR',
        'DL',
        'DR',
      ],
      graphAlignDefault: undefined,
      ranksep: '50',
      nodesep: '10',
      jsonDiagram: null,
      edgeLine: 'curveLinear',
      edgeLineOptions: [
        'curveBasis',
        'curveLinear',
        'curveStep',
        'curveStepAfter',
        'curveStepBefore'
        ],
      width: '',
      height: ''
    }
  },
  mounted () {
    console.log('Diagram Mounted')

    /*!SECTION Emitter section */
    this.emitter.on('saveDiagram', () => {
      console.log('saving diagram')
      console.log(this.modifier)
      this.setDiagramInfo()
      if (this.modifier.d3dInfo.id){
        console.log('found diagram info id ... saving changes')
        this.updateLocalDiagram();
      } else {
        this.diagramModal = true
      }
    })

    this.emitter.on('editDiagram', () => {
      this.diagramModal = true
      this.update = this.diagramModal
      this.setDiagramInfo()
    })

    this.emitter.on('newDiagram', () => {
      this.newDiagram()
    })
  },
  methods: {
    newDiagram(){
      // clear the cookie of the last saved diagram
      this.$cookies.remove('LastLocallySavedItemId')

      console.log('creating a new localDiagram')
      let g = new DagreD3.graphlib.Graph(this.diagramDefaults)
      g.setGraph({})
      g.graph().rankdir = this.rankdir
      g.graph().ranksep = this.ranksep
      g.graph().nodesep = this.nodesep 
      g.setDefaultEdgeLabel(function () { return {} })
      g.setNode('first', {label: 'first node', id: 'first'})
      if (D3Util.debug) {
        console.log('newDiagram')
        console.log(g)
        console.log('newDiagram')
      }

      let d3dInfo = {}
      d3dInfo.id = null
      d3dInfo.diagram = g

      /**re-using temp name and description */
      d3dInfo.name = D3Util.tempInfo().name
      d3dInfo.description = D3Util.tempInfo().description
      console.log(d3dInfo)

      this.newModifier(d3dInfo)
    },
    setDiagramInfo(newDiagram){
      /*NOTE - tried to add this to the `mount` method, however because DiagramForm.vue 
      gets loaded before the App.vue `this.modifier.d3Info` is undefined causing the app
      to error out.  A workaround for this is to use `v-if` so that the Diagramform.vue does
      not get rendered as part of starting up the application
      */
      console.log(this.modifier)
      let info = this.modifier.d3dInfo
      this.id = newDiagram ? this.id : info.id
      this.name = newDiagram ? this.name : info.name
      this.description = newDiagram ? this.description : info.description
      this.diagram = newDiagram ? this.diagram : info.diagram
      this.created = newDiagram ? this.created : info.created
      let json = new DagreD3.graphlib.json.write(this.diagram)
      this.jsonDiagram = JSON.stringify(json)
      this.setGraphOptions(this.diagram)
      this.rankdir = this.diagram._label.rankdir
      this.ranksep = this.diagram._label.ranksep
      this.nodesep = this.diagram._label.nodesep

      /** this is part of the graph_label property, we may not need to retrieve this*/
      //this.width = this.diagram._label.width
      //this.height = this.diagram._label.height
      //this.edgeLine = VueCookies.get(this.id)['edgeLine']

      if (D3Util.debug) {
        console.log(this.diagram)
      }
    },
    create: async function () {
      console.log('creating a new diagramForm')
      /*NOTE - gets latest/updated modified objects, and sets it as it's value */
      this.setDiagramInfo(true)

      this.setOptionsAndLabels()

      /**
       * TODO: each line/edge can be different a global edge option is found
       * in the settings page
      */
      //VueCookies.set('edgeLine'+this.id, this.edgeLine)


      /**
       * Need to move this into the API
       * this should be the current diagram object
       */
      /*NOTE - There is a special way graphlib write to json, 
      if we don't do it this way the application 
      errors out when reloading the page
      */
      //let json = new DagreD3.graphlib.json.write(this.diagram)
      //let payload = { 
      //  'name': this.name,
      //  'description': this.description,
      //  'diagram': JSON.stringify(json),
      //  'createdTime': created.toISOString(),
      //  'updatedTime': null,
      //}

      if (D3Util.debug()){
        console.log(this.diagramInfo)
        console.log(this.diagram)
      }

      if (D3Util.auth()) {
        /*NOTE - Commenting this out for now
      //  var result = await D3VimApi.postDiagram(payload)
      //  if(D3Util.debug()){
      //    console.log(result)
      //  }
      //  var statusText = result.statusText + " ID: " + result.data

      //  if (Object.prototype.hasOwnProperty.call(result, 'data')) {
      //    payload.id = result.data
      //    D3Util.saveTempDiagram(payload)
      //    this.$root.$emit('appMessage', true, 'New diagram successfully created', statusText)
      //    this.$root.$emit('updateHelperDiagramInfo', payload.name, payload.description, result.data)

      //  } else {
      //    this.$root.$emit('appMessage', false, 'Failed to create or save diagram', statusText)
      //  }
      //  /**
      //   * TODO: Move this to the backend api 
      //   * a temporary workaround to set save
      //   * and retrieve the edgeLine setting
      //  */
      //  VueCookies.set('edgeLine'+this.id, this.edgeLine)
      } else {
        console.log(this)
        /*NOTE - once the setDiagramInfo completes ... DiagramForm.vue should have the latest/updated information */
        let id = D3Util.createLocalEntry(this)
        this.id = id
        this.emitter.emit('appMessage', true, 'Changes are being saved to local storage')
        this.emitter.emit('updateDiagramInfo', this)
      }

      this.close()
    },
    setOptionsAndLabels () {
      if (D3Util.debug) {
        console.log(this.diagram)
      }
      this.diagram._isCompound = this.diagramOptions.includes('compound')
      this.diagram._isDirected = this.diagramOptions.includes('directed')
      this.diagram._isMultigraph = this.diagramOptions.includes('multigraph')
      this.diagram._label.nodesep = this.nodesep
      this.diagram._label.rankdir = this.rankdir
      this.diagram._label.ranksep = this.ranksep
      /*properties that we should not need to change, it's part of the `_label` attribute */
      //this.diagram._label.width = this.width
      //this.diagram._label.height = this.height
      if (D3Util.debug) {
        console.log(this.diagram)
      }
    },
    updateLocalDiagram () {

      /**
       * TODO: the line can be set for each line, we need a better
       * way to address the potential different lines(edges)
      */
      //VueCookies.set('edgeLine'+this.id, this.edgeLine)


      /**NOTE - this info appers to be very similar to the newDiagram() method!!!
      In case the jsonDiagram has been updated/modified to 
      overwrite/create a new diagram
      */

      let d3dInfo = {}
      d3dInfo.id = this.id
      d3dInfo.name = this.name
      d3dInfo.description = this.description
      d3dInfo.created = this.created
      console.log(d3dInfo)
      this.diagram = new DagreD3.graphlib.json.read(JSON.parse(this.jsonDiagram))

      /*NOTE - any changes to the diagram options are
      updated by the setOptionsAndLabels method below
      */

      this.setOptionsAndLabels()
      d3dInfo.diagram = this.diagram

      this.newModifier(d3dInfo)
      D3Util.updateLocalEntry(this.$data)
      this.close()
      
    },
    newModifier (d3dInfo) {
      /**NOTE - this.modifier is the main object used by all other components files */
      let newModifier = new DiagramModifier(d3dInfo)
      console.log(this.newModifier)
      newModifier.redraw(d3dInfo.diagram)
      this.emitter.emit('updateModifier', newModifier)
    },
    //updateDiagram: async function () {
    //  this.setOptionsAndLabels()
    //  this.diagramInfo.redraw(this.diagram) 
    //  var result = await D3VimApi.updateDiagram(this.$data, this)

    //  if(D3Util.debug){
    //    console.log('updateDiagram')
    //    console.log(result)
    //  }

    //  console.log('this.edgeLine')
    //  console.log(this.edgeLine)
    //  console.log(this.$data)
    //  VueCookies.set('edgeLine'+this.id, this.edgeLine)
    //  this.close()
    //},
    // Not being used at the moment
    // keyPress(event) {
    //   this.hints = D3Util.formHints(event, this)
    // },
    close () {
      console.log('Close method')
      this.diagramModal= false
      console.log(this)
      this.emitter.emit('changeActive')

      // this.$root.$emit('d3DagreActivate')
      // this.$root.$emit('showForm', 'node')
    },
    // Not being used at the moment
    //common(){
    //  this.diagramModal = false
    //  this.hints = D3Util.removeHints(this.hints)
    //  this.$root.$emit("changeActive")
    //  this.$root.$emit("d3ResetValues")
    //},

    /** workaround for vuetify-js issue where v-for does not work as expected */
    setGraphOptions (options) {
      this.diagramOptions = []
      console.log(options)
      if(options._isDirected){
        this.diagramOptions.push('directed')
      }
      if(options._isMultigraph){
        this.diagramOptions.push('multigraph')
      }
      if(options._isCompound){
        this.diagramOptions.push('compound')
      }
    }
  },
  watch: {
  //  active: function(){
  //    console.log('active window diagramForm')
  //    this.update = this.active == 'Edit'?true:false

  //    if(this.active === 'New' || this.active === 'Edit'){
  //      this.diagramModal = true
  //    }
  //    if(this.update || this.diagramModal){
  //      this.setUpdateData(this.diagramInfo)
  //    } else {
  //      console.log('nothing to do')
  //    }
  //  }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
