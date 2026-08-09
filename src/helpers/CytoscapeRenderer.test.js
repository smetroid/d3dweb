import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer.js'
import {
  DEFAULT_PALETTE,
  edgeStyleFrom,
  resolveBoxOverlap,
  hintTransform,
  paletteFromCSSVars,
  themeStyle,
} from '@/helpers/CytoscapeRenderer.js'
import GraphModel from '@/helpers/GraphModel.js'

describe('CytoscapeRenderer', () => {
  let renderer

  beforeAll(() => {
    const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() }
    renderer = new CytoscapeRenderer(undefined, emitter)
    renderer.init()
  })

  afterAll(() => {
    renderer.teardown()
  })

  it('adds nodes and edges from the graph model', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
      { group: 'nodes', data: { id: 'b', label: 'B' } },
      { group: 'edges', data: { id: 'ab', source: 'a', target: 'b' } },
    ])

    renderer.updateScene(model)
    expect(renderer.cy.nodes().length).toBe(2)
    expect(renderer.cy.edges().length).toBe(1)
  })

  it('updates surviving node data without rebuilding the scene', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
    ])
    await renderer.updateScene(model)
    model.getElementById('a').data({ label: 'Renamed' })
    await renderer.updateScene(model)
    expect(renderer.cy.getElementById('a').data('label')).toBe('Renamed')
    expect(renderer.cy.nodes().length).toBe(1)
  })

  it('syncs per-element style data and applies the data-driven styles', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'st', label: 'S', nodeShape: 'diamond', bgColor: '#ff0000', borderWidth: 3 } },
      { group: 'nodes', data: { id: 'st2', label: 'T' } },
      { group: 'edges', data: { id: 'ste', source: 'st', target: 'st2', edgeWidth: 5, edgeColor: '#00ff00', edgeCurve: 'straight' } },
    ])
    await renderer.updateScene(model)

    const node = renderer.cy.getElementById('st')
    expect(node.data('nodeShape')).toBe('diamond')
    expect(node.data('bgColor')).toBe('#ff0000')
    expect(node.data('borderWidth')).toBe(3)
    expect(renderer.cy.getElementById('ste').data('edgeWidth')).toBe(5)
    expect(renderer.cy.getElementById('ste').data('edgeColor')).toBe('#00ff00')

    expect(node.style('shape')).toBe('diamond')
    expect(node.style('background-color')).toBe('rgb(255,0,0)')
    expect(node.style('border-width')).toBe('3px')
    expect(renderer.cy.getElementById('ste').style('curve-style')).toBe('straight')

    // A rebuilt scene keeps the latest data
    model.getElementById('st').data({ bgColor: '#0000ff' })
    await renderer.updateScene(model)
    expect(renderer.cy.getElementById('st').data('bgColor')).toBe('#0000ff')
    expect(renderer.cy.getElementById('st').style('background-color')).toBe('rgb(0,0,255)')
  })

  it('never lets empty optional styling fields reach cytoscape', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
      { group: 'nodes', data: { id: 'b', label: 'B' } },
      { group: 'edges', data: { id: 'ab', source: 'a', target: 'b' } },
    ])

    // Inject empty values bypassing _addElement to exercise the renderer guard
    model._nodes[0].data.bgColor = ''
    model._nodes[0].data.borderWidth = null
    model._edges[0].data.edgeColor = ''
    model._edges[0].data.sourceArrowhead = ''
    model._edges[0].data.edgeWidth = null

    await renderer.updateScene(model)

    expect(renderer.cy.getElementById('a').data('bgColor')).toBeUndefined()
    expect(renderer.cy.getElementById('a').data('borderWidth')).toBeUndefined()
    expect(renderer.cy.getElementById('ab').data('edgeColor')).toBeUndefined()
    expect(renderer.cy.getElementById('ab').data('sourceArrowhead')).toBeUndefined()
    expect(renderer.cy.getElementById('ab').data('edgeWidth')).toBeUndefined()
  })

  it('derives legacy "style: fill: …" into fillColor and applies it inline', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'leg', label: 'Old', style: 'fill: #5f9488' } },
    ])
    await renderer.updateScene(model)

    const node = renderer.cy.getElementById('leg')
    expect(node.data('fillColor')).toBe('#5f9488')
    expect(node.style('background-color')).toBe('rgb(95,148,136)')
    expect(node.style('border-color')).toBe('rgb(95,148,136)')

    // Clearing the legacy style restores the theme fill
    model.getElementById('leg').data({ style: undefined })
    await renderer.updateScene(model)
    expect(renderer.cy.getElementById('leg').data('fillColor')).toBeNull()
  })

  it('lays out nodes instead of leaving them stacked at the origin', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'x1', label: 'X1' } },
      { group: 'nodes', data: { id: 'x2', label: 'X2' } },
      { group: 'edges', data: { id: 'x1x2', source: 'x1', target: 'x2' } },
    ])

    await renderer.updateScene(model)

    const positions = renderer.cy.nodes().map(n => n.position())
    const spreadX = Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x))
    const spreadY = Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y))
    expect(spreadX + spreadY).toBeGreaterThan(0)
  })

  it('handles compound (parent) graphs without failing and centers parents on their children', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'first', label: 'first node' } },
      { group: 'nodes', data: { id: 'n1', label: 'Node', parent: 'first' } },
      { group: 'nodes', data: { id: 'n2', label: 'Node', parent: 'first' } },
      { group: 'nodes', data: { id: 'n3', label: 'Node' } },
      { group: 'nodes', data: { id: 'n4', label: 'Node' } },
      { group: 'edges', data: { id: 'e1', source: 'n1', target: 'n2' } },
      { group: 'edges', data: { id: 'e2', source: 'n1', target: 'n3' } },
      { group: 'edges', data: { id: 'e3', source: 'n3', target: 'n4' } },
    ])

    await renderer.updateScene(model)

    const kids  = renderer.cy.getElementById('n1').position()
    const n2    = renderer.cy.getElementById('n2').position()
    const parent = renderer.cy.getElementById('first').position()
    const expectedX = (kids.x + n2.x) / 2
    const expectedY = (kids.y + n2.y) / 2
    expect(Math.abs(parent.x - expectedX)).toBeLessThan(0.01)
    expect(Math.abs(parent.y - expectedY)).toBeLessThan(0.01)
  })



  it('does not rebuild on pan/zoom options', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'z', label: 'Z' } },
    ])
    renderer.updateScene(model)
    renderer.updateScene(model, { pan: 'Left' })
    renderer.updateScene(model, { zoom: 'In' })
    expect(renderer.cy.nodes().length).toBe(1)
  })

  it('skips the layout on layout:false so edit saves keep node positions', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'a', label: 'A' } },
      { group: 'nodes', data: { id: 'b', label: 'B' } },
    ])
    await renderer.updateScene(model)
    const posA = renderer.cy.getElementById('a').position()

    const runLayoutSpy = vi.spyOn(renderer, '_runLayout')
    model.getElementById('a').data({ label: 'A2' })
    renderer.updateScene(model, { layout: false })

    expect(runLayoutSpy).not.toHaveBeenCalled()
    expect(renderer.cy.getElementById('a').data('label')).toBe('A2')
    expect(renderer.cy.getElementById('a').position()).toEqual(posA)
    runLayoutSpy.mockRestore()
  })

  it('fits the viewport after a rebuild (gliding with the layout)', async () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'fit1', label: 'Fit' } },
    ])
    await renderer.updateScene(model)
    const target = renderer._computeFitTarget()
    expect(target).not.toBeNull()
    expect(renderer.cy.zoom()).toBeCloseTo(target.zoom, 2)
    expect(renderer.cy.pan().x).toBeCloseTo(target.pan.x, 2)
    expect(renderer.cy.pan().y).toBeCloseTo(target.pan.y, 2)
  })

  it('applies the default zoom level on open when fit-on-open is disabled', async () => {
    const nextFrame = () => new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve)
      else resolve()
    })
    // Drain any deferred fits still pending from earlier tests in this file
    for (let i = 0; i < 6; i++) await nextFrame()

    const VueCookies = (await import('vue-cookies')).default
    const spy = vi.spyOn(VueCookies, 'get').mockReturnValue({
      defaultZoomFit: false,
      defaultZoomLevel: 2,
    })
    await renderer.updateScene(new GraphModel([
      { group: 'nodes', data: { id: 'zl', label: 'Z' } },
    ]))
    for (let i = 0; i < 3; i++) await nextFrame()
    expect(renderer.cy.zoom()).toBe(2)
    spy.mockRestore()
  })

  it('zooms about the viewport centre when applying a zoom-level multiplier', async () => {
    const VueCookies = (await import('vue-cookies')).default
    const spy = vi.spyOn(VueCookies, 'get').mockReturnValue({
      defaultZoomFit: true,
      defaultZoomLevel: 2,
    })
    const widthSpy = vi.spyOn(renderer.cy, 'width').mockReturnValue(800)
    const heightSpy = vi.spyOn(renderer.cy, 'height').mockReturnValue(600)

    await renderer.updateScene(new GraphModel([
      { group: 'nodes', data: { id: 'zc', label: 'Z' } },
    ]))
    renderer.cy.stop()

    const c = { x: 400, y: 300 }
    const base = renderer.cy.getFitViewport(undefined, renderer._fitPadding())
    const baseCentre = { x: (c.x - base.pan.x) / base.zoom, y: (c.y - base.pan.y) / base.zoom }
    const target = renderer._computeFitTarget()
    expect(target).not.toBeNull()
    expect(target.zoom).toBeCloseTo(base.zoom * 2, 3)
    // The model point under the viewport centre must be unchanged.
    const centre = { x: (c.x - target.pan.x) / target.zoom, y: (c.y - target.pan.y) / target.zoom }
    expect(centre.x).toBeCloseTo(baseCentre.x, 3)
    expect(centre.y).toBeCloseTo(baseCentre.y, 3)

    spy.mockRestore()
    widthSpy.mockRestore()
    heightSpy.mockRestore()
  })

  it('pushes non-member nodes out of a parent box after layout', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'P', label: 'Group' } },
      { group: 'nodes', data: { id: 'A', label: 'A', parent: 'P' } },
      { group: 'nodes', data: { id: 'B', label: 'B', parent: 'P' } },
      { group: 'nodes', data: { id: 'C', label: 'C' } },
    ])
    renderer.updateScene(model)

    // Force an unrelated node directly on top of the parent, then resolve.
    renderer.cy.getElementById('P').position({ x: 0, y: 0 })
    renderer.cy.getElementById('C').position({ x: 0, y: 0 })
    renderer._resolveGroupOverlaps()

    const cb = renderer.cy.getElementById('C').boundingBox()
    const pb = renderer.cy.getElementById('P').boundingBox()
    const overlap = !(cb.x1 > pb.x2 || cb.x2 < pb.x1 || cb.y1 > pb.y2 || cb.y2 < pb.y1)
    expect(overlap).toBe(false)
  })

  it('returns no DOM hint elements in headless mode (no container, no document)', () => {
    expect(renderer.getNodeElement('a')).toBeNull()
    expect(renderer.getAllNodeElements()).toEqual([])
  })

  it('tracks the focused node and keeps the cytoscape focused class in sync', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'f1', label: 'F' } },
      { group: 'nodes', data: { id: 'f2', label: 'G' } },
    ])
    renderer.updateScene(model)

    renderer.selectNode('f1')
    expect(renderer.cy.getElementById('f1').hasClass('focused')).toBe(true)
    expect(renderer._focusedNodeId).toBe('f1')

    renderer.selectNode('f2')
    expect(renderer.cy.getElementById('f1').hasClass('focused')).toBe(false)
    expect(renderer.cy.getElementById('f2').hasClass('focused')).toBe(true)
    expect(renderer._focusedNodeId).toBe('f2')

    renderer.deselectNode('f2')
    expect(renderer.cy.getElementById('f2').hasClass('focused')).toBe(false)
    expect(renderer._focusedNodeId).toBeNull()
  })

  it('stores selected/double-selected node ids for the crosshair overlay', () => {
    const model = new GraphModel([
      { group: 'nodes', data: { id: 's1', label: 'S' } },
      { group: 'nodes', data: { id: 's2', label: 'T' } },
    ])
    renderer.updateScene(model)

    renderer.setSelectedNodes(['s1'], ['s2'])
    expect(renderer._selectedNodeIds).toEqual(['s1'])
    expect(renderer._doubleSelectedIds).toEqual(['s2'])

    renderer.clearSelectionCrosshairs()
    expect(renderer._selectedNodeIds).toEqual([])
    expect(renderer._doubleSelectedIds).toEqual([])
  })

  it('zooms in on wheel-up and out on wheel-down', () => {
    renderer.cy.zoom(1)
    const before = renderer.cy.zoom()
    renderer._onWheel({ deltaY: -100, clientX: 50, clientY: 50, preventDefault: vi.fn() })
    expect(renderer.cy.zoom()).toBeGreaterThan(before)

    const mid = renderer.cy.zoom()
    renderer._onWheel({ deltaY: 100, clientX: 50, clientY: 50, preventDefault: vi.fn() })
    expect(renderer.cy.zoom()).toBeLessThan(mid)
  })

  it('produces ~37% zoom change per standard mouse wheel click (deltaY=120)', () => {
    renderer.cy.zoom(1)

    renderer._onWheel({ deltaY: 120, clientX: 50, clientY: 50, preventDefault: vi.fn() })
    const zoomed = renderer.cy.zoom()
    // normalized=1, diff=0.2, factor=10^(-0.2)≈0.631 — a responsive ~37% step.
    expect(zoomed).toBeLessThan(0.7)
    expect(zoomed).toBeGreaterThan(0.55)
  })

  it('leaves native panning enabled so cytoscape handles drag-to-pan', () => {
    expect(renderer.cy.userPanningEnabled()).toBe(true)
  })

  it('pans with vim-style directions for the hjkl shortcuts', async () => {
    renderer.cy.stop()
    renderer.cy.pan({ x: 0, y: 0 })
    await renderer._pan('Left')
    expect(renderer.cy.pan().x).toBeCloseTo(-100, 0)
    await renderer._pan('Right')
    expect(renderer.cy.pan().x).toBeCloseTo(0, 0)
    await renderer._pan('Up')
    expect(renderer.cy.pan().y).toBeCloseTo(-100, 0)
    await renderer._pan('Down')
    expect(renderer.cy.pan().y).toBeCloseTo(0, 0)
  })

  it('interrupts an in-flight glide so rapid inputs retarget instead of stacking', async () => {
    renderer.cy.stop()
    renderer.cy.pan({ x: 0, y: 0 })
    renderer.cy.zoom(1)

    // A slow glide is mid-flight when a fast one starts (like successive wheel
    // events). Without true interruption both would run concurrently and fight
    // over the viewport, leaving the pan somewhere between the two targets.
    const slow = renderer._glide({ pan: { x: 500, y: 0 } }, 5000)
    const fast = renderer._glide({ pan: { x: -100, y: 0 } }, 100)
    await fast
    expect(renderer.cy.pan().x).toBeCloseTo(-100, 0)

    // The interrupted glide settles its promise instead of hanging forever.
    await slow
    expect(renderer.cy.pan().x).toBeCloseTo(-100, 0)
  })

  it('leaves zoom disabled so only custom wheel handler zooms', () => {
    expect(renderer.cy.userZoomingEnabled()).toBe(false)
  })

  it('uses opts.layoutMode over the settings cookie layout', async () => {
    const VueCookies = (await import('vue-cookies')).default
    const spy = vi.spyOn(VueCookies, 'get').mockReturnValue({ defaultLayoutMode: 'cola' })
    const computeSpy = vi.spyOn(renderer, '_computeBuiltinLayout')

    const model = new GraphModel([
      { group: 'nodes', data: { id: 'lm1', label: 'A' } },
      { group: 'nodes', data: { id: 'lm2', label: 'B' } },
    ])
    await renderer.updateScene(model, { layoutMode: 'grid' })

    expect(computeSpy).toHaveBeenCalledWith('grid', expect.anything())
    spy.mockRestore()
    computeSpy.mockRestore()
  })

  it('falls back to settings.defaultLayoutMode when opts.layoutMode is absent', async () => {
    const VueCookies = (await import('vue-cookies')).default
    const spy = vi.spyOn(VueCookies, 'get').mockReturnValue({ defaultLayoutMode: 'circle' })
    const computeSpy = vi.spyOn(renderer, '_computeBuiltinLayout')

    const model = new GraphModel([
      { group: 'nodes', data: { id: 'fb1', label: 'A' } },
    ])
    await renderer.updateScene(model, {})

    expect(computeSpy).toHaveBeenCalledWith('circle', expect.anything())
    spy.mockRestore()
    computeSpy.mockRestore()
  })
})

