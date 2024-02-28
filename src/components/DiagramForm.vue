<template>
  <div>
    <v-dialog v-model="diagramModal" max-width="800">
    <div>
    <!--
    <div 
      @keydown.esc="keyPress($event)"
      @keypress.stop.prevent="keyPress($event)"
    >
    -->
    <focus-trap v-model="enableTrap">
      <div id="trapDiv" tabindex="-1" class="trap is-active">
        <v-card id="loginCard" class="mx-auto">
          <v-card-title class="headline">
            <v-row justify="center">
              <b v-if="update">Update Diagram</b>
              <b v-else>Create New Diagram</b>
            </v-row>
          </v-card-title>
          <v-card-text class="blue-grey darken-4">
            <v-container>
              <v-form>
                <v-row v-if="update" class="ma-0" align="center">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">ID:</span>
                  </v-col>
                  {{ id }}
                </v-row>
                <v-row class="ma-0">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Name:</span>
                  </v-col>
                  <v-text-field v-model="name" type="textarea"
                    placeholder="" />
                </v-row>
                <v-row class="ma-0" align="center">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Description:</span>
                  </v-col>
                  <v-textarea v-model="description" hint="Enter a decription for the new diagram"
                    rows="2" row-height="10">
                    </v-textarea>
                </v-row>
                <v-row class="ma-0" align="center">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Options:</span>
                  </v-col>
                  <v-col class="pa-0">
                    <v-switch
                      dense
                      v-model="graphOptions"
                      color="green"
                      label="directed"
                      value="directed"
                      >
                    </v-switch>
                    <v-switch
                      dense
                      v-model="graphOptions"
                      color="green"
                      label="multigraph"
                      value="multigraph"
                      >
                    </v-switch>
                    <v-switch
                      dense
                      v-model="graphOptions"
                      color="green"
                      label="compound"
                      value="compound"
                      >
                    </v-switch>
                  </v-col>
                  <!--
                  <v-col class="pa-0">
                    <v-switch
                      dense
                      color="green"
                      v-for="n in graphOptions"
                        :key="`${n.label}-${n.value}`"
                        :label="`${n.label} : ${n.value}`"
                        :value="`${n.value}`"
                      >
                    </v-switch>
                  </v-col>
                  -->
                </v-row>
                <v-row class="ma-0">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Rankdir:</span>
                  </v-col>
                  <v-col class="pa-0">
                    <v-select
                      color="green"
                      v-model="rankdir"
                      :items="rankdirOptions"
                      item-value="key"
                      item-text="value"
                      auto-select-first
                    ></v-select>
                  </v-col>
                </v-row>
                <v-row class="ma-0">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Ranksep:</span>
                  </v-col>
                  <v-text-field v-model="ranksep" type="textarea"
                    placeholder="" />
                </v-row>
                <v-row class="ma-0">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Nodesep:</span>
                  </v-col>
                  <v-text-field v-model="nodesep" type="textarea"
                    placeholder="" />
                </v-row>
                <v-row class="ma-0">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">D3Line:</span>
                  </v-col>
                  <v-col class="pa-0">
                    <v-select 
                      v-model="edgeLine" 
                      :items="edgeLineOptions"
                      item-value="key"
                      item-text="value"
                    ></v-select>
                  </v-col>
                </v-row>
                  <!--
                  <v-col class="pa-0">
                      <v-switch
                        dense
                        color="green"
                        v-for="n in diagramOptions"
                        :key="n.label"
                        label="`${n.label}`"
                        value="`${n.value}`"
                        >
                      </v-switch>
                  </v-col>
                  -->
                <v-row v-if="update" class="ma-0" align="center">
                  <v-col sm="3" align="right" class="pa-2">
                    <span class="samus__label">Diagram:</span>
                  </v-col>
                  <v-textarea v-model="jsonDiagram" disabled hint="JSON Data of the Diagram"
                    rows="5" row-height="50">
                  </v-textarea>
                </v-row>
              </v-form>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="update" dense class="ma-2" outlined color="green"
              @click="updateDiagram()"> Update</v-btn>
            <v-btn v-else dense class="ma-2" outlined color="green"
              @click="create()"> Create </v-btn>
            <v-spacer></v-spacer>
            <v-btn dense class="ma-2" outlined color="red"
              @click="close()">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </focus-trap>
    </div>
  </v-dialog>
  </div>
