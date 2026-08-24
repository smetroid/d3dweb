<template>
  <div class="fx-panel" @keydown.esc="$emit('close')">
    <focus-trap :active="true" :escape-deactivates="false">
      <div tabindex="0" class="fx-panel-inner">
        <header class="fx-panel-header">
          <div class="fx-panel-title">
            <span class="fx-title-chip fx-chip-edit">SHR</span>
            <h2 class="fx-title">SHARE ELEMENTS</h2>
          </div>
          <button
            type="button"
            class="fx-close"
            aria-label="Close"
            data-testid="close-btn"
            @click="$emit('close')"
          >
            ✕
          </button>
        </header>

        <div class="fx-panel-body">
          <div class="share-instructions">
            <p class="share-instr-line">
              Use <span class="share-kbd">hjkl</span> to focus a node or edge, then press
              <span class="share-kbd">Shift+O</span> (or <span class="share-kbd">a</span> → Share
              Selection) to open this dialog.
            </p>
            <p class="share-instr-line">
              Switch between node and edge navigation with
              <span class="share-kbd">Shift+N</span> / <span class="share-kbd">Shift+E</span>. The
              focused element is used as the sharing root — no need to press Enter.
            </p>
          </div>
          <div class="share-form">
            <!-- Focused element -->
            <div class="share-field">
              <label class="share-label">SHARING FROM</label>
              <p class="share-hint">{{ selectedNodeIds.length ? selectedNodeIds[0] : '—' }}</p>
            </div>

            <!-- Audience -->
            <div class="share-field">
              <label class="share-label">AUDIENCE</label>
              <div class="share-seg">
                <button
                  v-for="kind in audienceKinds"
                  :key="kind.value"
                  class="share-seg-btn"
                  :class="{ active: audience.kind === kind.value }"
                  @click="selectAudience(kind.value)"
                >
                  {{ kind.label }}
                </button>
              </div>

              <!-- Company picker -->
              <template v-if="audience.kind === 'company'">
                <select v-if="companies.length" v-model="audience.id" class="share-select">
                  <option value="">— pick company —</option>
                  <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <p v-else class="share-hint">Loading companies…</p>
              </template>

              <!-- Group picker -->
              <template v-if="audience.kind === 'group'">
                <select v-if="groups.length" v-model="audience.id" class="share-select">
                  <option value="">— pick group —</option>
                  <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
                <p v-else class="share-hint">Loading groups…</p>
              </template>
            </div>

            <!-- Depth -->
            <div class="share-field">
              <label class="share-label">SCOPE</label>
              <div class="share-seg">
                <button
                  v-for="opt in depthOpts"
                  :key="opt.value"
                  class="share-seg-btn"
                  :class="{ active: depth === opt.value }"
                  @click="depth = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Expiry -->
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

            <button
              class="share-generate-btn"
              :disabled="generating"
              data-testid="generate-btn"
              @click="generate"
            >
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
                @click="$refs.linkInput?.select()"
              />
              <button class="share-copy-btn" :class="{ copied }" @click="copyLink">
                {{ copied ? '✓' : 'Copy' }}
              </button>
            </div>
            <p class="share-hint">
              {{ audienceSummary }} · {{ depthSummary }} · expires in {{ expDays }}d
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
import {
  buildShareRequest,
  audienceLabel,
  depthOptions,
  depthLabel,
  shareUrl,
  validateRootIds
} from '@/helpers/elementShareHelpers'

export default {
  name: 'ElementShareDialog',
  props: {
    dagId: { type: String, required: true },
    selectedNodeIds: { type: Array, default: () => [] }
  },
  emits: ['close'],
  data() {
    return {
      audience: { kind: 'public' },
      depth: -1,
      expDays: 7,
      generating: false,
      generatedLink: null,
      copied: false,
      errorMsg: null,
      companies: [],
      groups: []
    }
  },
  computed: {
    audienceKinds() {
      return [
        { value: 'public', label: 'Public' },
        { value: 'user', label: 'Me' },
        { value: 'company', label: 'Company' },
        { value: 'group', label: 'Group' }
      ]
    },
    depthOpts() {
      return depthOptions()
    },
    audienceSummary() {
      return audienceLabel(this.audience)
    },
    depthSummary() {
      return depthLabel(this.depth)
    }
  },
  methods: {
    async selectAudience(kind) {
      this.audience = { kind }
      if (kind === 'company' && !this.companies.length) {
        this.companies = await api.listCompanies().catch(() => [])
      }
      if (kind === 'group' && !this.groups.length) {
        this.groups = await api.listGroups().catch(() => [])
      }
    },

    async generate() {
      const validation = validateRootIds(this.selectedNodeIds)
      if (!validation.valid) {
        this.errorMsg = validation.error
        return
      }
      this.generating = true
      this.generatedLink = null
      this.errorMsg = null
      try {
        const req = buildShareRequest({
          rootIds: validation.ids,
          audience: this.audience,
          depth: this.depth,
          expDays: this.expDays
        })
        const data = await api.createElementShare(this.dagId, req)
        if (data?.token) {
          this.generatedLink = shareUrl(data.token)
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
        setTimeout(() => (this.copied = false), 2000)
      } catch {
        this.$refs.linkInput?.select()
      }
    }
  }
}
</script>

<style scoped>
.share-instructions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.2);
  background: rgba(var(--fx-accent), 0.05);
}

.share-instr-line {
  font-size: 11px;
  color: rgb(var(--fx-ink-dim));
  margin: 0;
  line-height: 1.6;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.share-kbd {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(var(--fx-accent), 0.35);
  background: rgba(var(--fx-glass-bottom), 0.5);
  color: rgb(var(--fx-ink));
  font-size: 10px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  white-space: nowrap;
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
  flex-wrap: wrap;
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
  white-space: nowrap;
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

.share-select {
  width: 100%;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid rgba(var(--fx-accent), 0.3);
  background: rgba(var(--fx-glass-bottom), 0.6);
  color: rgb(var(--fx-ink));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  outline: none;
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
