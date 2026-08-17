<template>
  <div class="fx-panel" @keydown.esc="$emit('close')">
    <focus-trap v-model:active="enableTrap" :escape-deactivates="false">
      <div tabindex="0" class="fx-panel-inner">
        <header class="fx-panel-header">
          <div class="fx-panel-title">
            <span class="fx-title-chip fx-chip-edit">SHR</span>
            <h2 class="fx-title">{{ activeTab === 'share' ? 'SHARE' : 'EMBED' }}</h2>
          </div>
          <button type="button" class="fx-close" aria-label="Close" @click="$emit('close')">
            ✕
          </button>
        </header>

        <div class="tab-bar">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'share' }"
            @click="activeTab = 'share'"
          >
            Share
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'embed' }" @click="switchToEmbed">
            Embed
          </button>
        </div>

        <div class="fx-panel-body">
          <!-- SHARE TAB -->
          <template v-if="activeTab === 'share'">
            <div class="share-form">
              <div class="share-field">
                <label class="share-label">ROLE</label>
                <div class="share-seg">
                  <button
                    class="share-seg-btn"
                    :class="{ active: role === 'view' }"
                    @click="role = 'view'"
                  >
                    View
                  </button>
                  <button
                    class="share-seg-btn"
                    :class="{ active: role === 'edit' }"
                    @click="role = 'edit'"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div class="share-field">
                <label class="share-label">EXPIRES IN</label>
                <div class="share-seg">
                  <button
                    v-for="d in [1, 7, 30]"
                    :key="d"
                    class="share-seg-btn"
                    :class="{ active: expDays === d }"
                    @click="expDays = d"
                  >
                    {{ d }}d
                  </button>
                </div>
              </div>

              <button class="share-generate-btn" :disabled="generating" @click="generate">
                {{ generating ? 'Generating…' : 'Generate Link' }}
              </button>
            </div>

            <div v-if="generatedLink" class="share-result">
              <div class="share-link-row">
                <input
                  ref="linkInput"
                  class="share-link-input"
                  :value="generatedLink"
                  readonly
                  @click="selectAll"
                />
                <button class="share-copy-btn" :class="{ copied }" @click="copyLink">
                  {{ copied ? '✓' : 'Copy' }}
                </button>
              </div>
              <p class="share-hint">
                Anyone with this link can {{ role }} this diagram for {{ expDays }} day{{
                  expDays !== 1 ? 's' : ''
                }}.
              </p>
            </div>

            <div v-if="shareErrorMsg" class="share-error">{{ shareErrorMsg }}</div>
          </template>

          <!-- EMBED TAB -->
          <template v-else>
            <div class="share-field">
              <label class="share-label">MODE</label>
              <div class="share-seg">
                <button
                  class="share-seg-btn"
                  :class="{ active: embedMode === 'inline' }"
                  @click="embedMode = 'inline'"
                >
                  Inline
                </button>
                <button
                  class="share-seg-btn"
                  :class="{ active: embedMode === 'byid' }"
                  @click="embedMode = 'byid'"
                >
                  By ID
                </button>
              </div>
            </div>

            <!-- Inline mode -->
            <template v-if="embedMode === 'inline'">
              <div v-if="inlineUrl" class="share-result">
                <p class="share-hint">Diagram encoded inline — works without login, no expiry.</p>
                <div class="share-link-row">
                  <input
                    ref="inlineLinkInput"
                    class="share-link-input"
                    :value="inlineUrl"
                    readonly
                    @click="$refs.inlineLinkInput?.select()"
                  />
                  <button
                    class="share-copy-btn"
                    :class="{ copied: inlineCopied }"
                    @click="copyInline"
                  >
                    {{ inlineCopied ? '✓' : 'Copy' }}
                  </button>
                </div>
              </div>
              <div v-else-if="inlineSizeError" class="share-error">{{ inlineSizeError }}</div>
            </template>

            <!-- By ID mode -->
            <template v-else>
              <div class="embed-public-row">
                <span class="share-label">PUBLIC</span>
                <button
                  class="public-toggle"
                  :class="{ on: isPublic }"
                  :disabled="publicLoading || publicToggling"
                  @click="togglePublic"
                >
                  {{ publicLoading ? '…' : isPublic ? 'On' : 'Off' }}
                </button>
              </div>
              <p class="share-hint">
                {{
                  isPublic
                    ? 'Anyone with the link can view this diagram.'
                    : 'Make this diagram public to embed by ID.'
                }}
              </p>
              <div v-if="isPublic && byIdUrl" class="share-result">
                <div class="share-link-row">
                  <input
                    ref="idLinkInput"
                    class="share-link-input"
                    :value="byIdUrl"
                    readonly
                    @click="$refs.idLinkInput?.select()"
                  />
                  <button class="share-copy-btn" :class="{ copied: idCopied }" @click="copyById">
                    {{ idCopied ? '✓' : 'Copy' }}
                  </button>
                </div>
              </div>
              <div v-if="embedErrorMsg" class="share-error">{{ embedErrorMsg }}</div>
            </template>
          </template>
        </div>
      </div>
    </focus-trap>
  </div>
