import { describe, it, expect, vi } from 'vitest'
import { drawCluster } from '@/helpers/clusterRender.js'

function fakeRenderer() {
  return {
    updateScene: vi.fn(),
    fitToContent: vi.fn()
  }
}

const positioned = {
  options: {},
  nodes: [
    { v: 'n1', value: { _x: 120, _y: 40 } },
    { v: 'n2', value: { _x: 300, _y: 180 } }
  ],
  edges: [{ v: 'n1', w: 'n2', value: {} }]
}

const unpositioned = {
  options: {},
  nodes: [
    { v: 'n1', value: {} },
    { v: 'n2', value: {} }
  ],
  edges: [{ v: 'n1', w: 'n2', value: {} }]
}

describe('drawCluster', () => {
  it("draws a positioned cluster at the author's coordinates", async () => {
    const renderer = fakeRenderer()

    await drawCluster(renderer, positioned)

    const [model, options] = renderer.updateScene.mock.calls[0]
    expect(options.layout).toBe(false)
    expect(model.getElementById('n1').position()).toEqual({ x: 120, y: 40 })
  })

  it('lays out a cluster that carries no positions', async () => {
    const renderer = fakeRenderer()

    await drawCluster(renderer, unpositioned)

    const options = renderer.updateScene.mock.calls[0][1] ?? {}
    expect(options.layout).not.toBe(false)
  })

  it('frames the graph once it is drawn', async () => {
    const renderer = fakeRenderer()

    await drawCluster(renderer, positioned)

    expect(renderer.fitToContent).toHaveBeenCalled()
  })

  // Thumbnails snapshot the canvas the moment this resolves, so resolving
  // before an asynchronous layout settles would capture nodes mid-flight.
  it('waits for a running layout before resolving', async () => {
    const renderer = fakeRenderer()
    let settle
    renderer.updateScene.mockReturnValue(new Promise((r) => (settle = r)))
    let resolved = false

    const done = drawCluster(renderer, unpositioned).then(() => (resolved = true))

    await Promise.resolve()
    expect(resolved).toBe(false)
    expect(renderer.fitToContent).not.toHaveBeenCalled()

    settle()
    await done
    expect(renderer.fitToContent).toHaveBeenCalled()
  })
})
