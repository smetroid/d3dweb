<script setup>
/**
 * Spike: WS notification pattern for diagram collaboration.
 *
 * Two Cytoscape panels each hold their own graph state.
 * Every structural mutation (add/delete node or edge) is broadcast as a
 * JSON "diagram:updated" message to the spike relay (spike/main.go).
 * The receiving panel applies the incoming state — the sender ignores its
 * own message (echo prevention via clientId).
 *
 * Prereq: cd spike && go run .      (starts relay on :8081)
 * Route:  /collab-cyto-poc
 *
 * DELETE this file and the /collab-cyto-poc route before merging to main.
 */

import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import cytoscape from 'cytoscape'

const RELAY = 'ws://localhost:8081/ws'
const ROOM = 'cyto-poc'

const containerRefs = ref([null, null])

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function makePanel(index, panelId) {
  const clientId = uuid()
  const relayStatus = ref('connecting')
  const lastEvent = ref(null)
  let cy = null
  let ws = null

  // ── Graph state ─────────────────────────────────────────────────────────
  // Kept as plain arrays; sent whole on every change (simulates what the
  // real server stores and what GET /dag/:id returns).

  function currentState() {
    if (!cy) return { nodes: [], edges: [] }
    return {
      nodes: cy
        .nodes()
        .map((n) => ({
          id: n.id(),
          label: n.data('label'),
          x: n.position('x'),
          y: n.position('y')
        })),
      edges: cy
        .edges()
        .map((e) => ({ id: e.id(), source: e.data('source'), target: e.data('target') }))
    }
  }

  function applyState({ nodes, edges }) {
    if (!cy) return
    cy.batch(() => {
      // Reconcile nodes
      const incoming = new Set(nodes.map((n) => n.id))
      cy.nodes().forEach((n) => {
        if (!incoming.has(n.id())) n.remove()
      })
      nodes.forEach((n) => {
        const existing = cy.$(`#${CSS.escape(n.id)}`)
        if (existing.length) {
          existing.position({ x: n.x, y: n.y })
        } else {
          cy.add({
            group: 'nodes',
            data: { id: n.id, label: n.label },
            position: { x: n.x, y: n.y }
          })
        }
      })
      // Reconcile edges
      const incomingEdges = new Set(edges.map((e) => e.id))
      cy.edges().forEach((e) => {
        if (!incomingEdges.has(e.id())) e.remove()
      })
      edges.forEach((e) => {
        if (!cy.$(`#${CSS.escape(e.id)}`).length) {
          cy.add({ group: 'edges', data: { id: e.id, source: e.source, target: e.target } })
        }
      })
    })
  }

  // ── WebSocket relay ──────────────────────────────────────────────────────

  function broadcast() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const msg = JSON.stringify({ type: 'diagram:updated', clientId, ...currentState() })
    ws.send(msg)
  }

  function connectRelay() {
    ws = new WebSocket(`${RELAY}?room=${ROOM}`)
    relayStatus.value = 'connecting'

    ws.onopen = () => {
      relayStatus.value = 'connected'
    }
    ws.onclose = () => {
      relayStatus.value = 'disconnected'
      setTimeout(connectRelay, 2000) // auto-reconnect
    }
    ws.onerror = () => {
      relayStatus.value = 'error'
    }
    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data)
        if (msg.type !== 'diagram:updated') return
        if (msg.clientId === clientId) return // echo prevention
        lastEvent.value = new Date().toLocaleTimeString()
        applyState(msg)
      } catch {
        /* ignore malformed */
      }
    }
  }

  // ── Cytoscape init ───────────────────────────────────────────────────────

  function initCytoscape(container) {
    cy = cytoscape({
      container,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': panelId === 'A' ? '#4a7fd4' : '#d47a4a',
            color: '#fff',
            'text-valign': 'center',
            'font-size': 12
          }
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#666',
            width: 2,
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#666',
            'curve-style': 'bezier'
          }
        },
        {
          selector: '.pending-edge',
          style: { 'border-width': 3, 'border-color': '#ff0', 'border-style': 'dashed' }
        }
      ],
      elements: [],
      layout: { name: 'preset' }
    })

    // Click background → add node
    cy.on('tap', (e) => {
      if (e.target !== cy) return
      const pos = e.position
      const id = `n-${clientId.slice(0, 4)}-${Date.now()}`
      const label = id.slice(-4)
      cy.add({ group: 'nodes', data: { id, label }, position: { x: pos.x, y: pos.y } })
      broadcast()
    })

    // Right-click node → delete
    cy.on('cxttap', 'node', (e) => {
      const n = e.target
      n.connectedEdges().remove()
      n.remove()
      broadcast()
    })

    // Shift+click two nodes → connect with edge
    let pendingSource = null
    cy.on('tap', 'node', (e) => {
      if (!e.originalEvent.shiftKey) {
        pendingSource = null
        return
      }
      const id = e.target.id()
      if (!pendingSource) {
        pendingSource = id
        e.target.addClass('pending-edge')
      } else if (pendingSource !== id) {
        const edgeId = `e-${clientId.slice(0, 4)}-${Date.now()}`
        cy.add({ group: 'edges', data: { id: edgeId, source: pendingSource, target: id } })
        cy.$('.pending-edge').removeClass('pending-edge')
        pendingSource = null
        broadcast()
      }
    })
  }

  function destroy() {
    if (ws) ws.onclose = null // prevent reconnect loop on unmount
    if (ws) ws.close()
    if (cy) cy.destroy()
  }

  connectRelay()

  return { panelId, relayStatus, lastEvent, initCytoscape, destroy }
}

