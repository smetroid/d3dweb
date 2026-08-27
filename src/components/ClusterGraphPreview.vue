<template>
  <div v-if="hasNodes" ref="canvas" class="cluster-graph" data-testid="cluster-graph"></div>
</template>

<script>
import { markRaw } from 'vue'
import mitt from 'mitt'
import CytoscapeRenderer from '@/helpers/CytoscapeRenderer'
import { graphlibToModel } from '@/helpers/graphlibMigration'

// GraphModel parks a node at the origin when the share carries no _x/_y for it.
// One placed node is enough to treat the cluster as laid out — a diagram whose
// author never moved anything has them all at 0,0.
function hasSavedPositions(model) {
  return model.nodes().some((n) => {
    const p = n.position()
    return p && (p.x !== 0 || p.y !== 0)
  })
}

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

    const model = graphlibToModel(this.cluster)
    if (hasSavedPositions(model)) {
      // Draw the diagram the way its author arranged it — {layout: false}
      // applies the stored positions and skips the layout pass entirely.
      this.renderer.updateScene(model, { layout: false })
      this.renderer.fitToContent()
    } else {
      // Never positioned (or saved before positions were stored): every node
      // sits at the origin, so a layout has to place them. No animation — the
      // viewer never saw the starting arrangement to be animated away from.
      Promise.resolve(this.renderer.updateScene(model, { animate: false })).then(() =>
        this.renderer?.fitToContent()
      )
    }

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