</template>

<script>
import { encode, embedUrl, EmbedSizeError } from '@d3dweb/embed'
import api from '@/services/api'

export default {
  name: 'ShareDialog',
  props: {
    dagId: { type: String, required: true },
    graphlibJson: { type: Object, default: null }
  },
  emits: ['close'],
  data() {
    return {
      enableTrap: true,
      activeTab: 'share',
      // share tab
      role: 'view',
      expDays: 7,
      generating: false,
      generatedLink: null,
      copied: false,
      shareErrorMsg: null,
      // embed tab
      embedMode: 'inline',
      inlineUrl: null,
      inlineSizeError: null,
      inlineCopied: false,
      isPublic: false,
      publicLoading: false,
      publicToggling: false,
      idCopied: false,
      embedErrorMsg: null
    }
  },
  computed: {
    byIdUrl() {
      if (!this.isPublic || !this.dagId) return null
      return embedUrl({ id: this.dagId, host: window.location.origin })
    }
  },
  methods: {
    async generate() {
      this.generating = true
      this.generatedLink = null
      this.shareErrorMsg = null
      try {
        const data = await api.createShare(this.dagId, { role: this.role, expDays: this.expDays })
        if (data?.token) {
          this.generatedLink = window.location.origin + '/join/' + data.token
        } else {
          this.shareErrorMsg = data?.error || 'Failed to generate link'
        }
      } catch {
        this.shareErrorMsg = 'Failed to generate link'
      } finally {
        this.generating = false
      }
    },

    async copyLink() {
      if (!this.generatedLink) return
      try {
        await navigator.clipboard.writeText(this.generatedLink)
        this.copied = true
        setTimeout(() => (this.copied = false), 2000)
      } catch {
        this.$refs.linkInput?.select()
      }
    },

    selectAll() {
      this.$refs.linkInput?.select()
    },

    switchToEmbed() {
      this.activeTab = 'embed'
      this.buildInlineUrl()
      this.loadPublicStatus()
    },

    buildInlineUrl() {
      if (!this.graphlibJson) return
      try {
        this.inlineUrl = embedUrl({ src: encode(this.graphlibJson), host: window.location.origin })
        this.inlineSizeError = null
      } catch (e) {
        if (e instanceof EmbedSizeError) {
          this.inlineUrl = null
          this.inlineSizeError = `Diagram too large for inline embed (${e.bytes} bytes). Use "By ID" instead.`
        } else {
          throw e
        }
      }
    },

    async loadPublicStatus() {
      if (!this.dagId) return
      this.publicLoading = true
      try {
        await api.getDiagramPublic(this.dagId)
        this.isPublic = true
      } catch {
        this.isPublic = false
      } finally {
        this.publicLoading = false
      }
    },

    async togglePublic() {
      this.publicToggling = true
      this.embedErrorMsg = null
      try {
        await api.setDiagramPublic(this.dagId, !this.isPublic)
        this.isPublic = !this.isPublic
      } catch {
        this.embedErrorMsg = 'Failed to update visibility'
      } finally {
        this.publicToggling = false
      }
    },

    async copyInline() {
      if (!this.inlineUrl) return
      try {
        await navigator.clipboard.writeText(this.inlineUrl)
        this.inlineCopied = true
        setTimeout(() => (this.inlineCopied = false), 2000)
      } catch {
        this.$refs.inlineLinkInput?.select()
      }
    },

    async copyById() {
      if (!this.byIdUrl) return
      try {
        await navigator.clipboard.writeText(this.byIdUrl)
        this.idCopied = true
        setTimeout(() => (this.idCopied = false), 2000)
      } catch {
        this.$refs.idLinkInput?.select()
      }
    }
  }
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  border-bottom: 1px solid rgba(var(--fx-accent), 0.15);
  padding: 0 16px;
}

