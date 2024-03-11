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
                  v-for="(v, k) in diagramDefaults.options"
                    :key="k"
                    :label="`${k}`"
                    :model-value="v"
                  >
                </v-switch>
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
              <v-select 
                label="D3Line"
                v-model="edgeLine" 
                :items="edgeLineOptions"
                item-value="key"
                item-text="value"
                />
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
            class="bg-primary"
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
import D3Util from '@/services/D3Util'
export default {
  name: 'DiagramForm',
  props: ['active'],
  inject: ['modifier'],
  data () {
    return {
      id: null,
      diagram: null,
      username: '',
      name: 'New diagram default name',
      description: 'New diagram default description',
      diagramModal: false,
      created: Date().toISOString,
      update: null,
      diagramDefaults: {
        "options": {
          "directed":true,
          "multigraph":true,
          "compound":true
        }, 
        "nodes": [], 
        "edges": [], 
        "value": {
          "rankdir":'50','ranksep':'TB','nodesep':'10'
        }
      },
      graphOptions: [],
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
    this.emitter.on('SaveDiagram', () => {
      if (this.modifier.d3dInfo.id){
        console.log('found diagram info id ... saving changes')
        this.updateLocalDiagram();
      } else {
        this.diagramModal = true
      }
      this.setDiagramInfo()
    })

    this.emitter.on('EditDiagram', () => {
      this.diagramModal = true
      this.update = this.diagramModal
      this.setDiagramInfo()
    })
  },
  methods: {
    setDiagramInfo(){
      console.log(this.modifier)
      let info = this.modifier.d3dInfo
      this.id = info.id
      this.name = info.name ? info.name : this.name
      this.description = info.description ? info.description : this.description
      this.diagram = info.diagram
      this.created = info.created
      this.jsonDiagram = JSON.stringify(this.diagram)
      this.setGraphOptions(this.diagram)
      this.rankdir = this.diagram._label.rankdir
      this.ranksep = this.diagram._label.ranksep
      this.nodesep = this.diagram._label.nodesep
      this.width = this.diagram._label.width
      this.height = this.diagram._label.height
      //this.edgeLine = VueCookies.get(this.id)['edgeLine']
      if (D3Util.debug) {
        console.log(this.diagram)
        console.log(this.graphOptions)
      }
    },
    create: async function () {
      console.log('creating a new diagramForm')
      this.setOptionsAndLabels()
      /**
       * Need to move this into the API
       * this should be the current diagram object
       */
      /*NOTE - There is a spacial way graphlib write to json, 
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
        let id = D3Util.createLocalEntry(this)
        this.id = id
        this.emitter.emit('appMessage', true, 'Changes are being saved to local storage')
        this.emitter.emit('updateDiagramInfo', this)
      }

      this.close()
    },
    setOptionsAndLabels () {
      this.diagram._isCompound = this.graphOptions.includes('compound')
      this.diagram._isDirected = this.graphOptions.includes('directed')
      this.diagram._isMultigraph = this.graphOptions.includes('multigraph')
      this.diagram._label.nodesep = this.nodesep
      this.diagram._label.rankdir = this.rankdir
      this.diagram._label.ranksep = this.ranksep
      this.diagram._label.width = this.width
      this.diagram._label.height = this.height
      if (D3Util.debug) {
        console.log(this.diagram)
      }
    },
    updateLocalDiagram (){
      let updated = new Date()
      let payload = { 
        'name': this.name,
        'description': this.description,
        'diagram': JSON.stringify(this.diagram),
        'createdTime': this.createTime,
        'updatedTime': updated.toISOString(),
      }
      D3Util.updateLocalEntry(this.id, payload)
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
      this.graphOptions = []
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
      this.graphOptions = []
      console.log(options)
      if(options._isDirected){
        this.graphOptions.push('directed')
      }
      if(options._isMultigraph){
        this.graphOptions.push('multigraph')
      }
      if(options._isCompound){
        this.graphOptions.push('compound')
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
