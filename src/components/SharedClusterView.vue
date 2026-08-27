<template>
  <div class="cluster-view">
    <div v-if="loading" class="cluster-loading">Loading shared cluster…</div>

    <div v-else-if="error" class="cluster-error">
      <p>{{ error }}</p>
    </div>

    <template v-else-if="share">
      <header class="cluster-header">
        <h1 class="cluster-title">{{ displayTitle }}</h1>
        <p class="cluster-meta">
          Shared by <strong>{{ displaySharedBy }}</strong> · {{ nodeCount }} node{{
            nodeCount !== 1 ? 's' : ''
          }}
          · {{ edgeCount }} edge{{ edgeCount !== 1 ? 's' : '' }}
        </p>
      </header>

      <div class="cluster-actions">
        <button
          v-if="showMerge"
          class="cluster-btn"
          :disabled="importing"
          data-testid="merge-btn"
          @click="$emit('merge', share)"
        >
          Merge here
        </button>
        <button
          class="cluster-btn cluster-btn-primary"
          :disabled="importing"
          data-testid="import-btn"
          @click="doImport"
        >
          {{ importing ? 'Importing…' : 'New diagram' }}
        </button>
      </div>

      <div v-if="importSuccess" class="cluster-success">Cluster imported successfully.</div>
      <div v-if="importError" class="cluster-error-inline">{{ importError }}</div>
    </template>
  </div>
</template>

<script>
import api from '@/services/api'
import { serverErrorMessage } from '@/helpers/apiErrors'

// Exchanges a share token and renders the cluster it unlocks. Used both by the
// /element-share/:token page (the destination of a share link, which has to be
// a real URL) and by the catalog's preview dialog.
export default {
  name: 'SharedClusterView',
  props: {
    token: { type: String, required: true },
    // The exchange endpoint returns neither a title nor the sharer's real
    // name, so a caller that already knows the title — the catalog — passes it
    // in rather than showing the generic fallback.
    title: { type: String, default: null },
    // "Merge here" merges into the diagram currently open in the app, so it is
    // only meaningful where one exists.
    showMerge: { type: Boolean, default: true }
  },
  emits: ['merge'],
  data() {
    return {
      loading: true,
      share: null,
      error: null,
      importing: false,
      importSuccess: false,
      importError: null
    }
  },
  computed: {
    nodeCount() {
      return this.share?.cluster?.nodes?.length ?? 0
    },
    edgeCount() {
      return this.share?.cluster?.edges?.length ?? 0
    },
    displayTitle() {
      return this.title || this.share?.title || 'Shared Cluster'
    },
    // anonName is what the endpoint deliberately exposes in place of the
    // creator's username.
    displaySharedBy() {
      return this.share?.anonName || this.share?.shared_by || 'someone'
    },
    // GET /element-shares/exchange returns shareId; `id` is accepted too so a
    // share object from another endpoint still works.
    shareId() {
      return this.share?.shareId ?? this.share?.id
    }
  },
  async mounted() {
    try {
      const data = await api.exchangeElementShare(this.token)
      if (!data || data.status === 'error') {
        this.error = serverErrorMessage(data, 'Invalid, expired, or revoked share link.')
      } else {
        this.share = data
      }
    } catch (err) {
      console.error('[SharedClusterView] exchangeElementShare failed:', err)
      this.error = serverErrorMessage(err, 'Invalid, expired, or revoked share link.')
    } finally {
      this.loading = false
    }
  },
  methods: {
    async doImport() {
      this.importing = true
      this.importSuccess = false
      this.importError = null
      try {
        const result = await api.importElementShare(this.shareId)
        if (result?.dagId) {
          this.importSuccess = true
        } else {
          this.importError = serverErrorMessage(result, 'Import failed')
        }
      } catch (err) {
        console.error('[SharedClusterView] importElementShare failed:', err)
        this.importError = serverErrorMessage(err, 'Import failed')
      } finally {
        this.importing = false
      }
    }
  }
}
</script>

<style scoped>
.cluster-loading,
.cluster-error {
  text-align: center;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 14px;
  color: #888;
  padding: 32px 40px;
}

.cluster-error {
  color: #ef5350;
}

.cluster-header {
  text-align: center;
  margin-bottom: 24px;
}

.cluster-title {
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
  color: rgb(var(--fx-ink));
}

.cluster-meta {
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: rgb(var(--fx-ink-dim));
  margin: 0;
}

.cluster-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 16px;
}

.cluster-btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  background: transparent;
  color: rgb(var(--fx-ink));
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.cluster-btn:hover:not(:disabled) {
  background: rgba(var(--fx-accent), 0.1);
}

.cluster-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cluster-btn-primary {
  background: rgba(var(--fx-accent), 0.12);
  border-color: rgba(var(--fx-accent), 0.6);
}

.cluster-success {
  text-align: center;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: #4caf50;
}

.cluster-error-inline {
  text-align: center;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: #ef5350;
}
</style>
