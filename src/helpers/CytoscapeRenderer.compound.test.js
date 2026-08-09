// Runs in a real DOM so cytoscape's compound parent tracking behaves as it
// does in the browser. In headless (no container) parents don't drag their
// children when the parent's position is set, so the bug this test guards
// against only shows up with jsdom + canvas.
// @vitest-environment jsdom
import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer.js'
import GraphModel from '@/helpers/GraphModel.js'

describe('CytoscapeRenderer compound layout (jsdom)', () => {
  let renderer, container
  beforeEach(() => {
    container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth',  { value: 1200, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value:  800, configurable: true })
    container.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800,
    })
    document.body.appendChild(container)
    renderer = new CytoscapeRenderer(container, { on(){}, off(){}, emit(){} })
    renderer.init()
  })
  afterEach(() => { renderer.teardown(); container.remove() })

  it('lands compound children on their layout target, not the rewind point', async () => {
    // Regression: setting a compound parent's position ALSO moves its children.
    // If the rewind loop iterates parent-first and captures `to` inside the
    // same pass, the child's captured `to` is corrupted to the rewind point —
    // the child then animates nowhere and gets glued at (0,0) while its edges
    // stretch to the untouched outer nodes.
    const model = new GraphModel([
      { group: 'nodes', data: { id: 'g',  label: 'first node' } },
      { group: 'nodes', data: { id: 'ci', label: 'Node', parent: 'g' } },
      { group: 'nodes', data: { id: 'o1', label: 'Node' } },
      { group: 'nodes', data: { id: 'o2', label: 'Node' } },
      { group: 'edges', data: { id: 'ci_o1', source: 'ci', target: 'o1' } },
      { group: 'edges', data: { id: 'ci_o2', source: 'ci', target: 'o2' } },
    ])
    await renderer.updateScene(model)

    const inner  = renderer.cy.getElementById('ci').position()
    const outer1 = renderer.cy.getElementById('o1').position()
    const outer2 = renderer.cy.getElementById('o2').position()
    const edge1 = Math.hypot(inner.x - outer1.x, inner.y - outer1.y)
    const edge2 = Math.hypot(inner.x - outer2.x, inner.y - outer2.y)
    // Both edges must be within a sane multiple of edgeLength=120, not the
    // hundreds-of-units stretch the bug produced.
    expect(edge1).toBeLessThan(400)
    expect(edge2).toBeLessThan(400)
  })
})
