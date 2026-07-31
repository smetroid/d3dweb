import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { gsap } from 'gsap'

export const SCALE = 2   // converts dagre pixel units → Three.js world units
const CAMERA_Z = 1500    // initial camera distance

const EDGE_COLOR        = 0x8a8a8a
const EDGE_COLOR_ACTIVE = 0xff6600
const ARROW_LENGTH      = 18

export default class ThreeDRenderer {
  constructor(container, emitter) {
    this.container = container
    this.emitter = emitter

    this.scene           = null
    this.camera          = null
    this.css3dRenderer   = null
    this.webglRenderer   = null
    this.controls        = null
    this.animFrameId     = null

    // id → { obj: CSS3DObject, el: HTMLElement }
    this.nodeObjects = new Map()
    // edgeId → { group: THREE.Group, line: Line2, arrow: THREE.Mesh }
    this.edgeLines   = new Map()
    this._viewportSize = null
    this._cy          = null
    this._firstFrame  = false

    this.is3D = false
  }

  // ─── Initialise both renderers and start the animation loop ──────────────────

  init() {
    const w = this.container.clientWidth  || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight

    this.scene  = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(40, w / h, 1, 10000)
    this.camera.position.set(0, 0, CAMERA_Z)

    this._viewportSize = new THREE.Vector2(w, h)

    // WebGL renderer — sits behind CSS3D, draws edges
    this.webglRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    this.webglRenderer.setPixelRatio(window.devicePixelRatio)
    this.webglRenderer.setSize(w, h)
    Object.assign(this.webglRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0', pointerEvents: 'none'
    })
    this.container.appendChild(this.webglRenderer.domElement)