describe('_computeBuiltinLayout per-layout opts', () => {
  let cr

  beforeAll(() => {
    const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() }
    cr = new CytoscapeRenderer(undefined, emitter)
    cr.init()
  })

  afterAll(() => {
    cr.teardown()
  })

  it('applies coseOpts to the cose layout', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('cose', { coseOpts: { nodeRepulsion: 500000, idealEdgeLength: 200 } })
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('cose')
    expect(opts.nodeRepulsion()).toBe(500000)
    expect(opts.idealEdgeLength()).toBe(200)
    spy.mockRestore()
  })

  it('applies dagreOpts to the dagre layout', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('dagre', { dagreOpts: { rankDir: 'LR', nodeSep: 80, rankSep: 100, edgeSep: 20, ranker: 'tight-tree' } })
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('dagre')
    expect(opts.rankDir).toBe('LR')
    expect(opts.nodeSep).toBe(80)
    expect(opts.rankSep).toBe(100)
    expect(opts.ranker).toBe('tight-tree')
    spy.mockRestore()
  })

  it('applies gridOpts rows/cols/spacingFactor/avoidOverlap to the grid layout', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('grid', { gridOpts: { rows: 3, cols: 4, spacingFactor: 2.0, avoidOverlap: false } })
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('grid')
    expect(opts.rows).toBe(3)
    expect(opts.cols).toBe(4)
    expect(opts.spacingFactor).toBe(2.0)
    expect(opts.avoidOverlap).toBe(false)
    spy.mockRestore()
  })

  it('applies breadthfirstOpts to the breadthfirst layout', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('breadthfirst', { breadthfirstOpts: { directed: false, circle: true, spacingFactor: 2.5 } })
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('breadthfirst')
    expect(opts.directed).toBe(false)
    expect(opts.circle).toBe(true)
    expect(opts.spacingFactor).toBe(2.5)
    spy.mockRestore()
  })

  it('applies circleOpts to the circle layout', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('circle', { circleOpts: { spacingFactor: 1.8, clockwise: false } })
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('circle')
    expect(opts.spacingFactor).toBe(1.8)
    expect(opts.clockwise).toBe(false)
    spy.mockRestore()
  })

  it('applies concentricOpts to the concentric layout', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('concentric', { concentricOpts: { spacingFactor: 2.0, minNodeSpacing: 50, clockwise: false, equidistant: true } })
    const opts = spy.mock.calls[0][0]
    expect(opts.name).toBe('concentric')
    expect(opts.spacingFactor).toBe(2.0)
    expect(opts.minNodeSpacing).toBe(50)
    expect(opts.clockwise).toBe(false)
    expect(opts.equidistant).toBe(true)
    spy.mockRestore()
  })

  it('falls back to app defaults when per-layout opts are absent', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('dagre', {})
    const opts = spy.mock.calls[0][0]
    expect(opts.rankDir).toBe('TB')
    expect(opts.nodeSep).toBe(50)
    expect(opts.rankSep).toBe(50)
    expect(opts.ranker).toBe('network-simplex')
    spy.mockRestore()
  })

  it('omits rows/cols from grid layout when opts are null', () => {
    const spy = vi.spyOn(cr.cy, 'layout').mockReturnValue({ run: vi.fn() })
    cr._computeBuiltinLayout('grid', { gridOpts: { rows: null, cols: null } })
    const opts = spy.mock.calls[0][0]
    expect(opts.rows).toBeUndefined()
    expect(opts.cols).toBeUndefined()
    spy.mockRestore()
  })
})

