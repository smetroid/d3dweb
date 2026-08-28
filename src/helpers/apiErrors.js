// The API reports failures as {status: "error", message: "..."} (see
// models.StatusResponse server-side). `source` may be an Axios error or an
// already-unwrapped response body; anything without a usable message — a
// network failure, an HTML error page from a proxy — yields the fallback
// rather than leaking a raw JS error string to the user.
export function serverErrorMessage(source, fallback) {
  const body = source?.response?.data ?? (source instanceof Error ? null : source)
  const message = body?.message ?? body?.error
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
}
