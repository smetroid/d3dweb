<template>
  <div
    @keydown.exact.alt.prevent="keyPress($event)"
    @keydown.exact.ctrl.r="reload($event)"
    @keypress.stop.prevent="keyPress($event)"
    >
      <FocusTrap
        v-model:active="trapGraph"
        :escapeDeactivates="false"
        :delayInitialFocus="true"
        :initial-focus="()=>$refs.svg"
        ref="graphTrap"
         >
          <div id="trap" ref="trapDiv" class="trap is-active" style="border: 3px solid red">
          <div v-if="diagramInfo">
            {{ selectedNodes }}
            {{ selectedEdges }}
            {{ doubleSelection }}
            {{ focusedEdgeId }}
            {{ focusedNodeId }}
            {{ hints }}
            {{ focusedIndex }}
            {{ edgeOrNode }}
          </div>
            <svg ref="svg" tabindex="0">
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
            :DagreLib ="dagreLib"
          />
          <D3NodeForm
            v-if="active === 'Add Node' || active === 'Edit Node'"
            :active="active"
            :d3Data="d3Data"
            :DagreLib ="dagreLib"
          />
      </v-bottom-sheet>
  </div>
</template>
<script>
import * as d3 from 'd3'
import D3Util from '../services/D3Util.js'
import D3EdgeForm from './D3EdgeForm.vue'
import D3NodeForm from './D3NodeForm.vue'
import DagreKeys from '../helpers/DagreKeys.vue'
import Hints from '../helpers/Hints.vue'
import DagreLib from '../helpers/DagreLib.vue'
//import login from '@/components/Login'
//import * as dagreD3 from 'dagre-d3'
//import DagreOtherKeys from '@/helpers/DagreOtherKeys'
import DagreAltKeys from '../helpers/DagreAltKeys.vue'
import DagreOtherKeys from '../helpers/DagreOtherKeys.vue'
// import Crud from '@/helpers/CRUD'

