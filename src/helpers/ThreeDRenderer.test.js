import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'
import ThreeDRenderer from '@/helpers/ThreeDRenderer.js'

vi.mock('gsap', () => {
  const to = vi.fn()
  const timeline = () => ({ to: () => ({}) })
  const fromTo = () => ({})
  return { gsap: { to, timeline, fromTo } }
})
import { gsap } from 'gsap'

function makeRenderer() {
  return new ThreeDRenderer(null, null)
}

function v(x, y, z = 0) {
  return new THREE.Vector3(x, y, z)
}

describe('_buildCurve', () => {
  it('stops the tip at the target node edge', () => {
    const renderer = makeRenderer()
    const { tipPoint } = renderer._buildCurve(v(0, 0), v(100, 0), 24)
    expect(tipPoint.x).toBeCloseTo(76, 6)
    expect(tipPoint.y).toBeCloseTo(0, 6)
    expect(tipPoint.distanceTo(v(100, 0))).toBeCloseTo(24, 6)
  })

  it('curve starts at source center and ends at the tip', () => {
    const renderer = makeRenderer()
    const { curve } = renderer._buildCurve(v(0, 0), v(100, 0), 10)
    expect(curve.getPoint(0).distanceTo(v(0, 0))).toBeLessThan(0.001)
    expect(curve.getPoint(1).distanceTo(v(90, 0))).toBeLessThan(0.001)
  })

  it('tipDir matches the curve tangent at its end', () => {
    const renderer = makeRenderer()
    const { curve, tipDir } = renderer._buildCurve(v(0, 0), v(100, 0), 0)
    expect(tipDir.dot(curve.getTangent(1))).toBeCloseTo(1, 6)
  })

  it('is deterministic for identical endpoints', () => {
    const renderer = makeRenderer()
    const a = renderer._buildCurve(v(10, 20), v(80, -40), 15)
    const b = renderer._buildCurve(v(10, 20), v(80, -40), 15)
    expect(a.tipPoint).toEqual(b.tipPoint)
    expect(a.curve.getPoint(0.5)).toEqual(b.curve.getPoint(0.5))
  })
})

describe('_buildSelfLoop', () => {
  it('pokes out to the right of the node and returns above', () => {
    const renderer = makeRenderer()
    const { curve, tipPoint, tipDir } = renderer._buildSelfLoop(v(0, 0), 24)
    const S = curve.getPoint(0)
    const E = curve.getPoint(1)
    expect(S.x).toBeGreaterThan(24)
    expect(S.y).toBeCloseTo(0, 6)
    expect(E.y).toBeLessThan(0)
    expect(tipPoint.y).toBeLessThan(0)
    expect(tipDir.length()).toBeCloseTo(1, 6)
  })
})

describe('_buildArrowhead', () => {
  it('places the cone apex exactly on the tip point', () => {
    const renderer = makeRenderer()
    const dir = new THREE.Vector3(-1, 0, 0)
    const cone = renderer._buildArrowhead(v(50, -10), dir)
    const apex = cone.position.clone().add(new THREE.Vector3(0, 9, 0).applyQuaternion(cone.quaternion))
    expect(apex.x).toBeCloseTo(50, 6)
    expect(apex.y).toBeCloseTo(-10, 6)
  })

  it('rotates +Y to align with the direction', () => {
    const renderer = makeRenderer()
    const dir = new THREE.Vector3(-0.5, 1, 0).normalize()
    const cone = renderer._buildArrowhead(v(0, 0), dir)
    const rotated = new THREE.Vector3(0, 1, 0).applyQuaternion(cone.quaternion)
    expect(rotated.dot(dir)).toBeCloseTo(1, 6)
  })

  it('uses the configured arrow length', () => {
    const renderer = makeRenderer()
    const cone = renderer._buildArrowhead(v(0, 0), new THREE.Vector3(0, 1, 0))
    expect(cone.geometry.parameters.height).toBe(18)
  })
})

