import axios from 'axios'
import * as dagreD3 from 'dagre-d3'
import D3Util from '@/services/D3Util'
// import VueCookies from 'vue-cookies'
// import * as dagreD3 from 'dagre-d3'
axios.defaults.baseURL = 'http://samus.home.io:3000'

export default {
  async auth (username, password) {
    return axios.post('/auth/login', {
      username: username,
      password: password,
    })
      .then(response => {
        console.log(response)
        localStorage.token = JSON.stringify(response.data.token).replace(/"/g, '')
        // this.$root.$emit('authenticated', (response))
        return response
      })
      .catch(error => {
        // this.$emit('authFailure', (error))
        return error
      })
  },
  getOptions () {
    // return axios.get('http://192.168.1.4:3000/menus_options',
    return axios.get('/menus',
      { headers:
        { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then(response => {
        console.log(response)
        return response.data
      })
  },
  async getDiagram (id) {
    return axios.get('/dag/' + id,
      { headers:
        { Authorization: 'Bearer ' + localStorage.getItem('token')
        }
      })
      .then(response => {
        return response.data
      })
      .catch(error => {
        return error
      })
      .finally(() => {
        console.log('getDiagram finished')
      })
  },
  async getDiagrams () {
    return axios.get('/dags',
      { headers:
        { Authorization: 'Bearer ' + localStorage.getItem('token')
        }
      })
      .then(response => {
        return response
      })
      .catch(error => {
        return error
      })
  },
  async postDiagram (payload) {
    // var json = new dagreD3.graphlib.json.write(data.diagram)
    if (D3Util.debug){
      // console.log(json)
      // console.log(data)
    }
    // var created = new Date()
    // var payload = { 'name': data.name,
    //   'description': data.description,
    //   'diagram': JSON.stringify(json),
    //   'createTime': created.toISOString(),
    //   'updatedTime': created.toISOString(),
    // }

    return axios.post('/dag', payload, {
      /*
      name: data.name,
      description: data.description,
      diagram: data.diagram,
      */
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then(response => {
        return response
      })
      .catch(error => {
        return error
      })
  },
  async updateDiagram (data, app) {
    if (D3Util.debug) {
      console.log(data.id)
      console.log(data.diagram)
      console.log(data.graphOptions)
    }
    /* eslint-disable-next-line  */
    var json = new dagreD3.graphlib.json.write(data.diagram)
    console.log(json)
//    /*Adding graph options and additional layout direction and 
//    node spacing*/
//    json.options.directed = data.graphOptions.includes('directed')
//    json.options.multigraph = data.graphOptions.includes('multigraph')
//    json.options.compound = data.graphOptions.includes('compound')
//    json.value.rankdir = data.rankdir
//    json.value.ranksep = data.ranksep
//    json.value.nodesep = data.nodesep
//    console.log(json)

    var updated = new Date()
    var updatedData = {
      'id': data.id,
      'name': data.name,
      'description': data.description,
      'diagram': JSON.stringify(json),
      'updatedTime': updated.toISOString(),
    }

    return axios.post('/dag/' + data.id + '/update', updatedData,
      { headers: { Authorization: 'Bearer ' + localStorage.getItem('token')
        }
      })
      .then(response => {
        if (D3Util.debug) {
          console.log(response)
        }

        if (Object.prototype.hasOwnProperty.call(response, 'data')) {
          app.$root.$emit('appMessage', true, 'Diagram saved', JSON.stringify(response.data))
        } else {
          app.$root.$emit('appMessage', false, 'Failed to save diagram', JSON.stringify(response.data))
        }
        app.$root.$emit("changeActive")


        return response
      })
      .catch(error => {
        return error
      })
  },
  async deleteDiagram (id) {
    if (D3Util.debug) {
      console.log(id)
    }
    return axios.delete('/dag/' + id,
      { headers:
        { Authorization: 'Bearer ' + localStorage.getItem('token')
        }
      })
      .then(response => {
        return response.data
      })
  }
  // addNode (id, update = false, g, nodes) {
  // if (update) {
  //   g.setNode(nodes[0], { 'label': inputs[0].value, 'shape': selections[0].value, 'labelType': selections[1].value })
  // } else {
  //   g.setNode(this.randomId(), { 'label': inputs[0].value, 'shape': selections[0].value, 'labelType': selections[1].value })
  // }
  // }
}
