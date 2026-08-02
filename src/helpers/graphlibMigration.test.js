import { describe, it, expect } from 'vitest'
import {
  graphlibToModel,
  modelToGraphlib,
  isGraphlibFormat,
} from '@/helpers/graphlibMigration.js'

// Realistic graphlib payload as saved by the old dagre-d3 app
const graphlibJson = {
  options: { directed: true, multigraph: false, compound: true },
  nodes: [
    { v: 'n1', value: { label: 'Alpha', shape: 'rect', style: 'fill:#4caf50', labelType: 'text' } },
    { v: 'n2', value: { label: 'Beta', shape: 'ellipse', style: 'fill:#2196f3', labelType: 'text' } },
    { v: 'n3', value: { label: 'Gamma', shape: 'diamond', style: 'fill:#ff5722', labelType: 'text' } },
    { v: 'c1', value: { label: 'Cluster One', clusterLabelPos: 'top', shape: 'rect' } },
    { v: 'n4', value: { label: 'Delta', shape: 'rect', style: 'fill:#9c27b0', labelType: 'text' }, parent: 'c1' },
    { v: 'n5', value: { label: 'Epsilon', shape: 'rect', style: 'fill:#795548', labelType: 'text' }, parent: 'c1' },
  ],
  edges: [
    { v: 'n1', w: 'n2', value: { id: 'e1', label: 'goes to', arrowhead: 'vee', arrowheadStyle: 'fill:#000' } },
    { v: 'n2', w: 'n3', value: { label: 'no id edge', arrowhead: 'vee' } },
    { v: 'n3', w: 'n1', value: { label: 'back edge', arrowhead: 'vee' } },
    { v: 'n4', w: 'n4', value: { label: 'self loop', arrowhead: 'vee' } },
    { v: 'n4', w: 'n5', value: { label: 'clustered edge', arrowhead: 'vee' } },
  ],
}

describe('isGraphlibFormat', () => {
  it('detects graphlib objects', () => {
    expect(isGraphlibFormat(graphlibJson)).toBe(true)
  })

  it('rejects cytoscape arrays', () => {
    expect(isGraphlibFormat([{ group: 'nodes' }])).toBe(false)
  })

  it('rejects null / undefined / non-objects', () => {
    expect(isGraphlibFormat(null)).toBe(false)
    expect(isGraphlibFormat(undefined)).toBe(false)
    expect(isGraphlibFormat('nope')).toBe(false)
  })

  it('rejects objects without a nodes array', () => {
    expect(isGraphlibFormat({ foo: 1 })).toBe(false)
  })
})

describe('graphlibToModel', () => {
  const model = graphlibToModel(graphlibJson)
  const nodeData = Object.fromEntries(model.nodes().map(n => [n.id(), n.data()]))
  const edgeData = Object.fromEntries(model.edges().map(e => [e.id(), e.data()]))

  it('converts every node and edge', () => {
    expect(model.nodes()).toHaveLength(6)
    expect(model.edges()).toHaveLength(5)
  })

  it('preserves node data', () => {
    expect(nodeData.n1.label).toBe('Alpha')
    expect(nodeData.n2.shape).toBe('ellipse')
    expect(nodeData.n3.style).toBe('fill:#ff5722')
    expect(nodeData.c1.clusterLabelPos).toBe('top')
  })

  it('maps graphlib parent to model parent', () => {
    expect(nodeData.n4.parent).toBe('c1')
    expect(model.getElementById('n4').parent().id()).toBe('c1')
  })

  it('preserves explicit edge ids', () => {
    expect(edgeData.e1).toBeDefined()
    expect(edgeData.e1.source).toBe('n1')
    expect(edgeData.e1.target).toBe('n2')
    expect(edgeData.e1.label).toBe('goes to')
    expect(edgeData.e1.arrowhead).toBe('vee')
  })

  it('generates stable ids for id-less edges', () => {
    const generated = Object.values(edgeData).filter(e => e.source === 'n2' && e.target === 'n3')
    expect(generated).toHaveLength(1)
    expect(generated[0].id).toBe('n2->n3')
  })
})

describe('modelToGraphlib', () => {
  const model = graphlibToModel(graphlibJson)
  const roundTrip = modelToGraphlib(model)

  it('serializes all nodes and edges', () => {
    expect(roundTrip.nodes).toHaveLength(6)
    expect(roundTrip.edges).toHaveLength(5)
    expect(roundTrip.options.directed).toBe(true)
    expect(roundTrip.options.compound).toBe(true)
  })

  it('keeps node ids in v and data in value', () => {
    const n1 = roundTrip.nodes.find(n => n.v === 'n1')
    expect(n1.value.label).toBe('Alpha')
    expect(n1.value.id).toBeUndefined()
  })

  it('maps model parent back to graphlib parent', () => {
    const n4 = roundTrip.nodes.find(n => n.v === 'n4')
    expect(n4.parent).toBe('c1')
    expect(n4.value.parent).toBeUndefined()
  })

  it('preserves edge ids across the round trip', () => {
    const e1 = roundTrip.edges.find(e => e.value.id === 'e1')
    expect(e1).toBeDefined()
    expect(e1.v).toBe('n1')
    expect(e1.w).toBe('n2')
    expect(e1.value.label).toBe('goes to')
    expect(e1.value.arrowhead).toBe('vee')
    expect(e1.value.source).toBeUndefined()
    expect(e1.value.target).toBeUndefined()
  })

  it('carries cola constraints through options.constraints', () => {
    const withConstraints = graphlibToModel(graphlibJson)
    withConstraints.colaConstraints = [
      { type: 'alignment', axis: 'y', offsets: [{ node: 'n1', offset: 0 }, { node: 'n2', offset: 0 }] },
      { axis: 'x', left: 'n1', right: 'n2', gap: 50 },
    ]
    const out = modelToGraphlib(withConstraints)
    expect(out.options.constraints).toEqual(withConstraints.colaConstraints)
  })

  it('omits options.constraints when empty', () => {
    const out = modelToGraphlib(model)
    expect(out.options.constraints).toBeUndefined()
  })
})

describe('round-trip stability', () => {
  it('graphlib → model → graphlib is idempotent for the full payload', () => {
    const model = graphlibToModel(graphlibJson)
    const out = modelToGraphlib(model)

    expect(out.nodes.map(n => n.v).sort()).toEqual(graphlibJson.nodes.map(n => n.v).sort())

    const pairs = graphlibJson.edges.map(e => `${e.v}->${e.w}`).sort()
    expect(out.edges.map(e => `${e.v}->${e.w}`).sort()).toEqual(pairs)

    graphlibJson.edges
      .filter(e => e.value?.id)
      .forEach(original => {
        const serialized = out.edges.find(e => e.v === original.v && e.w === original.w)
        expect(serialized.value.id).toBe(original.value.id)
      })

    out.edges.forEach(serialized => {
      expect(serialized.value.id).toBeDefined()
      expect(serialized.value.source).toBeUndefined()
      expect(serialized.value.target).toBeUndefined()
    })
  })

  it('handles empty graphs', () => {
    const empty = graphlibToModel({ nodes: [], edges: [] })
    expect(empty.nodes()).toHaveLength(0)
    const out = modelToGraphlib(empty)
    expect(out.nodes).toHaveLength(0)
    expect(out.edges).toHaveLength(0)
  })
})
