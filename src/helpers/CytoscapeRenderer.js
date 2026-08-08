import cytoscape from 'cytoscape'
import cola from 'cytoscape-cola'
import dagre from 'cytoscape-dagre'
import VueCookies from 'vue-cookies'
import {
  normalizeOptionalFields,
  NODE_OPTIONAL_FIELDS,
  EDGE_OPTIONAL_FIELDS,
} from '@/helpers/GraphModel.js'

cytoscape.use(cola)
cytoscape.use(dagre)

// Fallback palette used when the app's CSS variables can't be read (headless
// tests, style-less pages). Matches the previous hardcoded dark HUD look.
export const DEFAULT_PALETTE = {
  nodeTop:     '#242b4d',
  nodeBottom:  '#121a30',
  nodeBg:      '#121a30',
  label:       '#c8d0f0',
  labelSoft:   '#a8b4dc',
  accent:      '#5e74ff',
  accentA:     (a) => `rgba(94,116,255,${a})`,
}

// Reads the app's --fx-* CSS variables (RGB triplets) and returns a cytoscape
// palette. `getVar` is injected so this is testable without a DOM.
export function paletteFromCSSVars(getVar) {
  const read = (key) => {
    const raw = getVar(key)
    if (!raw) return null
    const m = String(raw).trim().match(/^([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/)
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null
  }
  const accent   = read('--fx-accent')
  const ink      = read('--fx-ink')
  const inkSoft  = read('--fx-ink-soft')
  const glassTop = read('--fx-glass-top')
  const glassBot = read('--fx-glass-bottom')
  if (!accent) return DEFAULT_PALETTE
  const rgb = (c) => `rgb(${c.r},${c.g},${c.b})`
  return {
    nodeTop:    glassTop ? rgb(glassTop) : DEFAULT_PALETTE.nodeTop,
    nodeBottom: glassBot ? rgb(glassBot) : DEFAULT_PALETTE.nodeBottom,
    nodeBg:     glassBot ? rgb(glassBot) : DEFAULT_PALETTE.nodeBg,
    label:      ink      ? rgb(ink)      : DEFAULT_PALETTE.label,
    labelSoft:  inkSoft  ? rgb(inkSoft)  : DEFAULT_PALETTE.labelSoft,
    accent:     rgb(accent),
    accentA:    (a) => `rgba(${accent.r},${accent.g},${accent.b},${a})`,
  }
}

function readSettings() {
  try {
    return VueCookies.get('settings') || {}
  } catch (e) {
    return {}
  }
}

// Given a node bounding box and a group box in the same coordinate space,
// returns the {x, y} translation that moves the node just clear of the group.
// Returns {x: 0, y: 0} when the boxes do not overlap.
export function resolveBoxOverlap(nodeBox, groupBox) {
  const overlapX = Math.min(nodeBox.x2, groupBox.x2) - Math.max(nodeBox.x1, groupBox.x1)
  const overlapY = Math.min(nodeBox.y2, groupBox.y2) - Math.max(nodeBox.y1, groupBox.y1)
  if (overlapX <= 0 || overlapY <= 0) return { x: 0, y: 0 }

  const gap = 2
  if (overlapX <= overlapY) {
    const toLeft  = nodeBox.x2 - groupBox.x1
    const toRight = groupBox.x2 - nodeBox.x1
    return toLeft <= toRight ? { x: -toLeft - gap, y: 0 } : { x: toRight + gap, y: 0 }
  }
  const toTop    = nodeBox.y2 - groupBox.y1
  const toBottom = groupBox.y2 - nodeBox.y1
  return toTop <= toBottom ? { x: 0, y: -toTop - gap } : { x: 0, y: toBottom + gap }
}

export function hintTransform(x, y) {
  return `translate(${x}px, ${y}px)`
}

export function edgeStyleFrom(settings, accent = '#5e74ff') {
  // Legacy settings stored 'curved' ("Curved (Bezier)"); normalize it to the
  // cytoscape curve-style value 'bezier'. Everything else passes straight
  // through so all curve options in the node/edge forms are supported.
  const curve = settings.defaultEdgeStyle === 'curved'
    ? 'bezier'
    : settings.defaultEdgeStyle || 'bezier'
  const raw = Number(settings.defaultArrowScale)
  const arrowScale = Number.isFinite(raw) ? Math.min(3, Math.max(0.1, raw)) : 1
  return {
    'width':                Number(settings.defaultEdgeWidth)   || 2,
    'line-color':           accent,
    'target-arrow-color':   accent,
    'target-arrow-shape':   settings.defaultArrowShape || 'vee',
    'arrow-scale':          arrowScale,
    'curve-style':          curve,
    'opacity':              Number(settings.defaultEdgeOpacity)  || 0.85,
  }
}

// Full cytoscape style, themed via the app palette. Accents (amber/red) are
// theme-invariant; node/edge colors come from the palette.
export function themeStyle(pal = DEFAULT_PALETTE, settings = {}) {
  return [
    // ── Edges ────────────────────────────────────────────────────────────────
    {
      selector: 'edge',
      style:    edgeStyleFrom(settings, pal.accent),
    },
    {
      selector: 'edge.hovered',
      style: {
        'opacity':            1,
        'width':              3,
        'line-color':         pal.accent,
        'target-arrow-color': pal.accent,
        'underlay-color':     pal.accent,
        'underlay-padding':   4,
        'underlay-opacity':   0.15,
      },
    },
    {
      selector: 'edge.focused',
      style: {
        'line-color':         '#ffab40',
        'target-arrow-color': '#ffab40',
        'opacity':            1,
        'width':              3.5,
        'underlay-color':     '#ffab40',
        'underlay-padding':   6,
        'underlay-opacity':   0.22,
      },
    },
    {
      selector: 'edge[label]',
      style: {
        'label':                     'data(label)',
        'color':                     pal.label,
        'font-size':                 10,
        'font-family':               'ui-monospace, "Cascadia Code", Menlo, monospace',
        'text-rotation':             'autorotate',
        'text-background-color':     pal.nodeBg,
        'text-background-opacity':   1,
        'text-background-padding':   '3px',
        'text-background-shape':     'round-rectangle',
      },
    },
    {
      selector: 'edge[?arrowhead]',
      style: { 'target-arrow-shape': 'data(arrowhead)' },
    },
    {
      selector: 'edge[?arrowheadStyle]',
      style: { 'target-arrow-fill': 'data(arrowheadStyle)' },
    },
    // ── Nodes (base) ─────────────────────────────────────────────────────────
    {
      selector: 'node',
      style: {
        'width':                      'label',
        'height':                     'label',
        'min-width':                          '40px',
        'min-height':                         '30px',
        'padding':                            '8px 14px',
        'background-color':                   pal.nodeBottom,
        'background-gradient-stop-colors':    `${pal.nodeTop} ${pal.nodeBottom}`,
        'background-gradient-stop-positions': '0 100',
        'background-gradient-direction':      'to-bottom',
        'background-opacity':                 0.88,
        'border-color':                       pal.accent,
        'border-width':                       1.5,
        'border-opacity':                     0.8,
        'color':                              pal.label,
        'label':                              'data(label)',
        'text-valign':                        'center',
        'text-halign':                        'center',
        'text-wrap':                          'wrap',
        'text-max-width':                     '120px',
        'font-family':                        'ui-monospace, "Cascadia Code", Menlo, monospace',
        'font-size':                          12,
        'font-weight':                        600,
        'shape':                              'round-rectangle',
        'underlay-color':                     pal.accent,
        'underlay-padding':                   '5px',
        'underlay-opacity':                   0.06,
        'overlay-color':                      pal.accent,
        'overlay-padding':                    '2px',
        'overlay-opacity':                    0.08,
      },
    },

    // Nodes with no label collapse to zero with width:'label' — give them
    // a fixed minimum rendered size so they remain visible.
    {
      selector: 'node[label = ""]',
      style: { 'width': 40, 'height': 30 },
    },

    // Per-node shape driven by form data (e.g. hexagon, diamond, star …)
    {
      selector: 'node[?nodeShape]',
      style: { 'shape': 'data(nodeShape)' },
    },

    // Shape-based accent colors (theme-invariant semantic tints)
    {
      selector: 'node[nodeShape="ellipse"]',
      style: { 'border-color': '#26a69a', 'underlay-color': '#26a69a' },
    },
    {
      selector: 'node[nodeShape="diamond"], node[nodeShape="round-diamond"]',
      style: { 'border-color': '#ffab40', 'underlay-color': '#ffab40' },
    },
    {
      selector: 'node[nodeShape="hexagon"], node[nodeShape="octagon"]',
      style: { 'border-color': '#29b6f6', 'underlay-color': '#29b6f6' },
    },
    {
      selector: 'node[nodeShape="star"]',
      style: { 'border-color': '#ef5350', 'underlay-color': '#ef5350' },
    },
    {
      selector: 'node[nodeShape="tag"], node[nodeShape="barrel"]',
      style: { 'border-color': '#ab47bc', 'underlay-color': '#ab47bc' },
    },

    // Custom fill color parsed from the node's "style" field (fill: #hex).
    // background-gradient-stop-colors does not support data() mappings, so
    // the gradient override is applied inline via ele.style() in updateScene.
    {
      selector: 'node[?fillColor]',
      style: {
        'border-color':   'data(fillColor)',
        'underlay-color': 'data(fillColor)',
      },
    },

    // ── Compound nodes ───────────────────────────────────────────────────────
    {
      selector: 'node:parent',
      style: {
        // accent-tinted header strip at top 18%, then regular node gradient
        'background-color':                   pal.nodeBottom,
        'background-gradient-stop-colors':    `${pal.accentA(0.22)} ${pal.nodeTop} ${pal.nodeBottom}`,
        'background-gradient-stop-positions': '0 18 100',
        'background-gradient-direction':      'to-bottom',
        'background-opacity':                 0.6,
        'border-color':                       pal.labelSoft,
        'border-style':                       'dashed',
        'border-width':                       1.5,
        'border-opacity':                     0.45,
        'color':                              pal.labelSoft,
        'text-valign':                        'top',
        'text-halign':                        'left',
        'text-background-color':              pal.accentA(0.35),
        'text-background-opacity':            1,
        'text-background-padding':            '4px',
        'text-background-shape':              'round-rectangle',
        'text-margin-x':                      8,
        'text-margin-y':                      8,
        'font-weight':                        'bold',
        'font-size':                          13,
        'padding':                            '20px',
        'shape':                              'round-rectangle',
        'underlay-color':                     pal.nodeTop,
        'underlay-padding':                   '8px',
        'underlay-opacity':                   0.04,
      },
    },

    // ── Node interaction states ───────────────────────────────────────────────
    {
      selector: 'node.hovered',
      style: {
        'border-opacity':   1,
        'border-width':     2.5,
        'underlay-opacity': 0.18,
        'underlay-padding': '7px',
      },
    },
    {
      selector: 'node.focused',
      style: {
        'border-color':     '#ffab40',
        'border-width':     3,
        'border-opacity':   1,
        'underlay-color':   '#ffab40',
        'underlay-padding': '6px',
        'underlay-opacity': 0.2,
      },
    },
    {
      selector: 'node.active_node',
      style: {
        'border-color':     '#ffab40',
        'border-width':     3,
        'border-opacity':   1,
        'background-color': 'rgba(255,171,64,0.18)',
        'underlay-color':   '#ffab40',
        'underlay-padding': '8px',
        'underlay-opacity': 0.3,
      },
    },
    {
      selector: 'node.d_active_node',
      style: {
        'border-color':     '#ff6e40',
        'border-width':     3,
        'border-opacity':   1,
        'underlay-color':   '#ff6e40',
        'underlay-padding': '8px',
        'underlay-opacity': 0.22,
      },
    },

    // ─── Per-element data-driven styling (edited via the node/edge forms) ────
    // Selectors are guarded by [attr] so the theme defaults above apply whenever
    // an element does not carry the data field. Shape itself is driven by
    // node[?nodeShape] above (unified with the shape-color tints).
    {
      selector: 'node[textHalign]',
      style:    { 'text-halign': 'data(textHalign)' },
    },
    {
      selector: 'node[textValign]',
      style:    { 'text-valign': 'data(textValign)' },
    },
    {
      selector: 'node[bgColor]',
      style: {
        'background-color': 'data(bgColor)',
      },
    },
    {
      selector: 'node[borderColor]',
      style:    { 'border-color': 'data(borderColor)' },
    },
    {
      selector: 'node[borderWidth]',
      style:    { 'border-width': 'data(borderWidth)' },
    },
    {
      selector: 'node[fontSize]',
      style:    { 'font-size': 'data(fontSize)' },
    },
    {
      selector: 'edge[sourceArrowhead]',
      style:    { 'source-arrow-shape': 'data(sourceArrowhead)' },
    },
    {
      selector: 'edge[edgeWidth]',
      style:    { 'width': 'data(edgeWidth)' },
    },
    {
      selector: 'edge[edgeColor]',
      style: {
        'line-color':         'data(edgeColor)',
        'target-arrow-color': 'data(edgeColor)',
        'source-arrow-color': 'data(edgeColor)',
      },
    },
    {
      selector: 'edge[edgeLineStyle]',
      style:    { 'line-style': 'data(edgeLineStyle)' },
    },
    {
      selector: 'edge[edgeCurve]',
      style:    { 'curve-style': 'data(edgeCurve)' },
    },
    {
      selector: 'edge[edgeOpacity]',
      style:    { 'opacity': 'data(edgeOpacity)' },
    },
  ]
}

// ─── Proximity navigation (j/k/h/l) ────────────────────────────────────────────
// Keyboard navigation picks the element geometrically nearest to the focused
// element in a screen direction. Directions follow vim: j=down, k=up, h=left,
// l=right. When nothing exists on the target side, we wrap to the element on
// the opposite side that is farthest along the same axis (mirroring the array
// wrap of the old index-based navigation).

export const DIRECTION = {
  k: { axis: 'y', sign: -1 },
  j: { axis: 'y', sign: 1 },
  h: { axis: 'x', sign: -1 },
  l: { axis: 'x', sign: 1 },
}

function anchorFor(cy, id, kind) {
  const ele = cy.getElementById(id)
  if (ele.empty()) return null
  if (kind === 'edges') {
    // edge.midpoint() depends on the renderer's curve, so derive the anchor
    // from the connected nodes' positions — works headless and rendered.
    const s = ele.source()
    const t = ele.target()
    if (!s || s.empty() || !t || t.empty()) return null
    const sp = s.position()
    const tp = t.position()
    if (!sp || !tp) return null
    return { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 }
  }
  return ele.position() || null
}

export function nearestInDirection(cy, fromId, direction, kind = 'nodes') {
  const dir = DIRECTION[direction]
  if (!dir || !cy || !fromId) return null

  const from = anchorFor(cy, fromId, kind)
  if (!from) return null

  const pool   = kind === 'edges' ? cy.edges() : cy.nodes()
  const anchor = (ele) => (kind === 'edges' ? anchorFor(cy, ele.id(), 'edges') : ele.position())
  const axis   = dir.axis
  const sign   = dir.sign

  let onTarget  = null
  let onOpposite = null

  for (let i = 0; i < pool.length; i++) {
    const ele = pool[i]
    if (ele.id() === fromId) continue
    const p = anchor(ele)
    if (!p) continue
    const delta = p[axis] - from[axis]
    if (delta * sign > 0) {
      if (!onTarget || isCloser(p, from, onTarget.p, axis)) onTarget = { ele, p }
    } else if (delta * sign < 0) {
      // "Farthest along the axis on the opposite side" = largest |delta|
      if (!onOpposite || Math.abs(p[axis] - from[axis]) > Math.abs(onOpposite.p[axis] - from[axis])) {
        onOpposite = { ele, p }
      }
    }
  }

  return (onTarget || onOpposite)?.ele.id() || null
}

// Prefer elements aligned on the perpendicular axis: a slightly farther but
// better-aligned element beats a closer one that is wildly off-line. Compare
// along-axis distance first (weighted), then perpendicular distance as a tie
// break.
function isCloser(p, from, best, axis) {
  const score = (pos) => {
    const along = Math.abs(pos[axis] - from[axis])
    const perp  = Math.abs(pos[axis === 'x' ? 'y' : 'x'] - from[axis === 'x' ? 'y' : 'x'])
    return along + perp * 2
  }
  return score(p) < score(best)
}

export default class CytoscapeRenderer {
  constructor(container, emitter) {
    this.container = container
    this.emitter   = emitter
    this.cy        = null
  }

  init() {
    this.cy = cytoscape({
      container:       this.container,
      style:           [],
      styleEnabled:    true,
      minZoom:         0.08,
      maxZoom:         5,
      // Native pan is kept enabled so cytoscape handles drag-to-pan on all
      // devices. Only wheel zoom is overridden (see _bindCameraControls).
      userZoomingEnabled: false,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    })

    this._applyTheme()
    this._bindCameraControls()

    this.cy.on('tap', 'node', (evt) => {
      this.emitter?.emit('node-click', evt.target.id())
    })

    this.cy.on('mouseover', 'node', (evt) => { evt.target.addClass('hovered') })
    this.cy.on('mouseout',  'node', (evt) => { evt.target.removeClass('hovered') })
    this.cy.on('mouseover', 'edge', (evt) => { evt.target.addClass('hovered') })
    this.cy.on('mouseout',  'edge', (evt) => { evt.target.removeClass('hovered') })

    // Keep hint badges + selection crosshairs glued to their nodes while panning/zooming
    this._viewportEmitPending = false
    this.cy.on('pan zoom resize', () => {
      this._updateHintAnchors()
      this._updateCrosshairs()
      if (!this._viewportEmitPending) {
        this._viewportEmitPending = true
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            this._viewportEmitPending = false
            if (this.cy) this.emitter?.emit('viewport-changed', { zoom: this.cy.zoom() })
          })
        } else {
          this._viewportEmitPending = false
          this.emitter?.emit('viewport-changed', { zoom: this.cy.zoom() })
        }
      }
    })

    this._onThemeChangedBound = () => this._applyTheme()
    this.emitter?.on('themeChanged', this._onThemeChangedBound)
  }

  // Replaces cytoscape's native "grab" gestures with camera-metaphor ones:
  // scrolling up zooms out (scrolling down zooms in) and dragging moves the
  // graph opposite the drag direction — the same convention as the keyboard
  // shortcuts (Alt+j/k/h/l pan, Alt+/- zoom).
  _bindCameraControls() {
    this._onWheel = (e) => {
      e.preventDefault()
      const raw = e.deltaY || 0
      if (raw === 0) return

      // Normalize to one "click" equivalent (120 units for a wheel mouse).
      // Cap at 3× to prevent flinging on high-resolution trackpads.
      const normalized = Math.sign(raw) * Math.min(Math.abs(raw) / 120, 3)
      const diff = normalized * 0.2  // ~37% zoom change per mouse click

      const rect = this.container ? this.container.getBoundingClientRect() : { left: 0, top: 0 }
      const pos  = { x: e.clientX - rect.left, y: e.clientY - rect.top }

      // Apply directly instead of animating: rapid scroll ticks would otherwise
      // interrupt each glide mid-flight, so only a fraction of each step lands.
      const level = Math.max(
        this.cy.minZoom(),
        Math.min(this.cy.maxZoom(), this.cy.zoom() * Math.pow(10, -diff))
      )
      this.cy.zoom({ level, renderedPosition: pos })
    }
    if (this.container) {
      this.container.addEventListener('wheel', this._onWheel, { passive: false })
    }

    // Trackpad pinch keeps the natural "spread to zoom in" direction
    this._gestureStartZoom = 1
    this._onGestureStart = () => { this._gestureStartZoom = this.cy.zoom() }
    this._onGestureChange = (e) => {
      if (!e.scale) return
      e.preventDefault()
      this.cy.zoom({ level: this._gestureStartZoom * e.scale })
    }
    if (this.container) {
      this.container.addEventListener('gesturestart', this._onGestureStart)
      this.container.addEventListener('gesturechange', this._onGestureChange)
    }


  }

  updateScene(graphModel, options = {}) {
    if (!this.cy) return

    if (options.pan)  { this._pan(options.pan);  return }
    if (options.zoom) { this._zoom(options.zoom); return }

    const animate = options.animate !== false

    // Diff against the current scene instead of tearing everything down, so
    // surviving nodes keep their identity and glide to the new layout.
    const nodeIds = new Set(graphModel.nodes().map(n => n.id()))
    const edgeIds = new Set(graphModel.edges().map(e => e.id()))
    this.cy.elements().forEach(ele => {
      const keep = ele.isNode() ? nodeIds.has(ele.id()) : edgeIds.has(ele.id())
      if (!keep) ele.remove()
    })

    // Remember where surviving nodes are, so the layout can animate from here.
    const prevPos = new Map()
    this.cy.nodes().forEach(n => prevPos.set(n.id(), { ...n.position() }))
    const seed = this._centroid(this.cy.nodes())

    this.cy.startBatch()

    const elements = []

    // Parent nodes must be added before children
    graphModel.nodes().filter(n => n.isParent()).forEach(node => {
      const d = { ...node.data(), id: node.id() }
      normalizeOptionalFields(d, NODE_OPTIONAL_FIELDS)
      delete d.parent
      elements.push({ group: 'nodes', data: d })
    })
    graphModel.nodes().filter(n => !n.isParent()).forEach(node => {
      const d = { ...node.data(), id: node.id() }
      normalizeOptionalFields(d, NODE_OPTIONAL_FIELDS)
      elements.push({ group: 'nodes', data: d })
    })
    graphModel.edges().forEach(edge => {
      const d = edge.data()
      const edgeData = { ...d, id: edge.id(), source: d.source, target: d.target }
      normalizeOptionalFields(edgeData, EDGE_OPTIONAL_FIELDS)
      elements.push({ group: 'edges', data: edgeData })
    })

    this.cy.add(elements)
    this.cy.endBatch()

    // Surviving elements keep their identity, so push the model's latest data
    // onto them (label/shape/style edits, parent changes) — otherwise diffs
    // would leave stale labels on renamed nodes.
    graphModel.nodes().forEach(node => {
      const ele = this.cy.getElementById(node.id())
      if (ele.empty()) return
      const d = { ...node.data() }
      normalizeOptionalFields(d, NODE_OPTIONAL_FIELDS)
      delete d.id
      if ((ele.data('parent') || null) !== (d.parent || null)) {
        ele.move({ parent: d.parent || null })
      }
      delete d.parent
      // Legacy "style: fill: …" drives fillColor (the [attr]-driven border/underlay
      // tint and the inline solid-fill override). Derive it fresh every pass so
      // clearing the style also clears a stale fillColor.
      const legacy = d.style && String(d.style).match(/\bfill\s*:\s*([^;]+)/i)
      d.fillColor = legacy ? legacy[1].trim() : null
      ele.data(d)
      // Custom fills (bgColor from the form, or legacy fillColor) are applied
      // inline — background-gradient-stop-colors does not take data() mappings.
      // A same-color gradient renders as a solid override of the theme.
      const fill = d.bgColor || d.fillColor
      if (fill) {
        ele.style({
          'background-color':                fill,
          'background-gradient-stop-colors': `${fill} ${fill}`,
        })
      } else {
        ele.removeStyle('background-color background-gradient-stop-colors')
      }
    })
    graphModel.edges().forEach(edge => {
      const ele = this.cy.getElementById(edge.id())
      if (ele.empty()) return
      const d = { ...edge.data() }
      normalizeOptionalFields(d, EDGE_OPTIONAL_FIELDS)
      delete d.id
      ele.data(d)
    })

    // New nodes start at the graph centroid so they glide in from the middle.
    this.cy.nodes().forEach(n => {
      if (!prevPos.has(n.id())) n.position(seed)
    })

    // Edit-only redraws refresh data/styles without re-running the layout, so
    // saving a label/color change does not set the whole graph gliding again.
    if (options.layout === false) {
      this._renderCrosshairs()
      this.emitter?.emit('scene-updated', {
        count: graphModel.nodes().length,
        nodes: graphModel.nodes().length,
        edges: graphModel.edges().length,
      })
      return
    }

    const animation = this._runLayout(options.colaOpts || {}, { prevPos, seed, animate })
    animation.then(() => this._renderCrosshairs())

    this.emitter?.emit('scene-updated', {
      count: graphModel.nodes().length,
      nodes: graphModel.nodes().length,
      edges: graphModel.edges().length,
    })
    return animation
  }

  _centroid(eles) {
    if (!eles.length) {
      if (this.cy) {
        const w = this.cy.width()
        const h = this.cy.height()
        if (w && h) {
          const pan  = this.cy.pan()
          const zoom = this.cy.zoom()
          return { x: (w / 2 - pan.x) / zoom, y: (h / 2 - pan.y) / zoom }
        }
      }
      return { x: 0, y: 0 }
    }
    const bb = eles.boundingBox()
    return { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 }
  }

  _runLayout(colaOpts = {}, { prevPos = new Map(), seed, animate = true } = {}) {
    const settings = readSettings()
    const layoutMode = settings.defaultLayoutMode || 'cola'

    if (layoutMode === 'cola') {
      this._computeColaLayout(colaOpts, settings)
    } else {
      this._computeBuiltinLayout(layoutMode)
    }

    this._resolveGroupOverlaps()
    this.cy.nodes().stop(true)

    if (!animate) {
      this._fitViewport()
      return Promise.resolve()
    }

    const fitTarget = this._computeFitTarget()

    // IMPORTANT: capture every `to` BEFORE rewinding any node — cytoscape moves
    // a compound parent's children when the parent's position is set, so
    // rewinding a parent first would corrupt its children's captured `to`.
    const targets = this.cy.nodes().map(node => ({
      node,
      to:   { ...node.position() },
      from: prevPos.get(node.id()) || seed || { x: 0, y: 0 },
    }))
    const anims = targets.map(({ node, to, from }) => {
      node.position(from)
      return node.animation({ position: to, duration: 650, easing: 'ease-out-cubic' }).play()
    })
    const done = Promise.all(anims.map(a => a.promise()))

    if (fitTarget) {
      this._glide(fitTarget, 500)
    } else {
      done.then(() => this._fitViewport())
    }

    return done
  }

  _computeColaLayout(colaOpts, settings) {
    const nodeSpacing   = Number(colaOpts.nodeSpacing        ?? settings.defaultColaNodeSpacing)        || 30
    const edgeLength    = Number(colaOpts.edgeLength         ?? settings.defaultColaEdgeLength)         || 120
    const avoidOverlaps = colaOpts.avoidOverlap !== false && settings.defaultColaAvoidOverlap !== false
    const flow          = colaOpts.flow ?? settings.defaultColaFlow ?? null
    const maxTime       = Number(colaOpts.maxSimulationTime  ?? settings.defaultColaMaxSimulationTime)  || 1500
    const gravity       = Number(colaOpts.gravity            ?? settings.defaultColaGravity)            || 0

    const opts = {
      name:               'cola',
      nodeSpacing,
      edgeLength,
      avoidOverlaps,
      handleDisconnected: true,
      animate:            false,
      infinite:           false,
      maxSimulationTime:  maxTime,
      fit:                false,
      padding:            60,
    }
    if (flow)    opts.flow    = { axis: flow, minSeparation: nodeSpacing }
    if (gravity) opts.gravity = gravity

    // cytoscape-cola runs out of memory when compound (parent) nodes are
    // included in the layout, even on tiny graphs. Lay out only leaf nodes,
    // then center each parent on the centroid of its children.
    const childless = this.cy.nodes(':childless')
    if (childless.length) childless.layout(opts).run()

    this.cy.nodes(':parent').forEach(parent => {
      const children = parent.children()
      if (!children.length) return
      const p0  = { ...parent.position() }
      const sum = children.reduce((acc, node) => {
        const p = node.position()
        acc.x += p.x
        acc.y += p.y
        return acc
      }, { x: 0, y: 0 })
      const centroid = { x: sum.x / children.length, y: sum.y / children.length }
      parent.position(centroid)
      const delta = { x: centroid.x - p0.x, y: centroid.y - p0.y }
      children.forEach(child => {
        const p = child.position()
        child.position({ x: p.x - delta.x, y: p.y - delta.y })
      })
    })
  }

  _computeBuiltinLayout(name) {
    const s    = readSettings()
    const opts = { name, fit: false, padding: 60, animate: false }

    if (name === 'cose') {
      const repulsion = Number(s.defaultCoseNodeRepulsion)    || 400000
      const edgeLen   = Number(s.defaultCoseIdealEdgeLength)  || 100
      opts.nodeRepulsion   = () => repulsion
      opts.idealEdgeLength = () => edgeLen
      opts.gravity         = Number(s.defaultCoseGravity)     ?? 1
      opts.nodeOverlap     = Number(s.defaultCoseNodeOverlap) || 4
    } else if (name === 'breadthfirst') {
      opts.directed      = s.defaultBreadthfirstDirected !== false
      opts.circle        = Boolean(s.defaultBreadthfirstCircle)
      opts.spacingFactor = Number(s.defaultBreadthfirstSpacingFactor) || 1.5
    } else if (name === 'grid') {
      opts.spacingFactor = Number(s.defaultGridSpacingFactor) || 1.5
      opts.avoidOverlap  = s.defaultGridAvoidOverlap !== false
      if (s.defaultGridRows != null) opts.rows = Number(s.defaultGridRows)
      if (s.defaultGridCols != null) opts.cols = Number(s.defaultGridCols)
    } else if (name === 'circle') {
      opts.spacingFactor = Number(s.defaultCircleSpacingFactor) || 1.0
      opts.clockwise     = s.defaultCircleClockwise !== false
    } else if (name === 'concentric') {
      opts.spacingFactor  = Number(s.defaultConcentricSpacingFactor)  || 1.5
      opts.minNodeSpacing = Number(s.defaultConcentricMinNodeSpacing) || 30
      opts.clockwise      = s.defaultConcentricClockwise !== false
      opts.equidistant    = Boolean(s.defaultConcentricEquidistant)
    } else if (name === 'dagre') {
      opts.rankDir = s.defaultDagreRankDir  || 'TB'
      opts.nodeSep = Number(s.defaultDagreNodeSep) || 50
      opts.rankSep = Number(s.defaultDagreRankSep) || 50
      opts.edgeSep = Number(s.defaultDagreEdgeSep) || 10
      opts.ranker  = s.defaultDagreRanker   || 'network-simplex'
    }

    this.cy.layout(opts).run()
  }

  // Viewport to fit the freshly laid-out graph, honoring the "fit on open"
  // setting and the default zoom multiplier. Based on the nodes' positions at
  // the time it is called.
  _computeFitTarget() {
    const settings = readSettings()
    if (!this.cy) return null
    if (this.container) this.cy.resize()

    // During early mount the container is often still 0×0; deferring is the
    // caller's job (it falls back to the deferred _fitViewport).
    if (!this.cy.width() || !this.cy.height()) return null

    const level = Number(settings.defaultZoomLevel)
    const lvl = Number.isFinite(level) && level > 0 ? level : 1

    if (settings.defaultZoomFit === false) {
      const bb = this.cy.nodes().boundingBox()
      const center = { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 }
      const vp = { x: this.cy.width() / 2, y: this.cy.height() / 2 }
      return { zoom: lvl, pan: { x: vp.x - center.x * lvl, y: vp.y - center.y * lvl } }
    }

    const fit = this.cy.getFitViewport(undefined, this._fitPadding())
    if (!fit) return null
    let { zoom, pan } = fit
    if (lvl !== 1) {
      const z1 = zoom * lvl
      const c = { x: this.cy.width() / 2, y: this.cy.height() / 2 }
      pan = {
        x: c.x - (c.x - pan.x) * (z1 / zoom),
        y: c.y - (c.y - pan.y) * (z1 / zoom),
      }
      zoom = z1
    }
    return { zoom, pan }
  }

  // For each parent box, pushes any node that is not one of its descendants
  // back out to the nearest edge. Repeated passes let pushes settle without
  // re-introducing overlaps.
  _resolveGroupOverlaps() {
    const parents = this.cy.nodes(':parent')
    if (!parents.length) return

    for (let pass = 0; pass < 20; pass++) {
      let moved = false
      parents.forEach(parent => {
        const pbox = parent.boundingBox()
        this.cy.nodes().forEach(node => {
          if (node === parent || node.ancestors().contains(parent)) return
          const delta = resolveBoxOverlap(node.boundingBox(), pbox)
          if (delta.x !== 0 || delta.y !== 0) {
            const p = node.position()
            node.position({ x: p.x + delta.x, y: p.y + delta.y })
            moved = true
          }
        })
      })
      if (!moved) break
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  // Applies the renderer-related settings cookie (edge style/width/opacity,
  // arrow scale) plus the current theme palette to the live cytoscape instance.
  _applySettings() {
    const settings = readSettings()
    this.cy.style(themeStyle(this._palette || DEFAULT_PALETTE, settings))
  }

  // Fit padding in px — the settings cookie uses zoomFitFactor for this.
  _fitPadding() {
    const settings = readSettings()
    return Number(settings.zoomFitFactor) || 60
  }

  // Sets the viewport after a rebuild. Cytoscape records the container size it
  // had at init() — which is often 0x0 during Vue mount — so this is deferred a
  // frame (with a retry if the container is still unsized). With "fit on open"
  // enabled the graph is fitted, then the configured default zoom level is
  // applied as a multiplier (1 = just the fit, 2 = twice as close, 0.5 = half).
  // With it disabled the zoom level is applied as an absolute value.
  _fitViewport() {
    const settings = readSettings()

    const apply = () => {
      if (!this.cy) return
      if (this.container) this.cy.resize()
      const level = Number(settings.defaultZoomLevel)
      const lvl = Number.isFinite(level) && level > 0 ? level : 1
      if (settings.defaultZoomFit === false) {
        this.cy.zoom(lvl)
        this.cy.center()
      } else {
        this.cy.fit(undefined, this._fitPadding())
        if (lvl !== 1) {
          this.cy.zoom({
            level:            this.cy.zoom() * lvl,
            renderedPosition: { x: this.cy.width() / 2, y: this.cy.height() / 2 },
          })
        }
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const unsized = this.container && this.cy &&
          (this.cy.width() === 0 || this.cy.height() === 0)
        if (unsized) requestAnimationFrame(apply)
        else apply()
      })
    } else {
      apply()
    }
  }

  // ─── Selection (keyboard j/k navigation + Enter toggles) ─────────────────────
  // Cytoscape draws the focused border; an HTML overlay draws crosshair reticles
  // on the focused and Enter-selected nodes.

  setFocusedNode(id) {
    this._focusedNodeId = id || null
    this._renderCrosshairs()
  }

  setSelectedNodes(ids = [], doubleIds = []) {
    this._selectedNodeIds   = ids
    this._doubleSelectedIds = doubleIds
    this._renderCrosshairs()
  }

  clearSelectionCrosshairs() {
    this._focusedNodeId = null
    this._selectedNodeIds   = []
    this._doubleSelectedIds = []
    this._renderCrosshairs()
  }

  selectNode(id) {
    this.cy?.elements()?.removeClass('focused')
    this.cy?.getElementById(id).addClass('focused')
    this.setFocusedNode(id)
  }

  deselectNode(id) {
    this.cy?.getElementById(id).removeClass('focused active_node d_active_node')
    if (this._focusedNodeId === id) this.setFocusedNode(null)
  }

  selectEdge(id) {
    this.cy?.getElementById(id).addClass('focused')
  }

  deselectEdge(id) {
    this.cy?.getElementById(id).removeClass('focused')
  }

  // Returns the id of the element (node or edge) nearest to `fromId` in the
  // given screen direction, or null when the graph has no other element.
  nearestElementId({ direction, fromId, kind }) {
    if (!this.cy) return null
    return nearestInDirection(this.cy, fromId, direction, kind)
  }

  // Selection crosshair overlay (sits below the hint badges, above the canvas)
  _getSelectionLayer() {
    if (!this.container || typeof document === 'undefined') return null
    if (this._selectionLayer && this._selectionLayer.isConnected) return this._selectionLayer
    this._selectionLayer = document.createElement('div')
    this._selectionLayer.className = 'cytoscape-selection-layer'
    Object.assign(this._selectionLayer.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      'pointer-events': 'none',
      'z-index': '5',
    })
    this.container.appendChild(this._selectionLayer)
    return this._selectionLayer
  }

  // Anchors the crosshair at the node centre and exposes the rendered
  // half-extents as CSS vars so the frame can wrap around the node box.
  _applyCrosshairPosition(el, node) {
    const bb = node.renderedBoundingBox()
    el.style.transform = hintTransform((bb.x1 + bb.x2) / 2, (bb.y1 + bb.y2) / 2)
    el.style.setProperty('--w', `${(bb.x2 - bb.x1) / 2}px`)
    el.style.setProperty('--h', `${(bb.y2 - bb.y1) / 2}px`)
  }

  _appendCrosshair(layer, node, kind) {
    const el = document.createElement('div')
    el.className = 'cytoscape-crosshair'
    el.dataset.nodeId = node.id()
    el.dataset.kind = kind
    el.innerHTML = [
      '<span class="crosshair-bracket tl"></span>',
      '<span class="crosshair-bracket tr"></span>',
      '<span class="crosshair-bracket bl"></span>',
      '<span class="crosshair-bracket br"></span>',
    ].join('')
    this._applyCrosshairPosition(el, node)
    layer.appendChild(el)
  }

  _renderCrosshairs() {
    const layer = this._getSelectionLayer()
    if (!layer || !this.cy) return
    layer.replaceChildren()
    if (this._focusedNodeId) {
      const node = this.cy.getElementById(this._focusedNodeId)
      if (!node.empty()) this._appendCrosshair(layer, node, 'focus')
    }
    const rendered = new Set()
    ;(this._selectedNodeIds || []).forEach(id => {
      const node = this.cy.getElementById(id)
      if (node.empty()) return
      const kind = (this._doubleSelectedIds || []).includes(id) ? 'double' : 'selected'
      this._appendCrosshair(layer, node, kind)
      rendered.add(id)
    })
    ;(this._doubleSelectedIds || []).forEach(id => {
      if (rendered.has(id)) return
      const node = this.cy.getElementById(id)
      if (node.empty()) return
      this._appendCrosshair(layer, node, 'double')
    })
  }

  _updateCrosshairs() {
    const layer = this._getSelectionLayer()
    if (!layer || !this.cy) return
    layer.querySelectorAll('.cytoscape-crosshair').forEach(el => {
      const node = this.cy.getElementById(el.dataset.nodeId)
      if (node.empty()) { el.remove(); return }
      this._applyCrosshairPosition(el, node)
    })
  }

  // ─── DOM element access (hints system) ────────────────────────────────────────

  // Cytoscape renders to canvas, so there are no per-node DOM elements. The
  // hints system still expects node DOM elements, so provide lightweight anchor
  // divs in an overlay layer, positioned over each node's rendered position.
  // The badges appended to them by the hints code then float above the canvas.
  getNodeElement(id) {
    if (!this.cy) return null
    const node = this.cy.getElementById(id)
    if (node.empty()) return null
    this._clearHintsLayer()
    return this._positionHintAnchor(node)
  }

  getAllNodeElements() {
    if (!this.cy) return []
    this._clearHintsLayer()
    return this.cy.nodes()
      .map(node => this._positionHintAnchor(node))
      .filter(Boolean)
  }

  // Overlay layer that holds the hint anchors, positioned above the canvas
  _getHintsLayer() {
    if (!this.container || typeof document === 'undefined') return null
    if (this._hintsLayer && this._hintsLayer.isConnected) return this._hintsLayer
    this._hintsLayer = document.createElement('div')
    this._hintsLayer.className = 'cytoscape-hints-layer'
    Object.assign(this._hintsLayer.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      'pointer-events': 'none',
      'z-index': '10',
    })
    this.container.appendChild(this._hintsLayer)
    return this._hintsLayer
  }

  _clearHintsLayer() {
    if (this._hintsLayer) this._hintsLayer.replaceChildren()
  }

  _positionHintAnchor(node) {
    const layer = this._getHintsLayer()
    if (!layer) return null
    const anchor = document.createElement('div')
    anchor.className = 'cytoscape-hint-anchor'
    anchor.dataset.nodeId = node.id()
    anchor.dataset.type = 'node'
    const bb = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false })
    const cx = (bb.x1 + bb.x2) / 2
    const cy = (bb.y1 + bb.y2) / 2
    anchor.style.transform = hintTransform(cx, cy)
    anchor.style.setProperty('--w', `${(bb.x2 - bb.x1) / 2}px`)
    anchor.style.setProperty('--h', `${(bb.y2 - bb.y1) / 2}px`)
    layer.appendChild(anchor)
    return anchor
  }

  _edgeRenderedMidpoint(edge) {
    const s = edge.source()
    const t = edge.target()
    if (!s || s.empty() || !t || t.empty()) return null
    const sp = s.renderedPosition()
    const tp = t.renderedPosition()
    if (!sp || !tp) return null
    return { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 }
  }

  _positionEdgeHintAnchor(edge) {
    const layer = this._getHintsLayer()
    if (!layer) return null
    const pos = this._edgeRenderedMidpoint(edge)
    if (!pos) return null
    const anchor = document.createElement('div')
    anchor.className = 'cytoscape-hint-anchor'
    anchor.dataset.edgeId = edge.id()
    anchor.dataset.type = 'edge'
    anchor.style.transform = hintTransform(pos.x, pos.y)
    layer.appendChild(anchor)
    return anchor
  }

  getAllEdgeElements() {
    if (!this.cy) return []
    this._clearHintsLayer()
    return this.cy.edges()
      .map(edge => this._positionEdgeHintAnchor(edge))
      .filter(Boolean)
  }

  _updateHintAnchors() {
    if (!this._hintsLayer || !this.cy) return
    this._hintsLayer.querySelectorAll('.cytoscape-hint-anchor').forEach(anchor => {
      if (anchor.dataset.type === 'edge') {
        const edge = this.cy.getElementById(anchor.dataset.edgeId)
        if (edge.empty()) { anchor.remove(); return }
        const pos = this._edgeRenderedMidpoint(edge)
        if (pos) anchor.style.transform = hintTransform(pos.x, pos.y)
      } else {
        const node = this.cy.getElementById(anchor.dataset.nodeId)
        if (node.empty()) { anchor.remove(); return }
        const bb = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false })
        anchor.style.transform = hintTransform((bb.x1 + bb.x2) / 2, (bb.y1 + bb.y2) / 2)
        anchor.style.setProperty('--w', `${(bb.x2 - bb.x1) / 2}px`)
        anchor.style.setProperty('--h', `${(bb.y2 - bb.y1) / 2}px`)
      }
    })
  }

  // ─── Camera controls ──────────────────────────────────────────────────────────

  zoomTo(id) {
    if (!id || !this.cy) return
    const ele = this.cy.getElementById(id)
    if (ele.empty()) return
    this.cy.animate({ center: { eles: ele } }, { duration: 350 })
  }

  zoomOut() {
    if (!this.cy) return
    this._glide({ fit: { padding: this._fitPadding() } }, 350)
  }

  resetCamera() {
    if (!this.cy) return
    this._glide({ fit: { padding: this._fitPadding() } }, 400)
  }

  _pan(direction) {
    if (!this.cy) return
    const delta = 100
    const deltas = {
      // Vim-style: j/k/h/l move the drawing down/up/left/right with the key.
      Up:    { x: 0,      y: -delta },
      Down:  { x: 0,      y:  delta },
      Left:  { x: -delta, y: 0 },
      Right: { x:  delta, y: 0 },
    }
    const by = deltas[direction]
    if (!by) return
    const pan = this.cy.pan()
    return this._glide({ pan: { x: pan.x + by.x, y: pan.y + by.y } }, 220)
  }

  _zoom(direction) {
    if (!this.cy) return
    const factor = direction === 'In' ? 1.3 : 0.77
    const cx = this.cy.width()  / 2
    const cy = this.cy.height() / 2
    return this._glide({ zoom: { level: this.cy.zoom() * factor, renderedPosition: { x: cx, y: cy } } }, 220)
  }

  // Eased viewport movement. Interrupts any in-flight glide so rapid inputs
  // retarget instead of stacking: `queue: false` alone does NOT stop the
  // previous animation — cytoscape keeps every non-queued animation in the
  // core's `current` list and steps them ALL each frame, so rapid inputs would
  // stack concurrent viewport animations that fight over zoom/pan. Exposes the
  // completion promise (on `_lastGlide`) so callers/tests can await the end
  // state; an interrupted glide settles its promise immediately.
  _glide(viewportProps, duration = 200, easing = 'ease-out-cubic') {
    if (!this.cy) return Promise.resolve()

    if (this._lastGlide) {
      // Stopped animations never fire their complete callbacks, so settle the
      // old promise manually (the old `cy.stop()` would otherwise leave any
      // await on `_lastGlide` hanging).
      this.cy.stop(true)
      this._resolveLastGlide?.()
      this._resolveLastGlide = null
    }

    let resolve
    const promise = new Promise(r => { resolve = r })
    this._resolveLastGlide = resolve
    const anim = this.cy.animation({ ...viewportProps, duration, easing })
    anim.promise('complete').then(() => {
      if (this._resolveLastGlide === resolve) {
        this._resolveLastGlide = null
        this._lastGlide = null
      }
      resolve()
    })
    anim.play()
    this._lastGlide = promise
    return promise
  }

  // ─── Theme ────────────────────────────────────────────────────────────────────
  // Reads the app's --fx-* CSS variables (theme-driven) and re-themes cytoscape.
  // Guarded so headless (no-document) environments keep the default palette.

  _applyTheme() {
    if (typeof document === 'undefined') {
      this._palette = DEFAULT_PALETTE
    } else {
      this._palette = paletteFromCSSVars(
        key => getComputedStyle(document.documentElement).getPropertyValue(key)
      )
    }
    this._applySettings()
  }

  // ─── Compat stubs (3-D mode removed) ─────────────────────────────────────────

  enable3D()               {}
  enable2D()               {}
  transitionToPositions()  {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  teardown() {
    this.container?.removeEventListener('wheel', this._onWheel)
    this.container?.removeEventListener('gesturestart', this._onGestureStart)
    this.container?.removeEventListener('gesturechange', this._onGestureChange)

    this._hintsLayer?.remove()
    this._hintsLayer = null
    this._selectionLayer?.remove()
    this._selectionLayer = null
    this.emitter?.off('themeChanged', this._onThemeChangedBound)
    this.cy?.destroy()
    this.cy = null
  }
}
