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

      <div class="cluster-graph-wrap">
        <ClusterGraphPreview :cluster="share.cluster" />
      </div>

      <div class="cluster-actions">
        <button
          v-if="showMerge"
          class="cluster-btn"
          :disabled="importing"
          data-testid="merge-btn"
          @click="doMerge"
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

      <div v-if="successMessage" class="cluster-success">{{ successMessage }}</div>
      <div v-if="actionError" class="cluster-error-inline">{{ actionError }}</div>
    </template>
  </div>
</template>

<script>
import api from '@/services/api'
import ClusterGraphPreview from '@/components/ClusterGraphPreview.vue'
import { serverErrorMessage } from '@/helpers/apiErrors'
import { stashPendingCluster } from '@/helpers/pendingCluster'

// Exchanges a share token and renders the cluster it unlocks. Used both by the
// /element-share/:token page (the destination of a share link, which has to be
// a real URL) and by the catalog's preview dialog.
export default {
  name: 'SharedClusterView',
  components: { ClusterGraphPreview },
  props: {
    token: { type: String, required: true },
    // The exchange endpoint returns neither a title nor the sharer's real
    // name, so a caller that already knows the title — the catalog — passes it
    // in rather than showing the generic fallback.
    title: { type: String, default: null },
    // Same deal for the author: the exchange endpoint returns only the random
    // alias stored with the share (anonName), never created_by, because it is
    // public and unauthenticated. The catalog listing does know the real name,
    // so it passes it in; a bare share link has none and keeps the alias.
    sharedBy: { type: String, default: null },
    // "Merge here" merges into the diagram currently open in the app, so it is
    // only meaningful where one exists.
    showMerge: { type: Boolean, default: true }
  },
  data() {
    return {
      loading: true,
      share: null,
      error: null,
      importing: false,
      successMessage: null,
      actionError: null
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
    // creator's username; it only stands in when no caller supplied the real one.
    displaySharedBy() {
      return this.sharedBy || this.share?.anonName || this.share?.shared_by || 'someone'
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
    // Both buttons act on a diagram, and this view renders on routes that
    // replace the editor entirely — so neither can apply the cluster here. Park
    // it and head back to the app, which applies it on arrival.
    handOff(cluster, mode) {
      if (!stashPendingCluster(cluster, mode)) {
        this.actionError = 'Could not open the cluster — session storage is unavailable.'
        return false
      }
      this.successMessage =
        mode === 'merge' ? 'Merging into your diagram…' : 'Cluster imported successfully.'
      this.$router?.push('/')
      return true
    },

    // POST /element-shares/:id/import records the import and returns the
    // cluster; it does not create a diagram server-side, so there is no id to
    // navigate to.
    async doImport() {
      this.importing = true
      this.successMessage = null
      this.actionError = null
      try {
        const result = await api.importElementShare(this.shareId)
        const cluster = result?.cluster
        if (!cluster) {
          this.actionError = serverErrorMessage(result, 'Import failed')
          return
        }
        this.handOff(cluster, 'new')
      } catch (err) {
        console.error('[SharedClusterView] importElementShare failed:', err)
        this.actionError = serverErrorMessage(err, 'Import failed')
      } finally {
        this.importing = false
      }
    },

    // Merging needs no round trip: the exchange already handed us the cluster,
    // and unlike an import there is nothing for the server to record. That also
    // keeps the button working for a visitor who is not logged in.
    doMerge() {
      this.successMessage = null
      this.actionError = null
      const cluster = this.share?.cluster
      if (!cluster) {
        this.actionError = 'No cluster data in this share'
        return
      }
      this.handOff(cluster, 'merge')
    }
  }
}
</script>

<style scoped>
.cluster-view {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  max-width: 720px;
  box-sizing: border-box;
}

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

.cluster-graph-wrap {
  /* The renderer fills its container, so the height is set here. On the
     fullscreen /element-share page the parent is a flex column that stretches;
     in the catalog dialog it is capped so the actions stay in view. */
  flex: 1 1 auto;
  min-height: 240px;
  height: min(420px, 50vh);
  margin-bottom: 16px;
  overflow: hidden;
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