describe('hintTransform', () => {
  it('renders a CSS translate from rendered coordinates', () => {
    expect(hintTransform(12, -3.5)).toBe('translate(12px, -3.5px)')
  })
})

describe('resolveBoxOverlap', () => {
  it('returns no movement when the boxes do not overlap', () => {
    expect(resolveBoxOverlap(
      { x1: 0, y1: 0, x2: 10, y2: 10 },
      { x1: 20, y1: 20, x2: 30, y2: 30 },
    )).toEqual({ x: 0, y: 0 })
  })

  it('pushes a node that is fully inside the group out to the nearest edge', () => {
    const group = { x1: 0, y1: 0, x2: 100, y2: 100 }
    const node  = { x1: 40, y1: 40, x2: 60, y2: 60 }
    expect(resolveBoxOverlap(node, group)).toEqual({ x: -62, y: 0 })
  })

  it('pushes horizontally when the horizontal escape is smallest', () => {
    // node pokes out of the right edge only a little
    const group = { x1: 0, y1: 0, x2: 100, y2: 100 }
    const node  = { x1: 98, y1: 10, x2: 108, y2: 20 }
    expect(resolveBoxOverlap(node, group)).toEqual({ x: 4, y: 0 })
  })

  it('pushes vertically when the vertical escape is smallest', () => {
    const group = { x1: 0, y1: 0, x2: 100, y2: 100 }
    const node  = { x1: 10, y1: 98, x2: 20, y2: 110 }
    expect(resolveBoxOverlap(node, group)).toEqual({ x: 0, y: 4 })
  })
})

