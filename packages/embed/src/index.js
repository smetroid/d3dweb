import { deflate, inflate } from 'pako'

const MAX_ENCODED_BYTES = 4096
const DEFAULT_HOST = 'd3dweb.fly.dev'

export class EmbedSizeError extends Error {
  constructor(bytes) {
    super(
      `Encoded diagram is ${bytes} bytes (max ${MAX_ENCODED_BYTES}). ` +
        `Use embedUrl({ id }) with a public diagram instead.`
    )
    this.name = 'EmbedSizeError'
    this.bytes = bytes
  }
}

function toBase64url(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(str) {
  const padded =
    str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Encode a graphlib JSON object into a compact base64url string.
 * Throws EmbedSizeError if the result exceeds MAX_ENCODED_BYTES.
 */
export function encode(graphlibJson) {
  const compressed = deflate(JSON.stringify(graphlibJson))
  const encoded = toBase64url(compressed)
  if (encoded.length > MAX_ENCODED_BYTES) {
    throw new EmbedSizeError(encoded.length)
  }
  return encoded
}

/**
 * Decode a base64url string back into a graphlib JSON object.
 */
export function decode(str) {
  const bytes = fromBase64url(str)
  return JSON.parse(new TextDecoder().decode(inflate(bytes)))
}

/**
 * Build a canonical embed URL for d3dweb or d3d-render.
 *
 * @param {object} opts
 * @param {string} [opts.id]      - Public diagram ID (fetched by server)
 * @param {string} [opts.src]     - Already-encoded diagram payload (from encode())
 * @param {string} [opts.layout]  - Layout name (e.g. 'dagre', 'cola')
 * @param {string} [opts.theme]   - 'light' | 'dark'
 * @param {string} [opts.host]    - Host (default: d3dweb.fly.dev)
 * @param {'svg'|'png'|null} [opts.render] - If set, targets d3d-render endpoint instead of SPA
 * @param {string} [opts.renderHost] - Render service host (default: d3d-render.vercel.app)
 * @returns {URL}
 */
export function embedUrl({ id, src, layout, theme, host, render, renderHost } = {}) {
  if (!id && !src) throw new TypeError('embedUrl requires either id or src')
  if (id && src) throw new TypeError('embedUrl accepts id or src, not both')

  let base
  if (render) {
    const rh = renderHost || 'd3d-render.vercel.app'
    base = `https://${rh}/${render}`
  } else {
    base = `https://${host || DEFAULT_HOST}/`
  }

  const url = new URL(base)
  if (id) url.searchParams.set('id', id)
  if (src) url.searchParams.set('src', src)
  if (layout) url.searchParams.set('layout', layout)
  if (theme) url.searchParams.set('theme', theme)
  return url
}
