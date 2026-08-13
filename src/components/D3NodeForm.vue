<template>
  <div
    id="iform"
    ref="formfields"
    class="fx-panel"
    @keyup="onKeyup($event)"
    @keydown="onKeydown($event)"
    @keypress.stop.prevent="keyPress($event)"
  >
    <focus-trap v-model:active="enableTrap">
      <div tabindex="0" class="fx-panel-inner">
        <header class="fx-panel-header">
          <div class="fx-panel-title">
            <span class="fx-title-chip" :class="update ? 'fx-chip-edit' : 'fx-chip-add'">
              {{ update ? 'EDIT' : 'CREATE' }}
            </span>
            <h2 class="fx-title">NODE</h2>
          </div>
          <button
            type="button"
            class="fx-close"
            @click="close()"
            @keypress.stop=""
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div class="fx-readout">
          <span class="fx-readout-kv">
            <span class="fx-readout-k">ID</span>
            <span class="fx-readout-v">{{ update ? nodeId : 'auto' }}</span>
          </span>
          <span class="fx-readout-kv">
            <span class="fx-readout-k">POS</span>
            <span class="fx-readout-v">{{ update ? posText : '—' }}</span>
          </span>
          <span class="fx-readout-kv">
            <span class="fx-readout-k">MODE</span>
            <span class="fx-readout-v">{{ update ? 'FOCUS' : 'PENDING' }}</span>
          </span>
        </div>

        <div class="fx-panel-body">
          <div class="fx-grid">
            <div class="fx-field">
              <span class="fx-label">Node Shape</span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('shape')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('shape', $event)"
                >
                  {{ shapeLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'shape'" class="fx-options">
                    <li
                      v-for="opt in nodeShapes"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': nodeShape === opt.value }"
                      @click="pick('nodeShape', opt.value)"
                      @keydown.enter.prevent="pick('nodeShape', opt.value)"
                      @keydown.space.prevent="pick('nodeShape', opt.value)"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.k.prevent="focusPrev($event)"
                      @keydown.j.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      {{ opt.label }}
                    </li>
                  </ul>
                </transition>
              </div>
            </div>

            <div class="fx-field">
              <span class="fx-label">Label H-Align <em class="fx-opt">compound nodes</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('halign')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('halign', $event)"
                >
                  {{ textHalign }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'halign'" class="fx-options">
                    <li
                      v-for="opt in halignOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': textHalign === opt.value }"
                      @click="pick('textHalign', opt.value)"
                      @keydown.enter.prevent="pick('textHalign', opt.value)"
                      @keydown.space.prevent="pick('textHalign', opt.value)"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.k.prevent="focusPrev($event)"
                      @keydown.j.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      {{ opt.label }}
                    </li>
                  </ul>
                </transition>
              </div>
            </div>

            <div class="fx-field">
              <span class="fx-label">Label V-Align <em class="fx-opt">compound nodes</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('valign')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('valign', $event)"
                >
                  {{ textValign }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'valign'" class="fx-options">
                    <li
                      v-for="opt in valignOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': textValign === opt.value }"
                      @click="pick('textValign', opt.value)"
                      @keydown.enter.prevent="pick('textValign', opt.value)"
                      @keydown.space.prevent="pick('textValign', opt.value)"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.k.prevent="focusPrev($event)"
                      @keydown.j.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      {{ opt.label }}
                    </li>
                  </ul>
                </transition>
              </div>
            </div>

            <div class="fx-field">
              <span class="fx-label">Parent <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('parent')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('parent', $event)"
                >
                  {{ parentLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <div v-if="openSel === 'parent'" class="fx-options">
                    <input
                      ref="parentSearchInput"
                      class="fx-option-search"
                      type="text"
                      v-model="parentSearch"
                      placeholder="Search..."
                      autocomplete="off"
                      @click.stop
                      @keypress.stop=""
                      @keydown.esc.stop="closeSel($event)"
                      @keydown.down.prevent="focusFirstParentOption"
                      @keydown.enter.prevent="focusFirstParentOption"
                    />
                    <ul class="fx-options-list">
                      <li
                        v-if="!parentSearch"
                        tabindex="0"
                        class="fx-option"
                        :class="{ 'fx-option-active': parentNode === null }"
                        @click="pick('parentNode', null)"
                        @keydown.enter.prevent="pick('parentNode', null)"
                        @keydown.space.prevent="pick('parentNode', null)"
                        @keydown.up.prevent="focusPrev($event)"
                        @keydown.down.prevent="focusNext($event)"
                        @keydown.k.prevent="focusPrev($event)"
                        @keydown.j.prevent="focusNext($event)"
                        @keydown.esc.stop="closeSel($event)"
                      >
                        — none —
                      </li>
                      <li
                        v-for="opt in filteredParentOptions"
                        :key="opt.key"
                        tabindex="0"
                        class="fx-option"
                        :class="{ 'fx-option-active': parentNode === opt.key }"
                        @click="pick('parentNode', opt.key)"
                        @keydown.enter.prevent="pick('parentNode', opt.key)"
                        @keydown.space.prevent="pick('parentNode', opt.key)"
                        @keydown.up.prevent="focusPrev($event)"
                        @keydown.down.prevent="focusNext($event)"
                        @keydown.k.prevent="focusPrev($event)"
                        @keydown.j.prevent="focusNext($event)"
                        @keydown.esc.stop="closeSel($event)"
                      >
                        {{ opt.value }}
                      </li>
                    </ul>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <label class="fx-field fx-field-full">
            <span class="fx-label">Node Label</span>
            <textarea
              ref="nodeLabelTextField"
              class="fx-input fx-textarea"
              v-model="nodeLabel"
              :rows="labelRows"
              placeholder="Add a node label ... if label contains HTML then Label Type must be Html ... {{ shortcutLabels.clear }} to clear value"
              @keypress.stop=""
            ></textarea>
          </label>

          <div class="fx-grid">
            <label class="fx-field">
              <span class="fx-label">Background Color <em class="fx-opt">optional</em></span>
              <div class="fx-color-row">
                <input
                  class="fx-input fx-input-color"
                  type="color"
                  :value="bgColor || '#5f9488'"
                  @input="bgColor = $event.target.value"
                  @keypress.stop=""
                />
                <button
                  type="button"
                  class="fx-btn fx-btn-mini"
                  :class="{ 'fx-btn-active': !bgColor }"
                  @click="bgColor = ''"
                  @keypress.stop=""
                  title="Use theme color"
                >
                  none
                </button>
              </div>
            </label>

            <label class="fx-field">
              <span class="fx-label">Border Color <em class="fx-opt">optional</em></span>
              <div class="fx-color-row">
                <input
                  class="fx-input fx-input-color"
                  type="color"
                  :value="borderColor || '#5e74ff'"
                  @input="borderColor = $event.target.value"
                  @keypress.stop=""
                />
                <button
                  type="button"
                  class="fx-btn fx-btn-mini"
                  :class="{ 'fx-btn-active': !borderColor }"
                  @click="borderColor = ''"
                  @keypress.stop=""
                  title="Use theme color"
                >
                  none
                </button>
              </div>
            </label>

            <label class="fx-field">
              <span class="fx-label">Border Width <em class="fx-opt">optional</em></span>
              <input
                class="fx-input"
                type="number"
                min="0"
                max="8"
                step="0.5"
                v-model.number="borderWidth"
                placeholder="theme"
                @keypress.stop=""
              />
            </label>

            <label class="fx-field">
              <span class="fx-label">Font Size <em class="fx-opt">optional</em></span>
              <input
                class="fx-input"
                type="number"
                min="8"
                max="28"
                step="1"
                v-model.number="fontSize"
                placeholder="theme"
                @keypress.stop=""
              />
            </label>
          </div>
        </div>

        <footer class="fx-panel-actions">
          <button
            v-if="update"
            type="button"
            class="fx-btn fx-btn-primary"
            @click="updateNode()"
            @keypress.stop=""
          >
            Update Node <span class="fx-kbd">{{ shortcutLabels.save }}</span>
          </button>
          <button
            v-else
            type="button"
            class="fx-btn fx-btn-primary"
            @click="addNode()"
            @keypress.stop=""
          >
            Add Node
          </button>
          <button type="button" class="fx-btn fx-btn-ghost" @click="close()" @keypress.stop="">
            Cancel <span class="fx-kbd">{{ shortcutLabels.close }}</span>
          </button>
        </footer>
      </div>
    </focus-trap>
  </div>
</template>

<script>
import D3Util from '@/helpers/D3Util'
import Shortcuts from '@/helpers/Shortcuts.js'
export default {
  name: 'D3Node',
  props: ['active', 'd3Data'],
  inject: ['modifier'],
  data() {
    return {
      enableTrap: false,
      errorClass: true,
      nodeLabel: null,
      nodeShape: null,
      hints: {},
      d3DagreData: null,
      nodeId: null,
      update: false,
      openSel: null,
      parentNode: null,
      parentSearch: '',
      textHalign: 'center',
      textValign: 'top',
      bgColor: '',
      borderColor: '',
      borderWidth: null,
      fontSize: null
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)

    this.$nextTick(() => {
      const mod = this.modifier?.value ?? this.modifier
      if (this.update && mod?.renderer) {
        mod.renderer.zoomTo(this.nodeId)
      }
      this.enableTrap = true
      if (this.$refs.nodeLabelTextField) this.$refs.nodeLabelTextField.focus()
      if (D3Util.debug) {
        const root = this.$refs.formfields
        const trig = root ? [...root.querySelectorAll('.fx-select-trigger')] : []
        const style = root ? root.querySelector('input.fx-input') : null
        console.log(
          '[D3NodeForm] dom',
          JSON.stringify({
            triggers: trig.map((b) => b.textContent),
            triggerColors: trig.map((b) => getComputedStyle(b).color),
            triggerBg: trig.map((b) => getComputedStyle(b).backgroundColor),
            styleInput: style ? style.value : null,
            styleInputColor: style ? getComputedStyle(style).color : null,
            panelBg: root ? getComputedStyle(root).backgroundColor : null
          })
        )
      }
    })
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    nodeShapes() {
      return D3Util.nodeShapeOptions()
    },
    halignOptions() {
      return D3Util.nodeHalignOptions()
    },
    valignOptions() {
      return D3Util.nodeValignOptions()
    },
    parentOptions() {
      const mod = this.modifier?.value ?? this.modifier
      if (!mod || !mod.cy) return []
      return mod.cy.nodes().map((n) => ({
        key: n.id(),
        value: n.data('label') || n.id()
      }))
    },
    filteredParentOptions() {
      if (!this.parentSearch) return this.parentOptions
      const q = this.parentSearch.toLowerCase()
      return this.parentOptions.filter((o) =>
        String(o.value || o.key)
          .toLowerCase()
          .startsWith(q)
      )
    },
    shapeLabel() {
      return this._optLabel(this.nodeShapes, this.nodeShape, 'value', 'label', 'Rectangle')
    },
    parentLabel() {
      if (!this.parentNode) return '— none —'
      const opt = this.parentOptions.find((o) => o.key === this.parentNode)
      return opt ? opt.value : this.parentNode
    },
    posText() {
      if (!this.nodeId) return '—'
      const mod = this.modifier?.value ?? this.modifier
      if (!mod?.cy) return '—'
      const el = mod.cy.getElementById(this.nodeId)
      if (!el || el.empty()) return '—'
      const pos = el.position()
      return `${Math.round(pos.x)}, ${Math.round(pos.y)}`
    },
    labelRows() {
      const count = (this.nodeLabel || '').split('\n').length
      return Math.min(8, Math.max(3, count))
    }
  },
  methods: {
    _populate() {
      // Derive from the prop every time: the immediate d3Data watcher runs
      // before created(), so we can't rely on this.update being set yet.
      this.update = this.active == 'Edit Node'
      if (D3Util.debug)
        console.log('[D3NodeForm] _populate', {
          active: this.active,
          update: this.update,
          hasId: !!this.d3Data?.id,
          d3Data: this.d3Data
        })
      if (!(this.update && this.d3Data?.id)) {
        // Create mode: start from the configurable node creation defaults in
        // Settings so a new node inherits the user's preferred look.
        const d = D3Util.defaultNodeValues()
        this.nodeLabel = d.nodeLabel
        this.nodeShape = d.nodeShape
        this.nodeId = null
        this.parentNode = null
        this.textHalign = d.textHalign
        this.textValign = d.textValign
        this.bgColor = d.bgColor || ''
        this.borderColor = d.borderColor || ''
        this.borderWidth = d.borderWidth != null ? d.borderWidth : null
        this.fontSize = d.fontSize != null ? d.fontSize : null
        return
      }
      const mod = this.modifier?.value ?? this.modifier
      this.nodeLabel = this.d3Data.label
      this.nodeShape = this.d3Data.nodeShape || this.d3Data.shape
      this.nodeId = this.d3Data.id
      const parentEl = mod?.cy?.getElementById(this.d3Data.id)?.parent()?.first()
      this.parentNode = parentEl?.length ? parentEl.id() : null
      this.textHalign = this.d3Data.textHalign || 'center'
      this.textValign = this.d3Data.textValign || 'top'
      this.bgColor = this.d3Data.bgColor || ''
      this.borderColor = this.d3Data.borderColor || ''
      this.borderWidth = this.d3Data.borderWidth ?? null
      this.fontSize = this.d3Data.fontSize ?? null
      if (D3Util.debug)
        console.log(
          '[D3NodeForm] fields',
          JSON.stringify({
            nodeLabel: this.nodeLabel,
            nodeShape: this.nodeShape,
            nodeId: this.nodeId,
            parentNode: this.parentNode,
            textHalign: this.textHalign,
            textValign: this.textValign,
            bgColor: this.bgColor,
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            fontSize: this.fontSize
          })
        )
    },
    _optLabel(list, val, valKey, labelKey, fallback) {
      if (!val) return fallback
      const opt = list.find((o) => o[valKey] === val)
      return opt ? opt[labelKey] : fallback
    },
    toggleSel(key) {
      this.openSel = this.openSel === key ? null : key
    },
    openAndFocus(key, event) {
      if (this.openSel !== key) this.openSel = key
      this.$nextTick(() => {
        const container = event.currentTarget.closest('.fx-select')
        const searchInput = container?.querySelector('.fx-option-search')
        if (searchInput) {
          searchInput.focus()
          return
        }
        const ul = container?.querySelector('.fx-options')
        if (ul) {
          const target = ul.querySelector('.fx-option-active') || ul.querySelector('.fx-option')
          if (target) target.focus()
        }
      })
    },
    focusFirstParentOption() {
      const input = this.$refs.parentSearchInput
      if (!input) return
      const first = input.nextElementSibling?.querySelector('.fx-option')
      if (first) first.focus()
    },
    focusPrev(event) {
      const prev = event.target.previousElementSibling
      if (prev) {
        prev.focus()
        return
      }
      const container = event.target.closest('.fx-select')
      const searchInput = container?.querySelector('.fx-option-search')
      if (searchInput) searchInput.focus()
      else event.target.closest('.fx-options-list, .fx-options')?.lastElementChild?.focus()
    },
    focusNext(event) {
      const next = event.target.nextElementSibling
      if (next) next.focus()
      else event.target.closest('.fx-options-list, .fx-options')?.firstElementChild?.focus()
    },
    closeSel(event) {
      this.openSel = null
      event.target.closest('.fx-select')?.querySelector('.fx-select-trigger')?.focus()
    },
    pick(field, val) {
      this[field] = val
      this.openSel = null
    },
    onDocClick() {
      this.openSel = null
    },
    updateNode() {
      const mod = this.modifier?.value ?? this.modifier
      console.log('[D3NodeForm] updateNode clicked', {
        nodeId: this.nodeId,
        nodeLabel: this.nodeLabel,
        data: this.$data
      })
      mod.updateNode(this.$data, this.nodeId)
      this.close()
    },
    keyPress(event) {
      this.hints = D3Util.formHints(event, this)
    },
    onKeydown(event) {
      if (Shortcuts.matches(event, 'close')) {
        event.preventDefault()
        this.close()
        return
      }
      if (Shortcuts.matches(event, 'clear')) {
        event.preventDefault()
        this.nodeLabel = ''
      }
    },
    onKeyup(event) {
      if (event.repeat) return
      if (Shortcuts.matches(event, 'save')) {
        event.preventDefault()
        this.updateNode()
      }
    },
    addNode() {
      const mod = this.modifier?.value ?? this.modifier
      mod.addNode(this.$data)
      this.common()
    },
    close() {
      this.common()
    },
    common() {
      this.hints = D3Util.removeHints(this.hints)
      this.emitter.emit('setSheetToFalse')
    }
  },
  watch: {
    openSel(val) {
      if (val !== 'parent') this.parentSearch = ''
    },
    active(val) {
      this.update = val == 'Edit Node'
      this._populate()
    },
    d3Data: {
      handler() {
        this._populate()
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
.hints {
  border: 1px solid magenta;
  color: magenta;
}

.fx-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fx-input-color {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  height: 38px;
  cursor: pointer;
}

.fx-btn-mini {
  flex: none;
  font-size: 10px;
  padding: 5px 10px;
  letter-spacing: 0.1em;
}

.fx-btn-active {
  border-color: rgb(var(--fx-accent));
  color: rgb(var(--fx-accent));
}

.fx-option-search {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-bottom: 1px solid rgba(var(--fx-accent), 0.25);
  background: transparent;
  color: rgb(var(--fx-ink));
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.fx-option-search::placeholder {
  color: rgb(var(--fx-ink-faint));
}

.fx-option-search:focus {
  border-bottom-color: rgb(var(--fx-accent));
}

.fx-options-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
