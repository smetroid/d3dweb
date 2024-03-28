import D3Util from '@/services/D3Util'
export default {
  Click: async function(event, app) {
    console.log(app)
    console.log(event)
    this.hints = D3Util.removeHints(this.hints)

    /*NOTE - When changing the type of selection the active pane should always 
    * be D3Dagre
    */
    if (( event === 'Select Node' ) || ( event === 'Select Edges' )) {
      app.emitter.emit('edgeOrNode', event)
      app.active = 'D3Dagre'
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
        app.active = "D3Dagre"
        app.emitter.emit('newDiagram')
        break
      case 'Open Diagram':
        app.emitter.emit('showDiagramList', '')
        break
      default:
        console.log('D3 Vim d3Action default event')
        console.log(event)
    }
  },
}
