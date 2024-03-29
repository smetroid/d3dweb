<template>
    <div
      @keydown.exact.alt.prevent="keyPress($event)"
      @keydown.exact.ctrl.r="reload($event)"
      @keypress.stop.prevent="keyPress($event)"
      @keydown.esc.prevent="keyPress($event)"
      >
        <FocusTrap
          v-model:active="trapGraph"
          :escapeDeactivates="false"
          :delayInitialFocus="true"
          :initial-focus="()=>$refs.svg"
          ref="graphTrap"
          >
            <div id="trap" ref="trapDiv" class="trap is-active" style="">
              <div v-if="diagramInfo">
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
              <svg
                ref="svg"
                tabindex="0"
                style="position: absolute; bottom: 30px; right: 1px"
                class="">
                <g/>
              </svg>
            </div>
        </FocusTrap>
        <v-bottom-sheet
          hide-overlay
          v-model="openSheet">
            <D3EdgeForm
              v-if="active === 'Add Edge' || active === 'Edit Edge'"
              :active="active"
              :d3Data="d3Data"
            />
            <D3NodeForm
              v-if="active === 'Add Node' || active === 'Edit Node'"
              :active="active"
              :d3Data="d3Data"
            />
        </v-bottom-sheet>
    </div>
</template>
<script>
import * as d3 from 'd3'
import D3Util from '@/helpers/D3Util'
import D3EdgeForm from '@/components/D3EdgeForm.vue'
import D3NodeForm from '@/components/D3NodeForm.vue'
import Hints from '@/helpers/Hints.vue'
//import login from '@/components/Login'
import D3DAltKeys from '@/helpers/DagreAltKeys.js'
import D3DOtherKeys from '@/helpers/DagreOtherKeys.js'
// import Crud from '@/helpers/CRUD'

