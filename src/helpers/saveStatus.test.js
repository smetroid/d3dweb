import { describe, it, expect } from 'vitest'
import { saveStatusLabel, nextSaveStatus, SAVE_EVENTS } from '@/helpers/saveStatus'

const at = new Date('2026-01-01T14:32:00')

describe('saveStatusLabel', () => {
  it('reports nothing saved yet before any persist', () => {
    expect(saveStatusLabel({ status: 'idle' })).toEqual({ text: 'Not saved', tone: 'warn' })
  })

  it('names local storage as the destination when offline', () => {
    const { text, tone } = saveStatusLabel({ status: 'local', at })
    expect(text).toBe('Local · 14:32')
    expect(tone).toBe('warn')
  })

  it('names the server once the write lands', () => {
    const { text, tone } = saveStatusLabel({ status: 'saved', at })
    expect(text).toBe('Server · 14:32')
    expect(tone).toBe('ok')
  })

  it('reports an in-flight write', () => {
    expect(saveStatusLabel({ status: 'saving', at })).toEqual({ text: 'Saving…', tone: 'busy' })
  })

  it('invites a retry when the write failed', () => {
    expect(saveStatusLabel({ status: 'error', at })).toEqual({
      text: 'Failed — retry',
      tone: 'error'
    })
  })

  it('omits the timestamp when one was never recorded', () => {
    expect(saveStatusLabel({ status: 'local' }).text).toBe('Local')
    expect(saveStatusLabel({ status: 'saved' }).text).toBe('Server')
  })
})

describe('nextSaveStatus', () => {
  const now = new Date('2026-01-01T14:32:00')
  const idle = { status: 'idle', at: null, message: '' }

  it('stamps the time a local-only save happened', () => {
    expect(nextSaveStatus(idle, SAVE_EVENTS.local, {}, now)).toEqual({
      status: 'local',
      at: now,
      message: ''
    })
  })

  it('prefers the time the graph reported for a server save', () => {
    const reported = new Date('2026-01-01T09:00:00')
    expect(nextSaveStatus(idle, SAVE_EVENTS.saved, { at: reported }, now).at).toBe(reported)
  })

  it('falls back to the current time when none was reported', () => {
    expect(nextSaveStatus(idle, SAVE_EVENTS.saved, {}, now).at).toBe(now)
  })

  it('keeps the last successful timestamp visible while saving', () => {
    const saved = { status: 'saved', at: now, message: '' }
    expect(nextSaveStatus(saved, SAVE_EVENTS.saving, {}, new Date())).toEqual({
      status: 'saving',
      at: now,
      message: ''
    })
  })

  it('keeps the last timestamp and records the reason on failure', () => {
    const saved = { status: 'saved', at: now, message: '' }
    expect(nextSaveStatus(saved, SAVE_EVENTS.error, { message: 'nope' }, new Date())).toEqual({
      status: 'error',
      at: now,
      message: 'nope'
    })
  })

  it('leaves state untouched for an unrelated event', () => {
    expect(nextSaveStatus(idle, 'save:bogus', {}, now)).toBe(idle)
  })
})
