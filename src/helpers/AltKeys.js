export default class AltKeys {
  constructor(emitter, modifier) {
    this.emitter  = emitter
    this.modifier = modifier
  }

  key(eventKey) {
    console.log('AltKey:', eventKey)
    let resetValues = false

    switch (eventKey) {
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
      // Layout shortcuts
      case '1': this.modifier.setLayoutMode('cola');         break
      case '2': this.modifier.setLayoutMode('cose');         break
      case '3': this.modifier.setLayoutMode('breadthfirst'); break
      case '4': this.modifier.setLayoutMode('grid');         break
      case '5': this.modifier.setLayoutMode('circle');       break
      case '6': this.modifier.setLayoutMode('concentric');   break
      case '7': this.modifier.setLayoutMode('dagre');        break
      case '8': this.modifier.setLayoutMode('random');       break
      default:
        console.log('AltKey default — no action')
    }

    return resetValues
  }
}
