
export default class DagreAltKeys {
  constructor(emitter, modifier) {
    this.emitter = emitter
    this.modifier = modifier
    this.diagram = modifier.d3dInfo.diagram
  }

  key(eventKey) {
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
        options = {"zoom": "Out"}
        this.modifier.redraw(this.diagram, options)
        break
      case '=':
        options = {"zoom": "In"}
        this.modifier.redraw(this.diagram, options)
        break
      case 'n':
        this.emitter.emit('newDiagram')
        break
      case 'o':
        this.emitter.emit('showDiagramList', '')
        break
      case 's':
        this.emitter.emit('saveDiagram')
        break
      case 'e':
        this.emitter.emit('editDiagram')
        break
      default:
        console.log('zoomPan Default')
    }
    return resetValues
  }
}