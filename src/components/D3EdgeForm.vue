<template>
  <div
    id="iform"
    ref="formfields"
    class="fx-panel"
    @keyup.alt.s="updateEdge()"
    @keyup.meta.s="updateEdge()"
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
            <h2 class="fx-title">EDGE</h2>
          </div>
          <button type="button" class="fx-close" @click="close()" @keypress.stop="" aria-label="Close">✕</button>
        </header>

        <div class="fx-readout">
          <span class="fx-readout-kv">
            <span class="fx-readout-k">ID</span>
            <span class="fx-readout-v">{{ update ? edgeId : 'auto' }}</span>
          </span>
          <span class="fx-readout-kv fx-readout-wide">
            <span class="fx-readout-k">PATH</span>
            <span class="fx-readout-v">{{ pathText }}</span>
          </span>
          <span class="fx-readout-kv">
            <span class="fx-readout-k">MODE</span>
            <span class="fx-readout-v">{{ update ? 'FOCUS' : 'PENDING' }}</span>
          </span>
        </div>

        <div class="fx-panel-body">
          <div class="fx-grid">
            <div class="fx-field">
              <span class="fx-label">Edge Arrow Head Style</span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('arrowStyle')"
                >{{ arrowStyleLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'arrowStyle'" class="fx-options">
                    <li
                      v-for="opt in edgeArrowHeadStyleOptions"
                      :key="opt.value"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeArrowHeadStyle === opt.value }"
                      @click="pick('edgeArrowHeadStyle', opt.value)"
                    >{{ opt.label }}</li>
                  </ul>
                </transition>
              </div>
            </div>

            <div class="fx-field">
              <span class="fx-label">Edge Arrow Head</span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('arrow')"
                >{{ arrowLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'arrow'" class="fx-options">
                    <li
                      v-for="opt in edgeArrowHeadOptions"
                      :key="opt.value"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeArrowHead === opt.value }"
                      @click="pick('edgeArrowHead', opt.value)"
                    >{{ opt.label }}</li>
                  </ul>
                </transition>
              </div>
            </div>
          </div>

          <div class="fx-grid fx-grid-2">
            <label class="fx-field">
              <span class="fx-label">From Node</span>
              <input class="fx-input fx-input-static" type="text" v-model="fromNode" readonly placeholder="select source" />
            </label>
            <label class="fx-field">
              <span class="fx-label">To Node</span>
              <input class="fx-input fx-input-static" type="text" v-model="toNode" readonly placeholder="select target" />
            </label>
          </div>

          <label class="fx-field fx-field-full">
            <span class="fx-label">Edge Label</span>
            <textarea
              ref="edgeLabelTextField"
              class="fx-input fx-textarea"
              v-model="edgeLabel"
              :rows="edgeRows"
              placeholder="Add edge label... can be html ... {{ shortcutLabels.clear }} to clear value"
              @keypress.stop=""
              @keydown.alt.shift.w="edgeLabel=''"
              @keydown.meta.shift.w="edgeLabel=''"
            ></textarea>
          </label>
        </div>

        <footer class="fx-panel-actions">
          <button
            v-if="update"
            type="button"
            class="fx-btn fx-btn-primary"
            @click="updateEdge()"
            @keypress.stop=""
          >Update Edge <span class="fx-kbd">{{ shortcutLabels.save }}</span></button>
          <button
            v-else
            type="button"
            class="fx-btn fx-btn-primary"
            @click="addEdge()"
            @keypress.stop=""
          >Add Edge <span class="fx-kbd">{{ shortcutLabels.save }}</span></button>
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
  name: 'D3Edge',
  props: ['active', 'd3Data'],
  inject: ['modifier'],
  data () {
    return {
      edgeModal: false,
      edgeLabel: '',
      edgeArrowHead: '',
      edgeArrowHeadStyle: '',
      enableTrap: false,
      hints: {},
      d3EdgesData: null,
      edgeId: null,
      update: false,
      openSel: null,
      edgeArrowHeadStyleOptions: [
        { 'value': 'filled', 'label': 'Filled' },
        { 'value': 'hollow', 'label': 'Hollow' }
      ],
      edgeArrowHeadOptions: [
        { 'value': 'triangle',       'label': 'Triangle' },
        { 'value': 'vee',            'label': 'Vee' },
        { 'value': 'none',           'label': 'None (undirected)' },
        { 'value': 'chevron',        'label': 'Chevron' },
        { 'value': 'tee',            'label': 'Tee' },
        { 'value': 'circle',         'label': 'Circle' },
        { 'value': 'diamond',        'label': 'Diamond' },
        { 'value': 'triangle-tee',   'label': 'Triangle Tee' },
        { 'value': 'triangle-cross', 'label': 'Triangle Cross' },
      ],
      fromNode: '',
      toNode: ''
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    arrowStyleLabel() {
      return this._optLabel(this.edgeArrowHeadStyleOptions, this.edgeArrowHeadStyle, 'value', 'label', 'Filled')
    },
    arrowLabel() {
      return this._optLabel(this.edgeArrowHeadOptions, this.edgeArrowHead, 'value', 'label', 'Triangle')
    },
    pathText() {
      if (this.fromNode && this.toNode) return `${this.fromNode} → ${this.toNode}`
      if (this.fromNode || this.toNode) return this.fromNode || this.toNode
      return '—'
    },
    edgeRows() {
      const count = (this.edgeLabel || '').split('\n').length
      return Math.min(6, Math.max(2, count))
    },
  },
  mounted () {
    this._showEdgeFormHandler = () => this.showForm()
    this._edgesD3DataHandler = (data, id) => {
      this.d3EdgesData = data
      this.edgeId = id
      this.edgeLabel = data.label
      this.edgeArrowHeadStyle = data.arrowheadStyle
      this.edgeArrowHead = data.arrowhead
    }
    this._editEdgeHandler = () => this.editEdge()
    this.emitter.on('showEdgeForm', this._showEdgeFormHandler)
    this.emitter.on('edgesD3Data', this._edgesD3DataHandler)
    this.emitter.on('editEdge', this._editEdgeHandler)
    document.addEventListener('click', this.onDocClick)

    if (this.edgeModal) {
      this.$nextTick(() => {
        const mod2 = this.modifier?.value ?? this.modifier
        if (this.update && mod2?.renderer) {
          mod2.renderer.zoomTo(this.edgeId)
        }
        this.enableTrap = true
        if (this.$refs.edgeLabelTextField) this.$refs.edgeLabelTextField.focus()
      })
    }
  },
  beforeUnmount () {
    this.emitter.off('showEdgeForm', this._showEdgeFormHandler)
    this.emitter.off('edgesD3Data', this._edgesD3DataHandler)
    this.emitter.off('editEdge', this._editEdgeHandler)
    document.removeEventListener('click', this.onDocClick)
  },
  methods: {
    _populate() {
      // Derive from the prop every time: the immediate d3Data watcher runs
      // before created(), so we can't rely on update/edgeModal being set yet.
      this.update    = this.active == 'Edit Edge'
      this.edgeModal = this.active == 'Edit Edge' || this.active == 'Add Edge'
      if (D3Util.debug) console.log('[D3EdgeForm] _populate', {
        active:    this.active,
        update:    this.update,
        edgeModal: this.edgeModal,
        d3Data:    this.d3Data,
      })
      if (!(this.update || this.edgeModal)) return
      const mod = this.modifier?.value ?? this.modifier
      this.edgeId = this.d3Data?.id
      this.edgeLabel = this.d3Data?.label || ''
      this.edgeArrowHeadStyle = this.d3Data?.arrowheadStyle || ''
      this.edgeArrowHead = this.d3Data?.arrowhead || ''

      let srcId = null
      let tgtId = null
      if (typeof this.edgeId === 'string' && mod?.cy) {
        const edge = mod.cy.getElementById(this.edgeId)
        if (edge && edge.nonempty()) {
          srcId = edge.data('source')
          tgtId = edge.data('target')
        }
      } else if (this.edgeId?.v && this.edgeId?.w) {
        srcId = this.edgeId.v
        tgtId = this.edgeId.w
      }
      this.fromNode = srcId ? (mod.getNodeData(srcId)?.label || srcId) : ''
      this.toNode = tgtId ? (mod.getNodeData(tgtId)?.label || tgtId) : ''
      if (D3Util.debug) console.log('[D3EdgeForm] fields', {
        edgeId:    this.edgeId,
        edgeLabel: this.edgeLabel,
        edgeArrowHeadStyle: this.edgeArrowHeadStyle,
        edgeArrowHead: this.edgeArrowHead,
        fromNode:  this.fromNode,
        toNode:    this.toNode,
      })
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
    updateEdge () {
      const mod = this.modifier?.value ?? this.modifier
      mod.updateEdge(this.$data, this.edgeId)
      this.close()
    },
    editEdge () {
      this.enableTrap = true
    },
    keyPress(event) {
      this.hints = D3Util.formHints(event, this)
    },
    addEdge () {
      const mod = this.modifier?.value ?? this.modifier
      mod.addEdge(this.$data)
      this.common()
    },
    close () {
      this.common()
    },
    common() {
      this.edgeModal = false
      this.hints = D3Util.removeHints(this.hints)
      this.emitter.emit('setSheetToFalse')
    }
  },
  watch: {
    active(val) {
      this.update    = val == 'Edit Edge'
      this.edgeModal = val == 'Edit Edge' || val == 'Add Edge'
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