.tab-btn {
  padding: 6px 14px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: rgb(var(--fx-ink-dim));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
  margin-bottom: -1px;
}

.tab-btn.active {
  color: rgb(var(--fx-ink));
  border-bottom-color: rgba(var(--fx-accent), 0.7);
}

.tab-btn:hover:not(.active) {
  color: rgb(var(--fx-ink));
}

.fx-panel-body {
  overflow-y: auto;
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.share-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.share-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.share-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgb(var(--fx-ink-dim));
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.share-seg {
  display: flex;
  gap: 4px;
}

.share-seg-btn {
  flex: 1;
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid rgba(var(--fx-accent), 0.3);
  background: transparent;
  color: rgb(var(--fx-ink-dim));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.share-seg-btn.active {
  background: rgba(var(--fx-accent), 0.18);
  color: rgb(var(--fx-ink));
  border-color: rgba(var(--fx-accent), 0.6);
}

.share-seg-btn:hover:not(.active) {
  background: rgba(var(--fx-accent), 0.07);
  color: rgb(var(--fx-ink));
}

.share-generate-btn {
  padding: 7px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.5);
  background: rgba(var(--fx-accent), 0.12);
  color: rgb(var(--fx-ink));
  font-size: 12px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  transition: background 0.15s;
}

.share-generate-btn:hover:not(:disabled) {
  background: rgba(var(--fx-accent), 0.25);
}

.share-generate-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.share-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share-link-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.share-link-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid rgba(var(--fx-accent), 0.3);
  background: rgba(var(--fx-glass-bottom), 0.6);
  color: rgb(var(--fx-ink));
  font-size: 10px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  outline: none;
}

.share-copy-btn {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 5px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  background: transparent;
  color: rgb(var(--fx-ink));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.share-copy-btn:hover {
  background: rgba(var(--fx-accent), 0.15);
}

.share-copy-btn.copied {
  color: #4caf50;
  border-color: rgba(76, 175, 80, 0.5);
}

.share-hint {
  font-size: 11px;
  color: rgb(var(--fx-ink-dim));
  margin: 0;
  line-height: 1.5;
}

.share-error {
  font-size: 12px;
  color: #ef5350;
  padding: 8px 0;
}

.embed-public-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.public-toggle {
  padding: 4px 14px;
  border-radius: 5px;
  border: 1px solid rgba(var(--fx-accent), 0.3);
  background: transparent;
  color: rgb(var(--fx-ink-dim));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
  min-width: 52px;
  text-align: center;
}

.public-toggle.on {
  background: rgba(76, 175, 80, 0.18);
  color: #4caf50;
  border-color: rgba(76, 175, 80, 0.5);
}

.public-toggle:hover:not(:disabled):not(.on) {
  background: rgba(var(--fx-accent), 0.07);
  color: rgb(var(--fx-ink));
}

.public-toggle:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
