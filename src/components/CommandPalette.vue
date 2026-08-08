<template>
  <Teleport to="body">
    <transition name="fx-palette">
      <div v-if="open" class="fx-palette-overlay" @mousedown.self="close()">
        <!-- Single focus trap around the whole dialog (DiagramList pattern).
             The dialog exposes exactly TWO focus stops: the search textbox and
             the menu-links region. focus-trap's own Tab handling cycles between
             them, so there is no document-level Tab interception and the switch
             cannot race any other trap. -->
        <FocusTrap
          :active="open"
          :escape-deactivates="false"
          :return-focus-on-deactivate="false"
          :initial-focus="() => $refs.input"
        >
          <div
            class="fx-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            @focusin="onRegionFocusin"
            @keydown.stop="onKeydown"
          >
            <div class="fx-palette-input-wrap">
              <v-icon class="fx-palette-search-icon" icon="mdi-magnify" />
              <input
                ref="input"
                v-model="query"
                class="fx-palette-input"
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls="fx-palette-list"
                :aria-activedescendant="activeId"
                placeholder="Type a command…"
                autocomplete="off"
                spellcheck="false"
              />
              <kbd class="fx-kbd fx-palette-esc">ESC</kbd>
            </div>

            <div
              v-if="filtered.length"
              id="fx-palette-list"
              ref="list"
              class="fx-palette-list"
              role="listbox"
              aria-label="Commands"
              tabindex="0"
              :aria-activedescendant="activeId"
            >
              <template v-for="(cmd, i) in filtered" :key="cmd.group + ':' + cmd.title">
                <div v-if="showGroupHeader(cmd, i)" class="fx-palette-group">
                  {{ cmd.group }}
                </div>
                <div
                  ref="items"
                  class="fx-palette-item"
                  :class="{ 'fx-palette-item--active': i === activeIndex }"
                  role="option"
                  :id="itemId(i)"
                  :aria-selected="i === activeIndex"
                  @click="run(cmd)"
                  @mouseenter="onItemHover(i)"
                >
                  <v-icon class="fx-palette-item-icon" :icon="cmd.icon" />
                  <span class="fx-palette-item-title">{{ cmd.title }}</span>
                  <kbd v-if="cmd.shortcut" class="fx-kbd fx-palette-item-shortcut">
                    {{ cmd.shortcut }}
                  </kbd>
                </div>
              </template>
            </div>

            <div v-if="!filtered.length" class="fx-palette-empty">
              No commands match “{{ query }}”
            </div>

            <div class="fx-palette-hints">
              <span><kbd class="fx-kbd">j</kbd><kbd class="fx-kbd">k</kbd> move</span>
              <span><kbd class="fx-kbd">tab</kbd> switch field</span>
              <span><kbd class="fx-kbd">enter</kbd> select</span>
              <span><kbd class="fx-kbd">esc</kbd> close</span>
            </div>
          </div>
        </FocusTrap>
      </div>
    </transition>
  </Teleport>
</template>

<script>
export default {
  name: 'CommandPalette',
  props: {
    open: { type: Boolean, default: false },
    commands: { type: Array, default: () => [] },
    group: { type: String, default: null }
  },
  emits: ['update:open', 'run'],
  data() {
    return {
      query: '',
      activeIndex: 0,
      // Which focus region owns focus: the search textbox or the menu links.
      region: 'input',
      prevFocus: null
    }
  },
  computed: {
    // Start scoped to the group the palette was opened from (M / A). The
    // instant the user types, search across everything.
    scoped() {
      const q = this.query.trim()
      if (q) return this.commands
      return this.group ? this.commands.filter((c) => c.group === this.group) : this.commands
    },
    filtered() {
      const q = this.query.trim().toLowerCase()
      if (!q) return this.scoped
      const scored = []
      for (const cmd of this.scoped) {
        const score = this._score(cmd.title.toLowerCase(), q)
        if (score !== -1) scored.push({ ...cmd, _score: score })
      }
      return scored.sort((a, b) => a._score - b._score)
    },
    activeId() {
      if (!this.filtered.length) return undefined
      return this.itemId(this.activeIndex)
    },
    activeItemEl() {
      const items = this.$refs.items
      return (items && items[this.activeIndex]) || null
    }
  },
  watch: {
    open(val) {
      if (!val) return
      this.prevFocus = document.activeElement
      this.query = ''
      this.activeIndex = 0
      this.region = 'input'
      this.$nextTick(() => this.$refs.input?.focus())
    },
    group() {
      this.query = ''
      this.activeIndex = 0
      this.region = 'input'
    },
    // Keep the list selection valid when filtering shrinks the results.
    filtered(list) {
      if (!list.length) {
        this.activeIndex = 0
        if (this.region === 'list') {
          this.region = 'input'
          this.$nextTick(this._focusInput)
        }
      } else if (this.activeIndex > list.length - 1) {
        this.activeIndex = list.length - 1
      }
    }
  },
  methods: {
    itemId(i) {
      return 'fx-palette-opt-' + i
    },
    // Subsequence fuzzy match; lower is better. -1 means no match.
    _score(text, q) {
      if (text === q) return 0
      if (text.startsWith(q)) return 1
      let idx = 0
      let spread = 0
      let last = -1
      for (let i = 0; i < q.length; i++) {
        idx = text.indexOf(q[i], idx)
        if (idx === -1) return -1
        if (last !== -1) spread += idx - last - 1
        last = idx
        idx++
      }
      return 100 + spread + (text.length - q.length)
    },
    showGroupHeader(cmd, i) {
      return i === 0 || this.filtered[i - 1].group !== cmd.group
    },

    _focusInput() {
      this.$refs.input?.focus({ preventScroll: true })
    },
    _scrollToActive() {
      const el = this.activeItemEl
      if (el) el.scrollIntoView({ block: 'nearest' })
    },
    // Keep `region` in sync with where focus actually landed (the two focus
    // stops: the search textbox and the menu-links region).
    onRegionFocusin(event) {
      const t = event.target
      if (t === this.$refs.input) {
        if (this.region !== 'input') this.region = 'input'
        return
      }
      if (t === this.$refs.list && this.region !== 'list') this.region = 'list'
    },

    // Only mouse-driven while the menu-links region owns focus. From the
    // textbox (keyboard-driven) a stationary cursor must not hijack the
    // selection: as the list filters, new items slide under the cursor and
    // their mouseenter would otherwise fight the active selection.
    onItemHover(i) {
      if (this.region !== 'list') return
      this.activeIndex = i
    },

    _moveSelection(dir) {
      const count = this.filtered.length
      if (!count) return
      this.activeIndex = (this.activeIndex + dir + count) % count
      this._scrollToActive()
    },

    onKeydown(event) {
      const key = event.key

      if (key === 'Escape') {
        event.preventDefault()
        this.close()
        return
      }
      if (key === 'Enter') {
        event.preventDefault()
        if (this.filtered[this.activeIndex]) this.run(this.filtered[this.activeIndex])
        return
      }
      // j/k only navigate while the menu-links region owns focus. In the
      // search textbox they are ordinary characters and filter the list.
      if (this.region === 'list') {
        if (key === 'ArrowDown' || key === 'j') {
          event.preventDefault()
          this._moveSelection(1)
          return
        }
        if (key === 'ArrowUp' || key === 'k') {
          event.preventDefault()
          this._moveSelection(-1)
          return
        }
        // Typing while the menu links have focus jumps back to the search field.
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          this.query += key
          this._focusInput()
        }
      }
    },
    run(cmd) {
      this.$emit('run', cmd)
      this.close()
    },
    close() {
      this.$emit('update:open', false)
      // The traps never return focus on their own (returnFocusOnDeactivate is
      // false); restore the element that opened the palette.
      const prev = this.prevFocus
      if (prev && prev.focus && prev !== document.body && document.contains(prev)) {
        setTimeout(() => {
          try { prev.focus() } catch (e) { /* element no longer focusable */ }
        }, 0)
      }
    }
  }
}
</script>

