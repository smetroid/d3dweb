<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const DEMO_SERVER = 'wss://demos.yjs.dev'
const ROOM = 'd3d-collab-poc-v1'

// Refs to the textarea DOM elements, populated by :ref in template
const textareaRefs = ref([null, null])

function makePanel(index, id) {
  const doc = new Y.Doc()
  const sharedText = doc.getText('shared')
  const provider = new WebsocketProvider(DEMO_SERVER, ROOM, doc)
  const status = ref('connecting')

  provider.on('status', ({ status: s }) => {
    status.value = s
  })

  // Load initial document state once synced
  provider.on('synced', () => {
    const el = textareaRefs.value[index]
    if (el) el.value = sharedText.toString()
  })

  // Only apply REMOTE changes to the DOM — skip local edits (cursor stays intact)
  sharedText.observe((event) => {
    if (event.transaction.local) return
    const el = textareaRefs.value[index]
    if (!el) return
    const { selectionStart, selectionEnd } = el
    el.value = sharedText.toString()
    // Restore cursor position after remote update
    el.selectionStart = selectionStart
    el.selectionEnd = selectionEnd
  })

  function onInput(e) {
    const next = e.target.value
    doc.transact(() => {
      sharedText.delete(0, sharedText.length)
      sharedText.insert(0, next)
    })
  }

  function destroy() {
    provider.destroy()
    doc.destroy()
  }

  return { id, status, onInput, destroy }
}

const panels = ref([])

onMounted(() => {
  panels.value = [makePanel(0, 'A'), makePanel(1, 'B')]
})

onUnmounted(() => {
  panels.value.forEach((p) => p.destroy())
})
</script>

<template>
  <div class="poc-root">
    <div class="poc-header">
      <h2>Yjs POC — shared text across two independent Y.Doc instances</h2>
      <p class="poc-hint">
        Both panels connect to <code>{{ ROOM }}</code> on the Yjs demo server.<br />
        Type in either panel — edits sync in real time. Open a second browser tab to
        <code>/collab-poc</code> to simulate a second user.
      </p>
    </div>
    <div class="poc-panels">
      <div v-for="(panel, i) in panels" :key="panel.id" class="poc-panel">
        <div class="poc-panel-header">
          <span class="poc-label">Panel {{ panel.id }}</span>
          <span class="poc-status" :class="`poc-status--${panel.status.value}`">
            {{ panel.status.value }}
          </span>
        </div>
        <textarea
          :ref="
            (el) => {
              textareaRefs[i] = el
            }
          "
          class="poc-textarea"
          placeholder="Type here to sync…"
          @input="panel.onInput"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.poc-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  font-family: monospace;
  background: #111;
  color: #eee;
}
.poc-header {
  margin-bottom: 24px;
}
.poc-header h2 {
  font-size: 1rem;
  margin: 0 0 8px;
}
.poc-hint {
  font-size: 0.8rem;
  color: #aaa;
  margin: 0;
  line-height: 1.5;
}
.poc-hint code {
  background: #222;
  padding: 1px 4px;
  border-radius: 3px;
}
.poc-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
}
.poc-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
}
.poc-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}
.poc-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: #7af;
}
.poc-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
}
.poc-status--connected {
  background: #1a3a1a;
  color: #4f4;
}
.poc-status--connecting {
  background: #3a3a1a;
  color: #ff4;
}
.poc-status--disconnected {
  background: #3a1a1a;
  color: #f44;
}
.poc-textarea {
  flex: 1;
  resize: none;
  background: #161616;
  color: #eee;
  border: none;
  padding: 12px;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  outline: none;
}
</style>