describe('edgeStyleFrom', () => {
  it('returns bezier curve with default values when settings is empty', () => {
    const s = edgeStyleFrom({})
    expect(s['curve-style']).toBe('bezier')
    expect(s['width']).toBe(2)
    expect(s['opacity']).toBe(0.85)
    expect(s['arrow-scale']).toBe(1)
    expect(s['target-arrow-shape']).toBe('vee')
  })

  it('uses defaultArrowShape from settings when provided', () => {
    expect(edgeStyleFrom({ defaultArrowShape: 'chevron' })['target-arrow-shape']).toBe('chevron')
  })

  it('uses straight curve style when defaultEdgeStyle is "straight"', () => {
    expect(edgeStyleFrom({ defaultEdgeStyle: 'straight' })['curve-style']).toBe('straight')
  })

  it('maps the legacy "curved" curve style to "bezier"', () => {
    expect(edgeStyleFrom({ defaultEdgeStyle: 'curved' })['curve-style']).toBe('bezier')
  })

  it('passes other curve styles straight through', () => {
    expect(edgeStyleFrom({ defaultEdgeStyle: 'unbundled-bezier' })['curve-style']).toBe('unbundled-bezier')
  })

  it('honours numeric overrides from settings', () => {
    const s = edgeStyleFrom({ defaultEdgeWidth: 4, defaultEdgeOpacity: 0.3, defaultArrowScale: 2 })
    expect(s['width']).toBe(4)
    expect(s['opacity']).toBe(0.3)
    expect(s['arrow-scale']).toBe(2)
  })

  it('clamps arrow scale to the cytoscape range', () => {
    expect(edgeStyleFrom({ defaultArrowScale: 18 })['arrow-scale']).toBe(3)
    expect(edgeStyleFrom({ defaultArrowScale: 0 })['arrow-scale']).toBe(0.1)
  })

  it('uses the supplied accent for line and arrow colors', () => {
    const s = edgeStyleFrom({}, 'rgb(28, 36, 66)')
    expect(s['line-color']).toBe('rgb(28, 36, 66)')
    expect(s['target-arrow-color']).toBe('rgb(28, 36, 66)')
  })
})

