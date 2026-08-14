import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Shortcuts, { parseCombo, matchesCombo } from '@/helpers/Shortcuts.js'
import VueCookies from 'vue-cookies'

vi.mock('vue-cookies', () => ({
  default: { get: vi.fn(), set: vi.fn() }
}))

function setOverrides(shortcuts) {
  VueCookies.get.mockReturnValue(shortcuts ? { shortcuts } : null)
}

function ev(key, mods = {}) {
  return {
    key,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
    altKey: !!mods.alt,
    shiftKey: !!mods.shift
  }
}

describe('parseCombo', () => {
  it('parses modifiers and key', () => {
    expect(parseCombo('meta+shift+s')).toEqual({
      meta: true,
      ctrl: false,
      alt: false,
      shift: true,
      key: 's'
    })
    expect(parseCombo('alt+l')).toEqual({
      meta: false,
      ctrl: false,
      alt: true,
      shift: false,
      key: 'l'
    })
  })

  it('treats single keys as bare', () => {
    expect(parseCombo('j')).toEqual({
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
      key: 'j'
    })
  })

  it('returns null key for empty / modifier-only combos', () => {
    expect(parseCombo('meta').key).toBeNull()
    expect(parseCombo('').key).toBeNull()
  })
})

describe('matchesCombo', () => {
  it('matches letters regardless of shift-casing', () => {
    expect(matchesCombo(ev('n'), 'n')).toBe(true)
    expect(matchesCombo(ev('N', { shift: true }), 'shift+h')).toBe(false)
    expect(matchesCombo(ev('H', { shift: true }), 'shift+h')).toBe(true)
  })

  it('requires exact modifier state', () => {
    expect(matchesCombo(ev('s', { alt: true, shift: true }), 'alt+shift+s')).toBe(true)
    expect(matchesCombo(ev('s', { meta: true, shift: true }), 'alt+shift+s')).toBe(false)
    expect(matchesCombo(ev('s', { alt: true }), 'alt+shift+s')).toBe(false)
  })

  it('matches special keys', () => {
    expect(matchesCombo(ev('Escape'), 'escape')).toBe(true)
    expect(matchesCombo(ev('Enter'), 'enter')).toBe(true)
    expect(matchesCombo(ev('/'), '/')).toBe(true)
  })

  it('matches space alias', () => {
    expect(matchesCombo(ev(' '), 'space')).toBe(true)
  })

  it('returns false for unparseable combos', () => {
    expect(matchesCombo(ev('a'), null)).toBe(false)
    expect(matchesCombo(ev('a'), '')).toBe(false)
  })
})

describe('platform defaults', () => {
  beforeEach(() => {
    setOverrides(null)
    vi.spyOn(Shortcuts, 'isMac')
  })
  afterEach(() => vi.restoreAllMocks())

  it('uses mac defaults on mac', () => {
    Shortcuts.isMac.mockReturnValue(true)
    expect(Shortcuts.combo('save')).toBe('meta+shift+s')
    expect(Shortcuts.combo('close')).toBe('escape')
    expect(Shortcuts.combo('login')).toBe('meta+l')
    expect(Shortcuts.combo('history')).toBe('shift+h')
  })

  it('uses other-platform defaults elsewhere', () => {
    Shortcuts.isMac.mockReturnValue(false)
    expect(Shortcuts.combo('save')).toBe('alt+shift+s')
    expect(Shortcuts.combo('login')).toBe('alt+l')
  })
})

describe('overrides from settings cookie', () => {
  beforeEach(() => {
    vi.spyOn(Shortcuts, 'isMac').mockReturnValue(false)
  })
  afterEach(() => vi.restoreAllMocks())

  it('user overrides win over defaults', () => {
    setOverrides({ save: 'ctrl+shift+s', addNode: 'z' })
    expect(Shortcuts.combo('save')).toBe('ctrl+shift+s')
    expect(Shortcuts.combo('addNode')).toBe('z')
    expect(Shortcuts.combo('addEdge')).toBe('d')
  })

  it('matches against the override', () => {
    setOverrides({ addNode: 'z' })
    expect(Shortcuts.matches(ev('z'), 'addNode')).toBe(true)
    expect(Shortcuts.matches(ev('n'), 'addNode')).toBe(false)
  })
})

