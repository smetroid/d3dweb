<template>
  <div id="iform">
      <v-card 
        class="mx-auto text-indigo"
        ref="formfields" 
        @keyup.alt.s="updateNode()"
        @keyup.meta.s="updateNode()"
        @keyup.ctrl.c="close()"
        @keydown.esc="keyPress($event)"
        @keypress.stop.prevent="keyPress($event)">
        <focus-trap 
          v-model:action="enableTrap"
          >
          <div tabindex="0">
            <v-card-title class="text-primary">
              <v-row class="pa-3" justify="center">
                <b v-if="update">Update Node</b>
                <b v-else>Add Node</b>
              </v-row>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pb-0">
              <v-container class="pb-0">
                <v-row
                >
                  <v-col 
                    >
                    <v-select
                      v-model="nodeLabelType"
                      :items="nodeLabelTypeOptions"
                      item-title="value"
                      item-value="key"
                      label="Node Label Type"
                    ></v-select>
                  </v-col>
                  <v-col 
                    >
                    <v-select
                      v-model="nodeShape"
                      :items="nodeShapes"
                      label="Node Shape"
                      item-value="value"
                      item-title="label"
                    ></v-select>
                  </v-col>
                  <v-col 
                    >
                    <v-select
                      v-model="clusterLabelPos"
                      :items="clusterLabelPosOptions"
                      label="Cluster Label Position"
                      item-value="value"
                      item-title="label"
                      hint="optional"
                      clearable
                    ></v-select>
                  </v-col>
                  <v-col 
                    >
                    <v-select
                      v-model="parentNode"
                      :items="parentOptions"
                      item-title="value"
                      item-value="key"
                      auto-select-first
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
                    <v-textarea
                      autofocus
                      class=""
                      label="Node Label"
                      v-model="nodeLabel"
                      placeholder="Add a node label ... if label contains HTML then Label Type must be Html ... alt+shift+w to clear value"
                      @keypress.stop=""
                      @keydown.alt.shift.w="nodeLabel=''"
                      @keydown.meta.shift.w="nodeLabel=''"
                      ref="nodeLabelTextField"
                      clearable
                      rows="5"
                      />
                  </v-col>
                  <v-col 
                    cols="6"
                    >
                    <v-text-field 
                      v-model="style"
                      placeholder="fill: #d3d7e8"
                      label="Node Style"
                      hint="optional"
                      @keypress.stop=""
                      clearable
                      >
                    </v-text-field>
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions
              class="mx-auto"
              >
                <v-btn 
                  v-if="update" 
                  variant="tonal"
                  class="text-primary" 
                  density="comfortable"
                  @click="updateNode()" 
                  @keypress.stop="">
                  Update Node
                  </v-btn>
                <v-btn 
                  v-else 
                  variant="tonal"
                  class="text-primary" 
                  @click="addNode()" 
                  type="submit"
                  density="comfortable"
                  @keypress.stop="">
                  Add Node
                </v-btn>
                <v-btn 
                  variant="tonal"
                  type="submit"
                  density="comfortable"
                  class="text-primary" 
                  @click="close()" 
                  @keypress.stop="">Cancel</v-btn>
            </v-card-actions>
          </div>
        </focus-trap>
      </v-card>
  </div>
</template>

<script>
// import * as Velocity from 'velocity-animate'
import D3Util from '@/helpers/D3Util'
// import VueCookies from 'vue-cookies'
export default {
  name: 'D3Node',
  props: ['active', 'd3Data'],
  inject: ['modifier'],
  data () {
    return {
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
    if (D3Util.debug) {
      console.log('active window watch d3nodeform')
      console.log(this.d3Data)
      console.log(this.modifier.diagram)
      console.log(this.d3Data.id)
      console.log(this.modifier.diagram.parent(this.modifier.d3dInfo.id))
    }

    this.update = this.active == 'Edit Node'? true : false

    if(this.update || this.nodeModal){
      //Setting up nodeModal to true if update is true
      this.nodeLabelType = (this.d3Data.labelType) || this.nodeLabelType
      this.nodeLabel = this.d3Data.label
      this.nodeShape = this.d3Data.shape
      this.nodeId = this.d3Data.id
      this.parentNode = this.modifier.diagram.parent(this.d3Data.id)
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
    } 
    /*
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
    */
 //    this.$root.$on('showNodeForm', (nodeAction) => {
 //      console.log('Message Received From D3Vim')
 //      console.log(this.$el)
 //      console.log(this.$root)
 //      this.viewNode(nodeAction)
 //    })

    this.emitter.on('d3NodeData', (data, nodeId) => {
      console.log('Message Received from D3Dagre')
      if (D3Util.debug) {
        console.log(data)
      }
      this.d3DagreData = data
      this.nodeId = nodeId
    })

    this.emitter.on('editNode', () => {
      this.editNode()
    })
  },
  computed: {
    parentOptions() {
      var nodes = this.modifier.diagram.nodes()
      console.log('computed'+nodes)
      var data = Object.values(nodes).map((key) => ({"key":key, "value":this.modifier.getNodeData(key).label}))
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

      this.modifier.updateNode(this.$data, this.nodeId)
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
      this.modifier.addNode(this.$data)
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
      /*FIXME - I think we need to copy the object before we make any changes
      in case we make changes and we 'Cancel' any changes made should be reverted
      else the changes will stay even though we don't save them? ... need to test
      this out
      */
      console.log(this.hints)
      this.hints = D3Util.removeHints(this.hints)
      /**
       * Close the parents sheet
       */
      this.emitter.emit('setSheetToFalse')
      //this.emitter.emit("changeActive")
      //this.emitter.emit('d3DagreActivate')
    }
  },
  //watch: {
  //  active: function() {
  //  // NOTE: Since we moved from a v-modal to a v-if from the 
  //  // this code no longer works because the v-if does not render
  //  // the component until v-if is valid.
  //  // Moved the logic to the mount method instead.

  //  //  console.log('active window watch d3nodeform')
  //  //  this.update = this.active == 'Edit Node'?true:false
  //  //  this.nodeModal = this.active == 'Add Node'?true:false
  //  //  if(this.update || this.nodeModal){
  //  //    //Setting up nodeModal to true if update is true
  //  //    this.nodeModal = true
  //  //    this.nodeLabelType = this.d3Data.labelType
  //  //    this.nodeLabel = this.d3Data.label
  //  //    this.nodeShape = this.d3Data.shape
  //  //    this.nodeId = this.d3Data.id
  //  //  } else {
  //  //    this.nodeModal = false
  //  //  }
  //  //  if(this.nodeModal){
  //  //    this.$nextTick(function(){
  //  //      console.log('Trap active')
  //  //    })
  //  //  }
  //  },
  //  d3Data: function(){
  //    //console.log(this.d3Data)
  //  }
  //}
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
/*
::v-deep .v-textarea textarea {
  color: red;
  height: auto;
  line-height: initial;
  margin: 0px 10px 7px 0px;
  padding-top: 6px;
}
*/

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
