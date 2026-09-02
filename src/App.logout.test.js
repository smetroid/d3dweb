// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// App.vue is a large orchestrator (Vuetify chrome, cytoscape canvas, many
// child components) with no existing mount harness in this repo — other
// large SFCs (DiagramForm.vue, DiagramList.vue) are likewise only exercised
// through the plain modules they delegate to, not by mounting the component.
// logout() only touches `this.emitter`, `this.loggedInUser` and
// `this.inboxCount`, so it can be tested directly off the compiled options
// object (App.methods.logout) with a minimal fake `this`, without mounting.
const { mockD3UtilLogout } = vi.hoisted(() => ({ mockD3UtilLogout: vi.fn() }))

vi.mock('@/helpers/D3Util.js', () => ({
  default: {
    isMac: () => false,
    logout: mockD3UtilLogout,
    // appDefaults()/other bits referenced at module scope while building
    // `menuLinks` in data() — never called here, but keep the shape safe.
    debug: false
  }
}))

import App from '@/App.vue'

function fakeThis() {
  return {
    loggedInUser: 'alice',
    inboxCount: 3,
    emitter: { emit: vi.fn() }
  }
}

describe('App.methods.logout', () => {
  beforeEach(() => {
    mockD3UtilLogout.mockReset()
  })

  it('clears the signed-in state and toasts on success', async () => {
    mockD3UtilLogout.mockResolvedValue()
    const self = fakeThis()

    await App.methods.logout.call(self)

    expect(self.loggedInUser).toBeNull()
    expect(self.inboxCount).toBe(0)
    expect(self.emitter.emit).toHaveBeenCalledWith('appMessage', {
      message: 'Logged out',
      status: 'info'
    })
  })

  // Minor C: D3Util.logout() clears the session store in its own
  // finally block but still rethrows a rejected api.logout() call. Without
  // a try/finally in App.vue's own logout(), that throw would propagate out
  // here and skip the lines below — leaving a stale username in the top bar
  // and no "Logged out" toast even though the store already forgot the user.
  it('still settles local UI state when the API call rejects', async () => {
    mockD3UtilLogout.mockRejectedValue(new Error('network down'))
    const self = fakeThis()

    // The try/finally settles local state before the rejection propagates —
    // it does not swallow the error, so the caller still sees it reject.
    await expect(App.methods.logout.call(self)).rejects.toThrow('network down')

    expect(self.loggedInUser).toBeNull()
    expect(self.inboxCount).toBe(0)
    expect(self.emitter.emit).toHaveBeenCalledWith('appMessage', {
      message: 'Logged out',
      status: 'info'
    })
  })
})
