export default class DagreAltKeys {
  constructor(emitter, modifier) {
    this.emitter  = emitter
    this.modifier = modifier
  }

  key(eventKey) {
    console.log('AltKey:', eventKey)
    let resetValues = false

    switch (eventKey) {
      // Camera pan — delegated to ThreeDRenderer via modifier.redraw(options)
      case 'j':
        this.modifier.redraw({ pan: 'Down' })
        break
      case 'k':
        this.modifier.redraw({ pan: 'Up' })
        break
      case 'h':
        this.modifier.redraw({ pan: 'Left' })
        break
      case 'l':
        this.modifier.redraw({ pan: 'Right' })
        break
      case '-':
        this.modifier.redraw({ zoom: 'Out' })
        break
      case '=':
        this.modifier.redraw({ zoom: 'In' })
        break
      // Diagram-level actions
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
      // 3-D layout modes
      case '1':
        this.modifier.backTo2D()
        break
      case '2':
        this.modifier.apply3DLayout('sphere')
        break
      case '3':
        this.modifier.apply3DLayout('helix')
        break
      case '4':
        this.modifier.apply3DLayout('hierarchy')
        break
      default:
        console.log('AltKey default — no action')
    }

    return resetValues
  }
}
