<template>
  <div class="catalog-page">
    <header class="catalog-header">
      <router-link to="/" class="catalog-back" data-testid="catalog-back">
        ← Back to app
      </router-link>
      <h1 class="catalog-title">Public Element Catalog</h1>
      <p class="catalog-subtitle">Browse publicly shared sub-graphs</p>
    </header>

    <div v-if="!loading && !error" class="catalog-search-wrap">
      <input
        v-model="query"
        class="catalog-search"
        placeholder="Filter by title or author…"
        data-testid="catalog-search"
        @input="query = $event.target.value"
      />
    </div>

    <div v-if="loading" class="catalog-state">Loading catalog…</div>
    <div v-else-if="error" class="catalog-state catalog-error">{{ error }}</div>
    <div v-else-if="!filtered.length" class="catalog-state">
      {{
        query
          ? 'No results match your filter.'
          : 'Nothing here yet — no public shares in the catalog.'
      }}
    </div>

    <ul v-else class="catalog-grid">
      <li v-for="item in filtered" :key="item.id" class="catalog-card" data-testid="catalog-card">
        <ShareThumbnail
          class="catalog-card-thumb"
          :share-id="item.id"
          :loader="() => loadCluster(item)"
        />
        <div class="catalog-card-body">
          <h2 class="catalog-card-title">{{ item.title || '(untitled)' }}</h2>
          <p class="catalog-card-meta">
            by <strong>{{ item.createdBy }}</strong> · {{ item.nodeCount ?? 0 }} node{{
              item.nodeCount !== 1 ? 's' : ''
            }}
            · {{ item.edgeCount ?? 0 }} edge{{ item.edgeCount !== 1 ? 's' : '' }}
          </p>
        </div>
        <p v-if="importErrors[item.id]" class="catalog-card-error" data-testid="catalog-card-error">
          {{ importErrors[item.id] }}
        </p>
        <div class="catalog-card-actions">
          <button
            type="button"
            class="catalog-link"
            data-testid="catalog-preview-btn"
            @click="openPreview(item)"
          >
            Preview →
          </button>
          <button
            type="button"
            class="catalog-link catalog-link-primary"
            :disabled="importingId === item.id"
            data-testid="catalog-import-btn"
            @click="doImport(item)"
          >
            {{ importingId === item.id ? '…' : 'New diagram' }}
          </button>
        </div>
      </li>
    </ul>

    <Teleport to="body">
      <div v-if="previewItem" class="fx-scrim" @click="closePreview"></div>
      <div v-if="previewItem" class="fx-hud-stage fx-hud-stage--center">
        <div class="fx-panel" data-testid="catalog-preview-dialog" @keydown.esc="closePreview">
          <focus-trap :active="true" :escape-deactivates="false">
            <div tabindex="0" class="fx-panel-inner">
              <header class="fx-panel-header">
                <div class="fx-panel-title">
                  <span class="fx-title-chip fx-chip-edit">CAT</span>
                  <h2 class="fx-title">PREVIEW</h2>
                </div>
                <button
                  type="button"
                  class="fx-close"
                  aria-label="Close"
                  data-testid="catalog-preview-close"
                  @click="closePreview"
                >
                  ✕
                </button>
              </header>

              <div class="fx-panel-body">
                <SharedClusterView
                  :key="previewItem.token"
                  :token="previewItem.token"
                  :title="previewItem.title"
                  :shared-by="previewItem.createdBy"
                  :show-merge="false"
                />
              </div>
            </div>
          </focus-trap>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import api from '@/services/api'
import SharedClusterView from '@/components/SharedClusterView.vue'
import ShareThumbnail from '@/components/ShareThumbnail.vue'
import { importShareAsDiagram } from '@/helpers/shareImport'

