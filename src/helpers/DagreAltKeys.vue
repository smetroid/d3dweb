<template>
  <div>
  </div>
</template>
<script>
import DagreLib from './DagreLib.vue'
import D3Util from '../services/D3Util.js'
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
  key(eventKey, comp) {
    // var g = this.g
    //var svg = d3.select('svg')
    // var inner = svg.select('g')

    console.log(eventKey)
    var resetValues = false
    var options = {}
    // DagreLib.redraw(this.DagreLib.graph, "zoomOut")

    switch (eventKey) {
      case 'j':
        options = {"pan": "Down"}
        DagreLib.redraw(this.diagram, options)
        break
      case 'k':
        options = {"pan": "Up"}
        DagreLib.redraw(this.diagram, options)
        break
      case 'h':
        options = {"pan": "Left"}
        DagreLib.redraw(this.diagram, options)
        break
      case 'l':
        options = {"pan": "Right"}
        DagreLib.redraw(this.diagram, options)
        break
      case '-':
    //    scaleUpdate = (scaleUpdate - 0.1)
        options = {"zoom": "Out"}
        DagreLib.redraw(this.diagram, options)
        break
      case '=':
        options = {"zoom": "In"}
        DagreLib.redraw(this.diagram, options)
     //   scaleUpdate = (scaleUpdate + 0.1)
        break
      case 'n':
        var node = D3Util.defaultNodeValues()
        DagreLib.addNode(node)
        resetValues = true
        break
      case 'd':
        var edge = D3Util.defaultEdgeValues()
        DagreLib.addEdge(edge)
        resetValues = true
        break
      case 'e':
        //Need to remove the id of node or edge when changing the selection option
        // or use the index and the id to do a comparizon to determine which one to edit
        if (comp.edgeOrNode == "edges"){
          comp.forwardLinkClicked(comp.focusedEdgeId)
        } else if (comp.edgeOrNode == "nodes") {
          comp.forwardLinkClicked(comp.focusedNodeId)
        } else {
          console.log('nothing to edit')
        }
        break
      default:
        console.log('zoomPan Default')
    }
    return resetValues
  },
  // /*
  // returns the d3Dagre node, based on the selected index key
  // */
  // watch: {
  //   diagram: function() {
  //     console.log('dagre keys diagram updates')
  //     console.log(this.diagram)

  //     this.graph = this.diagram
  //     console.log(this.graph)
  //   }
  // }
}
</script>
