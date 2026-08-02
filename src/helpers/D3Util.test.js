/* eslint-env es2020 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import D3Util from '@/helpers/D3Util.js'

const realNavigator = globalThis.navigator

afterEach(() => {
  globalThis.navigator = realNavigator
  vi.restoreAllMocks()
})

function setNavigator (props) {
  globalThis.navigator = props
}

describe('isMac', () => {
  it('returns false when navigator is unavailable', () => {
    const { navigator } = globalThis
    delete globalThis.navigator
    expect(D3Util.isMac()).toBe(false)
    globalThis.navigator = navigator
  })

  it('detects Mac platform', () => {
    setNavigator({ platform: 'MacIntel', userAgent: 'Mozilla/5.0' })
    expect(D3Util.isMac()).toBe(true)
  })

  it('detects iOS from the user agent', () => {
    setNavigator({ platform: 'iPhone', userAgent: 'Mozilla/5.0 (iPhone)' })
    expect(D3Util.isMac()).toBe(true)
  })

  it('returns false on other platforms', () => {
    setNavigator({ platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows)' })
    expect(D3Util.isMac()).toBe(false)
  })
})

describe('shortcutLabels', () => {
  it('uses command labels on macOS', () => {
    vi.spyOn(D3Util, 'isMac').mockReturnValue(true)
    const labels = D3Util.shortcutLabels()
    expect(labels.save).toBe('⌘+S')
    expect(labels.close).toBe('⌘+C')
    expect(labels.login).toBe('⌘+L')
  })

  it('uses alt / ctrl labels elsewhere', () => {
    vi.spyOn(D3Util, 'isMac').mockReturnValue(false)
    const labels = D3Util.shortcutLabels()
    expect(labels.save).toBe('Alt+S')
    expect(labels.close).toBe('Ctrl+C')
  })
})

describe('mod', () => {
  it('wraps negative values', () => {
    expect(D3Util.mod(-1, 4)).toBe(3)
  })

  it('wraps values at or past the modulus', () => {
    expect(D3Util.mod(4, 4)).toBe(0)
    expect(D3Util.mod(9, 4)).toBe(1)
  })
})

describe('list navigation', () => {
  it('liSelectionJ moves the selection forward', () => {
    expect(D3Util.liSelectionJ([0, 1, 2], 0)).toBe(1)
    expect(D3Util.liSelectionJ([0, 1, 2], 2)).toBe(0)
  })

  it('liSelectionK moves the selection backward', () => {
    expect(D3Util.liSelectionK([0, 1, 2], 2)).toBe(1)
    expect(D3Util.liSelectionK([0, 1, 2], 0)).toBe(2)
  })
})

describe('randomId', () => {
  it('returns a fixed-length id (underscore + 9 chars)', () => {
    expect(D3Util.randomId()).toHaveLength(10)
    expect(D3Util.randomId().startsWith('_')).toBe(true)
  })

  it('produces different ids across calls', () => {
    expect(D3Util.randomId()).not.toBe(D3Util.randomId())
  })
})

describe('defaultNodeValues', () => {
  it('returns a complete node defaults object', () => {
    const defaults = D3Util.defaultNodeValues()
    expect(defaults.nodeLabel).toBe('Node')
    expect(defaults.nodeShape).toBe('rectangle')
    expect(defaults.textHalign).toBe('center')
    expect(defaults.textValign).toBe('top')
  })
})

describe('defaultEdgeValues', () => {
  it('returns a complete edge defaults object', () => {
    const defaults = D3Util.defaultEdgeValues()
    expect(defaults.edgeLabel).toBe('Edge ')
    expect(defaults.edgeArrowHead).toBe('triangle')
    expect(defaults.edgeArrowHeadStyle).toBe('filled')
  })
})

describe('appDefaults', () => {
  it('includes graph defaults and themes', () => {
    const defaults = D3Util.appDefaults()
    expect(defaults.defaultTheme).toBe('light')
    expect(defaults.themes).toEqual([
      { value: 'light', label: 'Light Theme' },
      { value: 'dark', label: 'Dark Theme' },
    ])
  })

  it('includes default layout options for Dagre, fCoSE, and Cola', () => {
    const defaults = D3Util.appDefaults()
    expect(defaults.defaultLayoutMode).toBe('dagre')
    expect(defaults.defaultRankDir).toBe('TB')
    expect(defaults.defaultRankSep).toBe(100)
    expect(defaults.defaultNodeSep).toBe(80)
    expect(defaults.defaultRanker).toBe('network-simplex')
    expect(defaults.defaultFcoseIdealEdgeLength).toBe(50)
    expect(defaults.defaultFcoseNodeRepulsion).toBe(45000)
    expect(defaults.defaultFcoseGravity).toBe(0.25)
    expect(defaults.defaultFcoseNumIter).toBe(2500)
    expect(defaults.defaultColaEdgeLength).toBe(80)
    expect(defaults.defaultColaNodeSpacing).toBe(10)
    expect(defaults.defaultColaFlow).toBeNull()
    expect(defaults.defaultColaAvoidOverlap).toBe(true)
    expect(defaults.defaultColaMaxSimulationTime).toBe(1500)
    expect(defaults.defaultEdgeStyle).toBe('curved')
    expect(defaults.defaultEdgeWidth).toBe(2)
    expect(defaults.defaultEdgeOpacity).toBe(0.7)
    expect(defaults.defaultArrowScale).toBe(18)
  })
})