describe('paletteFromCSSVars', () => {
  it('parses --fx-* RGB triplets into cytoscape colors', () => {
    const vars = {
      '--fx-accent':       ' 94, 116, 255 ',
      '--fx-ink':          '223, 230, 255',
      '--fx-ink-soft':     '185, 194, 236',
      '--fx-drop-bg':      '10, 16, 34',
      '--fx-glass-top':    '14, 21, 44',
      '--fx-glass-bottom': '7, 12, 28',
    }
    const pal = paletteFromCSSVars(key => vars[key] || null)
    expect(pal.accent).toBe('rgb(94,116,255)')
    expect(pal.accentA(0.45)).toBe('rgba(94,116,255,0.45)')
    expect(pal.nodeBg).toBe('rgb(7,12,28)')
    expect(pal.nodeTop).toBe('rgb(14,21,44)')
    expect(pal.nodeBottom).toBe('rgb(7,12,28)')
    expect(pal.label).toBe('rgb(223,230,255)')
    expect(pal.labelSoft).toBe('rgb(185,194,236)')
  })

  it('falls back to the default palette when accent is unavailable', () => {
    const pal = paletteFromCSSVars(() => null)
    expect(pal.accent).toBe('#5e74ff')
    expect(pal.nodeTop).toBe('#242b4d')
    expect(pal.nodeBottom).toBe('#121a30')
    expect(pal.nodeBg).toBe('#121a30')
  })

  it('flips the node background with the light-theme CSS vars', () => {
    const vars = {
      '--fx-accent':       '94, 116, 255',
      '--fx-ink':          '28, 36, 66',
      '--fx-drop-bg':      '255, 255, 255',
      '--fx-glass-top':    '242, 246, 255',
      '--fx-glass-bottom': '222, 230, 252',
    }
    const pal = paletteFromCSSVars(key => vars[key] || null)
    expect(pal.nodeBg).toBe('rgb(222,230,252)')
    expect(pal.nodeTop).toBe('rgb(242,246,255)')
    expect(pal.nodeBottom).toBe('rgb(222,230,252)')
    expect(pal.label).toBe('rgb(28,36,66)')
  })
})

