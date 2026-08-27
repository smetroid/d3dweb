// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { ensureIconFont } from '@/helpers/IconRegistry.js'

describe('ensureIconFont', () => {
  beforeEach(() => {
    document.getElementById('material-symbols-link')?.remove()
  })

  it('injects the Google stylesheet for material-symbols without rendering the canvas', () => {
    ensureIconFont('material-symbols')
    const link = document.getElementById('material-symbols-link')
    expect(link).not.toBeNull()
    expect(link.href).toContain('Material+Symbols+Rounded')
  })

  it('is a no-op for the bundled mdi set', () => {
    ensureIconFont('mdi')
    expect(document.getElementById('material-symbols-link')).toBeNull()
  })
})

describe('resolveIcon font side effect', () => {
  it('requests the Material Symbols face so canvas labels can draw the glyph', async () => {
    document.getElementById('material-symbols-link')?.remove()
    const { resolveIcon } = await import('@/helpers/IconRegistry.js')
    resolveIcon('material-symbols', 'home')
    expect(document.getElementById('material-symbols-link')).not.toBeNull()
  })
})