const panels = ref([])

onMounted(async () => {
  panels.value = [makePanel(0, 'A'), makePanel(1, 'B')]
  await nextTick()
  panels.value.forEach((p, i) => {
    if (containerRefs.value[i]) p.initCytoscape(containerRefs.value[i])
  })
})

onUnmounted(() => {
  panels.value.forEach((p) => p.destroy())
})
</script>

<template>
  <div class="poc-root">
    <div class="poc-header">
      <h2>WS Notification Spike — diagram sync via relay</h2>
      <p class="poc-hint">
        <strong>Prereq:</strong> <code>cd spike &amp;&amp; go run .</code> (relay on :8081)<br />
        <strong>Click canvas</strong> to add node &nbsp;·&nbsp;
        <strong>Shift+click two nodes</strong> to connect &nbsp;·&nbsp;
        <strong>Right-click node</strong> to delete<br />
        Structural changes in one panel broadcast <code>diagram:updated</code> to the relay; the
        other panel receives and re-renders. The sender does NOT re-apply (echo prevention).
      </p>
    </div>
    <div class="poc-panels">
      <div v-for="(panel, i) in panels" :key="panel.panelId" class="poc-panel">
        <div class="poc-panel-header">
          <span class="poc-label">Panel {{ panel.panelId }}</span>
          <span class="poc-status" :class="`poc-status--${panel.relayStatus}`">
            relay: {{ panel.relayStatus }}
          </span>
        </div>
        <div
          :ref="
            (el) => {
              containerRefs[i] = el
            }
          "
          class="poc-cy"
        />
        <div class="poc-footer">
          <span v-if="panel.lastEvent" class="poc-event">
            ⟵ diagram:updated received at {{ panel.lastEvent }}
          </span>
          <span v-else class="poc-event poc-event--idle">waiting for peer events…</span>
        </div>
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
  margin-bottom: 14px;
}
.poc-header h2 {
  font-size: 0.95rem;
  margin: 0 0 6px;
}
.poc-hint {
  font-size: 0.78rem;
  color: #aaa;
  margin: 0;
  line-height: 1.7;
}
.poc-hint strong {
  color: #7af;
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
  min-height: 0;
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
  padding: 6px 12px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
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
.poc-status--error {
  background: #3a1a1a;
  color: #f84;
}
.poc-cy {
  flex: 1;
  background: #0e0e0e;
}
.poc-footer {
  padding: 6px 12px;
  background: #1a1a1a;
  border-top: 1px solid #333;
  flex-shrink: 0;
  font-size: 0.72rem;
}
.poc-event {
  color: #4f4;
}
.poc-event--idle {
  color: #555;
}
</style>
