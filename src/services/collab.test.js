import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/helpers/D3Util', () => ({
  default: { serverUrl: () => 'http://localhost:3000' }
}))

// ── WebSocket mock ────────────────────────────────────────────────────────────

class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    this._listeners = {}
    this._sent = []
    MockWebSocket.latest = this
    MockWebSocket.instances.push(this)
  }

  addEventListener(event, fn) {
    ;(this._listeners[event] ??= []).push(fn)
  }

  send(data) {
    this._sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this._emit('close', {})
  }

  _emit(event, data) {
    ;(this._listeners[event] ?? []).forEach((fn) => fn(data))
  }

  _open() {
    this.readyState = MockWebSocket.OPEN
    this._emit('open', {})
  }

  _message(payload) {
    this._emit('message', { data: JSON.stringify(payload) })
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances = []
  static latest = null

  static reset() {
    this.instances = []
    this.latest = null
  }
}

// ── Storage mocks ─────────────────────────────────────────────────────────────

function makeStorage() {
  const store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k])
    }
  }
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

let collab

beforeEach(async () => {
  MockWebSocket.reset()
  vi.useFakeTimers()

  vi.stubGlobal('WebSocket', MockWebSocket)
  vi.stubGlobal('sessionStorage', makeStorage())
  vi.stubGlobal('localStorage', makeStorage())
  vi.stubGlobal('crypto', { randomUUID: () => 'test-client-id' })

  localStorage.setItem('token', 'header.eyJ1c2VybmFtZSI6InRlc3QifQ.sig') // gitleaks:allow
  sessionStorage.setItem('d3d_collab_client_id', 'test-client-id')

  // Fresh module import each test so module-level state is reset
  vi.resetModules()
  collab = await import('@/services/collab')
})

afterEach(() => {
  collab.disconnect()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('collab.connect', () => {
  it('opens a WebSocket with ws:// URL and token', () => {
    collab.connect('dag-1')
    expect(MockWebSocket.instances).toHaveLength(1)
    const ws = MockWebSocket.latest
    expect(ws.url).toBe(
      'ws://localhost:3000/dag/dag-1/ws?token=header.eyJ1c2VybmFtZSI6InRlc3QifQ.sig' // gitleaks:allow
    )
  })

  it('closes the previous socket when called again', () => {
    collab.connect('dag-1')
    const first = MockWebSocket.latest
    collab.connect('dag-2')
    expect(first.readyState).toBe(MockWebSocket.CLOSED)
    expect(MockWebSocket.instances).toHaveLength(2)
  })
})

describe('echo prevention', () => {
  it('ignores messages with own clientId', () => {
    const cb = vi.fn()
    collab.onDiagramUpdated(cb)
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    MockWebSocket.latest._message({
      type: 'diagram:updated',
      clientId: 'test-client-id',
      nodes: []
    })
    expect(cb).not.toHaveBeenCalled()
  })

  it('delivers messages from a different clientId', () => {
    const cb = vi.fn()
    collab.onDiagramUpdated(cb)
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    MockWebSocket.latest._message({ type: 'diagram:updated', clientId: 'other-client', nodes: [] })
    expect(cb).toHaveBeenCalledOnce()
    expect(cb.mock.calls[0][0]).toMatchObject({ type: 'diagram:updated', clientId: 'other-client' })
  })
})

describe('onPresence', () => {
  it('fires for presence messages from remote peers', () => {
    const cb = vi.fn()
    collab.onPresence(cb)
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    MockWebSocket.latest._message({
      type: 'presence',
      clientId: 'peer-1',
      displayName: 'Alice',
      color: '#ef5350',
      selection: ['n1']
    })
    expect(cb).toHaveBeenCalledOnce()
    expect(cb.mock.calls[0][0]).toMatchObject({ clientId: 'peer-1', displayName: 'Alice' })
  })

  it('does not fire for own presence messages', () => {
    const cb = vi.fn()
    collab.onPresence(cb)
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    MockWebSocket.latest._message({
      type: 'presence',
      clientId: 'test-client-id',
      displayName: 'Me'
    })
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('onStatusChange', () => {
  it('emits connected on open', () => {
    const cb = vi.fn()
    collab.onStatusChange(cb)
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    expect(cb).toHaveBeenCalledWith('connected')
  })

  it('emits disconnected on close', () => {
    const cb = vi.fn()
    collab.onStatusChange(cb)
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    MockWebSocket.latest.close()
    expect(cb).toHaveBeenCalledWith('disconnected')
  })
})

describe('reconnect', () => {
  it('schedules reconnect after unintentional close', () => {
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    MockWebSocket.latest.close()
    expect(MockWebSocket.instances).toHaveLength(1)
    vi.runAllTimers()
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('does not reconnect after disconnect()', () => {
    collab.connect('dag-1')
    MockWebSocket.latest._open()
    collab.disconnect()
    vi.runAllTimers()
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})

describe('sendPresence', () => {
  it('sends presence JSON when socket is open', () => {
    collab.connect('dag-1')
    const ws = MockWebSocket.latest
    ws._open()
    collab.sendPresence({ displayName: 'Alice', color: '#ef5350', selection: ['n1'] })
    expect(ws._sent).toHaveLength(1)
    const msg = JSON.parse(ws._sent[0])
    expect(msg).toMatchObject({
      type: 'presence',
      clientId: 'test-client-id',
      displayName: 'Alice',
      color: '#ef5350',
      selection: ['n1']
    })
  })

  it('is a no-op when socket is not open', () => {
    collab.connect('dag-1')
    const ws = MockWebSocket.latest
    // socket stays in CONNECTING state
    collab.sendPresence({ displayName: 'Alice', color: '#ef5350', selection: [] })
    expect(ws._sent).toHaveLength(0)
  })
})
