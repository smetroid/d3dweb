<template>
  <div class="fx-shortcut">
    <div class="fx-shortcut-main">
      <span class="fx-shortcut-label">{{ label }}</span>
      <button
        v-if="!recording"
        type="button"
        class="fx-shortcut-combo"
        :title="'Press to change ' + label"
        @click="startRecord"
      >
        <span class="fx-kbd">{{ display }}</span>
        <span class="fx-shortcut-action">change</span>
      </button>
      <button
        v-else
        type="button"
        class="fx-shortcut-combo is-recording"
        @keydown="captureKeydown"
        @blur="stopRecord"
      >
        <span class="fx-shortcut-pulse">Press keys…</span>
      </button>
      <button
        v-if="!recording && isCustom"
        type="button"
        class="fx-btn-mini fx-shortcut-reset"
        @click="reset"
      >
        reset
      </button>
    </div>
    <div v-if="messages.length" class="fx-shortcut-warn">
      <span v-for="msg in messages" :key="msg" class="fx-shortcut-msg">{{ msg }}</span>
    </div>
  </div>
</template>

<script>
import Shortcuts from '@/helpers/Shortcuts.js'

export default {
  name: 'ShortcutRecorder',
  props: {
    // The stored override for this action (undefined when using the default).
    modelValue: { type: String, default: null },
    actionId: { type: String, required: true },
    label: { type: String, required: true },
    // Action ids that currently share this combo (conflict detection).
    conflictIds: { type: Array, default: () => [] }
  },
  emits: ['update:modelValue'],
  data() {
    return { recording: false }
  },
  computed: {
    defaultCombo() {
      const entry = Shortcuts.action(this.actionId)
      if (!entry) return ''
      return Shortcuts.isMac() ? entry.mac : entry.other
    },
    effectiveCombo() {
      return this.modelValue || this.defaultCombo
    },
    display() {
      return Shortcuts.format(this.effectiveCombo)
    },
    isCustom() {
      return !!this.modelValue && this.modelValue !== this.defaultCombo
    },
    messages() {
      const out = []
      const validation = Shortcuts.validate(this.effectiveCombo)
      if (!validation.ok) out.push(validation.reasons[0])
      else out.push(...validation.reasons)
      const conflicts = this.conflictIds.filter((id) => id !== this.actionId)
      if (conflicts.length) {
        const names = conflicts.map((id) => Shortcuts.action(id)?.label || id).join(', ')
        out.push(`Also assigned to: ${names}`)
      }
      return out
    }
  },
  beforeUnmount() {
    this.stopRecord()
  },
  methods: {
    startRecord() {
      this.recording = true
      window.addEventListener('keydown', this.captureKeydown, true)
    },
    stopRecord() {
      if (!this.recording) return
      this.recording = false
      window.removeEventListener('keydown', this.captureKeydown, true)
    },
    captureKeydown(event) {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        this.stopRecord()
        return
      }
      const combo = Shortcuts.comboFromEvent(event)
      if (!combo) return
      this.$emit('update:modelValue', combo)
      this.stopRecord()
    },
    reset() {
      this.$emit('update:modelValue', null)
    }
  }
}
</script>

<style scoped>
.fx-shortcut {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--fx-accent), 0.08);
}

.fx-shortcut-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fx-shortcut-label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: rgb(var(--fx-ink));
}

.fx-shortcut-combo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
}

.fx-shortcut-combo.is-recording {
  padding: 4px 10px;
  border: 1px dashed rgb(var(--fx-accent));
  border-radius: 4px;
  cursor: default;
}

.fx-shortcut-pulse {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--fx-accent));
}

.fx-shortcut-action {
  font-size: 10px;
  color: rgb(var(--fx-ink-faint));
  text-decoration: underline dotted;
}

.fx-shortcut-reset {
  flex: none;
  font-size: 10px;
  padding: 4px 8px;
  color: rgb(var(--fx-ink-dim));
}

.fx-shortcut-warn {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fx-shortcut-msg {
  font-size: 10px;
  color: rgb(var(--fx-warn, 220, 160, 60));
}
</style>
