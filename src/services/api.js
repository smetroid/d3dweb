import axios from 'axios'
import D3Util from '@/helpers/D3Util'

function api() {
  return axios.create({ baseURL: D3Util.serverUrl() })
}

export default {
  async auth(username, password) {
    return api()
      .post('/auth/login', {
        username: username,
        password: password
      })
      .then((response) => {
        return response
      })
      .catch((error) => {
        return error
      })
  },
  getOptions() {
    // return axios.get('http://192.168.1.4:3000/menus_options',
    return api()
      .get('/menus', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
      .then((response) => {
        console.log(response)
        return response.data
      })
  },
  async getDiagram(id) {
    return api()
      .get('/dag/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error
      })
      .finally(() => {
        console.log('getDiagram finished')
      })
  },
  async getDiagrams() {
    return api()
      .get('/dags', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
      .then((response) => {
        return response
      })
      .catch((error) => {
        return error
      })
  },
  async postDiagram(payload) {
    return api()
      .post('/dag', payload, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => {
        return response
      })
      .catch((error) => {
        return error
      })
  },
  async updateDiagram(data) {
    return api()
      .post('/dag/' + data.id + '/update', data, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => {
        return response
      })
      .catch((error) => {
        return error
      })
  },
  async getHistory(dagId) {
    return api()
      .get('/dag/' + dagId + '/history', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async restoreHistory(dagId, historyId) {
    return api()
      .post(
        '/dag/' + dagId + '/history/' + historyId + '/restore',
        {},
        { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
      )
      .then((response) => response)
      .catch((error) => error)
  },
  async createShare(dagId, req) {
    return api()
      .post('/dag/' + dagId + '/shares', req, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async revokeShare(dagId, jti) {
    return api()
      .post(
        '/dag/' + dagId + '/shares/' + jti + '/revoke',
        {},
        { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async deleteDiagram(id) {
    if (D3Util.debug) {
      console.log(id)
    }
    return api()
      .delete('/dag/' + id, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => {
        return response.data
      })
  }
}
