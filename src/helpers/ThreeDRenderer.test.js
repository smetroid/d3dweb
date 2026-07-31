import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import ThreeDRenderer from '@/helpers/ThreeDRenderer.js'

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
    expect(renderer.camera.position.z).toBeCloseTo((800 / 2) / Math.tan(halfFov) * 1.15, 6)
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
