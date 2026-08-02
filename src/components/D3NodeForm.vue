<template>
  <div
    id="iform"
    ref="formfields"
    class="fx-panel"
    @keyup.alt.s="updateNode()"
    @keyup.meta.s="updateNode()"
    @keyup.ctrl.c="close()"
    @keyup.meta.c="close()"
    @keydown.esc="keyPress($event)"
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
          <button type="button" class="fx-close" @click="close()" @keypress.stop="" aria-label="Close">✕</button>
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
            <label class="fx-field">
              <span class="fx-label">Node Shape</span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('shape')"
                >{{ shapeLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'shape'" class="fx-options">
                    <li
                      v-for="opt in nodeShapes"
                      :key="opt.value"
                      class="fx-option"
                      :class="{ 'fx-option-active': nodeShape === opt.value }"
                      @click="pick('nodeShape', opt.value)"
                    >{{ opt.label }}</li>
                  </ul>
                </transition>
              </div>
            </label>

            <label class="fx-field">
              <span class="fx-label">Label H-Align <em class="fx-opt">compound nodes</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('halign')"
                >{{ textHalign }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'halign'" class="fx-options">
                    <li v-for="opt in ['left','center','right']" :key="opt"
                      class="fx-option" :class="{ 'fx-option-active': textHalign === opt }"
                      @click="pick('textHalign', opt)">{{ opt }}</li>
                  </ul>
                </transition>
              </div>
            </label>

            <label class="fx-field">
              <span class="fx-label">Label V-Align <em class="fx-opt">compound nodes</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('valign')"
                >{{ textValign }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'valign'" class="fx-options">
                    <li v-for="opt in ['top','center','bottom']" :key="opt"
                      class="fx-option" :class="{ 'fx-option-active': textValign === opt }"
                      @click="pick('textValign', opt)">{{ opt }}</li>
                  </ul>
                </transition>
              </div>
            </label>

            <label class="fx-field">
              <span class="fx-label">Parent <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('parent')"
                >{{ parentLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'parent'" class="fx-options">
                    <li
                      class="fx-option"
                      :class="{ 'fx-option-active': parentNode === null }"
                      @click="pick('parentNode', null)"
                    >— none —</li>
                    <li
                      v-for="opt in parentOptions"
                      :key="opt.key"
                      class="fx-option"
                      :class="{ 'fx-option-active': parentNode === opt.key }"
                      @click="pick('parentNode', opt.key)"
                    >{{ opt.value }}</li>
                  </ul>
                </transition>
              </div>
            </label>
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
              @keydown.alt.shift.w="nodeLabel=''"
              @keydown.meta.shift.w="nodeLabel=''"
            ></textarea>
          </label>

          <label class="fx-field fx-field-full">
            <span class="fx-label">Node Style <em class="fx-opt">optional</em></span>
            <input
              class="fx-input"
              type="text"
              v-model="style"
              placeholder="fill: #d3d7e8"
              @keypress.stop=""
            />
          </label>
        </div>

        <footer class="fx-panel-actions">
          <button
            v-if="update"
            type="button"
            class="fx-btn fx-btn-primary"
            @click="updateNode()"
            @keypress.stop=""
          >Update Node <span class="fx-kbd">{{ shortcutLabels.save }}</span></button>
          <button
            v-else
            type="button"
            class="fx-btn fx-btn-primary"
            @click="addNode()"
            @keypress.stop=""
          >Add Node</button>
          <button
            type="button"
            class="fx-btn fx-btn-ghost"
            @click="close()"
            @keypress.stop=""
          >Cancel <span class="fx-kbd">{{ shortcutLabels.close }}</span></button>
        </footer>
      </div>
    </focus-trap>
  </div>
</template>

<script>
import D3Util from '@/helpers/D3Util'
export default {
  name: 'D3Node',
  props: ['active', 'd3Data'],
  inject: ['modifier'],
  data () {
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
      nodeShapes: [
        { 'value': 'rectangle',       'label': 'Rectangle' },
        { 'value': 'round-rectangle', 'label': 'Round Rectangle' },
        { 'value': 'ellipse',         'label': 'Ellipse' },
        { 'value': 'diamond',         'label': 'Diamond' },
        { 'value': 'round-diamond',   'label': 'Round Diamond' },
        { 'value': 'hexagon',         'label': 'Hexagon' },
        { 'value': 'octagon',         'label': 'Octagon' },
        { 'value': 'star',            'label': 'Star' },
        { 'value': 'tag',             'label': 'Tag' },
        { 'value': 'barrel',          'label': 'Barrel' },
      ],
      parentNode: null,
      textHalign: 'center',
      textValign: 'top',
      style: 'fill: #5f9488',
    }
  },
  mounted () {
    document.addEventListener('click', this.onDocClick)

    this.$nextTick(() => {
      const mod = this.modifier?.value ?? this.modifier
      if (this.update && mod?.renderer) {
        mod.renderer.zoomTo(this.nodeId)
      }
      this.enableTrap = true
      if (this.$refs.nodeLabelTextField) this.$refs.nodeLabelTextField.focus()
      if (D3Util.debug) {
        const root  = this.$refs.formfields
        const trig  = root ? [...root.querySelectorAll('.fx-select-trigger')] : []
        const style = root ? root.querySelector('input.fx-input') : null
        console.log('[D3NodeForm] dom', JSON.stringify({
          triggers: trig.map(b => b.textContent),
          triggerColors: trig.map(b => getComputedStyle(b).color),
          triggerBg: trig.map(b => getComputedStyle(b).backgroundColor),
          styleInput: style ? style.value : null,
          styleInputColor: style ? getComputedStyle(style).color : null,
          panelBg: root ? getComputedStyle(root).backgroundColor : null,
        }))
      }
    })
  },
  beforeUnmount () {
    document.removeEventListener('click', this.onDocClick)
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    parentOptions() {
      const mod = this.modifier?.value ?? this.modifier
      if (!mod || !mod.cy) return []
      return mod.cy.nodes().map((n) => ({
        key:   n.id(),
        value: n.data('label') || n.id(),
      }))
    },
    shapeLabel() {
      return this._optLabel(this.nodeShapes, this.nodeShape, 'value', 'label', 'Rectangle')
    },
    parentLabel() {
      if (!this.parentNode) return '— none —'
      const opt = this.parentOptions.find(o => o.key === this.parentNode)
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
    },
  },
  methods: {
    _populate() {
      // Derive from the prop every time: the immediate d3Data watcher runs
      // before created(), so we can't rely on this.update being set yet.
      this.update = this.active == 'Edit Node'
      if (D3Util.debug) console.log('[D3NodeForm] _populate', {
        active: this.active,
        update: this.update,
        hasId:  !!this.d3Data?.id,
        d3Data: this.d3Data,
      })
      if (!(this.update && this.d3Data?.id)) {
        this.nodeLabel  = null
        this.nodeShape  = 'rectangle'
        this.nodeId     = null
        this.parentNode = null
        this.textHalign = 'center'
        this.textValign = 'top'
        this.style      = 'fill: #5f9488'
        return
      }
      const mod = this.modifier?.value ?? this.modifier
      this.nodeLabel  = this.d3Data.label
      this.nodeShape  = this.d3Data.nodeShape || this.d3Data.shape
      this.nodeId     = this.d3Data.id
      const parentEl  = mod?.cy?.getElementById(this.d3Data.id)?.parent()?.first()
      this.parentNode = parentEl?.length ? parentEl.id() : null
      this.textHalign = this.d3Data.textHalign || 'center'
      this.textValign = this.d3Data.textValign || 'top'
      this.style      = this.d3Data.style
      if (D3Util.debug) console.log('[D3NodeForm] fields', JSON.stringify({
        nodeLabel:  this.nodeLabel,
        nodeShape:  this.nodeShape,
        nodeId:     this.nodeId,
        parentNode: this.parentNode,
        textHalign: this.textHalign,
        textValign: this.textValign,
        style:      this.style,
      }))
    },
    _optLabel(list, val, valKey, labelKey, fallback) {
      if (!val) return fallback
      const opt = list.find(o => o[valKey] === val)
      return opt ? opt[labelKey] : fallback
    },
    toggleSel(key) {
      this.openSel = this.openSel === key ? null : key
    },
    pick(field, val) {
      this[field] = val
      this.openSel = null
    },
    onDocClick() {
      this.openSel = null
    },
    updateNode () {
      const mod = this.modifier?.value ?? this.modifier
      console.log('[D3NodeForm] updateNode clicked', { nodeId: this.nodeId, nodeLabel: this.nodeLabel, data: this.$data })
      mod.updateNode(this.$data, this.nodeId)
      this.close()
    },
    keyPress(event) {
      this.hints = D3Util.formHints(event, this)
    },
    addNode () {
      const mod = this.modifier?.value ?? this.modifier
      mod.addNode(this.$data)
      this.common()
    },
    close () {
      this.common()
    },
    common() {
      this.hints = D3Util.removeHints(this.hints)
      this.emitter.emit('setSheetToFalse')
    }
  },
  watch: {
    active(val) {
      this.update = val == 'Edit Node'
      this._populate()
    },
    d3Data: {
      handler() {
        this._populate()
      },
      immediate: true,
    },
  },
}
</script>

<style scoped>
.hints {
  border: 1px solid magenta;
  color: magenta;
}
</style>
