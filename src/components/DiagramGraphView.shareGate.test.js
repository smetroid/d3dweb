import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DiagramGraphView from '@/components/DiagramGraphView.vue'

// DiagramGraphView is a large component (cytoscape/three.js renderer, focus
// trap, collab websocket) that no existing test mounts. Rather than stand up
// all of that, these tests call the real methods.keyPress / _openElementShare
// off the compiled component options object directly, with a minimal fake
// `this` — the same production code the app runs, without the mounting cost.

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(() => null), set: vi.fn() }
}))

// This environment's 'node' test runner has no bare localStorage global, so
// stub it — same pattern as session.test.js / session.callsites.test.js.
function makeStorage() {
  const store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    }
  }
}

function shareToken(role) {
  const payload = btoa(JSON.stringify({ iss: 'd3d-share', role }))
  return `header.${payload}.sig`
}

function shareEvent() {
  return { key: 'S', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false }
}

function elementShareEvent() {
  return { key: 'O', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false }
}

function makeThis(overrides = {}) {
  const mod = {
    redraw: vi.fn(),
    d3dInfo: { id: 'dag-1' },
    getNodeData: vi.fn((id) => ({ id })),
    getEdgeData: vi.fn((id) => ({ id }))
  }
  const fakeThis = {
    showShare: false,
    showElementShare: false,
    shareRootId: null,
    hints: {},
    hintKeysReplaced: '',
    focusedIndex: null,
    selectedNodes: [],
    doubleSelection: [],
    selectedEdges: [],
    edgeOrNode: 'nodes',
    focusedNodeId: 'n1',
    focusedEdgeId: null,
    escCount: 0,
    threeDRenderer: null,
    modifier: mod,
    emitter: { emit: vi.fn() },
    ...overrides
  }
  // Bind the real, unmodified methods so `this._openElementShare()` inside
  // keyPress resolves to production code, not a stub.
  fakeThis._openElementShare = DiagramGraphView.methods._openElementShare
  fakeThis._closeElementShare = DiagramGraphView.methods._closeElementShare
  return fakeThis
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DiagramGraphView share gating', () => {
  it('opens the share dialog for an ordinary owner (no share session) — the regression that matters', () => {
    const fakeThis = makeThis()
    DiagramGraphView.methods.keyPress.call(fakeThis, shareEvent())
    expect(fakeThis.showShare).toBe(true)
  })

  it('does not open the share dialog for an edit-role share session', () => {
    localStorage.setItem('shareToken', shareToken('edit'))
    const fakeThis = makeThis()
    DiagramGraphView.methods.keyPress.call(fakeThis, shareEvent())
    expect(fakeThis.showShare).toBe(false)
  })

  it('opens the element-share dialog for an ordinary owner (no share session)', () => {
    const fakeThis = makeThis()
    DiagramGraphView.methods.keyPress.call(fakeThis, elementShareEvent())
    expect(fakeThis.showElementShare).toBe(true)
  })

  it('does not open the element-share dialog for an edit-role share session', () => {
    localStorage.setItem('shareToken', shareToken('edit'))
    const fakeThis = makeThis()
    DiagramGraphView.methods.keyPress.call(fakeThis, elementShareEvent())
    expect(fakeThis.showElementShare).toBe(false)
  })
})
