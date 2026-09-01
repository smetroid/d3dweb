// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import router, { FULLSCREEN_ROUTES } from '@/router'

describe('router', () => {
  // Every route in this app is a standalone page. App.vue only renders
  // <RouterView> for routes in FULLSCREEN_ROUTES — a route missing from the
  // array never mounts at all, and fails silently with the editor showing
  // in its place.
  it('every declared route is listed in FULLSCREEN_ROUTES', () => {
    const declared = router.getRoutes().map((r) => r.name)
    expect(declared.sort()).toEqual([...FULLSCREEN_ROUTES].sort())
  })
})
