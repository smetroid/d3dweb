import axios from 'axios'
import D3Util from '@/helpers/D3Util'
axios.defaults.baseURL = 'http://localhost:3000'

export default {
  async auth (username, password) {
    return axios.post('/auth/login', {
      username: username,
      password: password,
    })
      .then(response => {
        return response
      })
      .catch(error => {
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
  async updateDiagram (data) {

    return axios.post('/dag/' + data.id + '/update', data,
      { headers: { Authorization: 'Bearer ' + localStorage.getItem('token')
        }
      })
      .then(response => {
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
