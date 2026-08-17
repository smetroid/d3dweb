import { describe, it, expect } from 'vitest'
import { encode, decode, embedUrl, EmbedSizeError } from './index.js'

const SMALL = {
  options: { directed: true, multigraph: false, compound: true },
  nodes: [
    { v: 'api', value: { label: 'API' } },
    { v: 'db', value: { label: 'DB' } }
  ],
  edges: [{ v: 'api', w: 'db', value: {} }]
}

const WITH_POSITIONS = {
  options: { directed: true, multigraph: false, compound: true },
  nodes: [
    { v: 'a', value: { label: 'A', _x: 100, _y: 200 } },
    { v: 'b', value: { label: 'B', _x: 300, _y: 200 } },
    { v: 'c', value: { label: 'C', bgColor: '#ff0000', _x: 200, _y: 400 } }
  ],
  edges: [
    { v: 'a', w: 'b', value: { label: 'calls' } },
    { v: 'b', w: 'c', value: {} }
  ]
}

const WITH_PARENT = {
  options: { directed: true, multigraph: false, compound: true },
  nodes: [
    { v: 'cluster1', value: { label: 'Backend' } },
    { v: 'svc', value: { label: 'Service' }, parent: 'cluster1' },
    { v: 'db', value: { label: 'DB' }, parent: 'cluster1' }
  ],
  edges: [{ v: 'svc', w: 'db', value: {} }]
}

const EMPTY = {
  options: { directed: true, multigraph: false, compound: true },
  nodes: [],
  edges: []
}

describe('encode / decode round-trip', () => {
  for (const [name, graph] of Object.entries({ SMALL, WITH_POSITIONS, WITH_PARENT, EMPTY })) {
    it(`round-trips ${name}`, () => {
      const encoded = encode(graph)
      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
      expect(decode(encoded)).toEqual(graph)
    })
  }

  it('produces URL-safe characters only', () => {
    const encoded = encode(SMALL)
    expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it('is deterministic for same input', () => {
    expect(encode(SMALL)).toBe(encode(SMALL))
  })
})

describe('size guard', () => {
  it('throws EmbedSizeError when encoded payload exceeds 4096 bytes', () => {
    const huge = {
      options: { directed: true, multigraph: false, compound: true },
      nodes: Array.from({ length: 400 }, (_, i) => ({
        v: `node-${i}`,
        value: {
          label: `Node ${i}`,
          description: `A longer description for node ${i} to increase payload size`
        }
      })),
      edges: Array.from({ length: 399 }, (_, i) => ({
        v: `node-${i}`,
        w: `node-${i + 1}`,
        value: {}
      }))
    }
    expect(() => encode(huge)).toThrow(EmbedSizeError)
  })

  it('EmbedSizeError has bytes property', () => {
    const huge = {
      options: { directed: true, multigraph: false, compound: true },
      nodes: Array.from({ length: 400 }, (_, i) => ({
        v: `n${i}`,
        value: {
          label: `long label for node ${i} that adds up`,
          extra: `padding-${i}-padding-${i}`
        }
      })),
      edges: []
    }
    try {
      encode(huge)
    } catch (e) {
      expect(e).toBeInstanceOf(EmbedSizeError)
      expect(e.bytes).toBeGreaterThan(4096)
    }
  })
})

describe('embedUrl', () => {
  it('builds SPA URL with id', () => {
    const url = embedUrl({ id: 'abc123' })
    expect(url.hostname).toBe('d3dweb.fly.dev')
    expect(url.searchParams.get('id')).toBe('abc123')
    expect(url.searchParams.get('src')).toBeNull()
  })

  it('builds SPA URL with src', () => {
    const encoded = encode(SMALL)
    const url = embedUrl({ src: encoded })
    expect(url.searchParams.get('src')).toBe(encoded)
    expect(url.searchParams.get('id')).toBeNull()
  })

  it('includes layout and theme params', () => {
    const url = embedUrl({ id: 'x', layout: 'dagre', theme: 'dark' })
    expect(url.searchParams.get('layout')).toBe('dagre')
    expect(url.searchParams.get('theme')).toBe('dark')
  })

  it('uses custom host', () => {
    const url = embedUrl({ id: 'x', host: 'localhost:5173' })
    expect(url.host).toBe('localhost:5173')
  })

  it('targets render service SVG endpoint', () => {
    const encoded = encode(SMALL)
    const url = embedUrl({ src: encoded, render: 'svg' })
    expect(url.hostname).toBe('d3d-render.fly.dev')
    expect(url.pathname).toBe('/svg')
    expect(url.searchParams.get('src')).toBe(encoded)
  })

  it('targets render service with custom renderHost', () => {
    const url = embedUrl({ id: 'x', render: 'png', renderHost: 'render.d3dweb.dev' })
    expect(url.hostname).toBe('render.d3dweb.dev')
    expect(url.pathname).toBe('/png')
  })

  it('throws when neither id nor src provided', () => {
    expect(() => embedUrl({})).toThrow(TypeError)
  })

  it('throws when both id and src provided', () => {
    expect(() => embedUrl({ id: 'x', src: 'y' })).toThrow(TypeError)
  })
})
