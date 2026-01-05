<script setup>
import{ useActionStore, useJsonStore } from '@/stores/store'
import EditorComponent from './EditorComponent.vue'
import { ref } from 'vue'

const actionStore = useActionStore()
const jsonStore = useJsonStore()
const openEditorId = ref(null);
const editorValue = ref('')

const handleEditorOpen = (key, value) => {
  console.log('Opening editor for key:', key, 'with value:', value[0]);
  openEditorId.value = key
  
  // Handle undefined or empty array
  const dataToStringify = value[0] !== undefined ? value[0] : {}
  editorValue.value = JSON.stringify(dataToStringify, null, 2)
};

</script>
<template>
  <div v-if="actionStore.toggleActionContainer && actionStore.currentInteractionId" class="action-container">
    <div class="content">
        <div class="close" @click="actionStore.toggleActionContainerVisibility(null)">X</div>
        <ul >
            <li v-for="(value, key) in jsonStore.currentInteractions[actionStore.currentInteractionId]" :key="key"  >
              <div v-if="key !== 'meta'">{{ key }} 
              <svg @click.stop="handleEditorOpen(key, value)" class="open-actions-icon"
            width="512"
            height="512"
            viewBox="0 0 24 24"
            fill="#000000"
          >
            <g
              fill="none"
              stroke="#000000"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            >
              <rect width="15" height="18.5" x="4.5" y="2.75" rx="3.5" />
              <path d="M8.5 6.755h7m-7 4h7m-7 4H12" />
            </g>
          </svg>
        
        </div>
            </li>
        </ul>
          <div class="editor-panel">
              <EditorComponent v-if="openEditorId" :modelValue="editorValue" />
          </div>
    </div>
    
  </div>
</template>
<style scoped>
.action-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.438);
  border: 2px solid black;
  z-index: 1000; /* Ensure it overlays other components */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
}
.content {
position: relative;
padding: 40px 100px;
background-color: darkgray;
}
.close {
  position: absolute;
  top: 0;
  right: 5px;
  font-size: 1.5em;
  cursor: pointer;
}
li div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.open-actions-icon {
  width: 24px;
  height: 24px;
  margin-left: 10px;
  cursor: pointer;
}
</style>
