import D3Util from '@/helpers/D3Util'
export default {
  Click: async function(event, app) {
    this.hints = D3Util.removeHints(this.hints)

    /*NOTE - When changing the type of selection the active pane should always
    * be Graph
    */
    if (( event === 'Edit Node' ) || ( event === 'Edit Edge' )) {
      app.emitter.emit(event === 'Edit Node' ? 'editNode' : 'editEdge')
      return
    }

    if (( event === 'Select Node' ) || ( event === 'Select Edges' )) {
      app.emitter.emit('edgeOrNode', event)
      app.active = 'Graph'
    } else {
      app.active = event
    }

    switch (event) {
      case 'D3D Settings':
        app.emitter.emit('settings')
        break
      case 'Edit Diagram':
        app.emitter.emit('editDiagram')
        break
      case 'Save Changes':
        app.emitter.emit('saveDiagram')
        break
      case 'Edit':
        break
      case 'Discard Changes':
        app.$root.$emit('discardChanges')
        break
      case 'New Diagram':
        app.active = "Graph"
        app.emitter.emit('newDiagram')
        break
      case 'Open Diagram':
        app.emitter.emit('showDiagramList', '')
        break
      case 'Login':
        app.emitter.emit('showLogin', '')
        break
      default:
        console.log('D3 Vim d3Action default event')
        console.log(event)
    }
  },
}
