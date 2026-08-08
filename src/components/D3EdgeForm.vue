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

          <div class="fx-grid">
            <div class="fx-field">
              <span class="fx-label">Source Arrow Head <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('sourceArrowhead')"
                >{{ sourceArrowLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'sourceArrowhead'" class="fx-options">
                    <li
                      class="fx-option"
                      :class="{ 'fx-option-active': sourceArrowhead === '' }"
                      @click="pick('sourceArrowhead', '')"
                    >— none —</li>
                    <li
                      v-for="opt in edgeArrowHeadOptions"
                      :key="opt.value"
                      class="fx-option"
                      :class="{ 'fx-option-active': sourceArrowhead === opt.value }"
                      @click="pick('sourceArrowhead', opt.value)"
                    >{{ opt.label }}</li>
                  </ul>
                </transition>
              </div>
            </div>

            <label class="fx-field">
              <span class="fx-label">Edge Width <em class="fx-opt">optional</em></span>
              <input
                class="fx-input"
                type="number"
                min="1"
                max="12"
                step="0.5"
                v-model.number="edgeWidth"
                placeholder="theme"
                @keypress.stop=""
              />
            </label>

            <label class="fx-field">
              <span class="fx-label">Edge Color <em class="fx-opt">optional</em></span>
              <div class="fx-color-row">
                <input
                  class="fx-input fx-input-color"
                  type="color"
                  :value="edgeColor || '#5e74ff'"
                  @input="edgeColor = $event.target.value"
                  @keypress.stop=""
                />
                <button
                  type="button"
                  class="fx-btn fx-btn-mini"
                  :class="{ 'fx-btn-active': !edgeColor }"
                  @click="edgeColor = ''"
                  @keypress.stop=""
                  title="Use theme color"
                >none</button>
              </div>
            </label>

            <div class="fx-field">
              <span class="fx-label">Line Style <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('lineStyle')"
                >{{ lineStyleLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'lineStyle'" class="fx-options">
                    <li
                      v-for="opt in edgeLineStyleOptions"
                      :key="opt.value"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeLineStyle === opt.value }"
                      @click="pick('edgeLineStyle', opt.value)"
                    >{{ opt.label }}</li>
                  </ul>
                </transition>
              </div>
            </div>

            <div class="fx-field">
              <span class="fx-label">Curve Style <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('curve')"
                >{{ edgeCurveLabel }}<span class="fx-caret">▾</span></button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'curve'" class="fx-options">
                    <li
                      v-for="opt in edgeCurveOptions"
                      :key="opt.value"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeCurve === opt.value }"
                      @click="pick('edgeCurve', opt.value)"
                    >{{ opt.label }}</li>
                  </ul>
                </transition>
              </div>
            </div>

            <label class="fx-field">
              <span class="fx-label">Opacity <em class="fx-opt">optional</em></span>
              <input
                class="fx-input"
                type="number"
                min="0.1"
                max="1"
                step="0.05"
                v-model.number="edgeOpacity"
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
      sourceArrowhead: '',
      edgeWidth: null,
      edgeColor: '',
      edgeLineStyle: '',
      edgeCurve: '',
      edgeOpacity: null,
      enableTrap: false,
      hints: {},
      edgeId: null,
      update: false,
      openSel: null,
      fromNode: '',
      toNode: ''
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    edgeArrowHeadStyleOptions() {
      return D3Util.edgeArrowHeadStyleOptions()
    },
    edgeArrowHeadOptions() {
      return D3Util.edgeArrowHeadOptions()
    },
    edgeLineStyleOptions() {
      return D3Util.edgeLineStyleOptions()
    },
    edgeCurveOptions() {
      return D3Util.edgeCurveOptions()
    },
    arrowStyleLabel() {
      return this._optLabel(this.edgeArrowHeadStyleOptions, this.edgeArrowHeadStyle, 'value', 'label', 'Filled')
    },
    arrowLabel() {
      return this._optLabel(this.edgeArrowHeadOptions, this.edgeArrowHead, 'value', 'label', 'Triangle')
    },
    sourceArrowLabel() {
      if (!this.sourceArrowhead) return '— none —'
      return this._optLabel(this.edgeArrowHeadOptions, this.sourceArrowhead, 'value', 'label', this.sourceArrowhead)
    },
    lineStyleLabel() {
      return this._optLabel(this.edgeLineStyleOptions, this.edgeLineStyle, 'value', 'label', '— theme —')
    },
    edgeCurveLabel() {
      return this._optLabel(this.edgeCurveOptions, this.edgeCurve, 'value', 'label', '— theme —')
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
      this.sourceArrowhead = this.d3Data?.sourceArrowhead || ''
      this.edgeWidth = this.d3Data?.edgeWidth ?? null
      this.edgeColor = this.d3Data?.edgeColor || ''
      this.edgeLineStyle = this.d3Data?.edgeLineStyle || ''
      this.edgeCurve = this.d3Data?.edgeCurve || ''
      this.edgeOpacity = this.d3Data?.edgeOpacity ?? null

      if (!this.update) {
        // Create mode: start from the configurable edge creation defaults in
        // Settings so a new line inherits the user's preferred look.
        const d = D3Util.defaultEdgeValues()
        this.edgeLabel          = d.edgeLabel
        this.edgeArrowHeadStyle = d.edgeArrowHeadStyle
        this.edgeArrowHead      = d.edgeArrowHead
        this.sourceArrowhead    = d.sourceArrowhead
        this.edgeWidth          = d.edgeWidth
        this.edgeColor          = d.edgeColor
        this.edgeLineStyle      = d.edgeLineStyle
        this.edgeCurve          = d.edgeCurve
        this.edgeOpacity        = d.edgeOpacity
      }

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
        sourceArrowhead: this.sourceArrowhead,
        edgeWidth: this.edgeWidth,
        edgeColor: this.edgeColor,
        edgeLineStyle: this.edgeLineStyle,
        edgeCurve: this.edgeCurve,
        edgeOpacity: this.edgeOpacity,
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
</style>
