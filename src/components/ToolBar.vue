<script setup>
import useToolBar from '@/composables/toolBarComposable'
import { useJsonStore } from '@/stores/store'

const { openFile } = useToolBar()
const jsonStore = useJsonStore()
</script>

<template>
  <nav>
    <button @click="openFile">Open file</button>
    <button
      @click="jsonStore.toggleCreationTool"
      :disabled="!jsonStore.selectedShapeId"
      :class="{ active: jsonStore.isCreationToolActive }"
    >
      {{ jsonStore.isCreationToolActive ? 'Drawing Mode' : 'Create Shape' }}
    </button>
  </nav>
</template>

<style scoped>
nav {
  background-color: #f0f0f0;
  padding: 10px;
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background-color: #007acc;
  color: white;
  border-color: #005999;
}

button:not(:disabled):hover {
  background-color: #e0e0e0;
}

button.active:hover {
  background-color: #005999;
}
</style>
