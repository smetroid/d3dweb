import VueCookies from 'vue-cookies'

const ACCENT = '#5e74ff'
const AMBER  = '#ffab40'
const MUTED  = '#5c6aa8'

function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const parts = raw.split(/[\s,]+/).filter(Boolean).map(Number)
  if (parts.length >= 3 && parts.every(v => !Number.isNaN(v))) {
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`
  }
  return fallback
}

export function readThemeColors() {
  return {
    accent: cssVar('--fx-accent', ACCENT),
    amber:  cssVar('--fx-amber', AMBER),
    muted:  cssVar('--fx-muted', MUTED),
  }
}

function edgeSettings() {
  const s = VueCookies.get('settings') || {}
  return {
    style:   s.defaultEdgeStyle || 'curved',
    width:   s.defaultEdgeWidth !== undefined ? Number(s.defaultEdgeWidth) : 2,
    opacity: s.defaultEdgeOpacity !== undefined ? Number(s.defaultEdgeOpacity) : 0.7,
    arrow:   s.defaultArrowScale !== undefined ? Number(s.defaultArrowScale) : 18,
  }
}

const VALID_SHAPES = new Set([
  'ellipse', 'triangle', 'round-triangle', 'rectangle', 'round-rectangle',
  'bottom-round-rectangle', 'cut-rectangle', 'barrel', 'rhomboid', 'diamond',
  'round-diamond', 'pentagon', 'round-pentagon', 'hexagon', 'round-hexagon',
  'concave-hexagon', 'heptagon', 'round-heptagon', 'octagon', 'round-octagon',
  'star', 'tag', 'round-tag', 'vee',
])

const VALID_ARROWS = new Set([
  'triangle', 'triangle-tee', 'triangle-triangle', 'triangle-backcurve',
  'triangle-cross', 'circle-triangle', 'triangle-vee', 'vee', 'tee',
  'square', 'circle', 'diamond', 'chevron', 'none',
])

function shapeOf(ele) {
  if (ele.isParent()) return 'round-rectangle'
  const s = ele.data('shape')
  return VALID_SHAPES.has(s) ? s : 'round-rectangle'
}

function arrowOf(ele) {
  const a = ele.data('arrowhead')
  if (!a) return 'none'
  return VALID_ARROWS.has(a) ? a : 'triangle'
}

function nodeColor(data) {
  const m = data && typeof data.style === 'string' &&
    data.style.match(/fill:\s*(#[0-9a-fA-F]{3,8})/)
  return m ? m[1] : null
}

export function buildStyle() {
  const { accent, amber } = readThemeColors()
  const edge = edgeSettings()
  const curveStyle = edge.style === 'straight' ? 'straight' : 'bezier'
  const arrowScale = Math.min(Math.max(edge.arrow / 16, 0.5), 2)

  return [
    {
      selector: 'node',
      style: {
        'shape':            ele => shapeOf(ele),
        'width':            96,
        'height':           36,
        'padding':          8,
        'background-color': ele => (ele.isParent() ? 'transparent' : (nodeColor(ele.data()) || accent)),
        'border-color':     accent,
        'border-width':     ele => (ele.isParent() ? 1 : 1.5),
        'border-style':     ele => (ele.isParent() ? 'dashed' : 'solid'),
        'label':            ele => ele.data('label') || ele.id() || '',
        'color':            '#ffffff',
        'font-size':        12,
        'font-weight':      'bold',
        'font-family':      'system-ui, sans-serif',
        'text-valign':      ele => (ele.isParent() ? 'top' : ele.data('textValign') || 'center'),
        'text-halign':      ele => (ele.isParent() ? 'center' : ele.data('textHalign') || 'center'),
        'text-wrap':        'wrap',
        'text-max-width':   110,
      },
    },
    {
      selector: 'node:selected, node.selected',
      style: {
        'border-color': amber,
        'border-width': 3,
      },
    },
    {
      selector: 'node.d_active_node',
      style: {
        'border-color': amber,
        'border-width': 3,
        'border-style': 'dashed',
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style':        curveStyle,
        'width':              edge.width,
        'line-color':         accent,
        'opacity':            edge.opacity,
        'target-arrow-shape': ele => arrowOf(ele),
        'target-arrow-color': accent,
        'arrow-scale':        arrowScale,
        'label':              ele => (ele.data('label') && String(ele.data('label')).trim() ? ele.data('label') : ''),
        'font-size':          10,
        'color':              '#ffffff',
        'text-rotation':      'autorotate',
      },
    },
    {
      selector: 'edge:selected, edge.selected',
      style: {
        'line-color':         amber,
        'opacity':            Math.min(1, edge.opacity + 0.25),
        'target-arrow-color': amber,
      },
    },
  ]
}
