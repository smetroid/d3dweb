import { describe, it, expect } from 'vitest'
import {
  resolveIcon,
  composeIconLabel,
  listIcons,
  isValidIcon,
  ICON_SETS,
  ICON_POSITIONS
} from '@/helpers/IconRegistry.js'

describe('resolveIcon', () => {
  it('resolves a known MDI icon to a glyph + font-family', () => {
    const r = resolveIcon('mdi', 'mdi-account')
    expect(r).not.toBeNull()
    expect(typeof r.glyph).toBe('string')
    expect(r.glyph.length).toBeGreaterThan(0)
    expect(r.fontFamily).toContain('Material Design Icons')
  })

  it('returns null for an unknown MDI name', () => {
    expect(resolveIcon('mdi', 'mdi-does-not-exist-xyz')).toBeNull()
  })

  it('resolves a Material Symbols icon using the name as glyph (ligature)', () => {
    const r = resolveIcon('material-symbols', 'home')
    expect(r).not.toBeNull()
    expect(r.glyph).toBe('home')
    expect(r.fontFamily).toContain('Material Symbols Rounded')
  })

  it('returns null for empty set or name', () => {
    expect(resolveIcon(null, 'mdi-account')).toBeNull()
    expect(resolveIcon('mdi', '')).toBeNull()
    expect(resolveIcon('mdi', null)).toBeNull()
  })
})

describe('composeIconLabel', () => {
  const GLYPH = resolveIcon('mdi', 'mdi-account')?.glyph ?? '\uF0004'

  it('returns empty displayLabel and undefined displayFont when no icon', () => {
    const r = composeIconLabel({ label: 'Hello', iconSet: null, iconName: null })
    expect(r.displayLabel).toBeUndefined()
    expect(r.displayFont).toBeUndefined()
  })

  it('icon-only: displayLabel is just the glyph', () => {
    const r = composeIconLabel({
      label: 'Hello',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'only'
    })
    expect(r.displayLabel).toBe(GLYPH)
    expect(r.displayFont).toBeTruthy()
  })

  it('icon-only: works even when label is empty', () => {
    const r = composeIconLabel({
      label: '',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'only'
    })
    expect(r.displayLabel).toBe(GLYPH)
  })

  it('left: glyph + space + text', () => {
    const r = composeIconLabel({
      label: 'Hello',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'left'
    })
    expect(r.displayLabel).toBe(`${GLYPH} Hello`)
  })

  it('right: text + space + glyph', () => {
    const r = composeIconLabel({
      label: 'Hello',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'right'
    })
    expect(r.displayLabel).toBe(`Hello ${GLYPH}`)
  })

  it('above: glyph + newline + text', () => {
    const r = composeIconLabel({
      label: 'Hello',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'above'
    })
    expect(r.displayLabel).toBe(`${GLYPH}\nHello`)
  })

  it('below: text + newline + glyph', () => {
    const r = composeIconLabel({
      label: 'Hello',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'below'
    })
    expect(r.displayLabel).toBe(`Hello\n${GLYPH}`)
  })

  it('defaults to left when position is absent', () => {
    const r = composeIconLabel({ label: 'Hello', iconSet: 'mdi', iconName: 'mdi-account' })
    expect(r.displayLabel).toBe(`${GLYPH} Hello`)
  })

  it('falls back to glyph-only when label is empty (non-only positions)', () => {
    const r = composeIconLabel({
      label: '',
      iconSet: 'mdi',
      iconName: 'mdi-account',
      iconPosition: 'left'
    })
    expect(r.displayLabel).toBe(GLYPH)
  })

  it('returns undefined displayFont for unknown MDI name', () => {
    const r = composeIconLabel({ label: 'X', iconSet: 'mdi', iconName: 'mdi-nonexistent-zzz' })
    expect(r.displayFont).toBeUndefined()
    expect(r.displayLabel).toBeUndefined()
  })

  it('material-symbols: displayLabel is the icon name (ligature)', () => {
    const r = composeIconLabel({
      label: 'Home',
      iconSet: 'material-symbols',
      iconName: 'home',
      iconPosition: 'left'
    })
    expect(r.displayLabel).toBe('home Home')
    expect(r.displayFont).toContain('Material Symbols')
  })
})

describe('listIcons', () => {
  it('returns up to `limit` MDI names', () => {
    const results = listIcons('mdi', '', { limit: 10 })
    expect(results.length).toBe(10)
    expect(results.every((n) => n.startsWith('mdi-'))).toBe(true)
  })

  it('filters by substring (without mdi- prefix)', () => {
    const results = listIcons('mdi', 'account', { limit: 50 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((n) => n.includes('account'))).toBe(true)
  })

  it('returns empty array for unknown set', () => {
    expect(listIcons('fontawesome', '', { limit: 10 })).toEqual([])
  })

  it('offset pagination works', () => {
    const page1 = listIcons('mdi', '', { limit: 5, offset: 0 })
    const page2 = listIcons('mdi', '', { limit: 5, offset: 5 })
    expect(page1).not.toEqual(page2)
    expect(page2[0]).toBe(listIcons('mdi', '', { limit: 10 })[5])
  })
})

describe('isValidIcon', () => {
  it('returns true for a known MDI name', () => {
    expect(isValidIcon('mdi', 'mdi-account')).toBe(true)
  })

  it('returns false for an unknown MDI name', () => {
    expect(isValidIcon('mdi', 'mdi-does-not-exist')).toBe(false)
  })

  it('returns true for any non-empty material-symbols name', () => {
    expect(isValidIcon('material-symbols', 'home')).toBe(true)
    expect(isValidIcon('material-symbols', '')).toBe(false)
  })
})

describe('constants', () => {
  it('ICON_SETS includes mdi and material-symbols', () => {
    const values = ICON_SETS.map((s) => s.value)
    expect(values).toContain('mdi')
    expect(values).toContain('material-symbols')
  })

  it('ICON_POSITIONS includes all 5 positions', () => {
    const values = ICON_POSITIONS.map((p) => p.value)
    expect(values).toContain('left')
    expect(values).toContain('right')
    expect(values).toContain('above')
    expect(values).toContain('below')
    expect(values).toContain('only')
  })
})
