<template>
  <Teleport to="body">
    <transition name="fx-scrim">
      <div v-if="settingsModal" class="fx-scrim" @click="close()"></div>
    </transition>
    <transition name="fx-panel">
      <div v-if="settingsModal" class="fx-hud-stage">
        <focus-trap v-model:active="settingsModal" class="trap is-active">
          <div tabindex="0" class="fx-panel" @keydown="onKeydown($event)">
            <div class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip fx-chip-settings">SETTINGS</span>
                  <h2 class="fx-title">Preferences</h2>
                </div>
                <button type="button" class="fx-close" aria-label="Close settings" @click="close()">
                  ✕
                </button>
              </header>
              <div class="fx-readout">
                <span class="fx-readout-kv fx-readout-wide">
                  <span class="fx-readout-k">STATUS</span>
                  <span class="fx-readout-v">{{ layoutModeLabel }} · Cytoscape.js</span>
                </span>
              </div>
              <div class="fx-panel-body">
                <div class="fx-settings-group">
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
                      <label class="fx-field">
                        <span class="fx-label">Server URL</span>
                        <input
                          class="fx-input"
                          type="text"
                          v-model="settings.serverUrl"
                          placeholder="http://localhost:3000"
                        />
                        <small class="fx-toggle-note"
                          >Backend API URL. Change if your server runs on a different host or
                          port.</small
                        >
                      </label>
                      <div>
                        <p class="fx-field-label">Theme</p>
                        <div class="fx-pill-row">
                          <button
                            type="button"
                            class="fx-pill"
                            :class="{ 'is-active': settings.defaultTheme === 'light' }"
                            @click="settings.defaultTheme = 'light'"
                          >
                            Light
                          </button>
                          <button
                            type="button"
                            class="fx-pill"
                            :class="{ 'is-active': settings.defaultTheme === 'dark' }"
                            @click="settings.defaultTheme = 'dark'"
                          >
                            Dark
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div class="fx-settings-group">
                  <section class="fx-section">
                    <h3 class="fx-section-title">Shortcuts</h3>
                    <div class="fx-section-body">
                      <div
                        v-for="group in shortcutGroups"
                        :key="group.id"
                        class="fx-shortcut-group"
                      >
                        <h4 class="fx-shortcut-group-title">{{ group.label }}</h4>
                        <ShortcutRecorder
                          v-for="action in group.actions"
                          :key="action.id"
                          :action-id="action.id"
                          :label="action.label"
                          v-model="settings.shortcuts[action.id]"
                          :conflict-ids="shortcutConflicts(action.id)"
                        />
                      </div>
                      <div class="fx-shortcut-actions">
                        <button type="button" class="fx-btn-mini" @click="resetShortcuts">
                          Reset all shortcuts to defaults
                        </button>
                      </div>
                    </div>
                  </section>
                </div>

                <div class="fx-settings-group">
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
                </div>

                <div class="fx-settings-group">
                  <section class="fx-section">
                    <h3 class="fx-section-title">Layout Defaults</h3>
                    <div class="fx-section-body">
                      <div class="fx-grid">
                        <div class="fx-field">
                          <span class="fx-label">Default Layout Mode</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('layoutMode')"
                            >
                              {{ layoutModeLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'layoutMode'" class="fx-options">
                                <li
                                  v-for="opt in layoutModeOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultLayoutMode === opt.value
                                  }"
                                  @click="pick('defaultLayoutMode', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <div v-if="settings.defaultLayoutMode === 'cola'" class="fx-field">
                          <span class="fx-label">Flow Direction</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('flow')"
                            >
                              {{ flowLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'flow'" class="fx-options">
                                <li
                                  v-for="opt in flowOptions"
                                  :key="opt.label"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultColaFlow === opt.value
                                  }"
                                  @click="pick('defaultColaFlow', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                      </div>
                      <div v-if="settings.defaultLayoutMode === 'cola'" class="fx-grid">
                        <label class="fx-field">
                          <span class="fx-label">Default Edge Length</span>
                          <input
                            class="fx-input"
                            type="number"
                            v-model.number="settings.defaultColaEdgeLength"
                          />
                        </label>
                        <label class="fx-field">
                          <span class="fx-label">Default Node Spacing</span>
                          <input
                            class="fx-input"
                            type="number"
                            v-model.number="settings.defaultColaNodeSpacing"
                          />
                        </label>
                      </div>
                      <div v-if="settings.defaultLayoutMode === 'cola'" class="fx-grid">
                        <label class="fx-field">
                          <span class="fx-label">Max Simulation Time (ms)</span>
                          <input
                            class="fx-input"
                            type="number"
                            v-model.number="settings.defaultColaMaxSimulationTime"
                          />
                        </label>
                        <label class="fx-field">
                          <span class="fx-label">Gravity</span>
                          <input
                            class="fx-input"
                            type="number"
                            min="0"
                            step="0.1"
                            v-model.number="settings.defaultColaGravity"
                          />
                          <small class="fx-toggle-note"
                            >0 = no pull; higher pulls disconnected nodes toward center.</small
                          >
                        </label>
                      </div>
                      <label v-if="settings.defaultLayoutMode === 'cola'" class="fx-toggle">
                        <div class="fx-toggle-text">
                          <span>Avoid Node Overlap</span>
                          <small>Enforces separation of nodes</small>
                        </div>
                        <input type="checkbox" v-model="settings.defaultColaAvoidOverlap" />
                        <span class="fx-toggle-track"></span>
                      </label>

                      <template v-if="settings.defaultLayoutMode === 'cose'">
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Node Repulsion</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              step="10000"
                              v-model.number="settings.defaultCoseNodeRepulsion"
                            />
                            <small class="fx-toggle-note">Higher = nodes push apart more.</small>
                          </label>
                          <label class="fx-field">
                            <span class="fx-label">Ideal Edge Length</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="1"
                              v-model.number="settings.defaultCoseIdealEdgeLength"
                            />
                          </label>
                        </div>
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Gravity</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              step="0.1"
                              v-model.number="settings.defaultCoseGravity"
                            />
                            <small class="fx-toggle-note">Pulls nodes toward center.</small>
                          </label>
                          <label class="fx-field">
                            <span class="fx-label">Node Overlap Padding</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              v-model.number="settings.defaultCoseNodeOverlap"
                            />
                          </label>
                        </div>
                      </template>

                      <template v-if="settings.defaultLayoutMode === 'breadthfirst'">
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Spacing Factor</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              v-model.number="settings.defaultBreadthfirstSpacingFactor"
                            />
                          </label>
                        </div>
                        <label class="fx-toggle">
                          <div class="fx-toggle-text">
                            <span>Directed</span>
                            <small>Respect edge direction in the tree</small>
                          </div>
                          <input type="checkbox" v-model="settings.defaultBreadthfirstDirected" />
                          <span class="fx-toggle-track"></span>
                        </label>
                        <label class="fx-toggle">
                          <div class="fx-toggle-text">
                            <span>Circle</span>
                            <small>Arrange as a circular tree</small>
                          </div>
                          <input type="checkbox" v-model="settings.defaultBreadthfirstCircle" />
                          <span class="fx-toggle-track"></span>
                        </label>
                      </template>

                      <template v-if="settings.defaultLayoutMode === 'grid'">
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Rows <em class="fx-opt">empty = auto</em></span>
                            <input
                              class="fx-input"
                              type="number"
                              min="1"
                              v-model.number="settings.defaultGridRows"
                              placeholder="auto"
                            />
                          </label>
                          <label class="fx-field">
                            <span class="fx-label"
                              >Columns <em class="fx-opt">empty = auto</em></span
                            >
                            <input
                              class="fx-input"
                              type="number"
                              min="1"
                              v-model.number="settings.defaultGridCols"
                              placeholder="auto"
                            />
                          </label>
                        </div>
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Spacing Factor</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              v-model.number="settings.defaultGridSpacingFactor"
                            />
                          </label>
                        </div>
                        <label class="fx-toggle">
                          <div class="fx-toggle-text">
                            <span>Avoid Node Overlap</span>
                            <small>Enforces separation of nodes</small>
                          </div>
                          <input type="checkbox" v-model="settings.defaultGridAvoidOverlap" />
                          <span class="fx-toggle-track"></span>
                        </label>
                      </template>

                      <template v-if="settings.defaultLayoutMode === 'circle'">
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Spacing Factor</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              v-model.number="settings.defaultCircleSpacingFactor"
                            />
                          </label>
                        </div>
                        <label class="fx-toggle">
                          <div class="fx-toggle-text">
                            <span>Clockwise</span>
                            <small>Place nodes clockwise around the circle</small>
                          </div>
                          <input type="checkbox" v-model="settings.defaultCircleClockwise" />
                          <span class="fx-toggle-track"></span>
                        </label>
                      </template>

                      <template v-if="settings.defaultLayoutMode === 'concentric'">
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Spacing Factor</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0.1"
                              step="0.1"
                              v-model.number="settings.defaultConcentricSpacingFactor"
                            />
                          </label>
                          <label class="fx-field">
                            <span class="fx-label">Min Node Spacing</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              v-model.number="settings.defaultConcentricMinNodeSpacing"
                            />
                          </label>
                        </div>
                        <label class="fx-toggle">
                          <div class="fx-toggle-text">
                            <span>Clockwise</span>
                            <small>Place nodes clockwise around rings</small>
                          </div>
                          <input type="checkbox" v-model="settings.defaultConcentricClockwise" />
                          <span class="fx-toggle-track"></span>
                        </label>
                        <label class="fx-toggle">
                          <div class="fx-toggle-text">
                            <span>Equidistant</span>
                            <small>Equal distance between concentric rings</small>
                          </div>
                          <input type="checkbox" v-model="settings.defaultConcentricEquidistant" />
                          <span class="fx-toggle-track"></span>
                        </label>
                      </template>

                      <template v-if="settings.defaultLayoutMode === 'dagre'">
                        <div class="fx-grid">
                          <div class="fx-field">
                            <span class="fx-label">Rank Direction</span>
                            <div class="fx-select">
                              <button
                                type="button"
                                class="fx-select-trigger"
                                @click.stop="toggleSel('dagreRankDir')"
                              >
                                {{ dagreRankDirLabel }}<span class="fx-caret">▾</span>
                              </button>
                              <transition name="fx-drop">
                                <ul v-if="openSel === 'dagreRankDir'" class="fx-options">
                                  <li
                                    v-for="opt in dagreRankDirOptions"
                                    :key="opt.value"
                                    class="fx-option"
                                    :class="{
                                      'fx-option-active': settings.defaultDagreRankDir === opt.value
                                    }"
                                    @click="pick('defaultDagreRankDir', opt.value)"
                                  >
                                    {{ opt.label }}
                                  </li>
                                </ul>
                              </transition>
                            </div>
                          </div>
                          <div class="fx-field">
                            <span class="fx-label">Ranker Algorithm</span>
                            <div class="fx-select">
                              <button
                                type="button"
                                class="fx-select-trigger"
                                @click.stop="toggleSel('dagreRanker')"
                              >
                                {{ dagreRankerLabel }}<span class="fx-caret">▾</span>
                              </button>
                              <transition name="fx-drop">
                                <ul v-if="openSel === 'dagreRanker'" class="fx-options">
                                  <li
                                    v-for="opt in dagreRankerOptions"
                                    :key="opt.value"
                                    class="fx-option"
                                    :class="{
                                      'fx-option-active': settings.defaultDagreRanker === opt.value
                                    }"
                                    @click="pick('defaultDagreRanker', opt.value)"
                                  >
                                    {{ opt.label }}
                                  </li>
                                </ul>
                              </transition>
                            </div>
                          </div>
                        </div>
                        <div class="fx-grid">
                          <label class="fx-field">
                            <span class="fx-label">Node Separation</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              v-model.number="settings.defaultDagreNodeSep"
                            />
                            <small class="fx-toggle-note"
                              >Pixels between nodes in the same rank.</small
                            >
                          </label>
                          <label class="fx-field">
                            <span class="fx-label">Rank Separation</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              v-model.number="settings.defaultDagreRankSep"
                            />
                            <small class="fx-toggle-note"
                              >Pixels between ranks (rows/columns).</small
                            >
                          </label>
                          <label class="fx-field">
                            <span class="fx-label">Edge Separation</span>
                            <input
                              class="fx-input"
                              type="number"
                              min="0"
                              v-model.number="settings.defaultDagreEdgeSep"
                            />
                          </label>
                        </div>
                      </template>
                    </div>
                  </section>
                </div>

                <div class="fx-settings-group">
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
                        <small class="fx-toggle-note"
                          >Pixel padding around the graph when fitting to the viewport.</small
                        >
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
                        <small class="fx-toggle-note"
                          >Zoom applied on open. With fit on: 1 = fit, 2 = twice as close, 0.5 =
                          half. With fit off: absolute level.</small
                        >
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
                  </section>
                </div>

                <div class="fx-settings-group">
                  <section class="fx-section">
                    <h3 class="fx-section-title">New Node Defaults</h3>
                    <div class="fx-section-body">
                      <div class="fx-grid">
                        <div class="fx-field">
                          <span class="fx-label">Default Node Shape</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('nodeShape')"
                            >
                              {{ nodeShapeLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'nodeShape'" class="fx-options">
                                <li
                                  v-for="opt in nodeShapeOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultNodeShape === opt.value
                                  }"
                                  @click="pick('defaultNodeShape', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <div class="fx-field">
                          <span class="fx-label">Label H-Align</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('halign')"
                            >
                              {{ halignLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'halign'" class="fx-options">
                                <li
                                  v-for="opt in nodeHalignOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultNodeTextHalign === opt.value
                                  }"
                                  @click="pick('defaultNodeTextHalign', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <div class="fx-field">
                          <span class="fx-label">Label V-Align</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('valign')"
                            >
                              {{ valignLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'valign'" class="fx-options">
                                <li
                                  v-for="opt in nodeValignOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultNodeTextValign === opt.value
                                  }"
                                  @click="pick('defaultNodeTextValign', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                      </div>
                      <div class="fx-grid">
                        <label class="fx-field">
                          <span class="fx-label"
                            >Default Node Label <em class="fx-opt">empty = no label</em></span
                          >
                          <input
                            class="fx-input"
                            type="text"
                            v-model="settings.defaultNodeLabel"
                            placeholder="empty = no label"
                          />
                        </label>
                      </div>
                      <div class="fx-grid">
                        <label class="fx-field">
                          <span class="fx-label"
                            >Background Color <em class="fx-opt">empty = theme</em></span
                          >
                          <div class="fx-color-row">
                            <input
                              class="fx-input fx-input-color"
                              type="color"
                              :value="settings.defaultNodeBgColor || '#5f9488'"
                              @input="settings.defaultNodeBgColor = $event.target.value"
                            />
                            <button
                              type="button"
                              class="fx-btn fx-btn-mini"
                              :class="{ 'fx-btn-active': !settings.defaultNodeBgColor }"
                              @click="settings.defaultNodeBgColor = ''"
                              title="Use theme color"
                            >
                              none
                            </button>
                          </div>
                        </label>
                        <label class="fx-field">
                          <span class="fx-label"
                            >Border Color <em class="fx-opt">empty = theme</em></span
                          >
                          <div class="fx-color-row">
                            <input
                              class="fx-input fx-input-color"
                              type="color"
                              :value="settings.defaultNodeBorderColor || '#5e74ff'"
                              @input="settings.defaultNodeBorderColor = $event.target.value"
                            />
                            <button
                              type="button"
                              class="fx-btn fx-btn-mini"
                              :class="{ 'fx-btn-active': !settings.defaultNodeBorderColor }"
                              @click="settings.defaultNodeBorderColor = ''"
                              title="Use theme color"
                            >
                              none
                            </button>
                          </div>
                        </label>
                        <label class="fx-field">
                          <span class="fx-label"
                            >Border Width <em class="fx-opt">empty = theme</em></span
                          >
                          <input
                            class="fx-input"
                            type="number"
                            min="0"
                            max="8"
                            step="0.5"
                            v-model.number="settings.defaultNodeBorderWidth"
                            placeholder="theme"
                          />
                        </label>
                        <label class="fx-field">
                          <span class="fx-label"
                            >Font Size <em class="fx-opt">empty = theme</em></span
                          >
                          <input
                            class="fx-input"
                            type="number"
                            min="8"
                            max="28"
                            step="1"
                            v-model.number="settings.defaultNodeFontSize"
                            placeholder="theme"
                          />
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

                <div class="fx-settings-group">
                  <section class="fx-section">
                    <h3 class="fx-section-title">New Edge Defaults</h3>
                    <div class="fx-section-body">
                      <div class="fx-grid">
                        <label class="fx-field">
                          <span class="fx-label"
                            >Default Edge Label <em class="fx-opt">empty = no label</em></span
                          >
                          <input
                            class="fx-input"
                            type="text"
                            v-model="settings.defaultEdgeLabel"
                            placeholder="empty = no label"
                          />
                        </label>
                      </div>
                      <div class="fx-grid">
                        <div class="fx-field">
                          <span class="fx-label">Edge Arrow Style</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('edgeArrowStyle')"
                            >
                              {{ edgeArrowHeadStyleLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'edgeArrowStyle'" class="fx-options">
                                <li
                                  v-for="opt in edgeArrowHeadStyleOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active':
                                      settings.defaultEdgeArrowHeadStyle === opt.value
                                  }"
                                  @click="pick('defaultEdgeArrowHeadStyle', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <div class="fx-field">
                          <span class="fx-label">Default Arrow Shape</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('arrowShape')"
                            >
                              {{ arrowShapeLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'arrowShape'" class="fx-options">
                                <li
                                  v-for="opt in edgeArrowHeadOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultArrowShape === opt.value
                                  }"
                                  @click="pick('defaultArrowShape', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <div class="fx-field">
                          <span class="fx-label"
                            >Source Arrow <em class="fx-opt">empty = none</em></span
                          >
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('sourceArrow')"
                            >
                              {{ sourceArrowLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'sourceArrow'" class="fx-options">
                                <li
                                  class="fx-option"
                                  :class="{ 'fx-option-active': !settings.defaultEdgeSourceArrow }"
                                  @click="pick('defaultEdgeSourceArrow', '')"
                                >
                                  — none —
                                </li>
                                <li
                                  v-for="opt in edgeArrowHeadOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active':
                                      settings.defaultEdgeSourceArrow === opt.value
                                  }"
                                  @click="pick('defaultEdgeSourceArrow', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <div class="fx-field">
                          <span class="fx-label">Edge Line Style</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('lineStyle')"
                            >
                              {{ lineStyleLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'lineStyle'" class="fx-options">
                                <li
                                  v-for="opt in edgeLineStyleOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultEdgeLineStyle === opt.value
                                  }"
                                  @click="pick('defaultEdgeLineStyle', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                      </div>
                      <div class="fx-grid">
                        <div class="fx-field">
                          <span class="fx-label">Curve Style</span>
                          <div class="fx-select">
                            <button
                              type="button"
                              class="fx-select-trigger"
                              @click.stop="toggleSel('curveStyle')"
                            >
                              {{ curveStyleLabel }}<span class="fx-caret">▾</span>
                            </button>
                            <transition name="fx-drop">
                              <ul v-if="openSel === 'curveStyle'" class="fx-options">
                                <li
                                  v-for="opt in edgeCurveOptions"
                                  :key="opt.value"
                                  class="fx-option"
                                  :class="{
                                    'fx-option-active': settings.defaultEdgeStyle === opt.value
                                  }"
                                  @click="pick('defaultEdgeStyle', opt.value)"
                                >
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </transition>
                          </div>
                        </div>
                        <label class="fx-field">
                          <span class="fx-label"
                            >Edge Color <em class="fx-opt">empty = theme</em></span
                          >
                          <div class="fx-color-row">
                            <input
                              class="fx-input fx-input-color"
                              type="color"
                              :value="settings.defaultEdgeColor || '#5e74ff'"
                              @input="settings.defaultEdgeColor = $event.target.value"
                            />
                            <button
                              type="button"
                              class="fx-btn fx-btn-mini"
                              :class="{ 'fx-btn-active': !settings.defaultEdgeColor }"
                              @click="settings.defaultEdgeColor = ''"
                              title="Use theme color"
                            >
                              none
                            </button>
                          </div>
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
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <footer class="fx-panel-actions">
                <button type="button" class="fx-btn fx-btn-primary" @click="save()">
                  Save ({{ shortcutLabels.save }})
                </button>
                <button type="button" class="fx-btn fx-btn-ghost" @click="resetSettings()">
                  Reset Defaults
                </button>
                <button type="button" class="fx-btn fx-btn-ghost" @click="close()">
                  Close ({{ shortcutLabels.close }})
                </button>
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
import Shortcuts, { SHORTCUT_GROUPS } from '@/helpers/Shortcuts.js'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'

export default {
  name: 'SettingsDialog',
  props: ['active', 'd3dInfo'],
  components: { ShortcutRecorder },
  inheritAttrs: false,
  data() {
    return {
      settingsModal: false,
      openSel: null,
      settings: this.cloneDefaults(),
      flowOptions: [
        { label: 'None', value: null },
        { label: 'Horizontal (x)', value: 'x' },
        { label: 'Vertical (y)', value: 'y' }
      ],
      dagreRankDirOptions: [
        { label: 'Top → Bottom', value: 'TB' },
        { label: 'Bottom → Top', value: 'BT' },
        { label: 'Left → Right', value: 'LR' },
        { label: 'Right → Left', value: 'RL' }
      ],
      dagreRankerOptions: [
        { label: 'Network Simplex', value: 'network-simplex' },
        { label: 'Tight Tree', value: 'tight-tree' },
        { label: 'Longest Path', value: 'longest-path' }
      ]
    }
  },
  computed: {
    shortcutGroups() {
      return SHORTCUT_GROUPS.map((group) => ({
        id: group.id,
        label: group.label,
        actions: Shortcuts.actions.filter((a) => a.group === group.id)
      }))
    },
    shortcutLabels() {
      return D3Util.shortcutLabels()
    },
    layoutModeOptions() {
      return D3Util.layoutOptions()
    },
    nodeShapeOptions() {
      return D3Util.nodeShapeOptions()
    },
    nodeHalignOptions() {
      return D3Util.nodeHalignOptions()
    },
    nodeValignOptions() {
      return D3Util.nodeValignOptions()
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
    layoutModeLabel() {
      return this._optLabel(this.layoutModeOptions, this.settings.defaultLayoutMode, '—')
    },
    flowLabel() {
      return this._optLabel(this.flowOptions, this.settings.defaultColaFlow, 'None')
    },
    dagreRankDirLabel() {
      return this._optLabel(
        this.dagreRankDirOptions,
        this.settings.defaultDagreRankDir,
        'Top → Bottom'
      )
    },
    dagreRankerLabel() {
      return this._optLabel(
        this.dagreRankerOptions,
        this.settings.defaultDagreRanker,
        'Network Simplex'
      )
    },
    nodeShapeLabel() {
      return this._optLabel(this.nodeShapeOptions, this.settings.defaultNodeShape, 'Rectangle')
    },
    halignLabel() {
      return this._optLabel(this.nodeHalignOptions, this.settings.defaultNodeTextHalign, 'Center')
    },
    valignLabel() {
      return this._optLabel(this.nodeValignOptions, this.settings.defaultNodeTextValign, 'Top')
    },
    edgeArrowHeadStyleLabel() {
      return this._optLabel(
        this.edgeArrowHeadStyleOptions,
        this.settings.defaultEdgeArrowHeadStyle,
        'Filled'
      )
    },
    arrowShapeLabel() {
      return this._optLabel(this.edgeArrowHeadOptions, this.settings.defaultArrowShape, 'Vee')
    },
    sourceArrowLabel() {
      if (!this.settings.defaultEdgeSourceArrow) return '— none —'
      return this._optLabel(
        this.edgeArrowHeadOptions,
        this.settings.defaultEdgeSourceArrow,
        this.settings.defaultEdgeSourceArrow
      )
    },
    lineStyleLabel() {
      return this._optLabel(this.edgeLineStyleOptions, this.settings.defaultEdgeLineStyle, 'Solid')
    },
    curveStyleLabel() {
      return this._optLabel(this.edgeCurveOptions, this.settings.defaultEdgeStyle, 'Bezier')
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)

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
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick)
  },
  methods: {
    onKeydown(event) {
      if (Shortcuts.matches(event, 'close')) {
        event.preventDefault()
        this.close()
      }
    },
    // Action ids whose effective combo matches the one currently used by the
    // given action (so the recorder can flag conflicting assignments).
    shortcutConflicts(actionId) {
      const target = Shortcuts.action(actionId)
      if (!target) return []
      const combo =
        this.settings.shortcuts[actionId] || (Shortcuts.isMac() ? target.mac : target.other)
      return Shortcuts.actions
        .filter((a) => {
          if (a.id === actionId) return false
          const other = this.settings.shortcuts[a.id] || (Shortcuts.isMac() ? a.mac : a.other)
          return other === combo
        })
        .map((a) => a.id)
    },
    resetShortcuts() {
      this.settings.shortcuts = {}
    },
    _optLabel(list, val, fallback) {
      if (val === null || val === undefined || val === '') return fallback
      const opt = list.find((o) => o.value === val)
      return opt ? opt.label : fallback
    },
    toggleSel(key) {
      this.openSel = this.openSel === key ? null : key
    },
    pick(field, val) {
      this.settings[field] = val
      this.openSel = null
    },
    onDocClick() {
      this.openSel = null
    },
    cloneDefaults() {
      const defaults = D3Util.appDefaults()
      return JSON.parse(JSON.stringify(defaults))
    },
    mergeWithDefaults(stored, defaults) {
      const merged = { ...defaults, ...stored }
      merged.shortcuts = { ...defaults.shortcuts, ...(stored.shortcuts || {}) }
      merged.themes = stored.themes || defaults.themes
      merged.hints = stored.hints || defaults.hints
      merged.hintLinkColor = this.expandHex(stored.hintLinkColor) || defaults.hintLinkColor
      merged.hintBGColor = this.expandHex(stored.hintBGColor) || defaults.hintBGColor
      merged.defaultTheme = stored.defaultTheme || defaults.defaultTheme
      merged.debug = Boolean(stored.debug)
      merged.d3dInfo = Boolean(stored.d3dInfo)
      merged.showHelpPane = Boolean(stored.showHelpPane)
      merged.zoomFitFactor = Number(stored.zoomFitFactor) || defaults.zoomFitFactor
      merged.defaultZoomFit =
        stored.defaultZoomFit !== undefined
          ? Boolean(stored.defaultZoomFit)
          : defaults.defaultZoomFit
      merged.defaultZoomLevel =
        stored.defaultZoomLevel !== undefined
          ? Number(stored.defaultZoomLevel)
          : defaults.defaultZoomLevel
      merged.defaultLayoutMode = stored.defaultLayoutMode || defaults.defaultLayoutMode
      merged.defaultColaEdgeLength =
        stored.defaultColaEdgeLength !== undefined
          ? Number(stored.defaultColaEdgeLength)
          : defaults.defaultColaEdgeLength
      merged.defaultColaNodeSpacing =
        stored.defaultColaNodeSpacing !== undefined
          ? Number(stored.defaultColaNodeSpacing)
          : defaults.defaultColaNodeSpacing
      merged.defaultColaFlow =
        stored.defaultColaFlow !== undefined ? stored.defaultColaFlow : defaults.defaultColaFlow
      merged.defaultColaAvoidOverlap =
        stored.defaultColaAvoidOverlap !== undefined
          ? Boolean(stored.defaultColaAvoidOverlap)
          : defaults.defaultColaAvoidOverlap
      merged.defaultColaMaxSimulationTime =
        stored.defaultColaMaxSimulationTime !== undefined
          ? Number(stored.defaultColaMaxSimulationTime)
          : defaults.defaultColaMaxSimulationTime
      merged.defaultColaGravity =
        stored.defaultColaGravity !== undefined
          ? Number(stored.defaultColaGravity)
          : defaults.defaultColaGravity
      merged.defaultCoseNodeRepulsion =
        stored.defaultCoseNodeRepulsion !== undefined
          ? Number(stored.defaultCoseNodeRepulsion)
          : defaults.defaultCoseNodeRepulsion
      merged.defaultCoseIdealEdgeLength =
        stored.defaultCoseIdealEdgeLength !== undefined
          ? Number(stored.defaultCoseIdealEdgeLength)
          : defaults.defaultCoseIdealEdgeLength
      merged.defaultCoseGravity =
        stored.defaultCoseGravity !== undefined
          ? Number(stored.defaultCoseGravity)
          : defaults.defaultCoseGravity
      merged.defaultCoseNodeOverlap =
        stored.defaultCoseNodeOverlap !== undefined
          ? Number(stored.defaultCoseNodeOverlap)
          : defaults.defaultCoseNodeOverlap
      merged.defaultBreadthfirstDirected =
        stored.defaultBreadthfirstDirected !== undefined
          ? Boolean(stored.defaultBreadthfirstDirected)
          : defaults.defaultBreadthfirstDirected
      merged.defaultBreadthfirstCircle =
        stored.defaultBreadthfirstCircle !== undefined
          ? Boolean(stored.defaultBreadthfirstCircle)
          : defaults.defaultBreadthfirstCircle
      merged.defaultBreadthfirstSpacingFactor =
        stored.defaultBreadthfirstSpacingFactor !== undefined
          ? Number(stored.defaultBreadthfirstSpacingFactor)
          : defaults.defaultBreadthfirstSpacingFactor
      merged.defaultGridRows =
        stored.defaultGridRows != null ? Number(stored.defaultGridRows) : defaults.defaultGridRows
      merged.defaultGridCols =
        stored.defaultGridCols != null ? Number(stored.defaultGridCols) : defaults.defaultGridCols
      merged.defaultGridAvoidOverlap =
        stored.defaultGridAvoidOverlap !== undefined
          ? Boolean(stored.defaultGridAvoidOverlap)
          : defaults.defaultGridAvoidOverlap
      merged.defaultGridSpacingFactor =
        stored.defaultGridSpacingFactor !== undefined
          ? Number(stored.defaultGridSpacingFactor)
          : defaults.defaultGridSpacingFactor
      merged.defaultCircleSpacingFactor =
        stored.defaultCircleSpacingFactor !== undefined
          ? Number(stored.defaultCircleSpacingFactor)
          : defaults.defaultCircleSpacingFactor
      merged.defaultCircleClockwise =
        stored.defaultCircleClockwise !== undefined
          ? Boolean(stored.defaultCircleClockwise)
          : defaults.defaultCircleClockwise
      merged.defaultConcentricSpacingFactor =
        stored.defaultConcentricSpacingFactor !== undefined
          ? Number(stored.defaultConcentricSpacingFactor)
          : defaults.defaultConcentricSpacingFactor
      merged.defaultConcentricMinNodeSpacing =
        stored.defaultConcentricMinNodeSpacing !== undefined
          ? Number(stored.defaultConcentricMinNodeSpacing)
          : defaults.defaultConcentricMinNodeSpacing
      merged.defaultConcentricClockwise =
        stored.defaultConcentricClockwise !== undefined
          ? Boolean(stored.defaultConcentricClockwise)
          : defaults.defaultConcentricClockwise
      merged.defaultConcentricEquidistant =
        stored.defaultConcentricEquidistant !== undefined
          ? Boolean(stored.defaultConcentricEquidistant)
          : defaults.defaultConcentricEquidistant
      merged.defaultDagreRankDir = stored.defaultDagreRankDir || defaults.defaultDagreRankDir
      merged.defaultDagreNodeSep =
        stored.defaultDagreNodeSep !== undefined
          ? Number(stored.defaultDagreNodeSep)
          : defaults.defaultDagreNodeSep
      merged.defaultDagreRankSep =
        stored.defaultDagreRankSep !== undefined
          ? Number(stored.defaultDagreRankSep)
          : defaults.defaultDagreRankSep
      merged.defaultDagreEdgeSep =
        stored.defaultDagreEdgeSep !== undefined
          ? Number(stored.defaultDagreEdgeSep)
          : defaults.defaultDagreEdgeSep
      merged.defaultDagreRanker = stored.defaultDagreRanker || defaults.defaultDagreRanker
      merged.defaultEdgeStyle =
        stored.defaultEdgeStyle === 'curved'
          ? 'bezier'
          : stored.defaultEdgeStyle || defaults.defaultEdgeStyle
      merged.defaultEdgeWidth =
        stored.defaultEdgeWidth !== undefined
          ? Number(stored.defaultEdgeWidth)
          : defaults.defaultEdgeWidth
      merged.defaultEdgeOpacity =
        stored.defaultEdgeOpacity !== undefined
          ? Number(stored.defaultEdgeOpacity)
          : defaults.defaultEdgeOpacity
      merged.defaultArrowScale = Math.min(
        3,
        Math.max(
          0.1,
          stored.defaultArrowScale !== undefined
            ? Number(stored.defaultArrowScale)
            : defaults.defaultArrowScale
        )
      )
      merged.defaultArrowShape = stored.defaultArrowShape || defaults.defaultArrowShape
      merged.defaultEdgeArrowHeadStyle =
        stored.defaultEdgeArrowHeadStyle || defaults.defaultEdgeArrowHeadStyle
      merged.defaultEdgeSourceArrow =
        stored.defaultEdgeSourceArrow || defaults.defaultEdgeSourceArrow
      merged.defaultEdgeColor = stored.defaultEdgeColor || defaults.defaultEdgeColor
      merged.defaultEdgeLineStyle = stored.defaultEdgeLineStyle || defaults.defaultEdgeLineStyle
      merged.defaultNodeShape = stored.defaultNodeShape || defaults.defaultNodeShape
      merged.defaultNodeTextHalign = stored.defaultNodeTextHalign || defaults.defaultNodeTextHalign
      merged.defaultNodeTextValign = stored.defaultNodeTextValign || defaults.defaultNodeTextValign
      merged.defaultNodeBgColor = stored.defaultNodeBgColor || defaults.defaultNodeBgColor
      merged.defaultNodeBorderColor =
        stored.defaultNodeBorderColor || defaults.defaultNodeBorderColor
      merged.defaultNodeBorderWidth =
        stored.defaultNodeBorderWidth != null
          ? Number(stored.defaultNodeBorderWidth)
          : defaults.defaultNodeBorderWidth
      merged.defaultNodeFontSize =
        stored.defaultNodeFontSize != null
          ? Number(stored.defaultNodeFontSize)
          : defaults.defaultNodeFontSize
      merged.defaultNodeLabel =
        stored.defaultNodeLabel !== undefined ? stored.defaultNodeLabel : defaults.defaultNodeLabel
      merged.defaultEdgeLabel =
        stored.defaultEdgeLabel !== undefined ? stored.defaultEdgeLabel : defaults.defaultEdgeLabel
      merged.serverUrl = stored.serverUrl || defaults.serverUrl
      return merged
    },
    expandHex(value) {
      if (typeof value !== 'string') return value
      const match = /^#([0-9a-fA-F]{3})$/.exec(value.trim())
      if (!match) return value
      const hex = match[1]
      return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    },
    close() {
      this.common()
    },
    save() {
      this.$cookies.set('settings', this.settings)
      this.emitter.emit('settingsChanged')
      this.emitter.emit('appMessage', { status: 'success', message: 'Settings saved' })
      this.common()
    },
    resetSettings() {
      const defaults = this.cloneDefaults()
      this.settings = defaults
      this.$cookies.set('settings', defaults)
    },
    common() {
      this.settingsModal = false
      this.emitter.emit('changeActive')
    }
  }
}
</script>

<style scoped>
.fx-chip-settings {
  background: rgba(var(--fx-accent), 0.1);
  color: rgb(var(--fx-ink));
  text-shadow: none;
}

.fx-settings-group {
  border: 1px solid rgba(var(--fx-accent), 0.18);
  border-radius: 10px;
  background: rgba(var(--fx-inset), 0.28);
  padding: 14px;
  margin-bottom: 16px;
}

.fx-section {
  margin-bottom: 0;
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
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid rgba(var(--fx-accent), 0.55);
  line-height: 1.3;
}

.fx-shortcut-group {
  margin-top: 4px;
}

.fx-shortcut-group-title {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--fx-ink-faint));
  margin: 10px 0 2px;
}

.fx-shortcut-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
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
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.fx-toggle input:checked + .fx-toggle-track {
  background: rgba(var(--fx-accent), 0.35);
  border-color: rgba(var(--fx-accent), 0.7);
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
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.fx-toggle input:checked + .fx-toggle-track::after {
  transform: translate(18px, -50%);
  background: rgb(var(--fx-accent));
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
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.fx-pill.is-active {
  background: rgba(var(--fx-accent), 0.25);
  color: rgb(var(--fx-ink));
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
  border-radius: 8px;
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
