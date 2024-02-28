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
    console.log(event)
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
        component.menuTrap = false
        component.showMenu = false
        break
      case 'j':
        newSelection = D3Util.liSelectionJ(component.menuLinks, component.gNavMenu)
        console.log(newSelection)
        // D3Util.selectionBool(newSelection)
        component.currentMenuLink = component.menuLinks[newSelection].title
        component.gNavMenu = newSelection
        break
      case 'k':
        newSelection = D3Util.liSelectionK(component.menuLinks, component.gNavMenu)
        component.currentMenuLink = component.menuLinks[newSelection].title
        // D3Util.selectionBool(newSelection)
        component.gNavMenu = newSelection
        break
      case 'Enter':
        if (D3Util.debug){
          console.log('enter')
          console.log(component.$refs.menu[component.gNavMenu])
          console.log(component.gNavMenu)
          //console.log(component.selectedUrl)
        }
        component.$refs.menu[component.gNavMenu].$el.click()
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
