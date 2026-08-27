// Turns the save:* events DiagramGraph emits into the footer readout's text.
// Kept separate from App.vue so the wording is testable on its own.

// Both ends of the wire import these, so an emit can't drift from a listener.
export const SAVE_EVENTS = {
  local: 'save:local',
  saving: 'save:saving',
  saved: 'save:saved',
  error: 'save:error'
}

const DESTINATIONS = { local: 'Local', saved: 'Server' }

function clockTime(at) {
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) return ''
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function saveStatusLabel({ status, at } = {}) {
  if (status === 'saving') return { text: 'Saving…', tone: 'busy' }
  if (status === 'error') return { text: 'Failed — retry', tone: 'error' }

  const destination = DESTINATIONS[status]
  if (!destination) return { text: 'Not saved', tone: 'warn' }

  const time = clockTime(at)
  return {
    text: time ? `${destination} · ${time}` : destination,
    tone: status === 'saved' ? 'ok' : 'warn'
  }
}

// Pure reducer over the save:* events, so the footer's state is testable
// without mounting App.
export function nextSaveStatus(current, event, detail = {}, now = new Date()) {
  switch (event) {
    case SAVE_EVENTS.local:
      return { status: 'local', at: now, message: '' }
    case SAVE_EVENTS.saved:
      return { status: 'saved', at: detail.at || now, message: '' }
    // Saving and error both keep the last known good timestamp on screen —
    // "Server · 14:32" going blank would read as data loss.
    case SAVE_EVENTS.saving:
      return { ...current, status: 'saving', message: '' }
    case SAVE_EVENTS.error:
      return { ...current, status: 'error', message: detail.message || '' }
    default:
      return current
  }
}