export default {
  name: 'DagreGraphLib',
  props: ['active','dagreLib'],
  components: {D3NodeForm, D3EdgeForm},
  data () {
    return {
      // gNavLi: null,
      g: null,
      id: null,
      //graph: null,
      //graphDefaults: {"options": {"directed":true,"multigraph":true,"compound":true}, "nodes": [], "edges": []},
      edgeOrNode: 'nodes',
      response: null,
      focusedIndex: null,
      trapGraph: true,
      gWidth: null,
      gHeight: null,
      svg: null,
      focusedEdgeId: null,
      focusedNodeId: null,
      initialScale: .96,
      hintKeysReplaced: '',
      hints: {},
      d3Data: {},
      //dagreLib: null,
      diagramInfo: true,
      selectedNodes: [],
      selectedEdges: [],
      doubleSelection: [],
      openSheet: false,
      transform: {},
      escCount: 0
    }
  },
  mounted () {
    this.emitter.on('d3ResetValues', () => {
      this.resetValues()
    })

    this.emitter.on('setSheetToFalse', () => {
      /**
       * on emit the page appears to be renndered, automatically getting
       * rid of the vuetify openSheet.
       * The setTimeout allows for the openSheet animation to close properly
       */
      this.openSheet = false
      setTimeout( ()=> {
        this.emitter.emit("changeActive")
      }, 300)
    })
  },
  methods: {
    reload(event) {
      console.log('reload page')
    },
    /**
     * used by DagreOtherKeys when creating the hyperlink hints
     */
    forwardLinkClicked (data) {
      if (D3Util.debug) {
        console.log('forwardLinkClicked')
        console.log(data)
        //console.log(this.dagreLib)
      }

      if (Object.prototype.hasOwnProperty.call(data, 'v') && Object.prototype.hasOwnProperty.call(data, 'w')) {
        console.log('v and w')
        /* We want to control the from using the active parent varible*/
        //this.showEdgeForm = true
        this.d3Data = DagreLib.getEdgeData(data)
        this.emitter.emit('changeActive', 'Edit Edge')
      } else {
        console.log('v')
        /* We want to control the from using the active parent variable*/
        //this.showNodeForm = true
        this.d3Data = DagreLib.getNodeData(data)
        console.log(this.d3Data)
        this.emitter.emit('changeActive', 'Edit Node')
      }
    },
    keyPress(event) {
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
        DagreAltKeys.diagram = this.dagreLib.diagram
        var resetValues = DagreAltKeys.key(event.key, this)
        if(resetValues){
          this.resetValues()
        }
      } else {
        /*IF searching eg: "/" don't search for anything */
        console.log(DagreKeys)
        console.log(this.dagreLib)
        if (this.dagreLib.id !== null){
          this.id = this.dagreLib.id 
        }
        DagreOtherKeys.dagreGraphLib = this
        DagreOtherKeys.dagreLib = this.dagreLib
        DagreOtherKeys.diagram = this.dagreLib.diagram
        DagreOtherKeys.focusedIndex = this.focusedIndex
        //DagreKeys.diagram = this.d3Diagram
        // DagreKeys.focusedIndex = this.focusedIndex
        //DagreKeys.nodeOrEdge = this.edgeOrNode
        /*just returning this updates the
          selectedNodes and doubleSelection vars
          need to know why?
          */
        var result = DagreOtherKeys.defaultActions(event.key, this.edgeOrNode)
        if (D3Util.debug){
          console.log(result)
          console.log(this.focusedNodeId)
          console.log(this.focusedEdgeId)
        }
        if (result){
          var status = false
          if(event.key == 'x') {
            if(this.edgeOrNode == 'nodes') {
              status = this.dagreLib.deleteNode(this.focusedNodeId)
              if (status){
                this.focusedNodeId = null
              } else {
                this.emitter.emit('appMessage', 'info', 'Unable to delete node')
              }
            } else {
              status = this.dagreLib.deleteEdge(this.focusedEdgeId)
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
            this.selectedNodes = result.selectedNodes
            /**!SECTION
             * how to fix this unexpected mutation?
             * there is probably a better way to do this!
             */
            this.dagreLib.selectedNodes = result.selectedNodes
            this.dagreLib.doubleSelection = result.doubleSelection
            this.doubleSelection = result.doubleSelection
          } else if (event.key == 'Escape') {
            if (this.escCount == 2){
              this.resetValues()
              //Resets the selections
            } else {
              this.escCount = this.escCount + 1
            }
          } else if (event.key == 'y') {
            console.log('trying to copy what is selected')
            this.dagreLib.createCopyV2(this.focusedNodeId)
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
        this.dagreLib.removeNodeSelectionById(this.focusedNodeId)
      }
      if (this.focusedEdgeId) {
        this.dagreLib.removeEdgeSelectionById(this.focusedEdgeId)
      }
      this.selectedNodes = []
      this.selectedEdges = []
      this.doubleSelection = []
      this.focusedIndex =  null
      this.focusedEdgeId = null
      this.focusedNodeId = null
      this.escCount = 0
      //this.emitter.emit()
      this.dagreLib.redraw(this.dagreLib.diagram)
      this.emitter.emit("changeActive")
    }
  },
  watch: {
    dagrelib: function () {
      console.log('dagreLib watch')
      console.log(this.dagreLib)
    },
    active: function () {
      console.log('DagreGraphLib')
      var nodes = this.active == 'Select Node'?true:false
      var edges = this.active == 'Select Edges'?true:false
      console.log(nodes)
      console.log(edges)
      if(this.active == 'D3Dagre' || (edges) || (nodes)){
        this.$nextTick(function(){
          console.log('d3Dagre Trap active')
          this.trapGraph = true
        })
      } else {
        this.trapGraph = false
      }

      if(edges){
        this.edgeOrNode = "edges"
      } else if(nodes){
        this.edgeOrNode = "nodes"
      } else {
        console.log('no edges or nodes')
      }

      if (this.active == 'Delete Node'){
        DagreLib.deleteNodes(this.selectedNodes)
      } else if (this.active == 'Delete Edge'){
        this.selectedNodes = DagreLib.deleteEdges(this.selectedEdges)
      }

      if ((this.active == 'Add Node') ||
          (this.active == 'Add Edge') ||
          (this.active == 'New') ||
          (this.active == 'Edit Node') ||
          (this.active == 'Edit Edge')) {
        this.openSheet = true
      } else if (this.active == 'Save Changes') {
        //this.openSheet = true
        if (D3Util.auth() && this.id) {
          console.log('save changes DagreGraphLib')
          this.openSheet = true
        }
      } else {
        console.log('DagreGraphLib watch end')
      }

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
      this.trapGraph = this.active== "D3Dagre"?true:false
    },
    edgeOrNode: function (){
      this.d3NodeEdgeSelection = this.edgeOrNode
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
