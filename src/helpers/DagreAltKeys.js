import D3Util from '@/helpers/D3Util.js'

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
        comp.openSheet = true
        if (comp.edgeOrNode == "edges"){
          //comp.forwardLinkClicked(comp.focusedEdgeId)
          comp.d3Data = this.modifier.getEdgeData(comp.focusedEdgeId)
          this.emitter.emit('changeActive', 'Edit Edge')
        } else if (comp.edgeOrNode == "nodes") {
          console.log('editing a node object')
          /*FIXME - removing this call back to the parent, seems like we can take the
          logic from forwardLinkClicked and add it here ... then use the emitters to pass the data to the node form
          */
          //comp.forwardLinkClicked(comp.focusedNodeId)
          comp.d3Data = this.modifier.getNodeData(comp.focusedNodeId)
          //comp.active = 'Edit Node' # Readonly property
          //comp.openSheet = true
          console.log(comp.d3Data)
          this.emitter.emit('changeActive', 'Edit Node')
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