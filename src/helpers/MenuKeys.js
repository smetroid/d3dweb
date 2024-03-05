// import Settings from '@/components/Settings.vue'
// import VueCookies from 'vue-cookies'
import D3Util from '@/services/D3Util'
export default {
  // activeWindow (event) {
  //   console.log("event")
  //   console.log(event)
  //   //var data = {}
  //   switch(event){
  //     // moved this to the App.vue
  //     // case '/':
  //     //   // data = {aciveWindow: "Menu", trap: 'd3ActionsTrap'}
  //     //   console.log(component.activeWindow)
  //     //   component.activeWindow = "Menu"
  //     //   component.menuTrap = true
  //     //   break;
  //     //   // return data
  //     case 'Escape':  //
  //       break
  //     case 'j':
  //       break
  //     case 'k':
  //       break
  //     case 'f':
  //       break
  //     case 'Enter':
  //       break
  //     default:
  //       //data = {aciveWindow: "Main", trap: ''}
  //       // return data
  //   }
  // },
  menuAction (event, component) {
    console.log(component)
    console.log(event)
    let linksSelected = ""
    if (component.active === 'Menu') {
      linksSelected = component.menuLinks
    } else {
      linksSelected = component.actionLinks
    }
    let gNav = component.gNavMenu

    //var data = {}
    var newSelection = null
    switch(event){
      case '/':
        // data = {aciveWindow: "Menu", trap: 'd3ActionsTrap'}
        console.log(component.activeWindow)
        //component.active = 'Menu'
        //component.menuTrap = true
        break;
        // return data
      case 'Escape':  //
        /*On escape setting activeWindow D3Dagre */
        component.active = 'D3Dagre'
        component.showMenu = false
        break
      case 'j':
        newSelection = D3Util.liSelectionJ(linksSelected, gNav)
        console.log(newSelection)
        // D3Util.selectionBool(newSelection)
        component.currentMenuLink = linksSelected[newSelection].title
        console.log(component.currentMenuLink)
        component.gNavMenu = newSelection
        break
      case 'k':
        newSelection = D3Util.liSelectionK(linksSelected, gNav)
        component.currentMenuLink = linksSelected[newSelection].title
        // D3Util.selectionBool(newSelection)
        component.gNavMenu = newSelection
        break
      case 'Enter':
        if (D3Util.debug){
          console.log('enter')
          console.log(component.$refs)
          console.log(component.gNavMenu)
          //console.log(component.selectedUrl)
        }
        if (component.active === 'Menu') {
          console.log(component.$refs.menu[gNav])
          component.$refs.menu[gNav].$el.click()
        } else {
          console.log(component.$refs.actionsMenu[gNav])
          component.$refs.actionsMenu[gNav].$el.click()
        }
        //this.addNodeFormVisible = true
        //console.log(this.addNodeFormVisible)
        // this.navAction(ref)
        //component.d3ActionsTrap = false
        component.fab = false
        break
      case 'f':
        // var text = document.createTextNode('f')
        // let node = '<div class="hints"> ff </div>'
        component.navActions = !component.navActions
        var hrefs = document.querySelectorAll('a')
        console.log(hrefs)
        component.forwardHrefs(hrefs)
        // this.addFollowLinks()
        break
      default:
        console.log('App Event Key Default')
        //data = {aciveWindow: "Main", trap: ''}
        // return data
    }
  }
}