describe('labels', () => {
  beforeEach(() => {
    setOverrides(null)
    vi.spyOn(Shortcuts, 'isMac')
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders mac glyphs on mac', () => {
    Shortcuts.isMac.mockReturnValue(true)
    expect(Shortcuts.label('save')).toBe('⌘+Shift+S')
    expect(Shortcuts.label('close')).toBe('Esc')
    expect(Shortcuts.label('login')).toBe('⌘+L')
    expect(Shortcuts.label('clear')).toBe('⌘+Shift+W')
    expect(Shortcuts.label('history')).toBe('Shift+H')
  })

  it('renders alt/ctrl labels elsewhere', () => {
    Shortcuts.isMac.mockReturnValue(false)
    expect(Shortcuts.label('save')).toBe('Alt+Shift+S')
    expect(Shortcuts.label('login')).toBe('Alt+L')
    expect(Shortcuts.label('close')).toBe('Esc')
    expect(Shortcuts.format('ctrl+shift+s')).toBe('Ctrl+Shift+S')
  })

  it('formats arbitrary combos', () => {
    Shortcuts.isMac.mockReturnValue(true)
    expect(Shortcuts.format('space')).toBe('Space')
    expect(Shortcuts.format('enter')).toBe('Enter')
    expect(Shortcuts.format('meta+alt+x')).toBe('⌘+⌥+X')
  })
})

describe('comboFromEvent', () => {
  it('records chords and bare keys', () => {
    expect(Shortcuts.comboFromEvent(ev('S', { meta: true, shift: true }))).toBe('meta+shift+s')
    expect(Shortcuts.comboFromEvent(ev('s', { alt: true }))).toBe('alt+s')
    expect(Shortcuts.comboFromEvent(ev('j'))).toBe('j')
    expect(Shortcuts.comboFromEvent(ev('Escape'))).toBe('escape')
    expect(Shortcuts.comboFromEvent(ev(' '))).toBe('space')
  })

  it('rejects bare modifiers', () => {
    expect(Shortcuts.comboFromEvent(ev('Meta', { meta: true }))).toBeNull()
    expect(Shortcuts.comboFromEvent(ev('Shift', { shift: true }))).toBeNull()
    expect(Shortcuts.comboFromEvent(ev(null))).toBeNull()
  })
})

describe('validate', () => {
  it('flags combos without a key', () => {
    expect(Shortcuts.validate('meta').ok).toBe(false)
    expect(Shortcuts.validate('').ok).toBe(false)
  })

  it('allows ordinary combos without warnings', () => {
    expect(Shortcuts.validate('alt+shift+s')).toEqual({ ok: true, reasons: [] })
    expect(Shortcuts.validate('j')).toEqual({ ok: true, reasons: [] })
  })

  it('warns on reserved app and browser combos', () => {
    expect(Shortcuts.validate('meta+k').reasons.length).toBeGreaterThan(0)
    expect(Shortcuts.validate('alt+n').reasons.length).toBeGreaterThan(0)
    expect(Shortcuts.validate('meta+w').reasons.length).toBeGreaterThan(0)
    expect(Shortcuts.validate('ctrl+w').reasons.length).toBeGreaterThan(0)
  })

  it('warns on navigation keys', () => {
    expect(Shortcuts.validate('tab').reasons.length).toBeGreaterThan(0)
    expect(Shortcuts.validate('arrowdown').reasons.length).toBeGreaterThan(0)
  })
})

describe('conflicts', () => {
  beforeEach(() => {
    vi.spyOn(Shortcuts, 'isMac').mockReturnValue(false)
  })
  afterEach(() => vi.restoreAllMocks())

  it('finds duplicate combos across actions', () => {
    const result = Shortcuts.conflicts({ addNode: 'x', deleteElement: 'x' })
    expect(result).toHaveLength(1)
    expect(result[0].ids.sort()).toEqual(['addNode', 'deleteElement'])
  })

  it('returns empty when nothing collides', () => {
    expect(Shortcuts.conflicts({ addNode: 'z' })).toEqual([])
  })
})
