/* eslint-env es2020 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import D3Util from '@/helpers/D3Util.js'
import Shortcuts from '@/helpers/Shortcuts.js'

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(() => null), set: vi.fn() }
}))

const realNavigator = globalThis.navigator

afterEach(() => {
  globalThis.navigator = realNavigator
  vi.restoreAllMocks()
})

function setNavigator(props) {
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
  beforeEach(() => {
    vi.spyOn(Shortcuts, 'isMac').mockReturnValue(false)
  })

  it('uses command labels on macOS', () => {
    Shortcuts.isMac.mockReturnValue(true)
    const labels = D3Util.shortcutLabels()
    expect(labels.save).toBe('⌘+Shift+S')
    expect(labels.close).toBe('Esc')
    expect(labels.login).toBe('⌘+L')
  })

  it('uses alt labels elsewhere and esc to close', () => {
    Shortcuts.isMac.mockReturnValue(false)
    const labels = D3Util.shortcutLabels()
    expect(labels.save).toBe('Alt+Shift+S')
    expect(labels.close).toBe('Esc')
  })

  it('reflects user shortcut rebinds', () => {
    const spy = vi.spyOn(Shortcuts, 'overrides').mockReturnValue({ close: 'j' })
    expect(D3Util.shortcutLabels().close).toBe('J')
    spy.mockRestore()
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
    expect(defaults.nodeLabel).toBe('')
    expect(defaults.nodeShape).toBe('round-rectangle')
    expect(defaults.textHalign).toBe('center')
    expect(defaults.textValign).toBe('center')
    expect(defaults.bgColor).toBe('')
    expect(defaults.borderColor).toBe('')
    expect(defaults.borderWidth).toBeNull()
    expect(defaults.fontSize).toBeNull()
  })

  it('uses the configured node creation defaults from the settings cookie', async () => {
    const VueCookies = (await import('vue-cookies')).default
    VueCookies.get.mockReturnValue({
      defaultNodeShape: 'star',
      defaultNodeTextHalign: 'right',
      defaultNodeTextValign: 'bottom',
      defaultNodeBgColor: '#ef5350',
      defaultNodeBorderColor: '#ffab40',
      defaultNodeBorderWidth: 3,
      defaultNodeFontSize: 18
    })
    const defaults = D3Util.defaultNodeValues()
    expect(defaults.nodeShape).toBe('star')
    expect(defaults.textHalign).toBe('right')
    expect(defaults.textValign).toBe('bottom')
    expect(defaults.bgColor).toBe('#ef5350')
    expect(defaults.borderColor).toBe('#ffab40')
    expect(defaults.borderWidth).toBe(3)
    expect(defaults.fontSize).toBe(18)
  })
})

describe('defaultEdgeValues', () => {
  it('returns a complete edge defaults object', () => {
    const defaults = D3Util.defaultEdgeValues()
    expect(defaults.edgeLabel).toBe('')
    expect(defaults.edgeArrowHead).toBe('vee')
    expect(defaults.edgeArrowHeadStyle).toBe('filled')
    expect(defaults.sourceArrowhead).toBe('')
    expect(defaults.edgeWidth).toBe(2)
    expect(defaults.edgeColor).toBe('')
    expect(defaults.edgeLineStyle).toBe('solid')
    expect(defaults.edgeCurve).toBe('bezier')
    expect(defaults.edgeOpacity).toBe(0.85)
  })

  it('uses the configured edge creation defaults from the settings cookie', async () => {
    const VueCookies = (await import('vue-cookies')).default
    VueCookies.get.mockReturnValue({
      defaultArrowShape: 'triangle',
      defaultEdgeArrowHeadStyle: 'hollow',
      defaultEdgeSourceArrow: 'circle',
      defaultEdgeWidth: 4,
      defaultEdgeColor: '#ff00aa',
      defaultEdgeLineStyle: 'dashed',
      defaultEdgeStyle: 'straight',
      defaultEdgeOpacity: 0.5
    })
    const defaults = D3Util.defaultEdgeValues()
    expect(defaults.edgeArrowHead).toBe('triangle')
    expect(defaults.edgeArrowHeadStyle).toBe('hollow')
    expect(defaults.sourceArrowhead).toBe('circle')
    expect(defaults.edgeWidth).toBe(4)
    expect(defaults.edgeColor).toBe('#ff00aa')
    expect(defaults.edgeLineStyle).toBe('dashed')
    expect(defaults.edgeCurve).toBe('straight')
    expect(defaults.edgeOpacity).toBe(0.5)
  })

  it('passes any curve value from settings through to the edge defaults', async () => {
    const VueCookies = (await import('vue-cookies')).default
    VueCookies.get.mockReturnValue({ defaultEdgeStyle: 'unbundled-bezier' })
    expect(D3Util.defaultEdgeValues().edgeCurve).toBe('unbundled-bezier')
  })

  it('maps the legacy "curved" curve value to "bezier"', async () => {
    const VueCookies = (await import('vue-cookies')).default
    VueCookies.get.mockReturnValue({ defaultEdgeStyle: 'curved' })
    expect(D3Util.defaultEdgeValues().edgeCurve).toBe('bezier')
  })
})

describe('appDefaults', () => {
  it('includes graph defaults and themes', () => {
    const defaults = D3Util.appDefaults()
    expect(defaults.defaultTheme).toBe('light')
    expect(defaults.themes).toEqual([
      { value: 'light', label: 'Light Theme' },
      { value: 'dark', label: 'Dark Theme' }
    ])
  })

  it('includes default layout options for Cola (single layout engine)', () => {
    const defaults = D3Util.appDefaults()
    expect(defaults.defaultLayoutMode).toBe('cola')
    expect(defaults.defaultColaEdgeLength).toBe(120)
    expect(defaults.defaultColaNodeSpacing).toBe(30)
    expect(defaults.defaultColaFlow).toBeNull()
    expect(defaults.defaultColaAvoidOverlap).toBe(true)
    expect(defaults.defaultColaMaxSimulationTime).toBe(1500)
    expect(defaults.defaultColaGravity).toBe(0)
    expect(defaults.defaultZoomFit).toBe(true)
    expect(defaults.defaultZoomLevel).toBe(1)
    expect(defaults.defaultEdgeStyle).toBe('bezier')
    expect(defaults.defaultEdgeWidth).toBe(2)
    expect(defaults.defaultEdgeOpacity).toBe(0.85)
    expect(defaults.defaultArrowScale).toBe(1)
    expect(defaults.defaultArrowShape).toBe('vee')
    expect(defaults.defaultEdgeArrowHeadStyle).toBe('filled')
    expect(defaults.defaultEdgeSourceArrow).toBe('')
    expect(defaults.defaultEdgeColor).toBe('')
    expect(defaults.defaultEdgeLineStyle).toBe('solid')
    expect(defaults.defaultNodeShape).toBe('round-rectangle')
    expect(defaults.defaultNodeTextHalign).toBe('center')
    expect(defaults.defaultNodeTextValign).toBe('center')
    expect(defaults.defaultNodeBgColor).toBe('')
    expect(defaults.defaultNodeBorderColor).toBe('')
    expect(defaults.defaultNodeBorderWidth).toBeNull()
    expect(defaults.defaultNodeFontSize).toBeNull()
  })
})

describe('shared dropdown options', () => {
  it('node shape options cover every node shape used in the node form', () => {
    expect(D3Util.nodeShapeOptions()).toEqual([
      { value: 'none', label: 'None' },
      { value: 'rectangle', label: 'Rectangle' },
      { value: 'round-rectangle', label: 'Round Rectangle' },
      { value: 'ellipse', label: 'Ellipse' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'round-diamond', label: 'Round Diamond' },
      { value: 'hexagon', label: 'Hexagon' },
      { value: 'octagon', label: 'Octagon' },
      { value: 'star', label: 'Star' },
      { value: 'tag', label: 'Tag' },
      { value: 'barrel', label: 'Barrel' }
    ])
  })

  it('edge arrow head options include square and match the edge form list', () => {
    const values = D3Util.edgeArrowHeadOptions().map((o) => o.value)
    expect(values).toEqual([
      'triangle',
      'vee',
      'none',
      'chevron',
      'tee',
      'circle',
      'diamond',
      'square',
      'triangle-tee',
      'triangle-cross'
    ])
  })

  it('edge curve options match the edge form curve list', () => {
    expect(D3Util.edgeCurveOptions().map((o) => o.value)).toEqual([
      'bezier',
      'straight',
      'segmented',
      'unbundled-bezier',
      'haystack'
    ])
  })

  it('edge line style and arrow head style options match the edge form lists', () => {
    expect(D3Util.edgeLineStyleOptions().map((o) => o.value)).toEqual(['solid', 'dotted', 'dashed'])
    expect(D3Util.edgeArrowHeadStyleOptions().map((o) => o.value)).toEqual(['filled', 'hollow'])
    expect(D3Util.nodeHalignOptions().map((o) => o.value)).toEqual(['left', 'center', 'right'])
    expect(D3Util.nodeValignOptions().map((o) => o.value)).toEqual(['top', 'center', 'bottom'])
  })
})