describe('_nodeRadius', () => {
  it('computes half the card diagonal', () => {
    const renderer = makeRenderer()
    renderer.nodeObjects.set('n1', { el: { clientWidth: 120, clientHeight: 80 } })
    expect(renderer._nodeRadius('n1')).toBeCloseTo(Math.hypot(120, 80) / 2, 6)
  })

  it('falls back to a default when the card is unknown', () => {
    const renderer = makeRenderer()
    expect(renderer._nodeRadius('missing')).toBe(24)
  })
})

describe('_fitToGraph', () => {
  function makeFitRenderer() {
    const renderer = makeRenderer()
    renderer.camera = new THREE.PerspectiveCamera(40, 1, 1, 10000)
    renderer.controls = { target: new THREE.Vector3(), update: vi.fn() }
    return renderer
  }

  it('centres the camera on the node midpoint', () => {
    const renderer = makeFitRenderer()
    renderer.nodeObjects.set('a', { obj: { position: v(0, 0) } })
    renderer.nodeObjects.set('b', { obj: { position: v(200, 100) } })
    renderer._fitToGraph()
    expect(renderer.controls.target.x).toBeCloseTo(100, 6)
    expect(renderer.controls.target.y).toBeCloseTo(50, 6)
    expect(renderer.camera.position.x).toBeCloseTo(100, 6)
    expect(renderer.camera.position.y).toBeCloseTo(50, 6)
    expect(renderer.camera.position.z).toBeGreaterThan(0)
    expect(renderer.controls.update).toHaveBeenCalled()
  })

  it('sizes the camera distance from the graph extent', () => {
    const renderer = makeFitRenderer()
    renderer.nodeObjects.set('a', { obj: { position: v(-400, -100) } })
    renderer.nodeObjects.set('b', { obj: { position: v(400, 100) } })
    renderer._fitToGraph()
    const halfFov = (40 * Math.PI) / 360
    expect(renderer.camera.position.z).toBeCloseTo((800 / 2) / Math.tan(halfFov) * 2.4, 6)
  })

  it('no-ops when there are no nodes', () => {
    const renderer = makeFitRenderer()
    renderer._fitToGraph()
    expect(renderer.controls.update).not.toHaveBeenCalled()
  })

  it('no-ops without a camera or controls', () => {
    const renderer = makeRenderer()
    expect(() => renderer._fitToGraph()).not.toThrow()
  })
})

describe('_readTheme', () => {
  it('falls back to a default palette outside the browser', () => {
    const renderer = makeRenderer()
    const palette = renderer._readTheme()
    expect(palette.primary).toBe(0x1867c0)
    expect(palette.source).toBeLessThan(palette.target)
    expect(palette.active).toBe(0xff9f43)
    expect(palette.grid).toEqual([0, 0, 0])
  })

  it('converts an rgb triplet to a hex int', () => {
    const renderer = makeRenderer()
    expect(renderer._rgbToHex([24, 103, 192])).toBe(0x1867c0)
  })
})

describe('_buildLineGeometry', () => {
  it('emits positions and a source→target colour gradient', () => {
    const renderer = makeRenderer()
    renderer._palette = { source: 0x0000ff, target: 0xff0000 }
    const { curve } = renderer._buildCurve(v(0, 0), v(100, 0), 10)
    const lineGeo = renderer._buildLineGeometry(curve)
    const starts = lineGeo.attributes.instanceColorStart.array
    const ends   = lineGeo.attributes.instanceColorEnd.array
    expect(lineGeo.attributes.instanceStart.count).toBe(48)
    expect(starts.length).toBe(48 * 6)
    expect(ends.length).toBe(48 * 6)
    expect(starts[0]).toBeCloseTo(0, 1)               // first segment: source blue
    expect(starts[1]).toBeCloseTo(0, 1)
    expect(starts[2]).toBeCloseTo(1, 1)
    expect(ends[ends.length - 3]).toBeCloseTo(1, 1)   // last segment: target red
    expect(ends[ends.length - 2]).toBeCloseTo(0, 1)
    expect(ends[ends.length - 1]).toBeCloseTo(0, 1)
  })
})

