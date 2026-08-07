import { describe, it, expect, vi } from 'vitest'
import OtherKeys from '@/helpers/OtherKeys.js'

vi.mock('vue-cookies', () => ({
  default: { get: () => null, set: () => {} },
}))

function makeSut(opts = {}) {
  const emitter = { emit: vi.fn() }
  const modifier = {
    focusedIndex: null,
    selectedNodes: [],
    doubleSelection: [],
    selectedEdges: [],
    nodeCount: () => 3,
    edgeCount: () => 2,
    selectNode: vi.fn(i => `node-${i}`),
    selectEdge: vi.fn(i => `edge-${i}`),
    removeSelection: vi.fn(),
    removeEdgeSelection: vi.fn(),
    getNodeData: vi.fn(id => ({ id, label: 'x' })),
    getEdgeData: vi.fn(id => ({ id, label: 'e' })),
    addNode: vi.fn(),
    addEdge: vi.fn(),
    arrayRemove: vi.fn((arr, item) => arr.filter(x => x !== item)),
    getNode: vi.fn(() => opts.noNode ? null : fakeElement()),
    getEdgeId: vi.fn(i => `edge-${i}`),
    renderer: { getAllNodeElements: vi.fn(() => opts.elements || []), selectEdge: vi.fn(), deselectEdge: vi.fn() },
    ...opts.modifier,
  }
  const hintFunction = vi.fn()
  const keys = new OtherKeys(emitter, modifier, hintFunction)
  return { emitter, modifier, hintFunction, keys }
}

function fakeElement() {
  return {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
  }
}

describe('OtherKeys emitter routes', () => {
  it('m / / / a / t emit their events', () => {
    const { emitter, keys } = makeSut()
    keys.defaultActions('m')
    keys.defaultActions('/')
    keys.defaultActions('a')
    keys.defaultActions('t')
    expect(emitter.emit).toHaveBeenNthCalledWith(1, 'changeActive', 'Menu')
    expect(emitter.emit).toHaveBeenNthCalledWith(2, 'showHelp')
    expect(emitter.emit).toHaveBeenNthCalledWith(3, 'changeActive', 'Actions Menu')
    expect(emitter.emit).toHaveBeenNthCalledWith(4, 'toggleTheme')
  })

  it('n / d add a node / edge', () => {
    const { modifier, keys } = makeSut()
    keys.defaultActions('n')
    keys.defaultActions('d')
    expect(modifier.addNode).toHaveBeenCalledOnce()
    expect(modifier.addEdge).toHaveBeenCalledOnce()
  })

  it('e edits the focused node and returns its data', () => {
    const { emitter, modifier, keys } = makeSut()
    const result = keys.defaultActions('e', 'nodes', 'n1', null)
    expect(modifier.getNodeData).toHaveBeenCalledWith('n1')
    expect(emitter.emit).toHaveBeenCalledWith('changeActive', 'Edit Node')
    expect(result.id).toBe('n1')
  })

  it('e edits the focused edge', () => {
    const { emitter, modifier, keys } = makeSut()
    const result = keys.defaultActions('e', 'edges', null, 'e5')
    expect(modifier.getEdgeData).toHaveBeenCalledWith('e5')
    expect(emitter.emit).toHaveBeenCalledWith('changeActive', 'Edit Edge')
    expect(result.id).toBe('e5')
  })
})

describe('OtherKeys j/k navigation', () => {
  it('j moves to the next node, wrapping around', () => {
    const { keys } = makeSut()
    let r = keys.defaultActions('j', 'nodes')
    expect(r).toEqual({ nodesId: 'node-0', index: 0 })
    r = keys.defaultActions('j', 'nodes')
    expect(r).toEqual({ nodesId: 'node-1', index: 1 })
    r = keys.defaultActions('j', 'nodes')
    expect(r).toEqual({ nodesId: 'node-2', index: 2 })
    r = keys.defaultActions('j', 'nodes')
    expect(r).toEqual({ nodesId: 'node-0', index: 0 })
  })

  it('k moves to the previous node', () => {
    const { keys } = makeSut()
    const r = keys.defaultActions('k', 'nodes')
    expect(r).toEqual({ nodesId: 'node-2', index: 2 })
  })

  it('j cycles edges when edge mode is active', () => {
    const { modifier, keys } = makeSut()
    const r = keys.defaultActions('j', 'edges')
    expect(r).toEqual({ edgesId: 'edge-0', index: 0 })
    expect(modifier.selectEdge).toHaveBeenCalledWith(0)
  })
})

