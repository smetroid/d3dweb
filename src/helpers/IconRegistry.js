import mdiIcons from './mdi-icons.json'
import msIcons from './ms-icons.json'

const MDI_FONT = '"Material Design Icons"'
const MS_FAMILY = 'Material Symbols Rounded'
const MS_FONT = `"${MS_FAMILY}"`
const BASE_FONT = 'ui-monospace, "Cascadia Code", Menlo, monospace'

function _injectMaterialSymbolsLink() {
  if (typeof document === 'undefined') return
  if (document.getElementById('material-symbols-link')) return
  const link = document.createElement('link')
  link.id = 'material-symbols-link'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded'
  document.head.appendChild(link)
}

let _msFontReady = null

/**
 * Make an icon set's font usable before anything tries to draw with it.
 *
 * MDI is bundled (main.js imports its stylesheet), so it needs nothing. Material
 * Symbols is fetched from Google on demand, and the stylesheet alone is not
 * enough: a <link> only defines the @font-face rule, and the browser downloads
 * the file lazily, when DOM text actually uses the family. A canvas label never
 * triggers that, and the edit form's preview span is styled by the very class
 * the stylesheet defines — so both render the raw ligature name until the face
 * is explicitly requested here.
 *
 * Returns a promise that settles once the font is ready to draw.
 */
export function ensureIconFont(set) {
  if (set !== 'material-symbols') return Promise.resolve()
  _injectMaterialSymbolsLink()
  if (_msFontReady) return _msFontReady
  const fonts = typeof document === 'undefined' ? null : document.fonts
  if (!fonts?.load) {
    _msFontReady = Promise.resolve()
    return _msFontReady
  }
  // Any ligature name works to pull the face down; "home" always exists.
  _msFontReady = fonts.load(`24px ${MS_FONT}`, 'home').catch(() => {})
  return _msFontReady
}

// Sorted name list for the picker (built once, lazily).
let _mdiNames = null
function _getMdiNames() {
  if (_mdiNames) return _mdiNames
  _mdiNames = Object.keys(mdiIcons).sort()
  return _mdiNames
}

/**
 * Resolve an icon descriptor to the glyph character and font-family stack
 * needed to render it on a canvas (Cytoscape label).
 *
 * Returns { glyph, fontFamily } or null when the name is unknown.
 */
export function resolveIcon(set, name) {
  if (!set || !name) return null
  if (set === 'mdi') {
    const glyph = mdiIcons[name]
    if (!glyph) return null
    return { glyph, fontFamily: `${MDI_FONT}, ${BASE_FONT}` }
  }
  if (set === 'material-symbols') {
    ensureIconFont(set)
    // Material Symbols uses ligatures: the font renders the name string (e.g.
    // "home") as the icon glyph. The raw name IS the glyph content.
    return { glyph: name, fontFamily: `${MS_FONT}, ${BASE_FONT}` }
  }
  return null
}

/**
 * Compose a display label and font-family from raw element data.
 * Returns { displayLabel, displayFont } — both undefined when no icon is set.
 */
export function composeIconLabel(data) {
  const { iconSet, iconName, iconPosition } = data ?? {}
  if (!iconSet || !iconName) return { displayLabel: undefined, displayFont: undefined }

  const resolved = resolveIcon(iconSet, iconName)
  if (!resolved) return { displayLabel: undefined, displayFont: undefined }

  const { glyph, fontFamily } = resolved
  const text = (data.label ?? '').trim()
  const pos = iconPosition || 'left'

  let displayLabel
  if (!text || pos === 'only') {
    displayLabel = glyph
  } else {
    switch (pos) {
      case 'right':
        displayLabel = `${text} ${glyph}`
        break
      case 'above':
        displayLabel = `${glyph}\n${text}`
        break
      case 'below':
        displayLabel = `${text}\n${glyph}`
        break
      default:
        displayLabel = `${glyph} ${text}` // 'left'
    }
  }
  return { displayLabel, displayFont: fontFamily }
}

/**
 * Return icon names for the picker, filtered by a substring query.
 * Results are paginated to keep list rendering cheap.
 */
export function listIcons(set, query = '', { limit = 60, offset = 0 } = {}) {
  if (set === 'mdi') {
    const q = query.toLowerCase().replace(/^mdi-/, '')
    const names = _getMdiNames()
    const matched = q ? names.filter((n) => n.slice(4).includes(q)) : names
    return matched.slice(offset, offset + limit)
  }
  if (set === 'material-symbols') {
    const q = query.toLowerCase().trim()
    const matched = q ? msIcons.filter((n) => n.includes(q)) : msIcons
    return matched.slice(offset, offset + limit)
  }
  return []
}

/** True if `name` is a valid icon for the given set. */
export function isValidIcon(set, name) {
  if (set === 'mdi') return Object.prototype.hasOwnProperty.call(mdiIcons, name)
  // Deliberately permissive: the CDN font can carry icons newer than the bundled
  // name list, and the form accepts a free-typed name, so membership is not required.
  if (set === 'material-symbols') return typeof name === 'string' && name.length > 0
  return false
}

export const ICON_SETS = [
  { value: 'mdi', label: 'Material Design Icons' },
  { value: 'material-symbols', label: 'Material Symbols (Google)' }
]

export const ICON_POSITIONS = [
  { value: 'left', label: '← Left' },
  { value: 'right', label: 'Right →' },
  { value: 'above', label: '↑ Above' },
  { value: 'below', label: 'Below ↓' },
  { value: 'only', label: 'Only' }
]
