<template>
  <div class="fx-panel" @keydown.esc="$emit('close')">
    <focus-trap v-model:active="enableTrap" :escape-deactivates="false">
      <div tabindex="0" class="fx-panel-inner">
        <header class="fx-panel-header">
          <div class="fx-panel-title">
            <span class="fx-title-chip fx-chip-edit">SHR</span>
            <h2 class="fx-title">SHARE</h2>
          </div>
          <button type="button" class="fx-close" aria-label="Close" @click="$emit('close')">
            ✕
          </button>
        </header>

        <div class="fx-panel-body">
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

          <div v-if="errorMsg" class="share-error">{{ errorMsg }}</div>
        </div>
      </div>
    </focus-trap>
  </div>
</template>

<script>
import api from '@/services/api'

export default {
  name: 'ShareDialog',
  props: {
    dagId: { type: String, required: true }
  },
  emits: ['close'],
  data() {
    return {
      enableTrap: true,
      role: 'view',
      expDays: 7,
      generating: false,
      generatedLink: null,
      copied: false,
      errorMsg: null
    }
  },
  methods: {
    async generate() {
      this.generating = true
      this.generatedLink = null
      this.errorMsg = null
      try {
        const data = await api.createShare(this.dagId, { role: this.role, expDays: this.expDays })
        if (data?.token) {
          this.generatedLink = window.location.origin + '/join/' + data.token
        } else {
          this.errorMsg = data?.error || 'Failed to generate link'
        }
      } catch {
        this.errorMsg = 'Failed to generate link'
      } finally {
        this.generating = false
      }
    },

    async copyLink() {
      if (!this.generatedLink) return
      try {
        await navigator.clipboard.writeText(this.generatedLink)
        this.copied = true
        setTimeout(() => {
          this.copied = false
        }, 2000)
      } catch {
        this.selectAll()
      }
    },

    selectAll() {
      this.$refs.linkInput?.select()
    }
  }
}
</script>

<style scoped>
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
</style>