describe('_buildArrowhead', () => {
  it('uses the palette target colour', () => {
    const renderer = makeRenderer()
    renderer._palette = { target: 0x00ff00 }
    const cone = renderer._buildArrowhead(v(0, 0), new THREE.Vector3(0, 1, 0))
    expect(cone.material.color.getHex()).toBe(0x00ff00)
  })
})

describe('_rayPointDistance', () => {
  it('measures perpendicular distance to the ray', () => {
    const renderer = makeRenderer()
    const ray = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))
    expect(renderer._rayPointDistance(ray, v(3, 4, 10))).toBeCloseTo(5, 6)
  })

  it('falls back to euclidean distance behind the ray origin', () => {
    const renderer = makeRenderer()
    const ray = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))
    expect(renderer._rayPointDistance(ray, v(3, 4, -10))).toBeCloseTo(Math.hypot(3, 4, 10), 6)
  })
})

describe('edge highlight', () => {
  it('selectEdge/deselectEdge toggle the active colour and opacity', () => {
    const renderer = makeRenderer()
    renderer._palette = { active: 0xff0000, target: 0x0000ff }
    const line  = { material: { color: { setHex: vi.fn() }, opacity: null } }
    const arrow = { material: { color: { setHex: vi.fn() } } }
    renderer.edgeLines.set('e1', { line, arrow })
    renderer.selectEdge('e1')
    expect(line.material.opacity).toBe(0.95)
    expect(line.material.color.setHex).toHaveBeenCalledWith(0xff0000)
    renderer.deselectEdge('e1')
    expect(line.material.opacity).toBe(0.7)
    expect(arrow.material.color.setHex).toHaveBeenLastCalledWith(0x0000ff)
  })
})

