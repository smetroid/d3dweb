<template>
  <div id="iform">
      <!--
    <v-dialog v-model="nodeModal" max-width="500">
        While refactoring d3Dagre v-if and the trap does not work
      <v-card class="mx-auto" max-width="560" v-if="showForm">
      -->
      <v-card ref="formfields" class="mx-auto"
        @keyup.alt.u="updateNode()"
        @keyup.meta.u="updateNode()"
        @keyup.ctrl.c="close()"
        @keydown.esc="keyPress($event)"
        @keypress.stop.prevent="keyPress($event)">
        <focus-trap v-model="enableTrap">
          <div tabindex="" class="trap is-active">
            <v-card-title class="">
              <v-row justify="center">
                <b v-if="update">Update Node</b>
                <b v-else>Add Node</b>
              </v-row>
            </v-card-title>
            <v-card-text class="blue-grey darken-4">
              <v-container fluid>
                <v-row
                >
                  <v-col 
                    >
                    <v-select
                      v-model="nodeLabelType"
                      color="green"
                      outlined
                      :items="nodeLabelTypeOptions"
                      item-text="value"
                      item-value="key"
                      label="Node Label Type"
                      dense
                    ></v-select>
                  </v-col>
                  <v-col 
                    >
                    <v-select
                      color="green"
                      outlined
                      v-model="nodeShape"
                      :items="nodeShapes"
                      label="Node Shape"
                      item-value="value"
                      item-text="label"
                      dense
                    ></v-select>
                  </v-col>
                  <v-col 
                    >
                    <v-select
                      color="green"
                      outlined
                      v-model="clusterLabelPos"
                      :items="clusterLabelPosOptions"
                      label="Cluster Label Position"
                      item-value="value"
                      item-text="label"
                      dense
                      hint="optional"
                      clearable
                    ></v-select>
                  </v-col>
                  <v-col 
                    >
                    <v-select
                      color="green"
                      outlined
                      v-model="parentNode"
                      :items="parentOptions"
                      item-value="key"
                      item-text="value"
                      auto-select-first
                      dense
                      label="Parent"
                      hint="optional"
                      clearable
                      >
                    </v-select>
                  </v-col>
                </v-row>
                <v-row
                  class="mt-n7"
                  >
                  <v-col 
                    cols="6"
                    >
                    <div samus="samus" >
                    <v-textarea
                      outlined
                      tabindex="0"
                      color="green"
                      class="mb-n11"
                      label="Node Label"
                      v-model="nodeLabel"
                      placeholder="Add a node label ... if label contains HTML then Label Type must be Html"
                      @keypress.stop=""
                      @keyup.alt.shift.w="nodeLabel=''"
                      @keyup.meta.shift.w="nodeLabel=''"
                      ref="nodeLabelTextField"
                      dense
                      clearable
                      rows="5"
                      />
                    </div>
                      <!--
                        *Leaving here for reference 
                    <v-textarea v-if="update" dense outline v-model="nodeLabel"
                      rows="3"
                      row-height="50"
                      @keypress.stop="" @keydown.enter.prevent="updateNode()"
                      placeholder="Add a node label ... can be html"
                      ref="textField" persistent-hint
                      hint="Pressing enter will update the node" />
                      -->
                  </v-col>
                  <v-col 
                    cols="6"
                    >
                    <v-text-field 
                      color="green"
                      outlined
                      v-model="style"
                      placeholder="fill: #d3d7e8"
                      label="Node Style"
                      hint="optional"
                      @keypress.stop=""
                      dense
                      clearable
                      >
                    </v-text-field>
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>
            <v-card-actions class="pa-1">
              <v-btn 
                v-if="update" 
                class="d-flex ma-1" 
                outlined 
                color="blue"
                x-small
                @click="updateNode()" 
                @keypress.stop="">
                Update Node (Alt/Meta + u)
                </v-btn>
              <v-btn 
                v-else 
                dense 
                class="d-flex ma-1" 
                outlined 
                color="green"
                x-small
                @click="addNode()" 
                @keypress.stop="">Add Node</v-btn>
              <v-btn 
                class="d-flex ma-1" 
                x-small
                dense 
                outlined 
                color="red"
                @click="close()" 
                @keypress.stop="">Cancel (Ctrl + c)</v-btn>
            </v-card-actions>
          </div>
        </focus-trap>
      </v-card>
      <!--
    </v-dialog>
    -->
  </div>
