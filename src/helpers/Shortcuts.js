import VueCookies from 'vue-cookies'

// Central registry for user-rebindable shortcuts.
//
// Combo format: lowercase modifier tokens joined by '+' followed by a key
// token, e.g. "meta+shift+s", "alt+l", "j", "escape", "shift+h".
//
// Defaults can differ per platform; user overrides (settings.shortcuts[id])
// apply to every platform. Overrides are read from the settings cookie on
// every call so rebinds take effect immediately without a reload.

export const SHORTCUT_GROUPS = [
  { id: 'forms', label: 'Forms & Dialogs' },
  { id: 'graph', label: 'Graph' }
]

export const DEFAULT_SHORTCUTS = [
  // ─── Forms & Dialogs ────────────────────────────────────────────────────
  {
    id: 'save',
    group: 'forms',
    label: 'Save (node / edge / diagram)',
    mac: 'meta+shift+s',
    other: 'alt+shift+s'
  },
  { id: 'close', group: 'forms', label: 'Close / cancel', mac: 'escape', other: 'escape' },
  { id: 'login', group: 'forms', label: 'Login', mac: 'meta+l', other: 'alt+l' },
  {
    id: 'clear',
    group: 'forms',
    label: 'Clear label field',
    mac: 'meta+shift+w',
    other: 'alt+shift+w'
  },
  // ─── Graph ───────────────────────────────────────────────────────────────
  { id: 'addNode', group: 'graph', label: 'Add node', mac: 'n', other: 'n' },
  { id: 'addEdge', group: 'graph', label: 'Add edge', mac: 'd', other: 'd' },
  { id: 'editElement', group: 'graph', label: 'Edit node / edge', mac: 'e', other: 'e' },
  { id: 'deleteElement', group: 'graph', label: 'Delete node / edge', mac: 'x', other: 'x' },
  { id: 'navDown', group: 'graph', label: 'Focus next element', mac: 'j', other: 'j' },
  { id: 'navUp', group: 'graph', label: 'Focus previous element', mac: 'k', other: 'k' },
  { id: 'navLeft', group: 'graph', label: 'Focus left', mac: 'h', other: 'h' },
  { id: 'navRight', group: 'graph', label: 'Focus right', mac: 'l', other: 'l' },
  {
    id: 'selectNodes',
    group: 'graph',
    label: 'Select nodes mode',
    mac: 'shift+n',
    other: 'shift+n'
  },
  {
    id: 'selectEdges',
    group: 'graph',
    label: 'Select edges mode',
    mac: 'shift+e',
    other: 'shift+e'
  },
  { id: 'select', group: 'graph', label: 'Select / deselect', mac: 'enter', other: 'enter' },
  { id: 'showHints', group: 'graph', label: 'Show element hints', mac: 'f', other: 'f' },
  { id: 'toggleTheme', group: 'graph', label: 'Toggle theme', mac: 't', other: 't' },
  { id: 'menu', group: 'graph', label: 'Open main menu', mac: 'm', other: 'm' },
  { id: 'actionsMenu', group: 'graph', label: 'Open actions menu', mac: 'a', other: 'a' },
  { id: 'help', group: 'graph', label: 'Show help', mac: '/', other: '/' },
  { id: 'copyNode', group: 'graph', label: 'Copy focused node', mac: 'y', other: 'y' },
  { id: 'history', group: 'graph', label: 'History panel', mac: 'shift+h', other: 'shift+h' },
  { id: 'share', group: 'graph', label: 'Share link dialog', mac: 'shift+s', other: 'shift+s' },
  { id: 'cycleCurveStyle', group: 'graph', label: 'Cycle edge curve style', mac: 'c', other: 'c' }
]

// Combos owned by non-rebindable handlers (menu, palette, pan/zoom/layouts)
// so the recorder can warn when a user assigns one of them to an action.
const RESERVED_COMBOS = [
  'meta+k',
  'ctrl+k',
  'alt+n',
  'alt+o',
  'alt+e',
  'alt+s',
  'alt+j',
  'alt+k',
  'alt+h',
  'alt+l',
  'alt+-',
  'alt+=',
  'alt+1',
  'alt+2',
  'alt+3',
  'alt+4',
  'alt+5',
  'alt+6',
  'alt+7',
  'alt+8'
]

const MODIFIERS = ['meta', 'ctrl', 'alt', 'shift']
const BARE_KEYS = [
  'meta',
  'control',
  'alt',
  'shift',
  'capslock',
  'numlock',
  'scrolllock',
  'unidentified'
]

const _actions = DEFAULT_SHORTCUTS
const _byId = new Map(_actions.map((a) => [a.id, a]))

