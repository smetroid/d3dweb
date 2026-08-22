import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveGraphKey } from '@/helpers/GraphKeys.js'
import Shortcuts from '@/helpers/Shortcuts.js'
import VueCookies from 'vue-cookies'

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(), set: vi.fn() }
}))

function ev(key, mods = {}) {
  return {
    key,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
    altKey: !!mods.alt,
    shiftKey: !!mods.shift
  }
}

function ctx(overrides = {}) {
  return {
    modifier: {
      getNodeData: vi.fn((id) => ({ id, label: 'n' })),
      getEdgeData: vi.fn((id) => ({ id, label: 'e' }))
    },
    edgeOrNode: 'nodes',
    focusedNodeId: 'n1',
    focusedEdgeId: null,
    ...overrides
  }
}

beforeEach(() => {
  vi.spyOn(Shortcuts, 'isMac').mockReturnValue(false)
  VueCookies.get.mockReturnValue(null)
})
afterEach(() => vi.restoreAllMocks())

describe('resolveGraphKey', () => {
  it('resolves plain graph actions', () => {
    expect(resolveGraphKey(ev('n'), ctx())).toEqual({ action: 'addNode' })
    expect(resolveGraphKey(ev('d'), ctx())).toEqual({ action: 'addEdge' })
    expect(resolveGraphKey(ev('x'), ctx())).toEqual({ action: 'delete' })
    expect(resolveGraphKey(ev('y'), ctx())).toEqual({ action: 'copy' })
    expect(resolveGraphKey(ev('m'), ctx())).toEqual({ action: 'menu' })
    expect(resolveGraphKey(ev('a'), ctx())).toEqual({ action: 'actionsMenu' })
    expect(resolveGraphKey(ev('/'), ctx())).toEqual({ action: 'help' })
    expect(resolveGraphKey(ev('t'), ctx())).toEqual({ action: 'toggleTheme' })
    expect(resolveGraphKey(ev('Enter'), ctx())).toEqual({ action: 'select' })
    expect(resolveGraphKey(ev('f'), ctx())).toEqual({ action: 'showHints' })
    expect(resolveGraphKey(ev('Escape'), ctx())).toEqual({ action: 'close' })
    expect(resolveGraphKey(ev('H', { shift: true }), ctx())).toEqual({ action: 'history' })
    expect(resolveGraphKey(ev('N', { shift: true }), ctx())).toEqual({ action: 'selectNodes' })
    expect(resolveGraphKey(ev('E', { shift: true }), ctx())).toEqual({ action: 'selectEdges' })
  })

  it('mode switches fire regardless of current mode or focus', () => {
    expect(
      resolveGraphKey(ev('E', { shift: true }), ctx({ edgeOrNode: 'nodes', focusedNodeId: null }))
    ).toEqual({ action: 'selectEdges' })
    expect(
      resolveGraphKey(ev('N', { shift: true }), ctx({ edgeOrNode: 'edges', focusedEdgeId: 'e1' }))
    ).toEqual({ action: 'selectNodes' })
  })

  it('resolves navigation actions to their direction', () => {
    expect(resolveGraphKey(ev('j'), ctx())).toEqual({ action: 'nav', direction: 'j' })
    expect(resolveGraphKey(ev('k'), ctx())).toEqual({ action: 'nav', direction: 'k' })
    expect(resolveGraphKey(ev('h'), ctx())).toEqual({ action: 'nav', direction: 'h' })
    expect(resolveGraphKey(ev('l'), ctx())).toEqual({ action: 'nav', direction: 'l' })
  })

  it('edit returns node data in node mode', () => {
    const c = ctx({ edgeOrNode: 'nodes', focusedNodeId: 'n1' })
    const hit = resolveGraphKey(ev('e'), c)
    expect(hit.action).toBe('edit')
    expect(hit.mode).toBe('Edit Node')
    expect(hit.data.id).toBe('n1')
    expect(c.modifier.getNodeData).toHaveBeenCalledWith('n1')
  })

  it('edit returns edge data in edge mode', () => {
    const c = ctx({ edgeOrNode: 'edges', focusedEdgeId: 'e5', focusedNodeId: null })
    const hit = resolveGraphKey(ev('e'), c)
    expect(hit.action).toBe('edit')
    expect(hit.mode).toBe('Edit Edge')
    expect(hit.data.id).toBe('e5')
    expect(c.modifier.getEdgeData).toHaveBeenCalledWith('e5')
  })

  it('edit resolves to null when nothing is focused', () => {
    expect(resolveGraphKey(ev('e'), ctx({ focusedNodeId: null }))).toBeNull()
  })

  it('ignores keys that trigger no action', () => {
    expect(resolveGraphKey(ev('q'), ctx())).toBeNull()
    expect(resolveGraphKey(ev('Escape', { shift: true }), ctx())).toBeNull()
  })

  it('honors user rebinds', () => {
    VueCookies.get.mockReturnValue({ shortcuts: { addNode: 'z' } })
    expect(resolveGraphKey(ev('z'), ctx())).toEqual({ action: 'addNode' })
    expect(resolveGraphKey(ev('n'), ctx())).toBeNull()
  })

  it('matches the default shortcut for each catalogued graph action', () => {
    // Every graph action id in the catalog must map to at least one key.
    const graph = Shortcuts.actions.filter((a) => a.group === 'graph')
    for (const a of graph) {
      const key = Shortcuts.combo(a.id)
      const mods = {}
      if (key.includes('shift')) mods.shift = true
      const char = key.split('+').at(-1)
      const keyName =
        char === 'space' ? ' ' : char === 'escape' ? 'Escape' : char === 'enter' ? 'Enter' : char
      const result = resolveGraphKey(ev(keyName, mods), ctx())
      expect(result, `action ${a.id} should resolve`).not.toBeNull()
    }
  })
})
