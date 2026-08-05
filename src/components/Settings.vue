<template>
  <Teleport to="body">
    <transition name="fx-scrim">
      <div
        v-if="settingsModal"
        class="fx-scrim"
        @click="close()"
      ></div>
    </transition>
    <transition name="fx-panel">
      <div
        v-if="settingsModal"
        class="fx-hud-stage"
      >
        <focus-trap
          v-model:active="settingsModal"
          class="trap is-active"
        >
          <div tabindex="0" class="fx-panel" @keydown.esc="close()">
            <div class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip fx-chip-settings">SETTINGS</span>
                  <h2 class="fx-title">Preferences</h2>
                </div>
                <button
                  type="button"
                  class="fx-close"
                  aria-label="Close settings"
                  @click="close()"
                >✕</button>
              </header>
              <div class="fx-readout">
                <span class="fx-readout-kv fx-readout-wide">
                  <span class="fx-readout-k">STATUS</span>
                  <span class="fx-readout-v">Cola · Cytoscape.js</span>
                </span>
                <span class="fx-readout-kv">
                  <span class="fx-readout-k">RELOAD</span>
                  <span class="fx-readout-v">Required after saving</span>
                </span>
              </div>
              <div class="fx-panel-body">
                <section class="fx-section">
                  <h3 class="fx-section-title">General</h3>
                  <div class="fx-section-body">
                    <label class="fx-toggle">
                      <div class="fx-toggle-text">
                        <span>Show Help Pane</span>
                        <small>Restores the floating assistant</small>
                      </div>
                      <input type="checkbox" v-model="settings.showHelpPane" />
                      <span class="fx-toggle-track"></span>
                    </label>
                    <label class="fx-toggle">
                      <div class="fx-toggle-text">
                        <span>Enable Console Debugging</span>
                        <small>Verbose logging for troubleshooting</small>
                      </div>
                      <input type="checkbox" v-model="settings.debug" />
                      <span class="fx-toggle-track"></span>
                    </label>
                    <label class="fx-toggle">
                      <div class="fx-toggle-text">
                        <span>Show Graph Metadata</span>
                        <small>Toggle the D3DInfo debug overlay</small>
                      </div>
                      <input type="checkbox" v-model="settings.d3dInfo" />
                      <span class="fx-toggle-track"></span>
                    </label>
                    <div>
                      <p class="fx-field-label">Theme</p>
                      <div class="fx-pill-row">
                        <button
                          type="button"
                          class="fx-pill"
                          :class="{ 'is-active': settings.defaultTheme === 'light' }"
                          @click="settings.defaultTheme = 'light'"
                        >Light</button>
                        <button
                          type="button"
                          class="fx-pill"
                          :class="{ 'is-active': settings.defaultTheme === 'dark' }"
                          @click="settings.defaultTheme = 'dark'"
                        >Dark</button>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="fx-section">
                  <h3 class="fx-section-title">Hints</h3>
                  <div class="fx-section-body">
                    <label class="fx-field">
                      <span class="fx-label">Hint Keys</span>
                      <input
                        class="fx-input"
                        type="text"
                        v-model="settings.hints"
                        placeholder="asdfjklqweruiopzxcvnmgh"
                      />
                    </label>
                    <div class="fx-grid">
                      <label class="fx-field">
                        <span class="fx-label">Hint Link Color</span>
                        <input
                          class="fx-input fx-input-color"
                          type="color"
                          v-model="settings.hintLinkColor"
                        />
                      </label>
                      <label class="fx-field">
                        <span class="fx-label">Hint Badge Background</span>
                        <input
                          class="fx-input fx-input-color"
                          type="color"
                          v-model="settings.hintBGColor"
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <section class="fx-section">
                  <h3 class="fx-section-title">Layout Defaults</h3>
                  <div class="fx-section-body">
                    <div class="fx-grid">
                      <label class="fx-field">
                        <span class="fx-label">Default Layout Mode</span>
                        <select class="fx-input" v-model="settings.defaultLayoutMode">
                          <option value="cola">Cola (Physics-based)</option>
                        </select>
                      </label>
                      <label class="fx-field">
                        <span class="fx-label">Flow Direction</span>
                        <select class="fx-input" v-model="settings.defaultColaFlow">
                          <option :value="null">None</option>
                          <option value="x">Horizontal (x)</option>
                          <option value="y">Vertical (y)</option>
                        </select>
                      </label>
                    </div>
                    <div class="fx-grid">
                      <label class="fx-field">
                        <span class="fx-label">Default Edge Length</span>
                        <input class="fx-input" type="number" v-model.number="settings.defaultColaEdgeLength" />
                      </label>
                      <label class="fx-field">
                        <span class="fx-label">Default Node Spacing</span>
                        <input class="fx-input" type="number" v-model.number="settings.defaultColaNodeSpacing" />
                      </label>
                    </div>
                    <div class="fx-grid">
                      <label class="fx-field">
                        <span class="fx-label">Max Simulation Time (ms)</span>
                        <input class="fx-input" type="number" v-model.number="settings.defaultColaMaxSimulationTime" />
                      </label>
                      <label class="fx-field">
                        <span class="fx-label">Gravity</span>
                        <input class="fx-input" type="number" min="0" step="0.1" v-model.number="settings.defaultColaGravity" />
                        <small class="fx-toggle-note">0 = no pull; higher pulls disconnected nodes toward center.</small>
                      </label>
                    </div>
                    <label class="fx-toggle">
                      <div class="fx-toggle-text">
                        <span>Avoid Node Overlap</span>
                        <small>Enforces separation of nodes</small>
                      </div>
                      <input type="checkbox" v-model="settings.defaultColaAvoidOverlap" />
                      <span class="fx-toggle-track"></span>
                    </label>
                  </div>
                </section>

                 <section class="fx-section">
                  <h3 class="fx-section-title">Renderer</h3>
                  <div class="fx-section-body">
                    <label class="fx-toggle">
                      <div class="fx-toggle-text">
                        <span>Fit diagram to viewport on open</span>
                        <small>Auto-zoom so the whole graph is visible</small>
                      </div>
                      <input type="checkbox" v-model="settings.defaultZoomFit" />
                      <span class="fx-toggle-track"></span>
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Fit Padding (px)</span>
                      <input
                        class="fx-input"
                        type="number"
                        step="1"
                        min="0"
                        max="200"
                        v-model.number="settings.zoomFitFactor"
                      />
                      <small class="fx-toggle-note">Pixel padding around the graph when fitting to the viewport.</small>
                    </label>
                    <label class="fx-field">
                      <span class="fx-label">Default Zoom Level</span>
                      <input
                        class="fx-input"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="5"
                        v-model.number="settings.defaultZoomLevel"
                      />
                      <small class="fx-toggle-note">Zoom applied on open. With fit on: 1 = fit, 2 = twice as close, 0.5 = half. With fit off: absolute level.</small>
                    </label>
                    <div class="fx-grid">
                      <label class="fx-field">
                        <span class="fx-label">Default Edge Style</span>
                        <select class="fx-input" v-model="settings.defaultEdgeStyle">
                          <option value="curved">Curved (Bezier)</option>
                          <option value="straight">Straight Line</option>
                        </select>
                      </label>
                      <label class="fx-field">
                        <span class="fx-label">Edge Thickness</span>
                        <input
                          class="fx-input"
                          type="number"
                          min="1"
                          max="10"
                          v-model.number="settings.defaultEdgeWidth"
                        />
                      </label>
                    </div>
                    <div class="fx-grid">
                      <label class="fx-field">
                        <span class="fx-label">Edge Opacity</span>
                        <input
                          class="fx-input"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="1"
                          v-model.number="settings.defaultEdgeOpacity"
                        />
                      </label>
                      <label class="fx-field">
                        <span class="fx-label">Arrowhead Size</span>
                        <input
                          class="fx-input"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="3"
                          v-model.number="settings.defaultArrowScale"
                        />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
              <footer class="fx-panel-actions">
                <button
                  type="button"
                  class="fx-btn fx-btn-primary"
                  @click="save()"
                >Save ({{ shortcutLabels.save }})</button>
                <button
                  type="button"
                  class="fx-btn fx-btn-ghost"
                  @click="resetSettings()"
                >Reset Defaults</button>
                <button
                  type="button"
                  class="fx-btn fx-btn-ghost"
                  @click="close()"
                >Close ({{ shortcutLabels.close }})</button>
              </footer>
            </div>
          </div>
        </focus-trap>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import D3Util from '@/helpers/D3Util'

