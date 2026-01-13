<script setup>
import { useActionStore, useJsonStore, useHistoryStore } from '@/stores/store'
import EditorComponent from './EditorComponent.vue'
import { ref, watch } from 'vue'

const actionStore = useActionStore()
const historyStore = useHistoryStore()
const jsonStore = useJsonStore()
const openEditorId = ref(null)
const editorValue = ref('')
const editingId = ref(null)
const editingName = ref('')
const showHistory = ref(false)
const autoCloseTimeout = ref(null)

watch(editingId, (newId) => {
  if (newId !== null) {
    // Use nextTick to ensure the input is rendered
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        const input = document.querySelector('.rename-input')
        if (input) {
          input.focus()
          input.select()
        }
      })
    })
  }
})

const startEditingName = (interactionId, currentName) => {
  editingId.value = interactionId
  editingName.value = currentName
}

const finishEditingName = (interactionId) => {
  if (editingName.value.trim() && editingName.value !== '') {
    // Update the interaction name in the store
    jsonStore.updateInteractionToolName(interactionId, editingName.value.trim())
  }
  editingId.value = null
  editingName.value = ''
}

const cancelEditingName = () => {
  editingId.value = null
  editingName.value = ''
}
const handleEditorSave = (key, newValue) => {
  console.log(
    'Saving editor value for key:',
    key,
    'with new value:',
    newValue,
    'current interaction id:',
    actionStore.currentInteractionId,
  )
  jsonStore.updateInteractionData(actionStore.currentInteractionId, key, newValue)
}
const deleteAction = (toolName) => {
  historyStore.deleteInteractionTool(toolName)
}
const handleEditorOpen = (key, value) => {
  console.log(jsonStore.currentInteractions[actionStore.currentInteractionId][key])
  console.log('Opening editor for key:', key, 'with value:', value[0])
  openEditorId.value = key

  // Handle undefined or empty array
  const dataToStringify = value[0] !== undefined ? value[0] : {}
  editorValue.value = JSON.stringify(dataToStringify, null, 2)
}
const toggleActionContainer = () => {
  actionStore.toggleActionContainerVisibility(null)
  editorValue.value = ''
  openEditorId.value = null
}
const toggleHistory = () => {
  showHistory.value = !showHistory.value
  console.log('toggled history, now:', showHistory.value)
  if (!showHistory.value && autoCloseTimeout.value) {
    clearTimeout(autoCloseTimeout.value)
    autoCloseTimeout.value = null
  }

  if (showHistory.value && historyStore.deleteInteractionToolHistory.length === 0) {
    autoCloseTimeout.value = setTimeout(() => {
      showHistory.value = false
      autoCloseTimeout.value = null
    }, 3000)
  }
}
const restoreInteractionTool = (toolName) => {
  historyStore.restoreInteractionTool(toolName)

  if (!showHistory.value && autoCloseTimeout.value) {
    clearTimeout(autoCloseTimeout.value)
    autoCloseTimeout.value = null
  }

  if (showHistory.value && historyStore.deleteInteractionToolHistory.length === 0) {
    autoCloseTimeout.value = setTimeout(() => {
      showHistory.value = false
      autoCloseTimeout.value = null
    }, 3000)
  }
}
</script>
<template>
  <div
    v-if="actionStore.toggleActionContainer && actionStore.currentInteractionId"
    class="action-container"
  >
    <div class="content">
      <div class="header">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="#000000" @click="toggleHistory">
          <path
            d="m16.112 20l-.689-.688l2.1-2.1l-2.1-2.1l.689-.689l2.1 2.1l2.1-2.1l.688.689l-2.075 2.1l2.075 2.1l-.688.688l-2.1-2.075zm-4.15 0q-3.046 0-5.311-1.99q-2.264-1.989-2.62-5.01h1.011q.408 2.58 2.351 4.29T11.962 19q.275 0 .541-.012t.536-.063v1.006q-.27.044-.536.056t-.541.013m-7-11.538V4.307h1v2.388q1.16-1.273 2.718-1.984T11.962 4q3.327 0 5.663 2.337T19.962 12v.27h-1V12q0-2.925-2.038-4.962T11.962 5q-1.552 0-2.918.656q-1.365.656-2.41 1.806h2.482v1zm8.965 6.153l-2.408-2.407V7h1v4.792l1.939 1.939z"
          />
        </svg>
        <svg
          fill="#000000"
          width="22px"
          height="22px"
          viewBox="0 0 32 32"
          version="1.1"
          @click="toggleActionContainer"
        >
          <path
            d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14 6.28 14 14-6.28 14.032-14 14.032zM21.657 10.344c-0.39-0.39-1.023-0.39-1.414 0l-4.242 4.242-4.242-4.242c-0.39-0.39-1.024-0.39-1.415 0s-0.39 1.024 0 1.414l4.242 4.242-4.242 4.242c-0.39 0.39-0.39 1.024 0 1.414s1.024 0.39 1.415 0l4.242-4.242 4.242 4.242c0.39 0.39 1.023 0.39 1.414 0s0.39-1.024 0-1.414l-4.242-4.242 4.242-4.242c0.391-0.391 0.391-1.024 0-1.414z"
          ></path>
        </svg>
      </div>
      <ul>
        <li
          v-for="(value, key) in jsonStore.currentInteractions[actionStore.currentInteractionId]"
          :key="key"
          @dblclick="editingId !== key && startEditingName(key, key)"
        >
          <div v-if="key !== 'meta'">
            <input
              v-if="editingId === key"
              v-model="editingName"
              type="text"
              class="rename-input"
              @blur="finishEditingName(key)"
              @keydown.enter="finishEditingName(key)"
              @keydown.esc="cancelEditingName(key)"
              @click.stop
              @dblclick.stop
            />
            <span v-else class="action-name" :title="key">{{ key }}</span>
            <div>
              <svg width="34px" height="34px" viewBox="0 0 50 50" @click.stop="deleteAction(key)">
                <path d="M20 18h2v16h-2z" />
                <path d="M24 18h2v16h-2z" />
                <path d="M28 18h2v16h-2z" />
                <path d="M12 12h26v2H12z" />
                <path
                  d="M30 12h-2v-1c0-.6-.4-1-1-1h-4c-.6 0-1 .4-1 1v1h-2v-1c0-1.7 1.3-3 3-3h4c1.7 0 3 1.3 3 3v1z"
                />
                <path
                  d="M31 40H19c-1.6 0-3-1.3-3.2-2.9l-1.8-24 2-.2 1.8 24c0 .6.6 1.1 1.2 1.1h12c.6 0 1.1-.5 1.2-1.1l1.8-24 2 .2-1.8 24C34 38.7 32.6 40 31 40z"
                />
              </svg>
              <svg
                @click.stop="handleEditorOpen(key, value)"
                class="open-actions-icon"
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
          </div>
        </li>
      </ul>
      <button
        class="add-action-btn"
        @click="jsonStore.addInterActionTool(actionStore.currentInteractionId)"
      >
        + Add action
      </button>
      <div class="delete-history" v-if="showHistory">
        <div>
          <p>
            {{
              historyStore.deleteInteractionToolHistory.length >= 1
                ? 'Deleted Items'
                : 'No items to restore'
            }}
          </p>
        </div>

        <ul>
          <li v-for="item in historyStore.deleteInteractionToolHistory" :key="item.id">
            {{ item.toolName }}
            <div class="interaction-actions">
              <svg
                width="30px"
                height="30px"
                viewBox="0 0 40 40"
                @click.stop="restoreInteractionTool(item.toolName)"
              >
                <path
                  d="M10 16.682l5.69 5.685 1.408-1.407-3.283-3.28h10.131c1.147 0 2.19.467 2.943 1.222a4.157 4.157 0 011.225 2.946 4.18 4.18 0 01-4.168 4.168h-5.628V28h5.522c3.387 0 6.16-2.77 6.16-6.157a6.117 6.117 0 00-1.81-4.343 6.143 6.143 0 00-4.35-1.805H13.815l3.283-3.285L15.69 11 10 16.682z"
                  fill="#000000"
                  fill-rule="nonzero"
                />
              </svg>
            </div>
          </li>
        </ul>
      </div>
      <div class="editor-panel">
        <EditorComponent
          v-if="openEditorId"
          :key="openEditorId"
          @save="handleEditorSave(openEditorId, $event)"
          :modelValue="editorValue"
        />
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
  font-size: 1.5em;
}
.content {
  width: 400px;
  height: 400px;
  position: relative;
  top: 50%;
  left: 25%;
  transform: translate(-25%, -50%);
  padding: 40px 5px;
  background-color: darkgray;
}
.delete-history {
  position: absolute;
  top: 0px;
  left: -200px;
  width: 200px;
  max-height: 400px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  padding: 10px;
  z-index: 1100;
  font-size: 18px;
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
  }
}
.header {
  position: absolute;
  top: 0;
  right: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.add-action-btn {
  position: absolute;
  bottom: -45px;
  left: 5px;
  right: 5px;
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
ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  max-height: 360px;
  overflow-y: auto;
}
li div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
li {
  &:hover {
    background-color: #d0d0d0;
  }
}
.open-actions-icon {
  width: 24px;
  height: 24px;
  margin-left: 10px;
}
svg {
  cursor: pointer;
}
</style>
