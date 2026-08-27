<template>
  <div class="cluster-preview">
    <router-link to="/" class="cluster-back" data-testid="cluster-back">
      ← Back to app
    </router-link>
    <SharedClusterView :token="token" />
  </div>
</template>

<script>
import SharedClusterView from '@/components/SharedClusterView.vue'

// Standalone page behind /element-share/:token — the destination of a share
// link, which is pasted into chat or email and opened by people who may not be
// logged in. The catalog renders the same SharedClusterView in a dialog.
export default {
  name: 'SharedClusterPreview',
  components: { SharedClusterView },
  props: {
    token: { type: String, required: true }
  }
}
</script>

<style scoped>
.cluster-preview {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-background, 255 255 255));
  padding: 64px 24px 32px;
  box-sizing: border-box;
}

/* Nothing competes for room on the standalone page, so the graph takes the
   height the dialog has to cap. :deep because the element belongs to
   SharedClusterView. */
.cluster-preview :deep(.cluster-view) {
  height: 100%;
}

.cluster-preview :deep(.cluster-graph-wrap) {
  height: auto;
}

.cluster-back {
  position: fixed;
  top: 20px;
  left: 24px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: inherit;
  opacity: 0.6;
  text-decoration: none;
  transition: opacity 0.12s;
}

.cluster-back:hover {
  opacity: 1;
}
</style>
