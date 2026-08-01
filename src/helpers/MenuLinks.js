import D3Util from '@/helpers/D3Util'
export default {
  Click: async function(event, app) {
    console.log(app)
    console.log(event)
    this.hints = D3Util.removeHints(this.hints)

    /*NOTE - When changing the type of selection the active pane should always 
    * be Graph
    */
    if (( event === 'Edit Node' ) || ( event === 'Edit Edge' )) {
      app.emitter.emit(event === 'Edit Node' ? 'editNode' : 'editEdge')
      app.showMenu = false
      app.showActionsMenu = false
      return
    }

    if (( event === 'Select Node' ) || ( event === 'Select Edges' )) {
      app.emitter.emit('edgeOrNode', event)
      app.active = 'Graph'
    } else {
      app.active = event
      app.showMenu = false
    }


    switch (event) {
      case 'D3D Settings':
        console.log('d3d settings')
        app.emitter.emit('settings')
        break
      case 'Edit Diagram':
        app.emitter.emit('editDiagram')
        break
      case 'Save Changes':
        app.emitter.emit('saveDiagram')
        break
      case 'Edit':
        console.log('edit event')
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
