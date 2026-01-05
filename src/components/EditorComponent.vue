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
  
  // Determine the document value
  let docValue = '{}'
  if (props.modelValue !== undefined) {
    // Check if it's an actual empty array
    if (Array.isArray(props.modelValue) && props.modelValue.length === 0) {
      docValue = '{}'
    }
    // Check if it's a JSON string representing an empty array
    else if (props.modelValue === '[]') {
      docValue = '{}'
    }
    // Otherwise use the provided value
    else {
      docValue = props.modelValue
    }
  }
  
  console.log('Using doc value:', docValue)
  
  editorView.value = new EditorView({
    doc: docValue,
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
  <div @keydown="handleKeydown" ref="editor"></div>
</template>
<style scoped>
div {
  width: 100%;
  height: 100%;
  border: 1px solid #ccc;
  background-color: darkgray;
  position: absolute;
  top: 0;
  right: -400px;
  overflow: auto;
}
</style>
