import D3Util from '@/services/D3Util'
export default {
  Click: async function(event, app) {
    console.log(app)
    console.log(event)
    this.hints = D3Util.removeHints(this.hints)
    app.active = event

    switch (event) {
      case 'D3D Settings':
        console.log('d3d settings')
        app.emitter.emit('settings')
        break
      case 'Edit Diagram':
        app.emitter.emit('EditDiagram')
        break
      case 'Save Changes':
        app.emitter.emit('SaveDiagram')
        break
      case 'Edit':
        console.log('edit event')
        //app.$root.$emit('diagramEditForm') 
        break
      case 'Discard Changes':
        app.$root.$emit('discardChanges')
        break
      case 'New Diagram':
        app.active = "D3Dagre"
        //app.$root.$emit('newDiagram', '')
        app.emitter.emit('NewDiagram')
        break
      // case 'Open':
      //   app.$root.$emit('showDiagramList', 'Open')
      //   break
      default:
        console.log('D3 Vim d3Action default event')
        console.log(event)
    }
  },
}
