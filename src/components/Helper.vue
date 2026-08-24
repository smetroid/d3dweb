<template>
  <div>
    <v-expand-transition>
      <div v-show="expand" class="fx-hud">
        <header class="fx-hud-header">
          <div class="fx-hud-title">
            <span class="fx-title-chip fx-chip-add">D3D</span>
            <h2 class="fx-title">CONTROL MATRIX</h2>
          </div>
          <div v-if="diagramInfo.name || diagramInfo.id" class="fx-hud-meta-group">
            <div v-if="diagramInfo.name" class="fx-hud-meta">
              <span class="fx-hud-meta-label">DIAGRAM INFO</span>
              <span class="fx-hud-meta-name">{{ diagramInfo.name }}</span>
              <span v-if="diagramInfo.description" class="fx-hud-meta-desc">{{
                diagramInfo.description
              }}</span>
            </div>
            <div v-if="diagramInfo.id" class="fx-hud-meta">
              <span class="fx-hud-meta-label">DIAGRAM SAVED</span>
              <span class="fx-hud-meta-name">{{ diagramInfo.id }}</span>
            </div>
          </div>
          <span class="fx-hud-tag">{{ mod }} PLATFORM · HELP</span>
        </header>

        <div class="fx-hud-divider"></div>
        <div class="fx-hud-body">
          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Actions</h3>
            <div v-for="helper in actions" :key="helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
          </section>

          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Collaboration</h3>
            <div v-for="helper in collab" :key="helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
          </section>

          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Shortcuts</h3>
            <div v-for="helper in actions" :key="helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
          </section>

          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Selection</h3>
            <div v-for="helper in selectionOptions" :key="helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
          </section>

          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Zoom</h3>
            <div v-for="helper in zoom" :key="helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
          </section>

          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Layouts</h3>
            <div v-for="helper in layouts" :key="helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
            <div v-for="helper in other" :key="'o-' + helper.title" class="fx-hud-row">
              <span class="fx-hud-row-title">{{ helper.title }}</span>
              <span class="fx-kbd">{{ helper.shortcut }}</span>
            </div>
          </section>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>
<script>
import D3Util from '@/helpers/D3Util.js'
import Shortcuts from '@/helpers/Shortcuts.js'

export default {
  name: 'D3DHelper',
  props: ['expand', 'diagramInfo'],
  computed: {
    mod() {
      return D3Util.isMac() ? '⌘' : 'Alt'
    },
    other() {
      return [
        { title: 'Settings', shortcut: 'Ctrl + t' },
        { title: 'Hints', shortcut: Shortcuts.label('showHints') }
      ]
    },
    selectionOptions() {
      return [
        {
          title: 'Focus Node',
          shortcut: `${Shortcuts.label('navDown')} or ${Shortcuts.label('navUp')}`
        },
        { title: 'Select Nodes', shortcut: Shortcuts.label('selectNodes') },
        { title: 'Select Edges', shortcut: Shortcuts.label('selectEdges') },
        { title: 'Active 1', shortcut: Shortcuts.label('select') },
        {
          title: 'Active 2',
          shortcut: `${Shortcuts.label('select')} ${Shortcuts.label('select')}`
        },
        { title: 'Hints', shortcut: Shortcuts.label('showHints') },
        { title: 'Change Focus', shortcut: Shortcuts.label('close') },
        { title: 'Command Palette', shortcut: '⌘ / Ctrl + k' }
      ]
    },
    actions() {
      return [
        { title: 'Delete', shortcut: Shortcuts.label('deleteElement') },
        { title: 'Read Only', shortcut: 'r' },
        { title: 'Edit', shortcut: Shortcuts.label('editElement') },
        { title: 'Create Node', shortcut: Shortcuts.label('addNode') },
        { title: 'Create Edge', shortcut: Shortcuts.label('addEdge') }
      ]
    },
    collab() {
      return [
        { title: 'History panel', shortcut: Shortcuts.label('history') },
        { title: 'Share link dialog', shortcut: Shortcuts.label('share') },
        { title: 'Share focused element', shortcut: Shortcuts.label('shareSelection') }
      ]
    },
    zoom() {
      return [
        { title: 'Zoom In', shortcut: `${this.mod} + =` },
        { title: 'Zoom Out', shortcut: `${this.mod} + -` },
        { title: 'Pan Right', shortcut: `${this.mod} + l` },
        { title: 'Pan Left', shortcut: `${this.mod} + h` },
        { title: 'Pan Up', shortcut: `${this.mod} + k` },
        { title: 'Pan Down', shortcut: `${this.mod} + j` }
      ]
    },
    samus() {
      return [
        { title: 'New Diagram', shortcut: `${this.mod} + n` },
        { title: 'Open Diagram', shortcut: `${this.mod} + o` },
        { title: 'Edit Diagram', shortcut: `${this.mod} + e` },
        { title: 'Save Diagram', shortcut: `${this.mod} + s` }
      ]
    },
    layouts() {
      return [
        { title: 'Cola (Physics-based)', shortcut: `${this.mod} + 1` },
        { title: 'CoSE (Force-directed)', shortcut: `${this.mod} + 2` },
        { title: 'Breadth First (Tree)', shortcut: `${this.mod} + 3` },
        { title: 'Grid', shortcut: `${this.mod} + 4` },
        { title: 'Circle', shortcut: `${this.mod} + 5` },
        { title: 'Concentric', shortcut: `${this.mod} + 6` },
        { title: 'Dagre (Hierarchical)', shortcut: `${this.mod} + 7` },
        { title: 'Random', shortcut: `${this.mod} + 8` }
      ]
    }
  }
}
</script>

<style scoped>
.fx-hud-meta-group {
  display: flex;
  margin-left: auto;
  border-left: 1px solid rgba(var(--fx-accent), 0.25);
  border-right: 1px solid rgba(var(--fx-accent), 0.25);
}

.fx-hud-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 16px;
  min-width: 0;
}

.fx-hud-meta + .fx-hud-meta {
  border-left: 1px solid rgba(var(--fx-accent), 0.25);
}

.fx-hud-meta-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--fx-accent));
  opacity: 0.7;
  margin-bottom: 2px;
}

.fx-hud-meta-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgb(var(--fx-ink));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fx-hud-divider {
  height: 1px;
  background: rgba(var(--fx-accent), 0.2);
  margin: 0;
}

.fx-hud-meta-desc {
  font-size: 9px;
  color: rgb(var(--fx-ink-dim));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.04em;
}
</style>
