<template>
  <div>
    <v-expand-transition>
      <div v-show="expand" class="fx-hud">
        <header class="fx-hud-header">
          <div class="fx-hud-title">
            <span class="fx-title-chip fx-chip-add">D3D</span>
            <h2 class="fx-title">CONTROL MATRIX</h2>
            <span v-if="diagramInfo.id" class="fx-title-chip fx-chip-edit">DIAGRAM SAVED</span>
          </div>
          <span class="fx-hud-tag">{{ mod }} PLATFORM · HELP</span>
        </header>

        <div class="fx-hud-body">
          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Diagram Info</h3>
            <div class="fx-hud-row">
              <span class="fx-hud-row-title">ID</span>
              <span class="fx-hud-row-v">{{ diagramInfo.id || '—' }}</span>
            </div>
            <div class="fx-hud-row">
              <span class="fx-hud-row-title">Name</span>
              <span class="fx-hud-row-v">{{ diagramInfo.name || '—' }}</span>
            </div>
            <div class="fx-hud-row">
              <span class="fx-hud-row-title">Description</span>
              <span class="fx-hud-row-v">{{ diagramInfo.description || '—' }}</span>
            </div>
          </section>

          <section class="fx-hud-mod">
            <h3 class="fx-hud-mod-title">Actions</h3>
            <div v-for="helper in samus" :key="helper.title" class="fx-hud-row">
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

<style scoped></style>
