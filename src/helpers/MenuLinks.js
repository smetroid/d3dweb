// import Settings from '@/components/Settings.vue'
// import VueCookies from 'vue-cookies'
import D3Util from '@/services/D3Util'
//import D3VimApi from '@/services/api/SamusApi'
export default {
  Click: async function(event, app) {
    console.log(app)
    console.log(event)
    // Clear the acions menu
    // this.$root.$emit('drawerAction')
    this.hints = D3Util.removeHints(this.hints)
    //this.menuTrap = false
    /**
     * active is the page currently
     * with focus
    */
    /*
    This may need some refactoring, maybe use switches and vue emit events
    I think the app.active, while cool, I think it can cause confusion
    and prevents certain focus functionality from working properly, because a focus is set to a different field
    */
    app.active = event
    if (event == 'Save Changes') {
      //app.active = 'New'
      app.saveChanges(app)
    }

    switch (event) {
      case 'Edit':
        console.log('edit event')
        //app.$root.$emit('diagramEditForm') 
        break
      case 'Discard Changes':
        app.$root.$emit('discardChanges')
        break
      case 'New':
        app.active = "D3Dagre"
        //app.$root.$emit('newDiagram', '')
        app.newDiagram()
        break
      // case 'Open':
      //   app.$root.$emit('showDiagramList', 'Open')
      //   break
      default:
        console.log('D3 Vim d3Action default event')
        console.log(event)
    }
    /*After every selection set the active window to D3DagreLib*/
  },
}
