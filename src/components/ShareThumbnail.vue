<template>
  <div class="share-thumb" data-testid="share-thumb">
    <img
      v-if="src"
      :src="src"
      alt=""
      class="share-thumb-img"
      data-testid="share-thumb-img"
      loading="lazy"
    />
  </div>
</template>

<script>
import { renderThumbnail } from '@/helpers/shareThumbnails'

// A share's graph, drawn small. Every thumbnail costs one request for the
// cluster, so it holds off until the row is actually on screen — the catalog
// list is unbounded and most of it is never scrolled to.
//
// The cluster is fetched through an injected `loader` rather than a token or an
// id: the catalog exchanges a public token and the inbox reads an authenticated
// share, and neither belongs in here.
export default {
  name: 'ShareThumbnail',
  props: {
    // Doubles as the thumbnail cache key, so it must identify the share.
    shareId: { type: String, required: true },
    // () => Promise<cluster>
    loader: { type: Function, required: true }
  },
  data() {
    return { src: null, loaded: false }
  },
  mounted() {
    this._alive = true

    // jsdom and older browsers have no observer; there, drawing it right away
    // beats not drawing it at all.
    if (typeof IntersectionObserver === 'undefined') {
      this.load()
      return
    }

    this._observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) this.load()
    })
    this._observer.observe(this.$el)
  },
  beforeUnmount() {
    this._alive = false
    this._observer?.disconnect()
    this._observer = null
  },
  methods: {
    async load() {
      // Once per share, whatever the observer reports — and no retry after a
      // failure, so a share that 403s does not fire a request per scroll.
      if (this.loaded) return
      this.loaded = true
      this._observer?.disconnect()

      try {
        const cluster = await this.loader()
        if (!this._alive || !cluster?.nodes?.length) return
        const uri = await renderThumbnail(this.shareId, cluster)
        if (this._alive && uri) this.src = uri
      } catch {
        // The row keeps its placeholder. A share that will not load is not
        // worth an error state on a card the user is only scanning past.
      }
    }
  }
}
</script>

<style scoped>
.share-thumb {
  display: block;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(var(--fx-glass-bottom), 0.5);
  border: 1px solid rgba(var(--fx-accent), 0.15);
}

.share-thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
