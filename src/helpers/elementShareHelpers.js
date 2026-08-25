export function validateRootIds(ids) {
  const deduped = [...new Set(ids)]
  if (deduped.length === 0) {
    return { valid: false, error: 'Select at least one node to share.' }
  }
  return { valid: true, ids: deduped }
}

export function buildShareRequest({ rootIds, audience, depth, expDays }) {
  const ids = audience.ids ?? (audience.id ? [audience.id] : [])
  return {
    rootIds,
    audience: { kind: audience.kind, ids },
    depth,
    expDays
  }
}

export function audienceLabel(audience) {
  switch (audience.kind) {
    case 'public':
      return 'Public'
    case 'user':
      return audience.id ? `User: ${audience.id}` : 'Only me'
    case 'company':
      return `Company: ${audience.id}`
    case 'group':
      return `Group: ${audience.id}`
    default:
      return audience.kind
  }
}

export function depthOptions() {
  return [
    { value: -1, label: depthLabel(-1) },
    { value: 0, label: depthLabel(0) },
    { value: 1, label: depthLabel(1) },
    { value: 2, label: depthLabel(2) },
    { value: 3, label: depthLabel(3) },
    { value: 5, label: depthLabel(5) }
  ]
}

export function depthLabel(depth) {
  if (depth < 0) return 'Full component'
  if (depth === 0) return 'Descendants only'
  return `${depth} hop${depth !== 1 ? 's' : ''}`
}

export function shareUrl(token, base) {
  const origin = base ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/element-share/${token}`
}