export default {
  isMac() {
    if (typeof navigator === 'undefined') return false
    const platform = navigator.platform || navigator.userAgentData?.platform || ''
    return platform.toLowerCase().includes('mac') || /Mac|iPhone|iPad/.test(navigator.userAgent)
  },

  get actions() {
    return _actions
  },

  action(id) {
    return _byId.get(id)
  },

  overrides() {
    const settings = VueCookies.get('settings')
    return (settings && settings.shortcuts) || {}
  },

  // Effective combo for an action: user override wins over the platform default.
  combo(id) {
    const entry = _byId.get(id)
    if (!entry) return null
    const override = this.overrides()[id]
    return override || (this.isMac() ? entry.mac : entry.other)
  },

  // Human-readable label for an action's effective combo.
  label(id) {
    return this.format(this.combo(id))
  },

  // Human-readable label for an arbitrary combo string.
  format(combo) {
    const p = parseCombo(combo)
    if (!p.key) return String(combo || '')
    const glyphs = {
      meta: this.isMac() ? '⌘' : 'Ctrl',
      ctrl: 'Ctrl',
      alt: this.isMac() ? '⌥' : 'Alt',
      shift: 'Shift'
    }
    const parts = ['meta', 'ctrl', 'alt', 'shift'].filter((m) => p[m]).map((m) => glyphs[m])
    parts.push(displayKey(p.key))
    return parts.join('+')
  },

  // Does this event trigger the given action (id or combo)?
  matches(event, idOrCombo) {
    const combo = _byId.has(idOrCombo) ? this.combo(idOrCombo) : idOrCombo
    return matchesCombo(event, combo)
  },

  // Capture the keys a user pressed as a combo string. Returns null when the
  // event cannot form a combo (bare modifier, unknown key).
  comboFromEvent(event) {
    const key = event && event.key
    if (!key) return null
    if (BARE_KEYS.includes(key.toLowerCase())) return null
    const parts = []
    if (event.metaKey) parts.push('meta')
    if (event.ctrlKey) parts.push('ctrl')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    parts.push(normalizeKey(key))
    return parts.join('+')
  },

  // Non-blocking warnings for a recorded combo. ok=false only for combos that
  // can never fire (no key). Everything else is allowed with warnings.
  validate(combo) {
    const p = parseCombo(combo)
    if (!p.key)
      return { ok: false, reasons: ['Combos need a key (modifiers alone are not enough)'] }
    const reasons = []
    if (['tab', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(p.key)) {
      reasons.push('Used by menus and dropdowns — this may conflict')
    }
    if (p.meta && ['w', 't', 'r', 'q', 'l', '`'].includes(p.key)) {
      reasons.push('Reserved by the browser on macOS (closes/reloads tabs)')
    }
    if (p.ctrl && ['w', 't', 'r', 'q', 'l'].includes(p.key)) {
      reasons.push('Reserved by the browser (closes/reloads tabs)')
    }
    if (RESERVED_COMBOS.includes(combo)) {
      reasons.push('Already used by another app feature (menu, palette, pan/zoom, layout)')
    }
    return { ok: true, reasons }
  },

  // Duplicate effective combos across actions, given a set of overrides.
  conflicts(overrides = {}) {
    const seen = {}
    for (const a of _actions) {
      const c = overrides[a.id] || (this.isMac() ? a.mac : a.other)
      if (!c) continue
      ;(seen[c] = seen[c] || []).push(a.id)
    }
    return Object.entries(seen)
      .filter(([, ids]) => ids.length > 1)
      .map(([combo, ids]) => ({ combo, ids }))
  }
}

function normalizeKey(key) {
  return key === ' ' ? 'space' : String(key).toLowerCase()
}

function displayKey(key) {
  if (key === 'space') return 'Space'
  if (key === 'escape') return 'Esc'
  if (key === 'enter') return 'Enter'
  if (key === 'tab') return 'Tab'
  if (key.length === 1) return key.toUpperCase()
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function parseCombo(combo) {
  const parts = String(combo || '')
    .toLowerCase()
    .split('+')
  const mods = { meta: false, ctrl: false, alt: false, shift: false }
  const rest = []
  for (const part of parts) {
    if (MODIFIERS.includes(part)) mods[part] = true
    else if (part) rest.push(part)
  }
  return { ...mods, key: rest[0] || null }
}

export function matchesCombo(event, combo) {
  const p = parseCombo(combo)
  if (!p.key) return false
  if (Boolean(event.metaKey) !== p.meta) return false
  if (Boolean(event.ctrlKey) !== p.ctrl) return false
  if (Boolean(event.altKey) !== p.alt) return false
  if (Boolean(event.shiftKey) !== p.shift) return false
  return normalizeKey(event.key || '') === p.key
}
