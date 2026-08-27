// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import D3NodeForm from '@/components/D3NodeForm.vue'

describe('D3NodeForm material symbols', () => {
  it('loads the Material Symbols font when the set is chosen while editing', async () => {
    document.getElementById('material-symbols-link')?.remove()
    const host = document.createElement('div')
    document.body.appendChild(host)
    let vm
    const app = createApp({
      provide: { modifier: ref({ renderer: null }) },
      render: () =>
        h(D3NodeForm, { active: 'Edit Node', d3Data: { id: 'n1', label: 'A' }, ref: 'f' }),
      mounted() {
        vm = this.$refs.f
      }
    })
    app.config.globalProperties.$cookies = { get: () => null, set: () => {} }
    app.component('focus-trap', { template: '<div><slot/></div>' })
    app.mount(host)
    await nextTick()

    expect(document.getElementById('material-symbols-link')).toBeNull()
    vm.pickIconSet('material-symbols')
    await nextTick()
    const link = document.getElementById('material-symbols-link')
    expect(link).not.toBeNull()
    expect(link.href).toContain('Material+Symbols+Rounded')
    app.unmount()
  })

  it('shows a searchable Material Symbols grid, not just a free-text field', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let vm
    const app = createApp({
      provide: { modifier: ref({ renderer: null }) },
      render: () =>
        h(D3NodeForm, { active: 'Edit Node', d3Data: { id: 'n1', label: 'A' }, ref: 'f' }),
      mounted() {
        vm = this.$refs.f
      }
    })
    app.config.globalProperties.$cookies = { get: () => null, set: () => {} }
    app.component('focus-trap', { template: '<div><slot/></div>' })
    app.mount(host)
    await nextTick()

    vm.pickIconSet('material-symbols')
    vm.iconSearch = 'home'
    vm.showIconPicker = true
    await nextTick()

    const glyphs = [...host.querySelectorAll('.fx-icon-item .material-symbols-rounded')]
    expect(glyphs.length).toBeGreaterThan(0)
    // The grid renders the ligature name as text — that IS the glyph for this font.
    expect(glyphs.map((el) => el.textContent.trim())).toContain('home')

    // Clicking a result fills the field.
    host.querySelector('.fx-icon-item').click()
    await nextTick()
    expect(vm.iconName).toBe(glyphs[0].textContent.trim())
    app.unmount()
  })
})
