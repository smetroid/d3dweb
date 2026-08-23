<template>
  <div class="catalog-page">
    <header class="catalog-header">
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
        <div class="catalog-card-body">
          <h2 class="catalog-card-title">{{ item.title || '(untitled)' }}</h2>
          <p class="catalog-card-meta">
            by <strong>{{ item.shared_by }}</strong> · {{ item.node_count ?? 0 }} node{{
              item.node_count !== 1 ? 's' : ''
            }}
            · {{ item.edge_count ?? 0 }} edge{{ item.edge_count !== 1 ? 's' : '' }}
          </p>
        </div>
        <div class="catalog-card-actions">
          <a
            :href="'/element-share/' + item.token"
            class="catalog-link"
            data-testid="catalog-preview-link"
          >
            Preview →
          </a>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import api from '@/services/api'

export default {
  name: 'CatalogView',
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      query: ''
    }
  },
  computed: {
    filtered() {
      if (!this.query.trim()) return this.items
      const q = this.query.trim().toLowerCase()
      return this.items.filter(
        (item) =>
          (item.title ?? '').toLowerCase().includes(q) ||
          (item.shared_by ?? '').toLowerCase().includes(q)
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
  }
}
</script>

<style scoped>
.catalog-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.catalog-header {
  margin-bottom: 24px;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
}

.catalog-link {
  font-size: 11px;
  color: rgb(var(--fx-accent));
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(var(--fx-accent), 0.4);
  transition: background 0.12s;
}

.catalog-link:hover {
  background: rgba(var(--fx-accent), 0.1);
}
</style>
