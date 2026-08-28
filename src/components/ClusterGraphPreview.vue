<template>
  <div v-if="hasNodes" ref="canvas" class="cluster-graph" data-testid="cluster-graph"></div>
</template>

<script>
import { markRaw } from 'vue'
import mitt from 'mitt'
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer'
import { drawCluster } from '@/helpers/clusterRender'

// Read-only render of a shared cluster — pan and zoom, no editing. Lives inside
// SharedClusterView, so it draws both in the catalog's preview dialog and on
// the /element-share/:token page.
export default {
  name: 'ClusterGraphPreview',
  props: {
    // Graphlib JSON, exactly as GET /element-shares/exchange returns it.
    cluster: { type: Object, required: true }
  },
  computed: {
    hasNodes() {
      return (this.cluster?.nodes?.length ?? 0) > 0
    }
  },
  mounted() {
    if (!this.hasNodes) return

    // A private emitter, not the app-wide one from main.js: the renderer emits
    // node-click and scene-updated, and on the shared instance those would
    // drive the editor's selection and node counter from a preview nobody is
    // editing.
    this.localEmitter = markRaw(mitt())
    this.renderer = markRaw(new CytoscapeRenderer(this.$refs.canvas, this.localEmitter))
    this.renderer.init()

    drawCluster(this.renderer, this.cluster)

    // Theme changes are the one app-wide event the preview does want: the
    // renderer restyles itself from the CSS vars when it hears themeChanged.
    this._onThemeChanged = () => this.localEmitter.emit('themeChanged')
    this.emitter?.on('themeChanged', this._onThemeChanged)
  },
  beforeUnmount() {
    // Guarded: mitt's off() with an undefined handler drops every listener for
    // the event, and this is the app-wide emitter.
    if (this._onThemeChanged) this.emitter?.off('themeChanged', this._onThemeChanged)
    this.renderer?.teardown()
    this.renderer = null
  }
}
</script>

<style scoped>
.cluster-graph {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 1px solid rgba(var(--fx-accent), 0.2);
  background: rgba(var(--fx-glass-bottom), 0.3);
  overflow: hidden;
}
</style>
