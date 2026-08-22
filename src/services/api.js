import axios from 'axios'
import D3Util from '@/helpers/D3Util'

function api() {
  return axios.create({ baseURL: D3Util.serverUrl() })
}

export default {
  // All methods reject on HTTP/network errors. Callers own error handling —
  // no swallowing here. The one exception is getDiagram(), which resolves
  // null on failure because loadFromServer() treats falsy as "fall back to
  // local storage".
  async auth(username, password) {
    return api().post('/auth/login', {
      username: username,
      password: password
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
      .catch(() => {
        return null
      })
  },
  async getDiagramPublic(id) {
    return api()
      .get('/dag/' + id + '/public')
      .then((response) => response.data)
  },
  async getDiagrams() {
    return api()
      .get('/dags', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
      .then((response) => response.data)
  },
  async postDiagram(payload) {
    return api().post(
      '/dag',
      payload,
      { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
    )
  },
  async updateDiagram(data) {
    return api().post(
      '/dag/' + data.id + '/update',
      data,
      { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
    )
  },
  async getHistory(dagId) {
    return api()
      .get('/dag/' + dagId + '/history', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
  },
  async restoreHistory(dagId, historyId) {
    return api().post(
      '/dag/' + dagId + '/history/' + historyId + '/restore',
      {},
      { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
    )
  },
  async createShare(dagId, req) {
    return api()
      .post('/dag/' + dagId + '/shares', req, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
  },
  async revokeShare(dagId, jti) {
    return api()
      .post(
        '/dag/' + dagId + '/shares/' + jti + '/revoke',
        {},
        { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
      )
      .then((response) => response.data)
  },
  async exchangeShare(token) {
    return api()
      .get('/shares/exchange', { params: { token } })
      .then((response) => response.data)
  },
  async setDiagramPublic(id, isPublic) {
    return api()
      .patch(
        '/dag/' + id,
        { public: isPublic },
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
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
  },

  // ── Element Shares ───────────────────────────────────────────────────────────

  async createElementShare(dagId, req) {
    return api()
      .post('/dag/' + dagId + '/elements/shares', req, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async exchangeElementShare(token) {
    return api()
      .get('/element-shares/exchange', { params: { token } })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async getElementShare(id) {
    return api()
      .get('/element-shares/' + id, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async revokeElementShare(id) {
    return api()
      .post(
        '/element-shares/' + id + '/revoke',
        {},
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async importElementShare(id) {
    return api()
      .post(
        '/element-shares/' + id + '/import',
        {},
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async listInbox() {
    return api()
      .get('/shares/inbox', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async getCatalog(limit) {
    const params = limit ? { limit } : {}
    return api()
      .get('/catalog', { params })
      .then((response) => response.data)
      .catch((error) => error)
  },

  // ── Companies ────────────────────────────────────────────────────────────────

  async createCompany(name) {
    return api()
      .post(
        '/companies',
        { name },
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async listCompanies() {
    return api()
      .get('/companies', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async addCompanyMember(companyId, userId) {
    return api()
      .put(
        '/companies/' + companyId + '/members',
        { userId },
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async removeCompanyMember(companyId, userId) {
    return api()
      .delete('/companies/' + companyId + '/members/' + userId, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async deleteCompany(id) {
    return api()
      .delete('/companies/' + id, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },

  // ── Groups ───────────────────────────────────────────────────────────────────

  async createGroup(companyId, name) {
    return api()
      .post(
        '/companies/' + companyId + '/groups',
        { name },
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async listGroups(companyId) {
    return api()
      .get('/companies/' + companyId + '/groups', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async addGroupMember(groupId, userId) {
    return api()
      .put(
        '/groups/' + groupId + '/members',
        { userId },
        {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      )
      .then((response) => response.data)
      .catch((error) => error)
  },
  async removeGroupMember(groupId, userId) {
    return api()
      .delete('/groups/' + groupId + '/members/' + userId, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  },
  async deleteGroup(id) {
    return api()
      .delete('/groups/' + id, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      })
      .then((response) => response.data)
      .catch((error) => error)
  }
}
