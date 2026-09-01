// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'

const { mockSocialCallback, mockReplace } = vi.hoisted(() => ({
  mockSocialCallback: vi.fn(),
  mockReplace: vi.fn()
}))

vi.mock('@/services/api', () => ({ default: { socialCallback: mockSocialCallback } }))

import AuthCallback from '@/components/AuthCallback.vue'
import { session, clearSession } from '@/services/session'

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountCallback(query) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp({
    render: () => h(AuthCallback)
  })
  app.config.globalProperties.$route = { query }
  app.config.globalProperties.$router = { replace: mockReplace }
  app.mount(el)
  return { app, el }
}

describe('AuthCallback', () => {
  beforeEach(() => {
    mockSocialCallback.mockReset()
    mockReplace.mockReset()
    clearSession()
  })

  it('exchanges the code and redirects home on success', async () => {
    const user = { username: 'github:smetroid', displayName: 'Enrique' }
    mockSocialCallback.mockResolvedValue({ data: { user } })

    mountCallback({ code: 'c1', state: 's1', provider: 'github' })
    await flush()

    expect(mockSocialCallback).toHaveBeenCalledWith({
      code: 'c1',
      state: 's1',
      provider: 'github'
    })
    expect(session.user).toEqual(user)
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('shows an error and does not redirect when the exchange fails', async () => {
    mockSocialCallback.mockRejectedValue({ response: { status: 401 } })

    const { el } = mountCallback({ code: 'c1', state: 'bad', provider: 'github' })
    await flush()

    expect(mockReplace).not.toHaveBeenCalled()
    expect(session.user).toBeNull()
    expect(el.textContent).toMatch(/sign in|try again/i)
  })

  it('errors immediately when the provider sent no code', async () => {
    const { el } = mountCallback({ error: 'access_denied' })
    await flush()

    expect(mockSocialCallback).not.toHaveBeenCalled()
    expect(el.textContent).toMatch(/sign in|try again/i)
  })
})
