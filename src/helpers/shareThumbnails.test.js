// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderThumbnail, resetThumbnails } from '@/helpers/shareThumbnails.js'

const { instances, scenes } = vi.hoisted(() => ({ instances: [], scenes: [] }))

// Records every scene the one renderer is asked to draw, and lets a test hold a
// render open so the queue's ordering is observable.
vi.mock('@/helpers/CytoscapeRenderer', () => ({
  default: class {
    constructor(container) {
      this.container = container
      this.cy = {}
      this.init = vi.fn()
      this.fitToContent = vi.fn()
      this.teardown = vi.fn()
      this.toPNG = vi.fn(() => 'data:image/png;base64,AAAA')
      this.updateScene = vi.fn((model) => {
        scenes.push({ nodes: model.nodes().length })
      })
      instances.push(this)
    }
  }
}))

// No _x/_y, so drawCluster takes the asynchronous layout path and updateScene's
// return value is awaited — which is what makes the queue observable.
const cluster = (n = 2) => ({
  options: {},
  nodes: Array.from({ length: n }, (_, i) => ({ v: `n${i}`, value: {} })),
  edges: []
})

beforeEach(() => {
  instances.length = 0
  scenes.length = 0
})

afterEach(() => {
  resetThumbnails()
  vi.clearAllMocks()
})

describe('renderThumbnail', () => {
  it('returns the snapshot as a data URI', async () => {
    const uri = await renderThumbnail('es1', cluster())
    expect(uri).toBe('data:image/png;base64,AAAA')
  })

  // One offscreen instance for the whole app: a card-per-instance design would
  // put a live cytoscape and a canvas behind every row in the catalog.
  it('reuses a single renderer across shares', async () => {
    await renderThumbnail('es1', cluster())
    await renderThumbnail('es2', cluster())
    await renderThumbnail('es3', cluster())
    expect(instances).toHaveLength(1)
  })

  it('draws each share only once', async () => {
    await renderThumbnail('es1', cluster())
    await renderThumbnail('es1', cluster())
    expect(scenes).toHaveLength(1)
  })

  it('collapses concurrent requests for the same share into one render', async () => {
    const [a, b] = await Promise.all([
      renderThumbnail('es1', cluster()),
      renderThumbnail('es1', cluster())
    ])
    expect(scenes).toHaveLength(1)
    expect(a).toBe(b)
  })

  // There is only one renderer, so two renders overlapping would draw the
  // second share's nodes into the first share's snapshot.
  it('renders one share at a time', async () => {
    const pending = renderThumbnail('es1', cluster(2))
    await Promise.resolve()
    const second = renderThumbnail('es2', cluster(5))

    await Promise.resolve()
    expect(scenes).toHaveLength(1)

    await pending
    await second
    expect(scenes.map((s) => s.nodes)).toEqual([2, 5])
  })

  it('gives back nothing when the canvas cannot be exported', async () => {
    await renderThumbnail('es1', cluster())
    instances[0].toPNG.mockReturnValue(null)
    expect(await renderThumbnail('es2', cluster())).toBeNull()
  })
})
