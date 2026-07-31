import { describe, it, expect, vi } from 'vitest'
import DagreOtherKeys from '@/helpers/DagreOtherKeys.js'

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
  const keys = new DagreOtherKeys(emitter, modifier, hintFunction)
  return { emitter, modifier, hintFunction, keys }
}

function fakeElement() {
  return {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
  }
}

describe('DagreOtherKeys emitter routes', () => {
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

describe('DagreOtherKeys j/k navigation', () => {
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

describe('DagreOtherKeys buildHints', () => {
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

describe('DagreOtherKeys enter selection', () => {
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