describe('OtherKeys h/l navigation', () => {
  function makeProxSut() {
    return makeSut({
      modifier: {
        selectNodeProximity: vi.fn((direction, fromId) => ({ id: `prox-${direction}-${fromId}`, index: 1 })),
        selectEdgeProximity: vi.fn((direction, fromId) => ({ id: `proxE-${direction}-${fromId}`, index: 2 })),
      },
    })
  }

  it('l selects the nearest node to the right of the focused one', () => {
    const { modifier, keys } = makeProxSut()
    const r = keys.defaultActions('l', 'nodes', 'n1', null)
    expect(modifier.selectNodeProximity).toHaveBeenCalledWith('l', 'n1')
    expect(r).toEqual({ nodesId: 'prox-l-n1', index: 1 })
  })

  it('h selects the nearest node to the left of the focused one', () => {
    const { modifier, keys } = makeProxSut()
    const r = keys.defaultActions('h', 'nodes', 'n1', null)
    expect(modifier.selectNodeProximity).toHaveBeenCalledWith('h', 'n1')
    expect(r).toEqual({ nodesId: 'prox-h-n1', index: 1 })
  })

  it('l selects the nearest edge to the right when edge mode is active', () => {
    const { modifier, keys } = makeProxSut()
    const r = keys.defaultActions('l', 'edges', null, 'e5')
    expect(modifier.selectEdgeProximity).toHaveBeenCalledWith('l', 'e5')
    expect(r).toEqual({ edgesId: 'proxE-l-e5', index: 2 })
  })

  it('h/l fall back to array navigation when there is no focused element', () => {
    const { modifier, keys } = makeProxSut()
    const r = keys.defaultActions('l', 'nodes', null, null)
    expect(modifier.selectNodeProximity).not.toHaveBeenCalled()
    expect(r).toEqual({ nodesId: 'node-0', index: 0 })
  })

  it('h/l fall back to array navigation when the modifier lacks proximity support', () => {
    const { keys } = makeSut()
    const r = keys.defaultActions('l', 'nodes', 'n1', null)
    expect(r).toEqual({ nodesId: 'node-0', index: 0 })
  })

  it('keeps j/k on the proximity path when a focused node exists', () => {
    const { modifier, keys } = makeProxSut()
    keys.defaultActions('j', 'nodes', 'n1', null)
    expect(modifier.selectNodeProximity).toHaveBeenCalledWith('j', 'n1')
  })
})

describe('OtherKeys buildHints', () => {
  it('assigns sequential hint characters to elements', () => {
    const { keys } = makeSut()
    const elements = [{}, {}, {}, {}]
    expect(keys.buildHints(elements)).toEqual(['a', 's', 'd', 'f', 'j'])
  })

  it('prepends the wrap prefix once elements exceed the alphabet', () => {
    const { keys } = makeSut()
    const alphabet = 'asdfjklqweruiopzxcvnmgh'
    const elements = Array.from({ length: alphabet.length + 2 })
    const hints = keys.buildHints(elements)
    expect(hints).toHaveLength(elements.length)
    expect(hints[0]).toBe('s')
    expect(hints.at(-1)).toBe('ad')
  })
})

describe('OtherKeys enter selection', () => {
  it('toggles node selection state', () => {
    const { keys } = makeSut()
    keys.focusedIndex = 0
    const first = keys.enter('nodes')
    expect(first.selectedNodes).toEqual([0])
    const second = keys.enter('nodes')
    expect(second.selectedNodes).toEqual([])
    expect(second.doubleSelection).toEqual([0])
  })
})
