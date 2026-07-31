import { describe, it, expect } from 'vitest'
import cytoscape from 'cytoscape'
import {
  graphlibToCytoscape,
  cytoscapeToGraphlib,
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

describe('graphlibToCytoscape', () => {
  const elements = graphlibToCytoscape(graphlibJson)
  const nodeData = Object.fromEntries(elements.filter(e => e.group === 'nodes').map(e => [e.data.id, e.data]))
  const edgeData = Object.fromEntries(elements.filter(e => e.group === 'edges').map(e => [e.data.id, e.data]))

  it('converts every node and edge', () => {
    expect(elements.filter(e => e.group === 'nodes')).toHaveLength(6)
    expect(elements.filter(e => e.group === 'edges')).toHaveLength(5)
  })

  it('preserves node data', () => {
    expect(nodeData.n1.label).toBe('Alpha')
    expect(nodeData.n2.shape).toBe('ellipse')
    expect(nodeData.n3.style).toBe('fill:#ff5722')
    expect(nodeData.c1.clusterLabelPos).toBe('top')
  })

  it('maps graphlib parent to cytoscape parent', () => {
    expect(nodeData.n4.parent).toBe('c1')
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
    expect(generated[0].id).toMatch(/^e_/)
  })

  it('round-trips through a real cytoscape instance', () => {
    const cy = cytoscape({ headless: true, elements })
    expect(cy.nodes()).toHaveLength(6)
    expect(cy.edges()).toHaveLength(5)
    expect(cy.getElementById('n4').parent().id()).toBe('c1')
  })
})

describe('cytoscapeToGraphlib', () => {
  const elements = graphlibToCytoscape(graphlibJson)
  const cy = cytoscape({ headless: true, elements })
  const roundTrip = cytoscapeToGraphlib(cy)

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

  it('maps cytoscape parent back to graphlib parent', () => {
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
})

describe('round-trip stability', () => {
  it('graphlib → cytoscape → graphlib is idempotent for the full payload', () => {
    const elements = graphlibToCytoscape(graphlibJson)
    const cy = cytoscape({ headless: true, elements })
    const out = cytoscapeToGraphlib(cy)

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
    const empty = graphlibToCytoscape({ nodes: [], edges: [] })
    expect(empty).toHaveLength(0)
    const cy = cytoscape({ headless: true, elements: empty })
    const out = cytoscapeToGraphlib(cy)
    expect(out.nodes).toHaveLength(0)
    expect(out.edges).toHaveLength(0)
  })
})
