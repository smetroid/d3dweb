<template>
  <div>
  </div>
</template>
<script>
//import D3VimApi from '@/services/api/SamusApi'
//import * as dagreD3 from 'dagre-d3'
// import * as dagreD3 from 'dagre-d3-webpack'
import * as Velocity from 'velocity-animate'
// var dagreD3 = require('dagre-d3')
import DagreLib from './DagreLib.vue'
// import AnimateKeys from '@/helpers/AnimateKeys'
// import D3Util from '@/services/D3Util'
// import * as d3 from 'd3'
export default {
  name: 'DagreKeys',
  // props: ['diagram', 'diagramId'],
  data () {
    return {
      g: 'DagreKeysObject',
      diagram: undefined,
      focusedIndex: null,
      nodeOrEdge: 'nodes',
    }
  },
  mounted () {
    console.log('dagrekeys loaded')
    console.log(this.g)
    console.log(this.diagram)
    DagreLib.graph = this.graph
  },
  clickHref (element, comp) {
    var href = null
    Velocity(element, {scale: 1.9}, {duration: 100})
    Velocity(element, 'reverse', 100)
    // Velocity(this.hints[event.key].parentElement.lastChild, 'fadeOut',
    //   {delay: 100,
    //     duration: 500,
    //     complete: function () {
    //     }
    //   })

    href = element.parentElement.querySelector('a')
    href.click()
    comp.removeHints(comp.hints)
    // resetting hintkeys
    comp.hintsKeyReplaced = ''
  },
  altKey (eventKey, comp) {
    // var g = this.g
    //var svg = d3.select('svg')
    // var inner = svg.select('g')

    console.log(eventKey)
    var options = {}
    // DagreLib.redraw(this.DagreLib.graph, "zoomOut")

    switch (eventKey) {
      case 'j':
        options = {"pan": "Down"}
        DagreLib.redraw(comp.d3Diagram, options)
        break
      case 'k':
        options = {"pan": "Up"}
        DagreLib.redraw(comp.d3Diagram, options)
        break
      case 'h':
        options = {"pan": "Left"}
        DagreLib.redraw(comp.d3Diagram, options)
        break
      case 'l':
        options = {"pan": "Right"}
        DagreLib.redraw(comp.d3Diagram, options)
        break
      case '-':
    //    scaleUpdate = (scaleUpdate - 0.1)
        options = {"zoom": "Out"}
        DagreLib.redraw(comp.d3Diagram, options)
        break
      case '=':
        options = {"zoom": "In"}
        DagreLib.redraw(comp.d3Diagram, options)
     //   scaleUpdate = (scaleUpdate + 0.1)
        break
      default:
        console.log('zoomPan Default')
    }
  },
//   defaultActions (eventKey, dagreGraphLib) {
//     switch (eventKey){
//       case 'm':
//         console.log('open menu')
//         dagreGraphLib.$root.$emit('changeActive', "Menu")
//         break
//       case '/':
//         console.log('show help')
//         dagreGraphLib.$root.$emit('showHelp')
//         break
// 
//       default:
//         AnimateKeys.dagreGraphLib = dagreGraphLib
//         console.log(eventKey)
//         return AnimateKeys.Animate(eventKey, this.nodeOrEdge)
//     }
//   },
  // deleteNodes (nodes) {
  //   var g = this.g
  //   if (this.gDebug) {
  //     console.log('deleteNodes function')
  //     console.log(this.selectedNodes)
  //   }

  //   for (var node in nodes) {
  //     console.log(node)
  //     // var nodeId = this.g.nodes()[this.selectedNodes[node]]
  //     var nodeId = this.getNodeId(this.selectedNodes[node])
  //     g.removeNode(nodeId)
  //   }
  //   this.redraw(g)
  //   this.selectedNodes = []
  //   // this.redraw()
  // },
  // getNodeData (id) {
  //   var nodeData = this.g.node(id)
  //   this.$root.$emit('d3NodeData', nodeData, id)
  // },
  // getEdgeData (id) {
  //   var edgeData = this.g.edge(id)

  //   if (D3Util.debug) {
  //     console.log(id)
  //     console.log(edgeData)
  //   }

  //   this.$root.$emit('edgesD3Data', edgeData, id)
  // },
  // activeDeactiveNode (index) {
  //   var node = this.getNode(index)
  //   console.log('node')
  //   console.log(node)
  //   var selectionExists = this.selectedNodes.indexOf(index)
  //   if (selectionExists === -1) {
  //     this.selectedNodes.push(this.focusedIndex)
  //     Velocity(node['_groups'][0], { scale: (1.2) }, { duration: 300 })
  //     Velocity(node['_groups'][0], 'reverse', 500)
  //     node.classed('active_node', true)
  //   } else {
  //     if (this.doubleSelection === null) {
  //       console.log('doubleActive')
  //       node.classed('d_active_node', true)
  //       this.selectedNodes = this.arrayRemove(this.selectedNodes, index)
  //       this.doubleSelection = index
  //     } else {
  //       console.log("insideDoubleSelection")
  //       this.selectedNodes = this.arrayRemove(this.selectedNodes, index)
  //       node.classed('d_active_node', false)
  //       this.doubleSelection = null
  //     }
  //   }
  //   var nodeId = this.getNodeId(index)
  //   var nodeData = this.g.node(nodeId)
  //   this.$root.$emit('d3NodeData', nodeData, nodeId)
  // },
  // activeDeactiveEdge (index) {
  //   var edge = this.getEdge(index)
  //   console.log('edge')
  //   console.log(edge)
  //   if (this.selectedEdges.indexOf(index) === -1) {
  //     this.selectedEdges.push(this.focusedIndex)
  //     Velocity(edge['_groups'][0], { scale: (1.1) }, { duration: 300 })
  //     Velocity(edge['_groups'][0], 'reverse', 500)
  //     edge.classed('active_edge', true)
  //     this.activeEdgeId = this.getEdgeId(index)
  //     var edgeData = this.g.edge(this.focusedEdgeId)
  //     console.log(edgeData)
  //     this.$root.$emit('edgesD3Data', edgeData, this.activeEdgeId)
  //   } else {
  //     edge.classed('active_edge', false)
  //     this.selectedEdges = this.arrayRemove(this.selectedEdges, index)
  //   }
  // },
  // enter () {
  //   if (this.gDebug) {
  //     console.log('enter')
  //   }
  //   // selectNode (refs.svg)
  // },
  // randomId () {
  //   // Math.random should be unique because of its seeding algorithm.
  //   // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  //   // after the decimal.
  //   return '_' + Math.random().toString(36).substr(2, 9)
  // },
  // selectNode (index) {
  //   console.log(index)
  //   var node = this.getNode(index)
  //   Velocity(node['_groups'][0], { scale: (1.2) }, { duration: 300 })
  //   Velocity(node['_groups'][0], 'reverse', 500)
  //   node.classed('selected', true)

  //   var nodeData = this.g.node(this.getNodeId(index))
  //   this.$root.$emit('d3DagreData', nodeData)
  // },
  // removeSelection (index) {
  //   // Deselect the previous selection
  //   // node = d3.select('svg g.node:nth-child('+ (deselect_node + 1) +') rect');
  //   var node = this.getNode(index)
  //   console.log('remove selected' + node)
  //   node.classed('selected', false)
  // },
  // liSelectionK (selectList, liSelected) {
  //   var li = liSelected
  //   var selectLi = null
  //   if (li === null) {
  //     selectLi = selectList.length - 1
  //   } else {
  //     this.prevLiSelected = D3Util.mod(li, selectList.length)
  //     li = li - 1
  //     selectLi = D3Util.mod(li, selectList.length)
  //   }
  //   return selectLi
  // },
  // liSelectionJ (selectList, liSelected) {
  //   var li = liSelected
  //   var selectLi = null
  //   if (li === null) {
  //     selectLi = 0
  //   } else {
  //     li = li + 1
  //     selectLi = D3Util.mod(li, selectList.length)
  //   }
  //   return selectLi
  // },
  // getLiElements (el) {
  //   var lis = el.querySelectorAll(':scope > li')
  //   return lis
  // },
  // arrayRemove (gAactiveNodes, valueToRemove) {
  //   return this.selectedNodes.filter(function (ele) {
  //     return ele !== valueToRemove
  //   })
  // },
  /*
  returns the d3Dagre node, based on the selected index key
  */
  watch: {
    diagram: function() {
      console.log('dagre keys diagram updates')
      console.log(this.diagram)
      this.graph = this.diagram
      console.log(this.graph)
    }
  }
}
</script>
