import axios from 'axios'
import D3Util from '@/helpers/D3Util'

// withCredentials sends the httpOnly session cookie on every request. It works
// because serverUrl() is same-origin — see D3Util.serverUrl and vercel.json.
//
// The Authorization header is NOT dead: anonymous share recipients authenticate
// with a share JWT (iss "d3d-share"), which the backend accepts via
// TokenLookup's `header:Authorization` — listed first, so a share token takes
// precedence over a session cookie, exactly as it does today. JoinView stores
// it under `shareToken`. Without this header, opening a share link would
// authenticate nothing.
function api() {
  const shareToken = localStorage.getItem('shareToken')
  return axios.create({
    baseURL: D3Util.serverUrl(),
    withCredentials: true,
    ...(shareToken ? { headers: { Authorization: 'Bearer ' + shareToken } } : {})
  })
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
      .get('/menus')
      .then((response) => {
        console.log(response)
        return response.data
      })
  },
  async getDiagram(id) {
    return api()
      .get('/dag/' + id)
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
      .get('/dags')
      .then((response) => response.data)
  },
  async postDiagram(payload) {
    return api().post('/dag', payload)
  },
  async updateDiagram(data) {
    return api().post('/dag/' + data.id + '/update', data)
  },
  async getHistory(dagId) {
    return api()
      .get('/dag/' + dagId + '/history')
      .then((response) => response.data)
  },
  async restoreHistory(dagId, historyId) {
    return api().post('/dag/' + dagId + '/history/' + historyId + '/restore', {})
  },
  async createShare(dagId, req) {
    return api()
      .post('/dag/' + dagId + '/shares', req)
      .then((response) => response.data)
  },
  async revokeShare(dagId, jti) {
    return api()
      .post('/dag/' + dagId + '/shares/' + jti + '/revoke', {})
      .then((response) => response.data)
  },
  async exchangeShare(token) {
    return api()
      .get('/shares/exchange', { params: { token } })
      .then((response) => response.data)
  },
  async setDiagramPublic(id, isPublic) {
    return api()
      .patch('/dag/' + id, { public: isPublic })
      .then((response) => response.data)
  },
  async deleteDiagram(id) {
    if (D3Util.debug) {
      console.log(id)
    }
    return api()
      .delete('/dag/' + id)
      .then((response) => {
        return response.data
      })
  },

  // Element shares
  async createElementShare(dagId, req) {
    return api()
      .post('/dag/' + dagId + '/elements/shares', req)
      .then((r) => r.data)
  },
  async exchangeElementShare(token) {
    return api()
      .get('/element-shares/exchange', { params: { token } })
      .then((r) => r.data)
  },
  async getElementShare(id) {
    return api()
      .get('/element-shares/' + id)
      .then((r) => r.data)
  },
  async revokeElementShare(id) {
    return api()
      .post('/element-shares/' + id + '/revoke', {})
      .then((r) => r.data)
  },
  async importElementShare(id) {
    return api()
      .post('/element-shares/' + id + '/import', {})
      .then((r) => r.data)
  },
  async listInbox() {
    return api()
      .get('/shares/inbox')
      .then((r) => r.data.shares ?? [])
  },
  async getCatalog(limit) {
    const params = limit !== undefined ? { limit } : {}
    return api()
      .get('/catalog', { params })
      .then((r) => r.data.items ?? [])
  },

  // Companies
  async createCompany(name) {
    return api()
      .post('/companies', { name })
      .then((r) => r.data)
  },
  async listCompanies() {
    return api()
      .get('/companies')
      .then((r) => r.data)
  },
  async addCompanyMember(companyId, userId) {
    return api()
      .post('/companies/' + companyId + '/members', { userId })
      .then((r) => r.data)
  },
  async removeCompanyMember(companyId, userId) {
    return api()
      .delete('/companies/' + companyId + '/members/' + userId)
      .then((r) => r.data)
  },
  async deleteCompany(id) {
    return api()
      .delete('/companies/' + id)
      .then((r) => r.data)
  },

  // Groups
  async createGroup(companyId, name) {
    return api()
      .post('/companies/' + companyId + '/groups', { name })
      .then((r) => r.data)
  },
  async listGroups(companyId) {
    return api()
      .get('/companies/' + companyId + '/groups')
      .then((r) => r.data)
  },
  async addGroupMember(groupId, userId) {
    return api()
      .post('/groups/' + groupId + '/members', { userId })
      .then((r) => r.data)
  },
  async removeGroupMember(groupId, userId) {
    return api()
      .delete('/groups/' + groupId + '/members/' + userId)
      .then((r) => r.data)
  },
  async deleteGroup(id) {
    return api()
      .delete('/groups/' + id)
      .then((r) => r.data)
  },

  // Reports the account behind the session cookie. 401 here means signed out.
  async me() {
    return api().get('/auth/me')
  },
  // Returns the provider consent URL to redirect the browser to.
  async getOAuthUrl(provider) {
    return api()
      .get('/auth/' + provider + '/url')
      .then((response) => response.data.url)
  },
  async logout() {
    return api().post('/auth/logout')
  }
}
