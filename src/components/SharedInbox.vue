<template>
  <div class="fx-panel" @keydown.esc="$emit('close')">
    <focus-trap :active="true" :escape-deactivates="false">
      <div tabindex="0" class="fx-panel-inner">
        <header class="fx-panel-header">
          <div class="fx-panel-title">
            <span class="fx-title-chip fx-chip-edit">INB</span>
            <h2 class="fx-title">SHARED INBOX</h2>
          </div>
          <button
            type="button"
            class="fx-close"
            aria-label="Close"
            data-testid="inbox-close-btn"
            @click="$emit('close')"
          >
            ✕
          </button>
        </header>

        <div class="fx-panel-body">
          <div v-if="loading" class="inbox-state">Loading inbox…</div>
          <div v-else-if="error" class="inbox-state inbox-error">{{ error }}</div>
          <div v-else-if="!shares.length" class="inbox-state">No shares yet — inbox is empty.</div>
          <ul v-else class="inbox-list">
            <li v-for="share in shares" :key="share.id" class="inbox-row" data-testid="inbox-row">
              <ShareThumbnail
                class="inbox-thumb"
                :share-id="share.id"
                :loader="() => loadCluster(share)"
              />
              <div class="inbox-row-info">
                <span class="inbox-title">{{
                  share.title || share.type + ' · ' + (share.rootIds?.[0] ?? '—')
                }}</span>
                <span class="inbox-meta">
                  from <strong>{{ share.createdBy }}</strong> · expires
                  {{ formatDate(share.expiresAt) }}
                </span>
              </div>
              <div class="inbox-row-actions">
                <span v-if="importedIds.has(share.id)" class="inbox-imported">Imported ✓</span>
                <template v-else>
                  <button
                    class="inbox-btn"
                    :disabled="importingId === share.id"
                    data-testid="inbox-merge-btn"
                    @click="$emit('merge', share.id)"
                  >
                    Merge here
                  </button>
                  <button
                    class="inbox-btn"
                    :disabled="importingId === share.id"
                    data-testid="inbox-import-btn"
                    @click="doImport(share)"
                  >
                    {{ importingId === share.id ? '…' : 'New diagram' }}
                  </button>
                </template>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </focus-trap>
  </div>
</template>

<script>
import api from '@/services/api'
import ShareThumbnail from '@/components/ShareThumbnail.vue'

export default {
  name: 'SharedInbox',
  components: { ShareThumbnail },
  emits: ['close', 'merge', 'import'],
  data() {
    return {
      loading: true,
      error: null,
      shares: [],
      importingId: null,
      importedIds: new Set()
    }
  },
  async mounted() {
    try {
      const shares = await api.listInbox()
      console.log('[SharedInbox] listInbox response:', shares)
      this.shares = shares
    } catch (err) {
      console.error('[SharedInbox] listInbox failed:', err)
      this.error = 'Failed to load inbox'
    } finally {
      this.loading = false
    }
  },
  methods: {
    // The inbox listing carries neither a token nor a cluster — only an id — so
    // a thumbnail has to read the share itself. ShareThumbnail only calls this
    // when the row is actually on screen.
    async loadCluster(share) {
      const full = await api.getElementShare(share.id)
      return full?.cluster ?? null
    },

    formatDate(iso) {
      if (!iso) return '—'
      try {
        return new Date(iso).toLocaleDateString()
      } catch {
        return iso
      }
    },
    async doImport(share) {
      this.importingId = share.id
      try {
        const result = await api.importElementShare(share.id)
        this.importedIds = new Set([...this.importedIds, share.id])
        this.$emit('import', result.cluster)
      } catch {
        // keep row available to retry
      } finally {
        this.importingId = null
      }
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
  gap: 8px;
}

.inbox-state {
  font-size: 12px;
  color: rgb(var(--fx-ink-dim));
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  padding: 16px 0;
  text-align: center;
}

.inbox-error {
  color: #ef5350;
}

.inbox-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inbox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.18);
  background: rgba(var(--fx-glass-bottom), 0.4);
}

.inbox-thumb {
  width: 56px;
  height: 40px;
  flex-shrink: 0;
}

.inbox-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.inbox-title {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--fx-ink));
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inbox-meta {
  font-size: 10px;
  color: rgb(var(--fx-ink-dim));
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.inbox-row-actions {
  flex-shrink: 0;
}

.inbox-btn {
  padding: 4px 12px;
  border-radius: 5px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  background: transparent;
  color: rgb(var(--fx-ink));
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
  transition: background 0.12s;
}

.inbox-btn:hover:not(:disabled) {
  background: rgba(var(--fx-accent), 0.1);
}

.inbox-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.inbox-imported {
  font-size: 11px;
  color: #4caf50;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}
</style>