</template>
<script>
import D3VimApi from '@/services/api/SamusApi'
import D3Util from '@/services/D3Util'
import VueCookies from 'vue-cookies'
//import * as dagreD3 from 'dagre-d3'
export default {
  name: 'DiagramForm',
  props: ['active', 'diagramInfo'],
  data () {
    return {
      id: null,
      diagram: null,
      username: '',
      enableTrap: null,
      name: 'New diagram default name',
      description: 'New diagram default description',
      diagramModal: null,
      update: null,
      graphDefaults: {
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
        ]
    }
  },
  mounted () {
    //this.$root.$on('diagramEditForm', (data) => {
    //    console.log('data.diagramInfo')
    //    this.getDiagramData(data)
    //  }
    //)
  },
  methods: {
    setUpdateData(diagramInfo){
      this.id = diagramInfo.id
      this.name = diagramInfo.name
      this.description = diagramInfo.description
      this.diagram = diagramInfo.diagram
      this.jsonDiagram = diagramInfo.json
      this.setGraphOptions(diagramInfo.diagram)
      this.rankdir = this.diagram._label.rankdir
      this.ranksep = this.diagram._label.ranksep
      this.nodesep = this.diagram._label.nodesep
      //this.edgeLine = VueCookies.get(this.id)['edgeLine']
      if (D3Util.debug) {
        console.log(this.diagram)
        console.log(this.graphOptions)
      }
    },
    create: async function () {
      console.log('creating a new diagramForm')
      this.setOptionsAndLabels()
      var created = new Date()
      /**
       * Need to move this into the API
       */
      var payload = { 
        'name': this.name,
        'description': this.description,
        'diagram': JSON.stringify(this.graphDefaults),
        'createTime': created.toISOString(),
        'updatedTime': created.toISOString(),
      }
      if (D3Util.debug()){
        console.log(this.diagramInfo)
        console.log(this.diagram)
      }
      if (D3Util.auth()) {
        var result = await D3VimApi.postDiagram(payload)
        if(D3Util.debug()){
          console.log(result)
        }
        var statusText = result.statusText + " ID: " + result.data

        if (Object.prototype.hasOwnProperty.call(result, 'data')) {
          payload.id = result.data
          D3Util.saveLocal(payload)
          this.$root.$emit('appMessage', true, 'New diagram successfully created', statusText)
          this.$root.$emit('updateHelperDiagramInfo', this.name, this.description, result.data)

        } else {
          this.$root.$emit('appMessage', false, 'Failed to create or save diagram', statusText)
        }
        /**
         * TODO: Move this to the backend api 
         * a temporary workaround to set save
         * and retrieve the edgeLine setting
        */
        VueCookies.set('edgeLine'+this.id, this.edgeLine)
      } else {
        //localStorage.setItem('samus.lastUpdated', JSON.stringify(this.$data))
        D3Util.saveLocal(payload)
        this.$root.$emit('appMessage', true, 'Changes are being saved to local storage')
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
      if (D3Util.debug) {
        console.log(this.diagram)
      }
    },
    updateDiagram: async function () {
      this.setOptionsAndLabels()
      this.diagramInfo.redraw(this.diagram) 
      var result = await D3VimApi.updateDiagram(this.$data, this)

      if(D3Util.debug){
        console.log('updateDiagram')
        console.log(result)
      }

      console.log('this.edgeLine')
      console.log(this.edgeLine)
      console.log(this.$data)
      VueCookies.set('edgeLine'+this.id, this.edgeLine)
      this.close()
    },
    // Not being used at the moment
    // keyPress(event) {
    //   this.hints = D3Util.formHints(event, this)
    // },
    close () {
      console.log('Close method')
      this.diagramModal= false
      this.enableTrap = false
      this.graphOptions = []
      console.log(this)
      this.$root.$emit('changeActive')

      // this.$root.$emit('d3DagreActivate')
      // this.$root.$emit('showForm', 'node')
    },
    // Not being used at the moment
    //common(){
    //  //this.enableTrap= false
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
    active: function(){
      console.log('active window diagramForm')
      this.update = this.active == 'Edit'?true:false

      if(this.active === 'New' || this.active === 'Edit'){
        this.diagramModal = true
        /**This may not be needed since the DOM is being rendered 
         * and therefore should trap the modal form when viwed
         */
        this.$nextTick(function(){
          console.log('enableTrap active')
          this.enableTrap = true
        })
      }
      if(this.update || this.diagramModal){
        this.setUpdateData(this.diagramInfo)
      } else {
        console.log('nothing to do')
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