export default {
  name: 'SettingsDialog',
  props: ['active', 'd3dInfo'],
  inheritAttrs: false,
  data () {
    return {
      settingsModal: false,
      settings: this.cloneDefaults(),
    }
  },
  computed: {
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
  },
  mounted () {
    const defaults = this.cloneDefaults()
    const cookie = this.$cookies.get('settings')
    if (cookie) {
      this.settings = this.mergeWithDefaults(cookie, defaults)
    } else {
      this.settings = defaults
      this.$cookies.set('settings', defaults)
    }

    this.emitter.on('settings', () => {
      this.settingsModal = true
    })
  },
  methods: {
    cloneDefaults() {
      const defaults = D3Util.appDefaults()
      return JSON.parse(JSON.stringify(defaults))
    },
    mergeWithDefaults(stored, defaults) {
      const merged = { ...defaults, ...stored }
      merged.themes = stored.themes || defaults.themes
      merged.hints = stored.hints || defaults.hints
      merged.hintLinkColor = stored.hintLinkColor || defaults.hintLinkColor
      merged.hintBGColor = stored.hintBGColor || defaults.hintBGColor
      merged.defaultTheme = stored.defaultTheme || defaults.defaultTheme
      merged.debug = Boolean(stored.debug)
      merged.d3dInfo = Boolean(stored.d3dInfo)
      merged.showHelpPane = Boolean(stored.showHelpPane)
      merged.zoomFitFactor = Number(stored.zoomFitFactor) || defaults.zoomFitFactor
      merged.defaultZoomFit = stored.defaultZoomFit !== undefined ? Boolean(stored.defaultZoomFit) : defaults.defaultZoomFit
      merged.defaultZoomLevel = stored.defaultZoomLevel !== undefined ? Number(stored.defaultZoomLevel) : defaults.defaultZoomLevel
      merged.defaultLayoutMode = stored.defaultLayoutMode || defaults.defaultLayoutMode
      merged.defaultColaEdgeLength = stored.defaultColaEdgeLength !== undefined ? Number(stored.defaultColaEdgeLength) : defaults.defaultColaEdgeLength
      merged.defaultColaNodeSpacing = stored.defaultColaNodeSpacing !== undefined ? Number(stored.defaultColaNodeSpacing) : defaults.defaultColaNodeSpacing
      merged.defaultColaFlow = stored.defaultColaFlow !== undefined ? stored.defaultColaFlow : defaults.defaultColaFlow
      merged.defaultColaAvoidOverlap = stored.defaultColaAvoidOverlap !== undefined ? Boolean(stored.defaultColaAvoidOverlap) : defaults.defaultColaAvoidOverlap
      merged.defaultColaMaxSimulationTime = stored.defaultColaMaxSimulationTime !== undefined ? Number(stored.defaultColaMaxSimulationTime) : defaults.defaultColaMaxSimulationTime
      merged.defaultColaGravity = stored.defaultColaGravity !== undefined ? Number(stored.defaultColaGravity) : defaults.defaultColaGravity
      merged.defaultEdgeStyle = stored.defaultEdgeStyle || defaults.defaultEdgeStyle
      merged.defaultEdgeWidth = stored.defaultEdgeWidth !== undefined ? Number(stored.defaultEdgeWidth) : defaults.defaultEdgeWidth
      merged.defaultEdgeOpacity = stored.defaultEdgeOpacity !== undefined ? Number(stored.defaultEdgeOpacity) : defaults.defaultEdgeOpacity
      merged.defaultArrowScale = Math.min(3, Math.max(0.1, stored.defaultArrowScale !== undefined ? Number(stored.defaultArrowScale) : defaults.defaultArrowScale))
      return merged
    },
    close () {
      this.common()
    },
    save () {
      this.$cookies.set('settings', this.settings)
      this.emitter.emit('appMessage', {status: 'success', message: 'Settings saved'})
      this.common()
    },
    resetSettings () {
      const defaults = this.cloneDefaults()
      this.settings = defaults
      this.$cookies.set('settings', defaults)
    },
    common () {
      this.settingsModal = false
      this.emitter.emit('changeActive')
    },
  },
}
</script>