</template>

<script>
// import * as Velocity from 'velocity-animate'
//import DagreLib from '@/helpers/DagreLib'
import D3Util from '@/services/D3Util'
// import VueCookies from 'vue-cookies'
export default {
  name: 'D3Node',
  props: ['active', 'd3Data', 'DagreLib'],
  data () {
    return {
      nodeModal: false,
      enableTrap: false,
      errorClass: true,
      nodeLabel: null,
      nodeShape: null,
      hints: {},
      d3DagreData: null,
      nodeId: null,
      update: false,
      //nodeLabelType: 'text',
      nodeLabelType: {
        'key':'text',
        'value':'Text'
      },
      nodeLabelTypeOptions: [
        { 'key':'text','value':'Text' },
        { 'key':'html','value':'HTML' }
      ],
      nodeShapes: [
        {'value':'rect','label':'Rectangle'},
        {'value':'circle','label':'Circle'},
        {'value':'ellipse','label':'Ellipse'},
        {'value':'diamond','label':'Diamond'}
      ],
      //parentOptions: {},
      parentNode: null,
      clusterLabelPos: 'top',
      clusterLabelPosOptions: [
        {'value':'top','label':'Top'},
        {'value':'bottom','label':'Bottom'},
        {'value':'topLeft','label':'TopLeft'},
        {'value':'topRight','label':'TopRight'},
        {'value':'bottomLeft','label':'BottomLeft'},
        {'value':'bottomRight','label':'BottomRight'}
      ],
      style: 'fill: #5f9488',
    }
  },
  mounted () {
    console.log('active window watch d3nodeform')
    console.log(this.d3Data)
    console.log(this.DagreLib.diagram)
    console.log(this.d3Data.id)
    console.log(this.DagreLib.diagram.parent(this.d3Data.id))
    this.update = this.active == 'Edit Node'?true:false
    this.nodeModal = this.active == 'Add Node'?true:false
    if(this.update || this.nodeModal){
      //Setting up nodeModal to true if update is true
      this.nodeModal = true
      this.nodeLabelType = (this.d3Data.labelType) || this.nodeLabelType
      this.nodeLabel = this.d3Data.label
      this.nodeShape = this.d3Data.shape
      this.nodeId = this.d3Data.id
      this.parentNode = this.DagreLib.diagram.parent(this.d3Data.id)
      // console.log("troubleshooting cluster label")

      // for( var key in this.clusterLabelPosOptions){
      //   console.log(this.clusterLabelPosOptions[key])
      //   var pos = this.clusterLabelPosOptions[key]
      //   console.log(pos.value)
      //   if (pos.value === this.d3Data.clusterLabelPos){
      //     console.log(pos)
      //     break
      //   }
      // }

      // //this.clusterLabelPos = (this.clusterLabelPosOptions[pos]) || this.clusterLabelPos
      // this.clusterLabelPos = this.clusterLabelPosOptions[key] || this.clusterLabelPos
      this.clusterLabelPos = (this.d3Data.clusterLabelPos) || "top" 

      this.style = this.d3Data.style
      //this.parentOptions = this.diagram.nodes()
    } else {
      this.nodeModal = false
    }
    if(this.nodeModal){
      this.$nextTick(function(){
        console.log('Trap active')
        this.enableTrap = this.nodeModal
        console.log(this.$refs)
        console.log(this.$refs.nodeLabelTextField)
        setTimeout(() => {
          this.$refs.nodeLabelTextField.focus()
        })
      })
    }
 //    this.$root.$on('showNodeForm', (nodeAction) => {
 //      console.log('Message Received From D3Vim')
 //      console.log(this.$el)
 //      console.log(this.$root)
 //      this.viewNode(nodeAction)
 //    })

    this.$root.$on('d3NodeData', (data, nodeId) => {
      console.log('Message Received from D3Dagre')
      if (D3Util.debug) {
        console.log(data)
      }
      this.d3DagreData = data
      this.nodeId = nodeId
    })

    this.$root.$on('editNode', () => {
      this.editNode()
    })
  },
  computed: {
    parentOptions() {
      var nodes = this.DagreLib.diagram.nodes()
      console.log('computed'+nodes)
      var data = Object.values(nodes).map((key) => ({"key":key, "value":this.DagreLib.getNodeData(key).label}))
      console.log(data)
      return data
    },
  },
  methods: {
    updateNode () {
      if (D3Util.debug) {
        console.log(this.$el)
        console.log('addNode Function')
        console.log(this.nodeLabel)
        console.log(this.nodeLabelType)
        console.log(this.clusterLabelPos)
        console.log(this.nodeShape)
        console.log(this.$data)
        console.log(this.nodeId)
      }

      this.DagreLib.updateNode(this.$data, this.nodeId)
      this.close()
      //this.$root.$emit('updateNode', this.$data, this.d3NodeId)
    },
    // viewNode () {
    //   this.trapActive = true
    //   this.nodeFormIsActive = true
    //   this.update = false
    // },
    // editNode () {
    //   // this.d3DagreId = this.d3DagreData.id
    //   if (D3Util.debug) {
    //     console.log(this.d3DagreData)
    //     console.log(this.d3DagreData.label)
    //   }
    //   this.trapActive = true
    //   this.nodeFormIsActive = true
    //   this.nodeLabelType = this.d3DagreData.labelType
    //   this.nodeLabel = this.d3DagreData.label
    //   this.nodeShape = this.d3DagreData.shape
    //   this.update = true
    // },
    keyPress(event) {
      if(D3Util.debug){
        console.log("keypress event")
        console.log(this.hints)
      }
      this.hints = D3Util.formHints(event, this)
    },
    addNode () {
      if (D3Util.debug) {
        console.log(this.$el)
        console.log('addNode Function')
        console.log(this.nodeLabel)
        console.log(this.nodeLabelType)
        console.log(this.nodeShape)
        console.log(this.$refs.textField.$el)
        console.log(this.$data)
      }
      //this.$root.$emit('addDagreNode', this.$data, false)
      this.DagreLib.addNode(this.$data)
      // this.hints['l'].focus()
      this.common()
    },
    close () {
      this.common()
      //console.log('Close method')
      ////this.trapActive = false
      //this.nodeModal = false
      //this.$root.$emit("changeActive")
      ////this.$root.$emit('d3DagreActivate')
      //this.hints = {}
      //D3Util.removeHints(this.hints)
      //// this.$root.$emit('nodeModal', 'node')
    },
    common() {
      console.log(this.hints)
      // this.enableTrap= false
      this.nodeModal = false
      this.hints = D3Util.removeHints(this.hints)
      /**
       * Close the parents sheet
       */
      this.$root.$emit('setSheetToFalse')
      //this.$root.$emit("changeActive")
      //this.$root.$emit('d3DagreActivate')
    }
  },
  watch: {
    active: function() {
    // NOTE: Since we moved from a v-modal to a v-if from the 
    // this code no longer works because the v-if does not render
    // the component until v-if is valid.
    // Moved the logic to the mount method instead.

    //  console.log('active window watch d3nodeform')
    //  this.update = this.active == 'Edit Node'?true:false
    //  this.nodeModal = this.active == 'Add Node'?true:false
    //  if(this.update || this.nodeModal){
    //    //Setting up nodeModal to true if update is true
    //    this.nodeModal = true
    //    this.nodeLabelType = this.d3Data.labelType
    //    this.nodeLabel = this.d3Data.label
    //    this.nodeShape = this.d3Data.shape
    //    this.nodeId = this.d3Data.id
    //  } else {
    //    this.nodeModal = false
    //  }
    //  if(this.nodeModal){
    //    this.$nextTick(function(){
    //      console.log('Trap active')
    //      this.enableTrap = this.nodeModal
    //    })
    //  }
    },
    d3Data: function(){
      //console.log(this.d3Data)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

/*
leaving here for reference
*/
::v-deep .v-textarea textarea {
  color: red;
  height: auto;
  line-height: initial;
  margin: 0px 10px 7px 0px;
  padding-top: 6px;
}

.hints{
  border: 1px solid magenta;
  color: magenta;
  /*# display: table-caption;*/
}

/*
#iform {
  margin: auto;
  background: #343a40;
  border-radius: 15px;
  width: 40%;
  bottom: auto;
}
*/

/*
.trap {
  brackground: #f3c5f5;
  border:1px solid #c21414;
}
*/

/*
button:focus {
  border: #42b983;
  background-color: #42b983;
}
*/
</style>
