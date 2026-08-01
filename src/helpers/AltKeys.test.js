import { describe, it, expect, vi } from 'vitest'
import AltKeys from '@/helpers/AltKeys.js'

function makeSut() {
  const emitter = { emit: vi.fn() }
  const modifier = {
    redraw: vi.fn(),
    backTo2D: vi.fn(),
    apply3DLayout: vi.fn(),
  }
  const alt = new AltKeys(emitter, modifier)
  return { emitter, modifier, alt }
}

describe('AltKeys diagram actions', () => {
  it('routes Alt+n/o/s/e to emitter events', () => {
    const { emitter, alt } = makeSut()
    alt.key('n')
    alt.key('o')
    alt.key('s')
    alt.key('e')
    expect(emitter.emit).toHaveBeenNthCalledWith(1, 'newDiagram')
    expect(emitter.emit).toHaveBeenNthCalledWith(2, 'showDiagramList', '')
    expect(emitter.emit).toHaveBeenNthCalledWith(3, 'saveDiagram')
    expect(emitter.emit).toHaveBeenNthCalledWith(4, 'editDiagram')
  })
})

describe('AltKeys camera controls', () => {
  it('pans with hjkl', () => {
    const { modifier, alt } = makeSut()
    alt.key('j')
    alt.key('k')
    alt.key('h')
    alt.key('l')
    expect(modifier.redraw).toHaveBeenNthCalledWith(1, { pan: 'Down' })
    expect(modifier.redraw).toHaveBeenNthCalledWith(2, { pan: 'Up' })
    expect(modifier.redraw).toHaveBeenNthCalledWith(3, { pan: 'Left' })
    expect(modifier.redraw).toHaveBeenNthCalledWith(4, { pan: 'Right' })
  })

  it('zooms with - and =', () => {
    const { modifier, alt } = makeSut()
    alt.key('-')
    alt.key('=')
    expect(modifier.redraw).toHaveBeenNthCalledWith(1, { zoom: 'Out' })
    expect(modifier.redraw).toHaveBeenNthCalledWith(2, { zoom: 'In' })
  })
})

describe('AltKeys 3D layout modes', () => {
  it('Alt+1 returns to 2D', () => {
    const { modifier, alt } = makeSut()
    alt.key('1')
    expect(modifier.backTo2D).toHaveBeenCalledOnce()
  })

  it('Alt+2/3/4 apply sphere/helix/hierarchy', () => {
    const { modifier, alt } = makeSut()
    alt.key('2')
    alt.key('3')
    alt.key('4')
    expect(modifier.apply3DLayout).toHaveBeenNthCalledWith(1, 'sphere')
    expect(modifier.apply3DLayout).toHaveBeenNthCalledWith(2, 'helix')
    expect(modifier.apply3DLayout).toHaveBeenNthCalledWith(3, 'hierarchy')
  })
})

describe('AltKeys misc', () => {
  it('never returns a reset signal', () => {
    const { alt } = makeSut()
    expect(alt.key('q')).toBe(false)
    expect(alt.key('n')).toBe(false)
  })
})
