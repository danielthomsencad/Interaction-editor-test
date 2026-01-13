<script setup>
import { basicSetup } from 'codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { linter, lintGutter } from '@codemirror/lint'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const editor = ref(null)
const editorView = ref(null)

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})
const emit = defineEmits(['update:modelValue', 'save'])

function saveChanges() {
  emit('save', editorView.value.state.doc.toString())
}
function handleKeydown(event) {
  event.stopPropagation()
}
watch(
  () => props.modelValue,
  (newVal) => {
    if (editorView.value && newVal !== editorView.value.state.doc.toString()) {
      editorView.value.dispatch({
        changes: { from: 0, to: editorView.value.state.doc.length, insert: newVal },
      })
    }
  },
)

onMounted(() => {
  console.log('Initializing CodeMirror with value:', props.modelValue)

  editorView.value = new EditorView({
    doc: props.modelValue,
    extensions: [basicSetup, json(), lintGutter(), linter(jsonParseLinter())],
    parent: editor.value,
  })
})

onUnmounted(() => {
  if (editorView.value) {
    editorView.value.destroy()
  }
})
</script>
<template>
  <div class="editor_container" @keydown="handleKeydown" ref="editor"></div>
  <button @click="saveChanges">Save</button>
</template>
<style scoped>
.editor_container {
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
  background-color: darkgray;
  position: absolute;
  top: 0;
  right: -400px;
  overflow: auto;
}
button {
  position: absolute;
  bottom: -45px;
  right: -395px;
  left: 405px;
  z-index: 10;
  padding: 8px;
  margin-top: 8px;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 4px;
  &:hover {
    background-color: #005fa3;
  }
}
</style>