<style scoped>
.fx-chip-settings {
  background: rgba(var(--fx-accent), 0.1);
  color: rgb(var(--fx-ink));
  text-shadow: none;
}

.fx-section {
  margin-bottom: 18px;
}

.fx-section-body {
  display: grid;
  gap: 12px;
}

.fx-section-title {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgb(var(--fx-ink-dim));
  margin-bottom: 10px;
}

.fx-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(var(--fx-accent), 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(var(--fx-input-bg), 0.65);
  position: relative;
}

.fx-toggle-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fx-toggle-text span {
  font-size: 13px;
  color: rgb(var(--fx-ink));
  font-weight: 600;
}

.fx-toggle-text small {
  font-size: 10px;
  color: rgb(var(--fx-ink-faint));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fx-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.fx-toggle-track {
  width: 42px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  background: rgba(var(--fx-ink-faint), 0.2);
  position: relative;
}

.fx-toggle-track::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgb(var(--fx-ink));
  transition: transform 0.2s ease;
}

.fx-toggle input:checked + .fx-toggle-track::after {
  transform: translate(18px, -50%);
}

.fx-pill-row {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.fx-pill {
  border-radius: 999px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  background: transparent;
  color: rgb(var(--fx-ink));
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.fx-pill.is-active {
  background: rgba(var(--fx-accent), 0.25);
  color: rgb(var(--fx-ink));
}

.fx-input-color {
  height: 40px;
  padding: 4px;
  border-radius: 8px;
}

.fx-field-label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgb(var(--fx-ink-dim));
}

.fx-toggle-note {
  font-size: 11px;
  color: rgb(var(--fx-ink-faint));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: block;
  margin-top: 4px;
}

.fx-advanced-details {
  border: 1px dashed rgba(var(--fx-accent), 0.35);
  border-radius: 8px;
  background: rgba(var(--fx-inset), 0.2);
  margin-top: 14px;
  overflow: hidden;
  transition: all 0.25s ease;
}

.fx-advanced-summary {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--fx-ink-soft));
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  background: rgba(var(--fx-accent), 0.08);
  outline: none;
}

.fx-advanced-summary:hover {
  background: rgba(var(--fx-accent), 0.15);
  color: rgb(var(--fx-ink));
}

.fx-advanced-content {
  padding: 14px;
  border-top: 1px solid rgba(var(--fx-accent), 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fx-advanced-subsection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fx-subsection-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgb(var(--fx-title-ink));
  margin: 0 0 4px;
}

.fx-advanced-hint {
  font-size: 11px;
  color: rgb(var(--fx-ink-faint));
  text-align: center;
  font-style: italic;
}
</style>
