import { describe, it, expect } from 'vitest'
import { listIcons, resolveIcon } from '@/helpers/IconRegistry.js'

describe('listIcons for material-symbols', () => {
  it('returns a page of icon names', () => {
    const results = listIcons('material-symbols', '', { limit: 10 })
    expect(results).toHaveLength(10)
    results.forEach((n) => expect(typeof n).toBe('string'))
  })

  it('filters by substring', () => {
    const results = listIcons('material-symbols', 'home', { limit: 50 })
    expect(results.length).toBeGreaterThan(0)
    results.forEach((n) => expect(n).toContain('home'))
    expect(results).toContain('home')
  })

  it('paginates with offset', () => {
    const page1 = listIcons('material-symbols', '', { limit: 5, offset: 0 })
    const page2 = listIcons('material-symbols', '', { limit: 5, offset: 5 })
    expect(page1).not.toEqual(page2)
    expect(page2[0]).toBe(listIcons('material-symbols', '', { limit: 10 })[5])
  })

  it('is case-insensitive', () => {
    expect(listIcons('material-symbols', 'HOME', { limit: 50 })).toContain('home')
  })

  it('lists names that resolve to a drawable glyph', () => {
    const [first] = listIcons('material-symbols', '', { limit: 1 })
    const resolved = resolveIcon('material-symbols', first)
    expect(resolved.glyph).toBe(first)
  })
})
