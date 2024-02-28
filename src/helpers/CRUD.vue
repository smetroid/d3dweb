<script>
//import D3VimApi from '@/services/api/SamusApi'
// import * as dagreD3 from 'dagre-d3'
// import DagreLib from '@/helpers/DagreLib'
import D3Util from '@/services/D3Util'
export default {
  name: 'CRUD',
  load() {
    try{
      console.log('open last saved item')
      //var localData = JSON.parse(localStorage.getItem("samus.lastUpdated"))
      var localData = D3Util.getLocal()
      return localData
    } catch {
      console.log("Creating a default graph")
    }
  },
//  saveChanges: async function(app){
//    //var localData = JSON.parse(localStorage.getItem('samus.lastUpdated'))
//    var localData = D3Util.getLocal()
//    var id = localData.id // means data has been saved to server
//    var auth = D3Util.auth()
//    if (id && auth) {
//      var result = await D3VimApi.updateDiagram(localData, app)
//      return result
//    } else if (auth){
//      console.log('id is empty')
//      app.active = "New"
//    } else {
//      // var common = D3Util.commonMsg
//      app.$root.$emit('appMessage', true, 'Changes are being saved to localStorage, please consider creating an account or login to save remotely to the server', '')
//      // this is not needed
//      //D3Util.saveLocal(data)
//    }
//  },
  save() {
  },
}
</script>