<style scoped>
.fx-palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10vh 16px 16px;
  background: rgba(var(--fx-scrim), 0.55);
  backdrop-filter: blur(3px);
}

.fx-palette {
  width: min(560px, 100%);
  max-height: min(60vh, 520px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(var(--fx-glass-top), 0.98),
    rgba(var(--fx-glass-bottom), 0.98)
  );
  border: 1px solid rgba(var(--fx-accent), 0.45);
  border-top: 3px solid rgb(var(--fx-accent));
  border-radius: 10px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.55),
    0 0 24px rgba(var(--fx-accent), 0.2);
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.fx-palette-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--fx-accent), 0.25);
  background: rgba(var(--fx-input-bg), 0.5);
  transition: background 0.1s;
}

.fx-palette-input-wrap:focus-within {
  background: rgba(var(--fx-accent), 0.1);
}

.fx-palette-search-icon {
  color: rgb(var(--fx-ink-dim));
  font-size: 20px;
}

.fx-palette-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: rgb(var(--fx-ink));
  font-family: inherit;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.fx-palette-input::placeholder {
  color: rgb(var(--fx-ink-faint));
}

.fx-palette-esc {
  opacity: 0.6;
}

.fx-palette-hints {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 7px 14px;
  border-top: 1px solid rgba(var(--fx-accent), 0.2);
  background: rgba(var(--fx-input-bg), 0.4);
  color: rgb(var(--fx-ink-dim));
  font-size: 10px;
  letter-spacing: 0.04em;
}

.fx-palette-hints .fx-kbd {
  margin: 0 2px;
}

.fx-palette-list {
  overflow-y: auto;
  padding: 6px;
  outline: none;
}

.fx-palette-list:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(var(--fx-accent), 0.5);
}

.fx-palette-empty {
  padding: 18px 16px;
  color: rgb(var(--fx-ink-dim));
  font-size: 12px;
}

.fx-palette-group {
  padding: 8px 10px 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--fx-title-ink));
}

.fx-palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  color: rgb(var(--fx-ink-soft));
  cursor: pointer;
  outline: none;
}

.fx-palette-item--active {
  background: rgba(var(--fx-accent), 0.18);
  color: rgb(var(--fx-ink));
  box-shadow:
    inset 0 0 0 1px rgba(var(--fx-accent), 0.55),
    0 0 12px rgba(var(--fx-accent), 0.25);
}

.fx-palette-item--active:focus-visible {
  background: rgba(var(--fx-accent), 0.22);
}

.fx-palette-item-icon {
  color: rgb(var(--fx-ink-dim));
  font-size: 17px;
}

.fx-palette-item--active .fx-palette-item-icon {
  color: rgb(var(--fx-title-ink));
}

.fx-palette-item-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fx-palette-item-shortcut {
  color: rgb(var(--fx-ink-dim));
}

.fx-palette-item--active .fx-palette-item-shortcut {
  color: rgb(var(--fx-amber-ink));
}

.fx-palette-enter-active {
  transition: opacity 0.18s ease-out;
}

.fx-palette-enter-active .fx-palette {
  transition:
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.18s ease-out;
}

.fx-palette-leave-active {
  transition: opacity 0.15s ease-in;
}

.fx-palette-enter-from,
.fx-palette-leave-to {
  opacity: 0;
}

.fx-palette-enter-from .fx-palette {
  transform: translateY(-14px) scale(0.98);
  opacity: 0;
}
</style>
