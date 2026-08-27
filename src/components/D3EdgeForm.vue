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
            <h2 class="fx-title">EDGE</h2>
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
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('arrowStyle', $event)"
                >
                  {{ arrowStyleLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'arrowStyle'" class="fx-options">
                    <li
                      v-for="opt in edgeArrowHeadStyleOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeArrowHeadStyle === opt.value }"
                      @click="pick('edgeArrowHeadStyle', opt.value)"
                      @keydown.enter.prevent="pick('edgeArrowHeadStyle', opt.value)"
                      @keydown.space.prevent="pick('edgeArrowHeadStyle', opt.value)"
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
              <span class="fx-label">Edge Arrow Head</span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('arrow')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('arrow', $event)"
                >
                  {{ arrowLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'arrow'" class="fx-options">
                    <li
                      v-for="opt in edgeArrowHeadOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeArrowHead === opt.value }"
                      @click="pick('edgeArrowHead', opt.value)"
                      @keydown.enter.prevent="pick('edgeArrowHead', opt.value)"
                      @keydown.space.prevent="pick('edgeArrowHead', opt.value)"
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
          </div>

          <div class="fx-grid fx-grid-2">
            <label class="fx-field">
              <span class="fx-label">From Node</span>
              <input
                class="fx-input fx-input-static"
                type="text"
                v-model="fromNode"
                readonly
                placeholder="select source"
              />
            </label>
            <label class="fx-field">
              <span class="fx-label">To Node</span>
              <input
                class="fx-input fx-input-static"
                type="text"
                v-model="toNode"
                readonly
                placeholder="select target"
              />
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
            ></textarea>
          </label>

          <!-- ── Icon ──────────────────────────────────────────────────────── -->
          <div class="fx-field fx-field-full">
            <span class="fx-label">Icon <em class="fx-opt">optional</em></span>
            <div class="fx-icon-row" @click.stop>
              <div class="fx-select fx-icon-set-sel">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('iconSet')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('iconSet', $event)"
                >
                  {{ iconSetLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'iconSet'" class="fx-options">
                    <li
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': !iconSet }"
                      @click="pickIconSet('')"
                      @keydown.enter.prevent="pickIconSet('')"
                      @keydown.space.prevent="pickIconSet('')"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      — none —
                    </li>
                    <li
                      v-for="s in iconSetOptions"
                      :key="s.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': iconSet === s.value }"
                      @click="pickIconSet(s.value)"
                      @keydown.enter.prevent="pickIconSet(s.value)"
                      @keydown.space.prevent="pickIconSet(s.value)"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      {{ s.label }}
                    </li>
                  </ul>
                </transition>
              </div>

              <template v-if="iconSet">
                <div class="fx-icon-name-wrap">
                  <input
                    class="fx-input"
                    v-model="iconSearch"
                    :placeholder="
                      iconSet === 'mdi' ? 'Search MDI icons…' : 'Search Material Symbols…'
                    "
                    autocomplete="off"
                    @keypress.stop=""
                    @input="onIconSearchInput"
                    @focus="showIconPicker = true"
                    @click.stop="showIconPicker = true"
                  />
                  <span
                    v-if="iconName && iconSet === 'mdi'"
                    :class="`mdi ${iconName} fx-icon-thumb`"
                    aria-hidden="true"
                  ></span>
                  <span
                    v-if="iconName && iconSet === 'material-symbols'"
                    class="material-symbols-rounded fx-icon-thumb"
                    aria-hidden="true"
                    >{{ iconName }}</span
                  >
                  <button
                    v-if="iconName"
                    type="button"
                    class="fx-btn fx-btn-mini"
                    @click="clearIcon"
                    @keypress.stop=""
                  >
                    ✕
                  </button>
                </div>

                <div v-if="showIconPicker && iconPickerResults.length" class="fx-icon-picker">
                  <ul class="fx-icon-grid">
                    <li
                      v-for="name in iconPickerResults"
                      :key="name"
                      class="fx-icon-item"
                      :class="{ 'fx-icon-item-active': iconName === name }"
                      :title="iconTitle(name)"
                      tabindex="0"
                      @click="pickIconName(name)"
                      @keydown.enter.prevent="pickIconName(name)"
                      @keydown.space.prevent="pickIconName(name)"
                    >
                      <span
                        v-if="iconSet === 'mdi'"
                        :class="`mdi ${name}`"
                        aria-hidden="true"
                      ></span>
                      <span v-else class="material-symbols-rounded" aria-hidden="true">{{
                        name
                      }}</span>
                    </li>
                  </ul>
                  <div v-if="iconPickerHasMore" class="fx-icon-more">
                    <button
                      type="button"
                      class="fx-btn fx-btn-mini"
                      @click="iconPickerLimit += 60"
                      @keypress.stop=""
                    >
                      Load more…
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="iconName && iconSet" class="fx-grid">
            <div class="fx-field">
              <span class="fx-label">Icon Position</span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('iconPosition')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('iconPosition', $event)"
                >
                  {{ iconPositionLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'iconPosition'" class="fx-options">
                    <li
                      v-for="p in iconPositions"
                      :key="p.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': iconPosition === p.value }"
                      @click="pick('iconPosition', p.value)"
                      @keydown.enter.prevent="pick('iconPosition', p.value)"
                      @keydown.space.prevent="pick('iconPosition', p.value)"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      {{ p.label }}
                    </li>
                  </ul>
                </transition>
              </div>
            </div>

            <label class="fx-field">
              <span class="fx-label">Icon Size <em class="fx-opt">px</em></span>
              <input
                class="fx-input"
                type="number"
                min="8"
                max="64"
                step="1"
                v-model.number="iconSize"
                placeholder="theme"
                @keypress.stop=""
              />
            </label>

            <label class="fx-field">
              <span class="fx-label">Icon Color <em class="fx-opt">optional</em></span>
              <div class="fx-color-row">
                <input
                  class="fx-input fx-input-color"
                  type="color"
                  :value="iconColor || '#c8d0f0'"
                  @input="iconColor = $event.target.value"
                  @keypress.stop=""
                />
                <button
                  type="button"
                  class="fx-btn fx-btn-mini"
                  :class="{ 'fx-btn-active': !iconColor }"
                  @click="iconColor = ''"
                  @keypress.stop=""
                  title="Use label color"
                >
                  none
                </button>
              </div>
            </label>
          </div>

          <div class="fx-grid">
            <div class="fx-field">
              <span class="fx-label">Source Arrow Head <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('sourceArrowhead')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('sourceArrowhead', $event)"
                >
                  {{ sourceArrowLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'sourceArrowhead'" class="fx-options">
                    <li
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': sourceArrowhead === '' }"
                      @click="pick('sourceArrowhead', '')"
                      @keydown.enter.prevent="pick('sourceArrowhead', '')"
                      @keydown.space.prevent="pick('sourceArrowhead', '')"
                      @keydown.up.prevent="focusPrev($event)"
                      @keydown.down.prevent="focusNext($event)"
                      @keydown.k.prevent="focusPrev($event)"
                      @keydown.j.prevent="focusNext($event)"
                      @keydown.esc.stop="closeSel($event)"
                    >
                      — none —
                    </li>
                    <li
                      v-for="opt in edgeArrowHeadOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': sourceArrowhead === opt.value }"
                      @click="pick('sourceArrowhead', opt.value)"
                      @keydown.enter.prevent="pick('sourceArrowhead', opt.value)"
                      @keydown.space.prevent="pick('sourceArrowhead', opt.value)"
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
                >
                  none
                </button>
              </div>
            </label>

            <div class="fx-field">
              <span class="fx-label">Line Style <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('lineStyle')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('lineStyle', $event)"
                >
                  {{ lineStyleLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'lineStyle'" class="fx-options">
                    <li
                      v-for="opt in edgeLineStyleOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeLineStyle === opt.value }"
                      @click="pick('edgeLineStyle', opt.value)"
                      @keydown.enter.prevent="pick('edgeLineStyle', opt.value)"
                      @keydown.space.prevent="pick('edgeLineStyle', opt.value)"
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
              <span class="fx-label">Curve Style <em class="fx-opt">optional</em></span>
              <div class="fx-select">
                <button
                  type="button"
                  class="fx-select-trigger"
                  @click.stop="toggleSel('curve')"
                  @keypress.stop=""
                  @keydown.down.prevent="openAndFocus('curve', $event)"
                >
                  {{ edgeCurveLabel }}<span class="fx-caret">▾</span>
                </button>
                <transition name="fx-drop">
                  <ul v-if="openSel === 'curve'" class="fx-options">
                    <li
                      v-for="opt in edgeCurveOptions"
                      :key="opt.value"
                      tabindex="0"
                      class="fx-option"
                      :class="{ 'fx-option-active': edgeCurve === opt.value }"
                      @click="pick('edgeCurve', opt.value)"
                      @keydown.enter.prevent="pick('edgeCurve', opt.value)"
                      @keydown.space.prevent="pick('edgeCurve', opt.value)"
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
          >
            Update Edge <span class="fx-kbd">{{ shortcutLabels.save }}</span>
          </button>
          <button
            v-else
            type="button"
            class="fx-btn fx-btn-primary"
            @click="addEdge()"
            @keypress.stop=""
          >
            Add Edge <span class="fx-kbd">{{ shortcutLabels.save }}</span>
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
import { listIcons, ensureIconFont, ICON_SETS, ICON_POSITIONS } from '@/helpers/IconRegistry.js'
export default {
  name: 'D3Edge',
  props: ['active', 'd3Data'],
  inject: ['modifier'],
  data() {
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
      toNode: '',
      iconSet: '',
      iconName: '',
      iconPosition: 'left',
      iconSize: null,
      iconColor: '',
      iconSearch: '',
      showIconPicker: false,
      iconPickerLimit: 60
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
      return this._optLabel(
        this.edgeArrowHeadStyleOptions,
        this.edgeArrowHeadStyle,
        'value',
        'label',
        'Filled'
      )
    },
    arrowLabel() {
      return this._optLabel(
        this.edgeArrowHeadOptions,
        this.edgeArrowHead,
        'value',
        'label',
        'Triangle'
      )
    },
    sourceArrowLabel() {
      if (!this.sourceArrowhead) return '— none —'
      return this._optLabel(
        this.edgeArrowHeadOptions,
        this.sourceArrowhead,
        'value',
        'label',
        this.sourceArrowhead
      )
    },
    lineStyleLabel() {
      return this._optLabel(
        this.edgeLineStyleOptions,
        this.edgeLineStyle,
        'value',
        'label',
        '— theme —'
      )
    },
    edgeCurveLabel() {
      return this._optLabel(this.edgeCurveOptions, this.edgeCurve, 'value', 'label', '— theme —')
    },
    iconSetOptions() {
      return ICON_SETS
    },
    iconPositions() {
      return ICON_POSITIONS
    },
    iconSetLabel() {
      if (!this.iconSet) return '— none —'
      const found = ICON_SETS.find((s) => s.value === this.iconSet)
      return found ? found.label : this.iconSet
    },
    iconPositionLabel() {
      const found = ICON_POSITIONS.find((p) => p.value === this.iconPosition)
      return found ? found.label : this.iconPosition
    },
    iconPickerResults() {
      if (!this.iconSet) return []
      return listIcons(this.iconSet, this.iconSearch, { limit: this.iconPickerLimit })
    },
    iconPickerHasMore() {
      if (!this.iconSet) return false
      return (
        listIcons(this.iconSet, this.iconSearch, { limit: 1, offset: this.iconPickerLimit })
          .length > 0
      )
    },
    pathText() {
      if (this.fromNode && this.toNode) return `${this.fromNode} → ${this.toNode}`
      if (this.fromNode || this.toNode) return this.fromNode || this.toNode
      return '—'
    },
    edgeRows() {
      const count = (this.edgeLabel || '').split('\n').length
      return Math.min(6, Math.max(2, count))
    }
  },
  mounted() {
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
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },
  methods: {
    _populate() {
      // Derive from the prop every time: the immediate d3Data watcher runs
      // before created(), so we can't rely on update/edgeModal being set yet.
      this.update = this.active == 'Edit Edge'
      this.edgeModal = this.active == 'Edit Edge' || this.active == 'Add Edge'
      if (D3Util.debug)
        console.log('[D3EdgeForm] _populate', {
          active: this.active,
          update: this.update,
          edgeModal: this.edgeModal,
          d3Data: this.d3Data
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
      this.iconSet = this.d3Data?.iconSet || ''
      this.iconName = this.d3Data?.iconName || ''
      this.iconPosition = this.d3Data?.iconPosition || 'left'
      this.iconSize = this.d3Data?.iconSize ?? null
      this.iconColor = this.d3Data?.iconColor || ''
      this.iconSearch = this.d3Data?.iconName || ''

      if (!this.update) {
        // Create mode: start from the configurable edge creation defaults in
        // Settings so a new line inherits the user's preferred look.
        const d = D3Util.defaultEdgeValues()
        this.edgeLabel = d.edgeLabel
        this.edgeArrowHeadStyle = d.edgeArrowHeadStyle
        this.edgeArrowHead = d.edgeArrowHead
        this.sourceArrowhead = d.sourceArrowhead
        this.edgeWidth = d.edgeWidth
        this.edgeColor = d.edgeColor
        this.edgeLineStyle = d.edgeLineStyle
        this.edgeCurve = d.edgeCurve
        this.edgeOpacity = d.edgeOpacity
        this.iconSet = d.iconSet || ''
        this.iconName = d.iconName || ''
        this.iconPosition = d.iconPosition || 'left'
        this.iconSize = d.iconSize != null ? d.iconSize : null
        this.iconColor = d.iconColor || ''
        this.iconSearch = d.iconName || ''
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
      this.fromNode = srcId ? mod.getNodeData(srcId)?.label || srcId : ''
      this.toNode = tgtId ? mod.getNodeData(tgtId)?.label || tgtId : ''
      if (D3Util.debug)
        console.log('[D3EdgeForm] fields', {
          edgeId: this.edgeId,
          edgeLabel: this.edgeLabel,
          edgeArrowHeadStyle: this.edgeArrowHeadStyle,
          edgeArrowHead: this.edgeArrowHead,
          sourceArrowhead: this.sourceArrowhead,
          edgeWidth: this.edgeWidth,
          edgeColor: this.edgeColor,
          edgeLineStyle: this.edgeLineStyle,
          edgeCurve: this.edgeCurve,
          edgeOpacity: this.edgeOpacity,
          fromNode: this.fromNode,
          toNode: this.toNode
        })
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
        const ul = container?.querySelector('.fx-options')
        if (ul) {
          const target = ul.querySelector('.fx-option-active') || ul.querySelector('.fx-option')
          if (target) target.focus()
        }
      })
    },
    focusPrev(event) {
      const prev = event.target.previousElementSibling
      if (prev) prev.focus()
      else event.target.closest('.fx-options')?.lastElementChild?.focus()
    },
    focusNext(event) {
      const next = event.target.nextElementSibling
      if (next) next.focus()
      else event.target.closest('.fx-options')?.firstElementChild?.focus()
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
      this.showIconPicker = false
    },
    onIconSearchInput() {
      this.iconPickerLimit = 60
      this.showIconPicker = true
      if (this.iconSet === 'material-symbols') {
        this.iconName = this.iconSearch
      } else if (!this.iconSearch) {
        this.iconName = ''
      }
    },
    iconTitle(name) {
      // MDI names carry an "mdi-" prefix that only adds noise in the tooltip;
      // a Material Symbols name is already the bare ligature.
      return this.iconSet === 'mdi' ? name.slice(4) : name
    },
    pickIconName(name) {
      this.iconName = name
      this.iconSearch = name
      this.showIconPicker = false
    },
    pickIconSet(val) {
      this.iconSet = val
      this.iconName = ''
      this.iconSearch = ''
      this.showIconPicker = false
      this.iconPickerLimit = 60
      this.openSel = null
    },
    clearIcon() {
      this.iconName = ''
      this.iconSearch = ''
      this.showIconPicker = false
    },
    updateEdge() {
      const mod = this.modifier?.value ?? this.modifier
      mod.updateEdge(this.$data, this.edgeId)
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
        this.edgeLabel = ''
      }
    },
    onKeyup(event) {
      if (event.repeat) return
      if (Shortcuts.matches(event, 'save')) {
        event.preventDefault()
        this.updateEdge()
      }
    },
    addEdge() {
      const mod = this.modifier?.value ?? this.modifier
      mod.addEdge(this.$data)
      this.common()
    },
    close() {
      this.common()
    },
    common() {
      this.edgeModal = false
      this.hints = D3Util.removeHints(this.hints)
      this.emitter.emit('setSheetToFalse')
    }
  },
  watch: {
    iconSet: {
      // The preview thumb is styled by the Material Symbols stylesheet, which is
      // fetched on demand — pull it in as soon as the set is picked or restored,
      // otherwise the thumb renders the raw ligature name instead of the glyph.
      handler(val) {
        ensureIconFont(val)
      },
      immediate: true
    },
    active(val) {
      this.update = val == 'Edit Edge'
      this.edgeModal = val == 'Edit Edge' || val == 'Add Edge'
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

/* ── Icon picker ─────────────────────────────────────────────────────── */
.fx-icon-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.fx-icon-set-sel {
  align-self: flex-start;
}

.fx-icon-name-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fx-icon-name-wrap .fx-input {
  flex: 1;
  min-width: 0;
}

.fx-icon-thumb {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  color: rgb(var(--fx-accent));
}

.fx-icon-picker {
  background: rgba(var(--fx-glass-bottom, 18 26 48), 0.97);
  border: 1px solid rgba(var(--fx-accent), 0.28);
  border-radius: 6px;
  padding: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.fx-icon-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.fx-icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  color: rgb(var(--fx-ink, 200 208 240));
  transition:
    background 0.1s,
    color 0.1s;
}

.fx-icon-item:hover,
.fx-icon-item:focus {
  background: rgba(var(--fx-accent), 0.18);
  color: rgb(var(--fx-accent));
  outline: none;
}

.fx-icon-item-active {
  background: rgba(var(--fx-accent), 0.28);
  color: rgb(var(--fx-accent));
}

.fx-icon-more {
  margin-top: 6px;
  text-align: center;
}
</style>
