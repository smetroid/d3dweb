import D3Util from '../services/D3Util.js'

export default class DagreAltKeys {
  constructor(emitter, modifier) {
    this.emitter = emitter
    this.modifier = modifier
    this.diagram = modifier.d3dInfo.diagram
  }

  key(eventKey, comp) {
    // var g = this.g
    //var svg = d3.select('svg')
    // var inner = svg.select('g')

    console.log(eventKey)
    var resetValues = false
    var options = {}
    // this.modifier.redraw(this.DagreLib.graph, "zoomOut")

    switch (eventKey) {
      case 'j':
        options = {"pan": "Down"}
        this.modifier.redraw(this.diagram, options)
        break
      case 'k':
        options = {"pan": "Up"}
        this.modifier.redraw(this.diagram, options)
        break
      case 'h':
        options = {"pan": "Left"}
        this.modifier.redraw(this.diagram, options)
        break
      case 'l':
        options = {"pan": "Right"}
        this.modifier.redraw(this.diagram, options)
        break
      case '-':
    //    scaleUpdate = (scaleUpdate - 0.1)
        options = {"zoom": "Out"}
        this.modifier.redraw(this.diagram, options)
        break
      case '=':
        options = {"zoom": "In"}
        this.modifier.redraw(this.diagram, options)
     //   scaleUpdate = (scaleUpdate + 0.1)
        break
      case 'n':
        var node = D3Util.defaultNodeValues()
        this.modifier.addNode(node)
        resetValues = true
        break
      case 'd':
        var edge = D3Util.defaultEdgeValues()
        this.modifier.addEdge(edge)
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
  }
}