describe('zoomTo / zoomOut', () => {
  beforeEach(() => {
    gsap.to.mockClear()
  })

  function makeZoomRenderer() {
    const renderer = makeRenderer()
    renderer.camera = new THREE.PerspectiveCamera(40, 1, 1, 10000)
    renderer.controls = { target: new THREE.Vector3(), update: vi.fn() }
    return renderer
  }

  it('zoomTo focuses the camera on a node', () => {
    const renderer = makeZoomRenderer()
    const obj = { position: v(100, 200, 0) }
    renderer.nodeObjects.set('n1', { obj, el: { clientWidth: 80, clientHeight: 40 } })
    renderer.zoomTo('n1')
    const calls = gsap.to.mock.calls
    expect(calls[0][0]).toBe(renderer.camera.position)
    expect(calls[0][1].x).toBe(100)
    expect(calls[0][1].y).toBe(200)
    expect(calls[0][1].z).toBeGreaterThan(0)
    expect(calls[1][0]).toBe(renderer.controls.target)
    expect(calls[1][1].x).toBe(100)
    expect(calls[1][1].y).toBe(200)
  })

  it('zoomTo focuses the midpoint of an edge', () => {
    const renderer = makeZoomRenderer()
    renderer.nodeObjects.set('a', { obj: { position: v(0, 0) } })
    renderer.nodeObjects.set('b', { obj: { position: v(200, 0) } })
    renderer.edgeLines.set('e1', { srcId: 'a', tgtId: 'b' })
    renderer.zoomTo('e1')
    const calls = gsap.to.mock.calls
    expect(calls[0][1].x).toBe(100)
    expect(calls[0][1].y).toBe(0)
  })

  it('zoomTo accepts a legacy {v, w} edge object', () => {
    const renderer = makeZoomRenderer()
    renderer.nodeObjects.set('a', { obj: { position: v(0, 0) } })
    renderer.nodeObjects.set('b', { obj: { position: v(100, 100) } })
    renderer.edgeLines.set('e1', { srcId: 'a', tgtId: 'b' })
    renderer.zoomTo({ v: 'a', w: 'b' })
    const calls = gsap.to.mock.calls
    expect(calls[0][1].x).toBe(50)
    expect(calls[0][1].y).toBe(50)
  })

  it('no-ops on an unknown id', () => {
    const renderer = makeZoomRenderer()
    renderer.zoomTo('missing')
    expect(gsap.to).not.toHaveBeenCalled()
    renderer.zoomTo(undefined)
    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('zoomOut returns to the fit target', () => {
    const renderer = makeZoomRenderer()
    renderer.nodeObjects.set('a', { obj: { position: v(0, 0) } })
    renderer.nodeObjects.set('b', { obj: { position: v(200, 100) } })
    renderer.zoomOut()
    const calls = gsap.to.mock.calls
    expect(calls[0][1].x).toBeCloseTo(100, 6)
    expect(calls[0][1].y).toBeCloseTo(50, 6)
    expect(calls[1][1].x).toBeCloseTo(100, 6)
    expect(calls[1][1].y).toBeCloseTo(50, 6)
  })

  it('zoomOut no-ops without a camera or controls', () => {
    const renderer = makeRenderer()
    expect(() => renderer.zoomOut()).not.toThrow()
    expect(() => renderer.zoomTo('n1')).not.toThrow()
  })
})

describe('zoom framing offset', () => {
  beforeEach(() => {
    gsap.to.mockClear()
  })

  it('shifts left in proportion to the panel share of the viewport', () => {
    const renderer = makeRenderer()
    const dx = renderer._zoomFramingOffset(500, 2000, 1000, 40, 2)
    expect(dx).toBeCloseTo(-(500 / 2000) * 1000 * Math.tan((40 * Math.PI) / 360) * 2, 6)
    expect(dx).toBeLessThan(0)
  })

  it('returns 0 when there is no panel or viewport', () => {
    const renderer = makeRenderer()
    expect(renderer._zoomFramingOffset(0, 2000, 1000, 40, 2)).toBe(0)
    expect(renderer._zoomFramingOffset(500, 0, 1000, 40, 2)).toBe(0)
    expect(renderer._zoomFramingOffset(500, 2000, 0, 40, 2)).toBe(0)
  })

  it('applies the panel offset to the camera target while editing', () => {
    vi.stubGlobal('document', { querySelector: () => ({ offsetWidth: 500 }) })
    try {
      const renderer = makeRenderer()
      renderer.camera = new THREE.PerspectiveCamera(40, 1, 1, 10000)
      renderer.controls = { target: new THREE.Vector3(), update: vi.fn() }
      renderer._viewportSize = new THREE.Vector2(2000, 1000)
      renderer.camera.position.set(0, 0, 800)
      renderer.nodeObjects.set('n1', { obj: { position: v(100, 200, 0) }, el: { clientWidth: 80, clientHeight: 40 } })
      renderer.zoomTo('n1')
      const calls = gsap.to.mock.calls
      expect(calls[0][1].x).toBeLessThan(100)
      expect(calls[1][1].x).toBeLessThan(100)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('centres normally when the edit rail is closed', () => {
    vi.stubGlobal('document', undefined)
    const renderer = makeRenderer()
    renderer.camera = new THREE.PerspectiveCamera(40, 1, 1, 10000)
    renderer.controls = { target: new THREE.Vector3(), update: vi.fn() }
    renderer._viewportSize = new THREE.Vector2(2000, 1000)
    renderer.camera.position.set(0, 0, 800)
    renderer.nodeObjects.set('n1', { obj: { position: v(100, 200, 0) }, el: { clientWidth: 80, clientHeight: 40 } })
    renderer.zoomTo('n1')
    vi.unstubAllGlobals()
    const calls = gsap.to.mock.calls
    expect(calls[0][1].x).toBe(100)
  })
})