    // CSS3D renderer — sits on top, draws node HTML cards
    this.css3dRenderer = new CSS3DRenderer()
    this.css3dRenderer.setSize(w, h)
    Object.assign(this.css3dRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0'
    })
    this.container.appendChild(this.css3dRenderer.domElement)

    // Camera controls — bound to CSS3D element so HTML events work
    this.controls = new OrbitControls(this.camera, this.css3dRenderer.domElement)
    this.controls.enableDamping  = true
    this.controls.dampingFactor  = 0.05
    this.controls.enableRotate   = false   // flat/2-D mode by default
    this.controls.screenSpacePanning = true
    // Diagram-tool bindings: left-drag pans, right-drag rotates (3-D only),
    // wheel/middle-drag zooms.
    this.controls.mouseButtons = {
      LEFT:   THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT:  THREE.MOUSE.ROTATE,
    }

    this._resizeHandler = this._onResize.bind(this)
    window.addEventListener('resize', this._resizeHandler)

    this._animate()
  }

  _animate() {
    this.animFrameId = requestAnimationFrame(this._animate.bind(this))
    this.controls.update()
    this.webglRenderer.render(this.scene, this.camera)
    this.css3dRenderer.render(this.scene, this.camera)

    // Node cards are only in the DOM (with real sizes) after the first CSS3D
    // render — rebuild edges once so arrowheads sit on the actual card edges.
    if (!this._firstFrame) {
      this._firstFrame = true
      if (this._cy && this.edgeLines.size > 0) this._rebuildEdges()
    }
  }

  // ─── Build / rebuild the scene from a Cytoscape instance ─────────────────────

  updateScene(cy, options = {}) {
    // On pan/zoom we just move the camera — don't rebuild scene geometry
    if (options.pan) {
      this._pan(options.pan)
      return
    }
    if (options.zoom) {
      this._zoom(options.zoom)
      return
    }

    this._clearScene()
    this._cy = cy

    cy.nodes().forEach(node => {
      const id  = node.id()
      const pos = node.position()
      const { wrapper, el } = this._createNodeElement(id, node.data())
      const obj = new CSS3DObject(wrapper)
      // Invert Y because Three.js Y-up vs dagre Y-down.
      obj.position.set(pos.x * SCALE, -pos.y * SCALE, 0)
      this.scene.add(obj)
      this.nodeObjects.set(id, { obj, el })
    })

    cy.edges().forEach(edge => {
      this._buildEdge(edge, cy)
    })

    // Keep the graph centred in the viewport (2-D mode only; in 3-D the
    // layouts are origin-centred and the user is free to orbit).
    if (!this.is3D) this._fitToGraph()
  }

  _createNodeElement(id, data) {
    // wrapper is what CSS3DRenderer applies matrix3d to (position only)
    const wrapper = document.createElement('div')

    // el is the actual card
    const el = document.createElement('div')
    el.className = 'node-card'
    el.id = id
    el.dataset.nodeId = id

    if (data.shape) el.classList.add(`node-shape-${data.shape}`)
    if (data.style) el.style.cssText += ';' + data.style

    const label = document.createElement('div')
    label.className = 'node-label'
    label.textContent = data.label || id
    el.appendChild(label)

    el.addEventListener('click', () => this.emitter.emit('node-click', id))
    wrapper.appendChild(el)
    return { wrapper, el }
  }

  _buildEdge(edge, cy) {
    const srcId = edge.data('source')
    const tgtId = edge.data('target')
    const srcPos = cy.getElementById(srcId)?.position()
    const tgtPos = cy.getElementById(tgtId)?.position()
    if (!srcPos || !tgtPos) return

    const srcRadius = this._nodeRadius(srcId)
    const tgtRadius = this._nodeRadius(tgtId)
    const start = new THREE.Vector3(srcPos.x * SCALE, -srcPos.y * SCALE, -1)
    const end   = new THREE.Vector3(tgtPos.x * SCALE, -tgtPos.y * SCALE, -1)
    const { curve, tipPoint, tipDir } = this._computeCurve(srcId, tgtId, start, end, srcRadius, tgtRadius)

    const group = new THREE.Group()

    const lineGeo = this._buildLineGeometry(curve)
    const lineMat = new LineMaterial({
      color:     EDGE_COLOR,
      linewidth: 2,
      resolution: this._viewportSize ? this._viewportSize.clone() : new THREE.Vector2(800, 600),
    })
    group.add(new Line2(lineGeo, lineMat))

    group.add(this._buildArrowhead(tipPoint, tipDir))

    this.scene.add(group)
    this.edgeLines.set(edge.id(), {
      group, line: group.children[0], lineGeo, arrow: group.children[1],
      srcId, tgtId, srcRadius, tgtRadius,
    })
  }

  _computeCurve(srcId, tgtId, start, end, srcRadius, tgtRadius) {
    if (srcId === tgtId) return this._buildSelfLoop(start, srcRadius)
    return this._buildCurve(start, end, tgtRadius)
  }

  _buildLineGeometry(curve) {
    const lineGeo = new LineGeometry()
    lineGeo.setPositions(this._curvePositions(curve))
    return lineGeo
  }

  // Straight-ish bow between two nodes, sagging perpendicular to the direct line
  _buildCurve(start, end, tgtRadius) {
    const dir  = end.clone().sub(start)
    const dist = dir.length()
    dir.normalize()

    // Stop the arrow at the target card's edge instead of its center
    const endPoint = end.clone().sub(dir.clone().multiplyScalar(tgtRadius))

    // Deterministic side choice so parallel edges don't fully overlap
    const hash   = (Math.round(start.x) * 73856093) ^ (Math.round(start.y) * 19349663) ^ (Math.round(end.x) * 83492791)
    const amount = Math.max(dist * 0.15, 40) * (hash % 2 === 0 ? 1 : -1)
    const mid    = start.clone().lerp(endPoint, 0.5)
    const side   = new THREE.Vector3(-dir.y, dir.x, 0)
    const control = mid.clone().add(side.multiplyScalar(amount))

    const curve = new THREE.QuadraticBezierCurve3(start, control, endPoint)
    return {
      curve,
      tipPoint: endPoint,
      tipDir:   endPoint.clone().sub(control).normalize(),
    }
  }

  // Self-loop: cubic bezier that pokes out to the right of the node and returns
  _buildSelfLoop(center, radius) {
    const side = new THREE.Vector3(1, 0, 0)
    const up   = new THREE.Vector3(0, -1, 0)
    const r    = Math.max(radius, 24)
    const R    = Math.max(r * 1.6, 70)

    const S   = center.clone().add(side.clone().multiplyScalar(r + 8))
    const cp1 = center.clone().add(side.clone().multiplyScalar(R))
    const cp2 = cp1.clone().add(up.clone().multiplyScalar(R * 0.9))
    const E   = S.clone().add(up.clone().multiplyScalar(r * 1.2))

    const curve = new THREE.CubicBezierCurve3(S, cp1, cp2, E)
    return {
      curve,
      tipPoint: E,
      tipDir:   E.clone().sub(cp2).normalize(),
    }
  }

  // ConeGeometry is centered on its midpoint, so the apex would overshoot the
  // edge point by half its height — pull the cone back so the apex lands on it.
  _placeArrowhead(cone, tipPoint, dir) {
    cone.position.copy(tipPoint)
    if (dir.lengthSq() > 0) {
      const n = dir.clone().normalize()
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
      cone.position.addScaledVector(n, -ARROW_LENGTH / 2)
    }
    return cone
  }

  _buildArrowhead(tipPoint, dir) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(ARROW_LENGTH * 0.35, ARROW_LENGTH, 10),
      new THREE.MeshBasicMaterial({ color: EDGE_COLOR })
    )
    return this._placeArrowhead(cone, tipPoint, dir)
  }

  // Approximate world radius of a node card (world units ≈ CSS px at the graph plane)
  _nodeRadius(id) {
    const el = this.nodeObjects.get(id)?.el
    if (!el) return 24
    return Math.max(Math.hypot(el.clientWidth, el.clientHeight) / 2, 12)
  }

  _clearScene() {
    this.nodeObjects.forEach(({ obj }) => {
      this.scene.remove(obj)
      if (obj.element && obj.element.parentNode) obj.element.parentNode.removeChild(obj.element)
    })
    this.nodeObjects.clear()

    this._disposeEdges()
    this.edgeLines.clear()
  }

  // Rebuild edge geometry (e.g. after the first frame measures real card sizes)
  _rebuildEdges() {
    if (!this._cy) return
    this._disposeEdges()
    this.edgeLines.clear()
    this._cy.edges().forEach(edge => this._buildEdge(edge, this._cy))
  }

  _disposeEdges() {
    this.edgeLines.forEach(({ group, line, arrow }) => {
      this.scene.remove(group)
      line.geometry.dispose()
      line.material.dispose()
      arrow.geometry.dispose()
      arrow.material.dispose()
    })
  }

  // Recompute every edge from the current CSS3DObject positions (used while
  // nodes are tweened in 3-D so lines stay glued to their endpoints).
  _refreshEdges() {
    this.edgeLines.forEach(entry => this._updateEdgeGeometry(entry))
  }

  _updateEdgeGeometry(entry) {
    const srcObj = this.nodeObjects.get(entry.srcId)?.obj
    const tgtObj = this.nodeObjects.get(entry.tgtId)?.obj
    if (!srcObj || !tgtObj) return

    const start = srcObj.position.clone()
    const end   = tgtObj.position.clone()
    const { curve, tipPoint, tipDir } = this._computeCurve(
      entry.srcId, entry.tgtId, start, end, entry.srcRadius, entry.tgtRadius
    )

    entry.lineGeo.setPositions(this._curvePositions(curve))
    this._placeArrowhead(entry.arrow, tipPoint, tipDir)
  }

  _curvePositions(curve) {
    const points = curve.getPoints(48)
    const positions = []
    for (const p of points) positions.push(p.x, p.y, p.z)
    return positions
  }

  // ─── Node element access (for the hints system) ───────────────────────────────

  getNodeElement(id) {
    return this.nodeObjects.get(id)?.el ?? null
  }

  getAllNodeElements() {
    const els = []
    this.nodeObjects.forEach(({ el }) => els.push(el))
    return els
  }

  // ─── Visual selection ─────────────────────────────────────────────────────────

  selectNode(id) {
    const { el } = this.nodeObjects.get(id) || {}
    if (!el) return
    el.classList.add('selected')
    gsap.fromTo(el, { scale: 1 }, { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1 })
  }

  deselectNode(id) {
    const { el } = this.nodeObjects.get(id) || {}
    if (el) el.classList.remove('selected', 'active_node', 'd_active_node')
  }

  selectEdge(edgeId) {
    const entry = this.edgeLines.get(edgeId)
    if (!entry) return
    entry.line.material.color.setHex(EDGE_COLOR_ACTIVE)
    entry.arrow.material.color.setHex(EDGE_COLOR_ACTIVE)
  }

  deselectEdge(edgeId) {
    const entry = this.edgeLines.get(edgeId)
    if (!entry) return
    entry.line.material.color.setHex(EDGE_COLOR)
    entry.arrow.material.color.setHex(EDGE_COLOR)
  }

  // ─── Camera controls (called from DagreAltKeys) ───────────────────────────────

  _pan(direction) {
    const delta = 80
    const tl    = gsap.timeline()
    const cam   = this.camera.position
    const tgt   = this.controls.target
    if (direction === 'Up') {
      tl.to(cam, { y: cam.y + delta, duration: 0.2 }, 0)
      tl.to(tgt, { y: tgt.y + delta, duration: 0.2 }, 0)
    } else if (direction === 'Down') {
      tl.to(cam, { y: cam.y - delta, duration: 0.2 }, 0)
      tl.to(tgt, { y: tgt.y - delta, duration: 0.2 }, 0)
    } else if (direction === 'Left') {
      tl.to(cam, { x: cam.x - delta, duration: 0.2 }, 0)
      tl.to(tgt, { x: tgt.x - delta, duration: 0.2 }, 0)
    } else if (direction === 'Right') {
      tl.to(cam, { x: cam.x + delta, duration: 0.2 }, 0)
      tl.to(tgt, { x: tgt.x + delta, duration: 0.2 }, 0)
    }
  }

  _zoom(direction) {
    const factor = direction === 'In' ? 0.7 : 1.43
    gsap.to(this.camera.position, { z: this.camera.position.z * factor, duration: 0.3 })
  }

  resetCamera() {
    gsap.to(this.camera.position, { x: 0, y: 0, z: CAMERA_Z, duration: 0.6 })
    gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 0.6 })
  }

  // Move camera + orbit target so the current node set is centred and fills
  // the viewport (like dagre-d3's auto-fit-to-viewBox).
  _fitToGraph() {
    if (!this.camera || !this.controls) return
    const objs = [...this.nodeObjects.values()]
    if (objs.length === 0) return

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    objs.forEach(({ obj }) => {
      minX = Math.min(minX, obj.position.x)
      maxX = Math.max(maxX, obj.position.x)
      minY = Math.min(minY, obj.position.y)
      maxY = Math.max(maxY, obj.position.y)
    })

    const cx     = (minX + maxX) / 2
    const cy     = (minY + maxY) / 2
    const extent = Math.max(maxX - minX, maxY - minY, 100)

    const halfFov = (this.camera.fov * Math.PI) / 360
    const dist    = Math.max((extent / 2) / Math.tan(halfFov) * 2.4, 200)

    this.controls.target.set(cx, cy, 0)
    this.camera.position.set(cx, cy, dist)
    this.controls.update()
  }

  // ─── 2-D ↔ 3-D mode toggle ───────────────────────────────────────────────────

  enable3D() {
    this.is3D = true
    this.controls.enableRotate = true
  }

  enable2D() {
    this.is3D = false
    this.controls.enableRotate = false
    // Note: centring happens in _fitToGraph on the next updateScene()
  }

  /**
   * Animate all node CSS3DObjects to new {x, y, z} positions.
   * positions3D: Map<nodeId, {x, y, z}>
   * Edges are recomputed every frame so they stay glued to the moving nodes.
   */
  transitionToPositions(positions3D, onComplete) {
    let pending = 0
    let raf = null
    const scheduleRefresh = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        this._refreshEdges()
      })
    }
    this.nodeObjects.forEach(({ obj }, id) => {
      const pos = positions3D.get(id)
      if (!pos) return
      pending++
      gsap.to(obj.position, {
        x: pos.x, y: pos.y, z: pos.z,
        duration: 0.8,
        ease: 'power2.inOut',
        onUpdate: scheduleRefresh,
        onComplete: () => {
          pending--
          if (pending === 0) {
            if (raf) cancelAnimationFrame(raf)
            raf = null
            this._refreshEdges()
            if (typeof onComplete === 'function') onComplete()
          }
        },
      })
    })
  }

  // ─── Keyboard navigation helpers ──────────────────────────────────────────────

  /**
   * Returns node IDs sorted by screen-space Y (top → bottom) so j/k
   * navigation feels spatially correct in 3-D mode.
   */
  getNodesSortedByScreenY() {
    const h      = this.container.clientHeight
    const proj   = new THREE.Vector3()
    const result = []

    this.nodeObjects.forEach(({ obj }, id) => {
      proj.copy(obj.position).project(this.camera)
      const screenY = (1 - (proj.y + 1) / 2) * h
      result.push({ id, screenY })
    })

    result.sort((a, b) => a.screenY - b.screenY)
    return result.map(r => r.id)
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  _onResize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this._viewportSize.set(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.webglRenderer.setSize(w, h)
    this.css3dRenderer.setSize(w, h)
    this.edgeLines.forEach(({ line }) => {
      line.material.resolution.set(w, h)
    })
  }

  teardown() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId)
    window.removeEventListener('resize', this._resizeHandler)
    this._clearScene()
    this.controls.dispose()
    this.webglRenderer.dispose()
    this.webglRenderer.domElement.remove()
    this.css3dRenderer.domElement.remove()
  }
}