export default {
  name: 'DagreGraphLib',
  //props: ['active', 'd3dInfo'],
  props: ['active'],
  inject: ['modifier'],
  components: {D3NodeForm, D3EdgeForm},
  data () {
    return {
      edgeOrNode: 'nodes',
      response: null,
      focusedIndex: null,
      trapGraph: true,
      focusedEdgeId: null,
      focusedNodeId: null,
      initialScale: .96,
      hintKeysReplaced: '',
      hints: {},
      d3Data: {},
      diagramInfo: true,
      selectedNodes: [],
      selectedEdges: [],
      doubleSelection: [],
      openSheet: false,
      transform: {},
      escCount: 0,
    }
  },
  mounted () {

    if (this.$cookies.get('settings')['d3dInfo']) {
      console.log()
      this.diagramInfo = true
    } else {
      this.diagramInfo = false
    }

    this.emitter.on('d3ResetValues', () => {
      this.resetValues()
    })

    this.emitter.on('setSheetToFalse', () => {
      /**
       * on emit the page appears to be rendered, automatically getting
       * rid of the vuetify openSheet.
       * The setTimeout allows for the openSheet animation to close properly
       */
      this.openSheet = false
      setTimeout( ()=> {
        this.emitter.emit("changeActive")
      }, 300)
    })

    /* NOTE - Change the edges or node selection when using the active menu links
    */
    this.emitter.on('edgeOrNode', (selection) => {
      var nodes = selection == 'Select Node' ? true : false
      var edges = selection == 'Select Edges' ? true : false
      if (edges) {
        this.edgeOrNode = "edges"
      } else if(nodes){
        this.edgeOrNode = "nodes"
      } else {
        console.log('no edges or nodes')
      }
    })
  },
  methods: {
    /**
     * used by DagreOtherKeys when creating the hyperlink hints
    */
    forwardLinkClicked (data) {
      /*
      NOTE - when using forward links to edit a node use the same logic for 
      editing a node via a selection ... for consistency.
      */
      if (D3Util.debug) {
        console.log('forwardLinkClicked')
        console.log(data)
        //console.log(this.modifier)
      }

      /*NOTE - need to test forwardLinkClicked methods to make sure this event key is the only thing we need
      */
      let event = {altKey: true, key: 'e', keyCode: 69}
      this.keyPress(event)

      // if (Object.prototype.hasOwnProperty.call(data, 'v') && Object.prototype.hasOwnProperty.call(data, 'w')) {
      //   console.log('v and w')
      //   // /* We want to control the from using the active parent varible*/
      //   // //this.showEdgeForm = true
      //   // this.d3Data = this.modifier.getEdgeData(data)
      //   // this.emitter.emit('changeActive', 'Edit Edge')
      // } else {
      //   console.log('v')
      //   let event = {altKey: true, key: 'e', keyCode: 69}
      //   this.keyPress(event)
      //   // /* We want to control the from using the active parent variable*/
      //   // //this.showNodeForm = true
      //   // this.d3Data = this.modifier.getNodeData(data)
      //   // console.log(this.d3Data)
      //   // this.emitter.emit('changeActive', 'Edit Node')
      // }
    },
    keyPress(event) {
      /*NOTE - let's add additional properties to the modifier object
      focusedIndex, selectedNodes, and doubleSelection are used by both
      DagreOtherKeys and the modifier ... keeping things DRY
      */
      this.modifier.focusedIndex = this.focusedIndex
      this.modifier.selectedNodes = this.selectedNodes
      this.modifier.doubleSelection = this.doubleSelection
      this.modifier.selectedEdges = this.selectedEdges

      if (D3Util.debug) {
        console.log('event')
        console.log(event)
      }
      if(Object.keys(this.hints).length > 1){
        Hints.data = this.hints
        Hints.hintKeysReplaced = this.hintKeysReplaced
        var data = Hints.followLinks(event)
        console.log(data)
        console.log(Object.keys(data.hints).length)
        if (Object.keys(data.hints).length > 1){
          this.hints = data.hints
          this.hintKeysReplaced = data.hintKeys
        } else {
          console.log('no data returned from followLinks')
          this.hints = {}
          this.hintKeysReplaced = ''
        }
      } else if ((event.altKey === true) || (event.metaKey === true)) {
        if (D3Util.debug) {
          console.log('alt key')
        }
        //DagreAltKeys.diagram = this.graphLib.diagram
        //DagreAltKeys.focusedNodeId = this.focusedNodeId
        //DagreAltKeys.focusedEdgeId = this.focusedEdgeId
        //DagreAltKeys.diagram = this.modifier.diagram
        let altKeys = new D3DAltKeys(this.emitter, this.modifier)
        console.log(this.modifier)
        var resetValues = altKeys.key(event.key, this)
        if(resetValues){
          this.resetValues()
        }
      } else {
        /*IF searching eg: "/" don't search for anything */
        console.log(this.modifier)
        let otherKeys = new D3DOtherKeys(this.emitter, this.modifier )
        var result = otherKeys.defaultActions(event.key, this.edgeOrNode)
        if (D3Util.debug){
          console.log(result)
          console.log(this.focusedNodeId)
          console.log(this.focusedEdgeId)
        }
        if (result){
          var status = false
          if(event.key == 'x') {
            if(this.edgeOrNode == 'nodes') {
              status = this.modifier.deleteNode(this.focusedNodeId)
              if (status){
                this.focusedNodeId = null
              } else {
                this.emitter.emit('appMessage', 'info', 'Unable to delete node')
              }
            } else {
              status = this.modifier.deleteEdge(this.focusedEdgeId)
              console.log(status)
              if (status){
                this.focusedEdgeId = null
              } else {
                this.emitter.emit('appMessage', 'info', 'Unable to delete edge')
              }
            }
          } else if(event.key == 'f') {
            this.hints = result.hints
            console.log(this.hints)
          } else if (event.key == 'Enter') {
            /*NOTE can we avoid this ... seems redundant*/
            this.selectedNodes = result.selectedNodes
            this.doubleSelection = result.doubleSelection
            /**!SECTION
             * how to fix this unexpected mutation?
             * there is probably a better way to do this!
             */
            this.modifier.selectedNodes = result.selectedNodes
            this.modifier.doubleSelection = result.doubleSelection
          } else if (event.key == 'Escape') {
            if (this.escCount == 2){
              this.resetValues()
              //Resets the selections
            } else {
              this.escCount = this.escCount + 1
            }
          } else if (event.key == 'y') {
            console.log('trying to copy what is selected')
            this.modifier.createCopyV2(this.focusedNodeId)
          } else {
            if (this.edgeOrNode == 'nodes') {
              this.focusedNodeId = result.nodesId
            } else if (this.edgeOrNode == 'edges') {
              this.focusedEdgeId = result.edgesId
            } else if (result.contains('hints')) {
              this.hints = result.hints
              console.log('')
            }
            this.focusedIndex = result.index
          }
        }
      }
    },
    // getDiagram: async function(id) {
    //   return D3VimApi.getDiagram(id)
    //     .then(response => {
    //       return response
    //     })
    //     .catch(error => {
    //       return error
    //     })
    //     .finally(() => {
    //       console.log('building diagram finished')
    //       // return "true"
    //     })
    // },
    clicked (event, [x, y]) {
      console.log('click')
      event.stopPropagation()
      this.svg.transition().duration(750).call(
        this.zoom.transform,
        d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(40).translate(-x, -y),
        d3.mouse(this.svg.node())
      );
    },
    zoomed (inner) {
      console.log('zoomed')
      console.log(inner)
      // console.log(zoomTrans)
      // transform.x = transform.x
      // transform.y = transform.y
      // transform.scale = transform.k
      // inner.attr('transform', d3.event.transform)
      //inner.attr("transform", transform);
    },
    resetValues () {
      if (this.focusedNodeId) {
        this.modifier.removeNodeSelectionById(this.focusedNodeId)
      }
      if (this.focusedEdgeId) {
        this.modifier.removeEdgeSelectionById(this.focusedEdgeId)
      }
      this.selectedNodes = []
      this.selectedEdges = []
      this.doubleSelection = []
      this.focusedIndex =  null
      this.focusedEdgeId = null
      this.focusedNodeId = null
      this.escCount = 0
      //this.emitter.emit()
      this.modifier.redraw(this.modifier.diagram)
      this.emitter.emit("changeActive")
    }
  },
  watch: {
    //dagrelib: function () {
    //  console.log('dagreLib watch')
    //  console.log(this.modifier)
    //},
    active: function () {
      //console.log('DagreGraphLib')
      //var nodes = this.active == 'Select Node'?true:false
      //var edges = this.active == 'Select Edges'?true:false
      //console.log(nodes)
      //console.log(edges)
      //if(this.active == 'D3Dagre' || (edges) || (nodes)){
      //  this.$nextTick(function(){
      //    console.log('d3Dagre Trap active')
      //    this.trapGraph = true
      //  })
      //} else {
      //  this.trapGraph = false
      //}

      //if (this.active == 'Delete Node'){
      //  this.modifier.deleteNodes(this.selectedNodes)
      //} else if (this.active == 'Delete Edge'){
      //  this.selectedNodes = this.modifier.deleteEdges(this.selectedEdges)
      //}


      if ( this.escCount === 3 ) {
        this.selectedNodes = []
        this.selectedEdges = []
        this.focusedIndex =  null
        this.focusedEdgeId = null
        this.focusedNodeId = null
        this.escCount = 0
      } else {
        this.escCount = this.escCount + 1
      }
      this.trapGraph = this.active == "D3Dagre" ? true : false
    },
    response: function(){
      console.log('response updated')
      console.log(this.response)
      this.diagram = this.response.diagram
      this.description = this.response.data.description
      this.name = this.response.data.name
      console.log(this.name)
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
  /*
  a {
    color: #fff;
  }
  */
  .border-square {
    width: 100%;
    height: 100%;
  }
  .d3hints {
    display: table-caption;
    position: absolute;
    width: 100px;
    height: 100px;
    border: 10px;
    padding: 1px 8px 1px 8px;
    border-radius: 10px
  }

  .samus__position {
    position: absolute ;
  }
</style>
