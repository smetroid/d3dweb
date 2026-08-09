// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, h, reactive, nextTick, ref, cloneVNode, onMounted, onBeforeUnmount } from 'vue'
import CommandPalette from '@/components/CommandPalette.vue'

const commands = [
  { title: 'Add Node', icon: 'mdi-shape-square-plus', group: 'Actions' },
  { title: 'Login', icon: 'mdi-login', group: 'Menu' },
  { title: 'Save Changes', icon: 'mdi-content-save-outline', group: 'Menu' },
]

function mountPalette() {
  const state = reactive({ open: false })
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp({
    setup() {
      return () => h(CommandPalette, {
        open: state.open,
        commands,
        'onUpdate:open': (v) => { state.open = v },
      })
    },
  })

  app.component('v-icon', { template: '<span />' })
  // FocusTrap stub — mirrors focus-trap-vue's native Tab cycling between
  // tabbable elements (input + list container). Like the real library
  // (dist/focus-trap-vue.cjs.js:141) it clones the dialog root and overwrites
  // its ref, so $refs.palette is null inside the palette — any regression that
  // reads that ref directly will fail here.
  app.component('FocusTrap', {
    name: 'FocusTrap',
    props: {
      active: { type: Boolean, default: true },
      escapeDeactivates: { type: Boolean, default: true },
      returnFocusOnDeactivate: { type: Boolean, default: true },
      initialFocus: { type: [String, Function, Boolean], default: undefined },
    },
    setup(props, { slots }) {
      const wrapper = ref(null)
      const onKeydown = (event) => {
        if (!props.active || event.key !== 'Tab') return
        const el = wrapper.value
        if (!el || !el.contains(event.target)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        const tabbables = Array.from(el.querySelectorAll('input, [tabindex]'))
          .filter((el) => el.tabIndex >= 0)
        if (!tabbables.length) return
        const idx = tabbables.indexOf(event.target)
        const next = event.shiftKey
          ? (idx <= 0 ? tabbables[tabbables.length - 1] : tabbables[idx - 1])
          : (idx >= tabbables.length - 1 ? tabbables[0] : tabbables[idx + 1])
        next.focus({ preventScroll: true })
      }
      onMounted(() => document.addEventListener('keydown', onKeydown, true))
      onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true))
      return () => {
        const [vnode] = slots.default?.() ?? []
        const children = vnode ? [cloneVNode(vnode, { ref: wrapper })] : []
        return h('div', { class: 'trap' + (props.active ? ' trap-on' : '') }, children)
      }
    },
  })

  app.mount(host)
  return { state, app, host }
}

const traps = () => Array.from(document.querySelectorAll('.trap'))
const trapOn = () => document.querySelectorAll('.trap-on')
const isInputTrap = (el) => !!el.querySelector('.fx-palette-input-wrap')
const isListTrap = (el) => !!el.querySelector('#fx-palette-list')

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

const press = (key, opts = {}) => {
  const target = opts.target || document.activeElement
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }))
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CommandPalette focus regions', () => {
  it('wraps the whole dialog in a single focus trap', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    const all = traps()
    expect(all).toHaveLength(1)
    expect(isInputTrap(all[0])).toBe(true)
    expect(isListTrap(all[0])).toBe(true)
  })

  it('exposes exactly two focus stops: the search textbox and the menu-links container', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    const input = document.querySelector('.fx-palette-input')
    const list = document.querySelector('#fx-palette-list')
    const items = Array.from(document.querySelectorAll('.fx-palette-item'))
    expect(input.tabIndex).toBe(0)
    expect(list.tabIndex).toBe(0)
    expect(items.every((el) => el.tabIndex < 0)).toBe(true)
  })

  it('activates the trap and focuses the search textbox on open', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    expect(trapOn()).toHaveLength(1)
    expect(document.activeElement?.classList.contains('fx-palette-input')).toBe(true)
  })

  it('Tab moves focus to the menu-links container', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Tab')
    await flush()

    const list = document.querySelector('#fx-palette-list')
    expect(document.activeElement).toBe(list)
    expect(list.getAttribute('aria-activedescendant')).toBe('fx-palette-opt-0')
    expect(trapOn()).toHaveLength(1)
  })

  it('j/k move the selection inside the menu links region', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Tab')
    await flush()

    const items = Array.from(document.querySelectorAll('.fx-palette-item'))
    const list = document.querySelector('#fx-palette-list')

    press('j')
    await flush()
    expect(document.activeElement).toBe(list)
    expect(items[1].getAttribute('aria-selected')).toBe('true')

    press('k')
    await flush()
    expect(document.activeElement).toBe(list)
    expect(items[0].getAttribute('aria-selected')).toBe('true')
  })

  it('Tab moves focus from the menu links back to the textbox', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Tab')
    await flush()
    press('Tab')
    await flush()

    expect(document.activeElement?.classList.contains('fx-palette-input')).toBe(true)
    expect(trapOn()).toHaveLength(1)
  })

  it('Shift+Tab moves focus back to the textbox', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Tab')
    await flush()
    press('Tab', { shiftKey: true })
    await flush()

    expect(document.activeElement?.classList.contains('fx-palette-input')).toBe(true)
  })

  it('Escape closes the palette', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Escape')
    await flush()
    await new Promise((r) => setTimeout(r, 20))

    expect(state.open).toBe(false)
    const gone = await (async () => {
      for (let i = 0; i < 20; i++) {
        if (!document.querySelector('.fx-palette')) return true
        await new Promise((r) => setTimeout(r, 20))
      }
      return false
    })()
    expect(gone).toBe(true)
  })

  it('clicking the overlay closes the palette', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    document.querySelector('.fx-palette-overlay')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flush()
    await new Promise((r) => setTimeout(r, 20))

    expect(state.open).toBe(false)
  })

  it('typing while the menu links are focused jumps back to the search field', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Tab')
    await flush()
    expect(document.activeElement?.id).toBe('fx-palette-list')

    press('a')
    await flush()

    expect(document.activeElement?.classList.contains('fx-palette-input')).toBe(true)
    expect(document.querySelector('.fx-palette-input').value).toBe('a')

    // j/k in the search textbox are ordinary characters, not navigation
    press('j')
    await flush()
    const input = document.querySelector('.fx-palette-input')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-activedescendant')).toBe('fx-palette-opt-0')
  })

  it('hovering from the textbox region does not change the selection', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    const items = Array.from(document.querySelectorAll('.fx-palette-item'))
    items[2].dispatchEvent(new MouseEvent('mouseenter'))
    await flush()
    expect(document.querySelector('.fx-palette-input').getAttribute('aria-activedescendant')).toBe('fx-palette-opt-0')

    // j/k in the textbox do not navigate the list
    press('j')
    await flush()
    expect(document.activeElement?.classList.contains('fx-palette-input')).toBe(true)
    expect(document.querySelector('.fx-palette-input').getAttribute('aria-activedescendant')).toBe('fx-palette-opt-0')
  })

  it('hovering the menu links while the menu links region has focus selects the hovered item', async () => {
    const { state } = mountPalette()
    state.open = true
    await flush()

    press('Tab')
    await flush()

    const items = Array.from(document.querySelectorAll('.fx-palette-item'))
    const list = document.querySelector('#fx-palette-list')
    items[2].dispatchEvent(new MouseEvent('mouseenter'))
    await flush()

    expect(document.activeElement).toBe(list)
    expect(items[2].getAttribute('aria-selected')).toBe('true')
  })
})