export default {
  name: 'CatalogView',
  components: { SharedClusterView, ShareThumbnail },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      query: '',
      previewItem: null,
      importingId: null,
      // Keyed by share id: /catalog replaces the editor, so App's toast stack
      // is not mounted and a failure has to be reported on the card itself.
      importErrors: {}
    }
  },
  computed: {
    filtered() {
      if (!this.query.trim()) return this.items
      const q = this.query.trim().toLowerCase()
      return this.items.filter(
        (item) =>
          (item.title ?? '').toLowerCase().includes(q) ||
          (item.createdBy ?? '').toLowerCase().includes(q)
      )
    }
  },
  async mounted() {
    try {
      this.items = await api.getCatalog()
    } catch {
      this.error = 'Failed to load catalog'
    } finally {
      this.loading = false
    }
  },
  methods: {
    // Previewing opens a dialog rather than navigating to /element-share/:token
    // so the filter and scroll position survive. That route still exists — it
    // is where an externally shared link lands.
    // Imports the share as a new diagram and heads back to the app, which
    // applies the parked cluster on arrival — the same route the preview
    // dialog's button takes.
    async doImport(item) {
      this.importingId = item.id
      this.importErrors = { ...this.importErrors, [item.id]: null }
      try {
        const result = await importShareAsDiagram(item.id)
        if (!result.ok) {
          this.importErrors = { ...this.importErrors, [item.id]: result.error }
          return
        }
        this.$router?.push('/')
      } finally {
        this.importingId = null
      }
    },

    // A catalog listing carries a public token rather than the cluster itself,
    // so a thumbnail costs one exchange per card. ShareThumbnail only calls
    // this when the card is actually on screen.
    async loadCluster(item) {
      const share = await api.exchangeElementShare(item.token)
      return share?.cluster ?? null
    },

    openPreview(item) {
      this.previewItem = item
    },
    closePreview() {
      this.previewItem = null
    }
  }
}
</script>

<style scoped>
.catalog-page {
  /* width is load-bearing: v-app's wrap is a flex column, and the auto margins
     below suppress its align-items: stretch, leaving this box sized to its
     content. Without it the grid collapses to one content-wide column however
     wide the window is. */
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.catalog-header {
  margin-bottom: 24px;
}

.catalog-back {
  display: inline-block;
  font-size: 11px;
  color: rgb(var(--fx-ink-dim));
  text-decoration: none;
  margin-bottom: 12px;
  opacity: 0.7;
  transition: opacity 0.12s;
}

.catalog-back:hover {
  opacity: 1;
}

.catalog-title {
  font-size: 20px;
  font-weight: 700;
  color: rgb(var(--fx-ink));
  margin: 0 0 4px;
}

.catalog-subtitle {
  font-size: 12px;
  color: rgb(var(--fx-ink-dim));
  margin: 0;
}

.catalog-search-wrap {
  margin-bottom: 20px;
}

.catalog-search {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.3);
  background: rgba(var(--fx-glass-bottom), 0.5);
  color: rgb(var(--fx-ink));
  font-size: 12px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.catalog-state {
  text-align: center;
  font-size: 13px;
  color: rgb(var(--fx-ink-dim));
  padding: 40px 0;
}

.catalog-error {
  color: #ef5350;
}

.catalog-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  /* auto-fit, not auto-fill: with fewer shares than the row has room for,
     auto-fill would leave empty tracks and bunch the cards to the left. */
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.catalog-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--fx-accent), 0.2);
  background: rgba(var(--fx-glass-bottom), 0.4);
  gap: 12px;
}

.catalog-card-thumb {
  height: 120px;
  width: 100%;
}

.catalog-card-title {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--fx-ink));
  margin: 0 0 4px;
}

.catalog-card-meta {
  font-size: 10px;
  color: rgb(var(--fx-ink-dim));
  margin: 0;
}

.catalog-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.catalog-link {
  font-family: inherit;
  font-size: 11px;
  color: rgb(var(--fx-accent));
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  background: transparent;
  cursor: pointer;
  transition: background 0.12s;
}

.catalog-link:hover:not(:disabled) {
  background: rgba(var(--fx-accent), 0.1);
}

.catalog-link:disabled {
  opacity: 0.5;
  cursor: default;
}

.catalog-link-primary {
  background: rgba(var(--fx-accent), 0.12);
  border-color: rgba(var(--fx-accent), 0.6);
}

.catalog-card-error {
  font-size: 10px;
  color: #ef5350;
  margin: 0 0 6px;
}
</style>