describe('themeStyle', () => {
  it('builds the full style with node/edge colors from the palette', () => {
    const pal = {
      nodeTop:    'rgb(14,21,44)',
      nodeBottom: 'rgb(7,12,28)',
      nodeBg:     'rgb(7,12,28)',
      label:      'rgb(223,230,255)',
      labelSoft:  'rgb(185,194,236)',
      accent:     'rgb(94,116,255)',
      accentA:    (a) => `rgba(94,116,255,${a})`,
    }
    const style = themeStyle(pal, {})
    const node  = style.find(s => s.selector === 'node')
    const parent = style.find(s => s.selector === 'node:parent')
    const edge  = style.find(s => s.selector === 'edge')
    expect(node.style['background-gradient-stop-colors']).toBe('rgb(14,21,44) rgb(7,12,28)')
    expect(node.style['background-color']).toBe('rgb(7,12,28)')
    expect(node.style['color']).toBe('rgb(223,230,255)')
    expect(node.style['width']).toBe('label')
    expect(node.style['height']).toBe('label')
    expect(parent.style['background-gradient-stop-colors']).toBe('rgba(94,116,255,0.22) rgb(14,21,44) rgb(7,12,28)')
    expect(edge.style['line-color']).toBe('rgb(94,116,255)')
  })

  it('drives per-element node/edge styles from data fields', () => {
    const style = themeStyle(DEFAULT_PALETTE, {})
    const selector = s => style.find(r => r.selector === s)
    expect(selector('node[?nodeShape]').style['shape']).toBe('data(nodeShape)')
    expect(selector('node[textHalign]').style['text-halign']).toBe('data(textHalign)')
    expect(selector('node[textValign]').style['text-valign']).toBe('data(textValign)')
    expect(selector('node[bgColor]').style['background-color']).toBe('data(bgColor)')
    expect(selector('node[borderColor]').style['border-color']).toBe('data(borderColor)')
    expect(selector('node[borderWidth]').style['border-width']).toBe('data(borderWidth)')
    expect(selector('node[fontSize]').style['font-size']).toBe('data(fontSize)')
    expect(selector('edge[sourceArrowhead]').style['source-arrow-shape']).toBe('data(sourceArrowhead)')
    expect(selector('edge[edgeWidth]').style['width']).toBe('data(edgeWidth)')
    expect(selector('edge[edgeColor]').style['line-color']).toBe('data(edgeColor)')
    expect(selector('edge[edgeColor]').style['target-arrow-color']).toBe('data(edgeColor)')
    expect(selector('edge[edgeLineStyle]').style['line-style']).toBe('data(edgeLineStyle)')
    expect(selector('edge[edgeCurve]').style['curve-style']).toBe('data(edgeCurve)')
    expect(selector('edge[edgeOpacity]').style['opacity']).toBe('data(edgeOpacity)')
  })
})
