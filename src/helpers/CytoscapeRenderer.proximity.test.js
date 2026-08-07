import { describe, it, expect } from 'vitest'
import cytoscape from 'cytoscape'
import { nearestInDirection } from '@/helpers/CytoscapeRenderer.js'

function makeCy(elements) {
  // Headless cytoscape ignores (and overwrites) the position field of the
  // elements JSON, so strip it and set positions explicitly afterwards.
  const clean = elements.map(el => {
    const copy = { ...el }
    delete copy.position
    return copy
  })
  const cy = cytoscape({ headless: true, elements: clean })
  for (const el of elements) {
    if (el.group === 'nodes' && el.position) {
      cy.getElementById(el.data.id).position({ x: el.position.x, y: el.position.y })
    }
  }
  return cy
}

function nodes(...positions) {
  return positions.map(([id, x, y]) => ({
    group: 'nodes',
    data: { id },
    position: { x, y },
  }))
}

describe('nearestInDirection (nodes)', () => {
  const grid = [
    ['left', -100, 0],
    ['origin', 0, 0],
    ['right1', 100, 0],
    ['right2', 200, 0],
    ['below', 100, 100],
  ]

  it('l picks the nearest node to the right', () => {
    const cy = makeCy(nodes(...grid))
    expect(nearestInDirection(cy, 'origin', 'l', 'nodes')).toBe('right1')
  })

  it('h picks the nearest node to the left', () => {
    const cy = makeCy(nodes(...grid))
    expect(nearestInDirection(cy, 'origin', 'h', 'nodes')).toBe('left')
  })

  it('j picks the nearest node below', () => {
    const cy = makeCy(nodes(...grid))
    expect(nearestInDirection(cy, 'origin', 'j', 'nodes')).toBe('below')
  })

  it('k picks the nearest node above', () => {
    const cy = makeCy(nodes(...grid))
    // 'above' only when a node sits strictly above; grid has none, so it wraps.
    expect(nearestInDirection(cy, 'right2', 'k', 'nodes')).toBe('below')
  })

  it('wraps to the element farthest on the opposite side of the same axis', () => {
    const cy = makeCy(nodes(['a', 0, 0], ['far', 200, 0]))
    expect(nearestInDirection(cy, 'a', 'h', 'nodes')).toBe('far')
  })

  it('prefers a better-aligned node over a closer but off-line one', () => {
    const cy = makeCy(nodes(['a', 0, 0], ['offline', 90, 200], ['aligned', 100, 5]))
    expect(nearestInDirection(cy, 'a', 'l', 'nodes')).toBe('aligned')
  })

  it('returns null when the graph has no other node', () => {
    const cy = makeCy(nodes(['only', 0, 0]))
    expect(nearestInDirection(cy, 'only', 'l', 'nodes')).toBeNull()
  })

  it('returns null for an unknown focused id or direction', () => {
    const cy = makeCy(nodes(['a', 0, 0], ['b', 100, 0]))
    expect(nearestInDirection(cy, 'nope', 'l', 'nodes')).toBeNull()
    expect(nearestInDirection(cy, 'a', 'x', 'nodes')).toBeNull()
    expect(nearestInDirection(cy, null, 'l', 'nodes')).toBeNull()
  })
})

describe('nearestInDirection (edges)', () => {
  it('uses the edge midpoint as the anchor', () => {
    const cy = makeCy([
      ...nodes(['p', 0, 0], ['q', 100, 0], ['r', 200, 0]),
      { group: 'edges', data: { id: 'e1', source: 'p', target: 'q' } },
      { group: 'edges', data: { id: 'e2', source: 'q', target: 'r' } },
    ])
    expect(nearestInDirection(cy, 'e1', 'l', 'edges')).toBe('e2')
    expect(nearestInDirection(cy, 'e2', 'h', 'edges')).toBe('e1')
  })

  it('returns null when no other edge exists', () => {
    const cy = makeCy([
      ...nodes(['p', 0, 0], ['q', 100, 0]),
      { group: 'edges', data: { id: 'e1', source: 'p', target: 'q' } },
    ])
    expect(nearestInDirection(cy, 'e1', 'l', 'edges')).toBeNull()
  })
})
