<template>
  <div class="fx-panel" @keydown.esc="$emit('close')">
    <focus-trap v-model:active="enableTrap" :escape-deactivates="false">
      <div tabindex="0" class="fx-panel-inner">
        <header class="fx-panel-header">
          <div class="fx-panel-title">
            <span class="fx-title-chip fx-chip-edit">HIST</span>
            <h2 class="fx-title">HISTORY</h2>
          </div>
          <button type="button" class="fx-close" aria-label="Close" @click="$emit('close')">
            ✕
          </button>
        </header>

        <div class="fx-panel-body">
          <div v-if="loading" class="hist-loading">Loading…</div>

          <div v-else-if="entries.length === 0" class="hist-empty">
            No history yet — snapshots are saved automatically as you edit.
          </div>

          <ul v-else class="hist-list">
            <li v-for="entry in entries" :key="entry.source + entry.id" class="hist-entry">
              <div class="hist-meta">
                <span class="hist-time" :title="entry.savedAt">{{
                  formatTime(entry.savedAt)
                }}</span>
                <span class="hist-subline">
                  <span
                    class="hist-chip"
                    :class="entry.source === 'server' ? 'hist-chip-server' : 'hist-chip-local'"
                    >{{ entry.source === 'server' ? 'SERVER' : 'LOCAL' }}</span
                  >
                  <span v-if="entry.savedBy" class="hist-user">{{ entry.savedBy }}</span>
                  <span v-else-if="entry.name" class="hist-name">{{ entry.name }}</span>
                </span>
              </div>
              <button
                class="hist-restore-btn"
                :disabled="restoring === entry.id"
                @click="confirmRestore(entry)"
              >
                {{ restoring === entry.id ? 'Restoring…' : 'Restore' }}
              </button>
            </li>
          </ul>
        </div>

        <div v-if="confirmEntry" class="hist-confirm-overlay">
          <div class="hist-confirm-box">
            <p class="hist-confirm-msg">
              Restore snapshot from<br />
              <strong>{{ formatTime(confirmEntry.savedAt) }}</strong
              >?<br />
              <span class="hist-confirm-warn">Current diagram will be overwritten.</span>
            </p>
            <div class="hist-confirm-actions">
              <button class="hist-btn-cancel" @click="confirmEntry = null">Cancel</button>
              <button class="hist-btn-confirm" @click="doRestore(confirmEntry)">Restore</button>
            </div>
          </div>
        </div>
      </div>
    </focus-trap>
  </div>
</template>

<script>
import api from '@/services/api'
import { hasServerAccess } from '@/services/session'
import { getHistory, getSnapshot } from '@/services/localHistory'

export default {
  name: 'HistoryPanel',
  props: {
    dagId: { type: String, required: true }
  },
  emits: ['close', 'restored'],
  data() {
    return {
      enableTrap: true,
      loading: true,
      entries: [],
      restoring: null,
      confirmEntry: null,
      errorMsg: null
    }
  },
  async mounted() {
    await this.fetchHistory()
  },
  methods: {
    _serverAvailable() {
      // 'unsaved' is the browser-only history bucket — never a server dag id.
      return hasServerAccess() && !!this.dagId && this.dagId !== 'unsaved'
    },

    async fetchHistory() {
      this.loading = true
      const local = getHistory(this.dagId).map((entry) => ({
        ...entry,
        source: 'local'
      }))

      let server = []
      if (this._serverAvailable()) {
        try {
          const data = await api.getHistory(this.dagId)
          server = (data?.history ?? []).map((entry) => ({ ...entry, source: 'server' }))
        } catch {
          // Server unreachable — local snapshots still available.
          server = []
        }
      }

      this.entries = [...local, ...server].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      this.loading = false
    },

    confirmRestore(entry) {
      this.confirmEntry = entry
    },

    async doRestore(entry) {
      this.confirmEntry = null
      this.restoring = entry.id
      try {
        if (entry.source === 'server') {
          await api.restoreHistory(this.dagId, entry.id)
          this.$emit('restored', { source: 'server' })
        } else {
          const snapshot = getSnapshot(this.dagId, entry.id)
          if (!snapshot) throw new Error('local snapshot missing')
          this.$emit('restored', { source: 'local', snapshot })
        }
      } catch (err) {
        this.emitter?.emit('appMessage', {
          message: 'Unable to restore this snapshot',
          status: 'error'
        })
        console.error('history restore failed', err)
      } finally {
        this.restoring = null
      }
    },

    formatTime(iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.fx-panel-body {
  overflow-y: auto;
  flex: 1;
  padding: 12px 16px;
}

.hist-loading,
.hist-empty {
  color: rgb(var(--fx-ink-dim));
  font-size: 13px;
  padding: 16px 0;
  text-align: center;
}

.hist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hist-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(var(--fx-glass-bottom), 0.5);
  border: 1px solid rgba(var(--fx-accent), 0.15);
}

.hist-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.hist-time {
  font-size: 12px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  color: rgb(var(--fx-ink));
  white-space: nowrap;
}

.hist-subline {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hist-chip {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.hist-chip-local {
  color: rgb(var(--fx-ink));
  border: 1px solid rgba(var(--fx-accent), 0.4);
}

.hist-chip-server {
  color: #fff;
  background: rgba(var(--fx-accent), 0.55);
}

.hist-user {
  font-size: 10px;
  color: rgb(var(--fx-ink-dim));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hist-name {
  font-size: 10px;
  color: rgb(var(--fx-ink-dim));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hist-restore-btn {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(var(--fx-accent), 0.5);
  background: transparent;
  color: rgb(var(--fx-ink));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  transition: background 0.15s;
}

.hist-restore-btn:hover:not(:disabled) {
  background: rgba(var(--fx-accent), 0.15);
}

.hist-restore-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* confirmation overlay */
.hist-confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: inherit;
}

.hist-confirm-box {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--fx-accent), 0.4);
  border-radius: 10px;
  padding: 20px 24px;
  max-width: 280px;
  text-align: center;
}

.hist-confirm-msg {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 16px;
  line-height: 1.6;
}

.hist-confirm-warn {
  font-size: 11px;
  color: rgb(var(--fx-ink-dim));
}

.hist-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.hist-btn-cancel,
.hist-btn-confirm {
  padding: 5px 16px;
  border-radius: 5px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  border: 1px solid rgba(var(--fx-accent), 0.4);
}

.hist-btn-cancel {
  background: transparent;
  color: rgb(var(--fx-ink-dim));
}

.hist-btn-confirm {
  background: rgba(var(--fx-accent), 0.2);
  color: rgb(var(--fx-ink));
}

.hist-btn-confirm:hover {
  background: rgba(var(--fx-accent), 0.35);
}
</style>
