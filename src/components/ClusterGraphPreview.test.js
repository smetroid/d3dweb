// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import mitt from 'mitt'
import ClusterGraphPreview from '@/components/ClusterGraphPreview.vue'

// The renderer owns a real cytoscape instance and a canvas; the component's job
// is only to hand it a container and a model, so it is stubbed here.
const { instances } = vi.hoisted(() => ({ instances: [] }))

vi.mock('@/helpers/CytoscapeRenderer', () => ({
  default: class {
    constructor(container, emitter) {
      this.container = container
      this.emitter = emitter
      this.init = vi.fn()
      this.updateScene = vi.fn()
      this.fitToContent = vi.fn()
      this.teardown = vi.fn()
      instances.push(this)
    }
  }
}))

const CLUSTER = {
  options: { directed: true },
  nodes: [
    { v: 'n1', value: { label: 'One' } },
    { v: 'n2', value: { label: 'Two' } }
  ],
  edges: [{ v: 'n1', w: 'n2', value: {} }]
}

// modelToGraphlib stores each node's position as _x/_y, so a share of a saved
// diagram carries the arrangement its author gave it.
const POSITIONED_CLUSTER = {
  options: { directed: true },
  nodes: [
    { v: 'n1', value: { label: 'One', _x: 120, _y: 40 } },
    { v: 'n2', value: { label: 'Two', _x: 300, _y: 180 } }
  ],
  edges: [{ v: 'n1', w: 'n2', value: {} }]
}

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountPreview(cluster = CLUSTER) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    setup() {
      return () => h(ClusterGraphPreview, { cluster })
    }
  })
  // main.js puts a single app-wide mitt instance here.
  const appEmitter = mitt()
  app.config.globalProperties.emitter = appEmitter
  app.mount(host)
  return { host, app, appEmitter }
}

beforeEach(() => {
  instances.length = 0
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ClusterGraphPreview', () => {
  it('renders the cluster into an element on the page', async () => {
    mountPreview()
    await flush()
    expect(instances).toHaveLength(1)
    const renderer = instances[0]
    expect(renderer.container).toBeInstanceOf(HTMLElement)
    expect(renderer.init).toHaveBeenCalled()
    const model = renderer.updateScene.mock.calls[0][0]
    expect(model.nodes()).toHaveLength(2)
    expect(model.edges()).toHaveLength(1)
  })

  // The catalog dialog mounts a fresh preview per share and unmounts the last
  // one, so a renderer that outlives its component leaks a cytoscape instance.
  it('tears the renderer down when unmounted', async () => {
    const { app } = mountPreview()
    await flush()
    const renderer = instances[0]
    app.unmount()
    expect(renderer.teardown).toHaveBeenCalled()
  })

  // The renderer emits node-click and scene-updated. main.js shares one mitt
  // instance across the whole app, so handing it over would drive the editor's
  // selection and node counter from a preview the user is only looking at.
  it('keeps its renderer events off the app-wide emitter', async () => {
    const { appEmitter } = mountPreview()
    await flush()
    const appListener = vi.fn()
    appEmitter.on('node-click', appListener)
    appEmitter.on('scene-updated', appListener)

    instances[0].emitter.emit('node-click', 'n1')
    instances[0].emitter.emit('scene-updated', { nodes: 2, edges: 1 })

    expect(appListener).not.toHaveBeenCalled()
  })

  // The private emitter cuts the renderer off from the app's themeChanged too,
  // and _applyTheme is what restyles it — so that one event is forwarded in.
  it('restyles when the app theme changes', async () => {
    const { appEmitter } = mountPreview()
    await flush()
    const rendererListener = vi.fn()
    instances[0].emitter.on('themeChanged', rendererListener)

    appEmitter.emit('themeChanged')

    expect(rendererListener).toHaveBeenCalled()
  })

  it('stops listening for theme changes once unmounted', async () => {
    const { app, appEmitter } = mountPreview()
    await flush()
    const rendererListener = vi.fn()
    instances[0].emitter.on('themeChanged', rendererListener)
    app.unmount()

    appEmitter.emit('themeChanged')

    expect(rendererListener).not.toHaveBeenCalled()
  })

  // A preview should look like the diagram its author arranged, so a cluster
  // that carries positions is drawn at them rather than re-lauded by cola.
  it('keeps the positions the author saved', async () => {
    mountPreview(POSITIONED_CLUSTER)
    await flush()
    const [model, options] = instances[0].updateScene.mock.calls[0]
    expect(options.layout).toBe(false)
    expect(model.getElementById('n1').position()).toEqual({ x: 120, y: 40 })
  })

  // Positions are optional in the wire format; without them every node sits at
  // the origin, so something has to place them.
  it('lays out a cluster that has no saved positions', async () => {
    mountPreview()
    await flush()
    const options = instances[0].updateScene.mock.calls[0][1] ?? {}
    expect(options.layout).not.toBe(false)
  })

  // {layout: false} skips _fitViewport, and a preview that opens off-screen
  // looks empty.
  it('frames the whole cluster', async () => {
    mountPreview(POSITIONED_CLUSTER)
    await flush()
    expect(instances[0].fitToContent).toHaveBeenCalled()
  })

  // Nothing to draw — an empty framed box reads as a broken render, so the
  // share falls back to its text-only header.
  it('draws nothing for a cluster with no nodes', async () => {
    mountPreview({ options: {}, nodes: [], edges: [] })
    await flush()
    expect(instances).toHaveLength(0)
    expect(document.querySelector('[data-testid="cluster-graph"]')).toBeNull()
  })
})
