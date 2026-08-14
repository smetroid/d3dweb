import D3Util from '@/helpers/D3Util'

const CLIENT_ID_KEY = 'd3d_collab_client_id'

function getClientId() {
  let id = sessionStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

function wsUrl(dagId) {
  const base = D3Util.serverUrl().replace(/^http/, 'ws')
  const token = localStorage.getItem('token')
  return `${base}/dag/${dagId}/ws?token=${encodeURIComponent(token ?? '')}`
}

const BACKOFF_BASE = 100
const BACKOFF_MAX = 30_000

let socket = null
let dagId = null
let reconnectTimer = null
let attempt = 0
let intentionalClose = false

const handlers = {
  diagramUpdated: null,
  presence: null,
  statusChange: null
}

function scheduleReconnect() {
  if (intentionalClose) return
  const delay = Math.min(BACKOFF_BASE * 2 ** attempt + Math.random() * 100, BACKOFF_MAX)
  attempt++
  reconnectTimer = setTimeout(() => openSocket(), delay)
}

function openSocket() {
  if (!dagId) return
  socket = new WebSocket(wsUrl(dagId))

  socket.addEventListener('open', () => {
    attempt = 0
    handlers.statusChange?.('connected')
  })

  socket.addEventListener('message', ({ data }) => {
    let msg
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }

    if (msg.clientId === getClientId()) return

    if (msg.type === 'diagram:updated') {
      handlers.diagramUpdated?.(msg)
    } else if (msg.type === 'presence') {
      handlers.presence?.(msg)
    }
  })

  socket.addEventListener('close', () => {
    handlers.statusChange?.('disconnected')
    scheduleReconnect()
  })

  socket.addEventListener('error', () => {
    socket.close()
  })
}

export function connect(id) {
  disconnect()
  dagId = id
  intentionalClose = false
  attempt = 0
  openSocket()
}

export function disconnect() {
  intentionalClose = true
  clearTimeout(reconnectTimer)
  reconnectTimer = null
  if (socket) {
    socket.close()
    socket = null
  }
  dagId = null
}

export function sendPresence(state) {
  if (socket?.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify({ type: 'presence', clientId: getClientId(), ...state }))
}

export function onDiagramUpdated(cb) {
  handlers.diagramUpdated = cb
}
export function onPresence(cb) {
  handlers.presence = cb
}
export function onStatusChange(cb) {
  handlers.statusChange = cb
}

export function clientId() {
  return getClientId()
}
