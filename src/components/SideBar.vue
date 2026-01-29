<script setup>
import { useJsonStore, useActionStore, useHistoryStore } from '@/stores/store'
import { computed, ref, watch } from 'vue'

const jsonStore = useJsonStore()
const actionStore = useActionStore()
const historyStore = useHistoryStore()

const draggedId = ref(null)
const dropTargetId = ref(null)
const dropPosition = ref(null) // 'before' or 'after'
const isDragging = ref(false)
const showHistory = ref(false)
const autoCloseTimeout = ref(null)
const editingId = ref(null)
const editingName = ref('')
const editingStateIndex = ref(null)
const editingStateName = ref('')
const editingInfoLayerId = ref(null)
const editingInfoLayerName = ref('')

// Local state to maintain sidebar display order
const sidebarOrder = ref([])

// Auto-focus the input field when editing starts
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

// Watch for changes in interactions and initialize/update order
watch(
  () => [jsonStore.currentInteractionShapes, jsonStore.currentInteractions],
  ([shapes, interactions]) => {
    if (
      (!shapes || shapes.length === 0) &&
      (!interactions || Object.keys(interactions).length === 0)
    )
      return

    // Initialize from shapes array to keep order in sync
    const shapeIds = shapes.map((s) => s.id)

    if (sidebarOrder.value.length === 0) {
      // First time: use shape order, then add any interactions without shapes
      const interactionIds = Object.keys(jsonStore.currentInteractions)
      const idsWithoutShapes = interactionIds.filter((id) => !shapeIds.includes(id))
      sidebarOrder.value = [...shapeIds, ...idsWithoutShapes]
    } else {
      // Update: add new IDs, remove deleted ones, but preserve custom order
      const allCurrentIds = Object.keys(jsonStore.currentInteractions)

      // Add new IDs
      const newIds = allCurrentIds.filter((id) => !sidebarOrder.value.includes(id))
      if (newIds.length > 0) {
        sidebarOrder.value.push(...newIds)
      }

      // Remove IDs that no longer exist
      sidebarOrder.value = sidebarOrder.value.filter((id) => allCurrentIds.includes(id))
    }
  },
  { immediate: true, deep: true },
)

const allInteractions = computed(() => {
  const interactions = Object.entries(jsonStore.currentInteractions).map(([id, interaction]) => {
    const shape = jsonStore.currentInteractionShapes.find((s) => s.id === id)
    return {
      id,
      name: interaction.meta?.name || id,
      color: shape?.color || interaction.meta?.color || '#cccccc',
      shape,
    }
  })

  // Sort by sidebar order (no side effects, just sorting)
  return sidebarOrder.value
    .map((id) => interactions.find((i) => i.id === id))
    .filter((i) => i !== undefined)
})

const currentStateDeletedItems = computed(() => {
  return historyStore.deleteInteractionLayerHistory.filter(
    (item) => item.stateIndex === jsonStore.currentStateIndex,
  )
})
const deleteInteractionLayer = async (interactionLayerId) => {
  const interaction = allInteractions.value.find((i) => i.id === interactionLayerId)
  const name = interaction?.name || interactionLayerId

  const confirmed = await window.api.showConfirmDialog({
    message: `Delete "${name}"?`,
    detail: 'You can restore it from the history panel.',
  })

  if (!confirmed) return

  historyStore.deleteInteractionLayer(interactionLayerId)
  const itemTodeleteIndex = sidebarOrder.value.indexOf(interactionLayerId)
  if (itemTodeleteIndex !== -1) {
    sidebarOrder.value.splice(itemTodeleteIndex, 1)
  }
  console.log('deleted items from sidebar:', historyStore.deleteInteractionLayerHistory)
}
const restoreInteractionLayer = (interactionLayerId) => {
  console.log('restore interaction layer called', interactionLayerId)
  historyStore.restoreInteractionLayer(interactionLayerId)
  // Re-add to sidebar order at the end
  if (!sidebarOrder.value.includes(interactionLayerId)) {
    sidebarOrder.value.push(interactionLayerId)
  }
  if (!showHistory.value && autoCloseTimeout.value) {
    clearTimeout(autoCloseTimeout.value)
    autoCloseTimeout.value = null
  }

  if (showHistory.value && currentStateDeletedItems.value.length === 0) {
    autoCloseTimeout.value = setTimeout(() => {
      showHistory.value = false
      autoCloseTimeout.value = null
    }, 3000)
  }
}
const toggleHistory = () => {
  showHistory.value = !showHistory.value
  console.log('toggled history, now:', showHistory.value)
  if (!showHistory.value && autoCloseTimeout.value) {
    clearTimeout(autoCloseTimeout.value)
    autoCloseTimeout.value = null
  }

  if (showHistory.value && currentStateDeletedItems.value.length === 0) {
    autoCloseTimeout.value = setTimeout(() => {
      showHistory.value = false
      autoCloseTimeout.value = null
    }, 3000)
  }
}

const handleSidebarClick = (interactionId) => {
  // Finalize any drawing in progress
  if (jsonStore.currentDrawingVertices.length >= 3 && jsonStore.selectedShapeId) {
    jsonStore.finalizeDrawing(jsonStore.selectedShapeId)
  }

  // Proceed with normal selection
  jsonStore.setInteractionShapeById(interactionId)
}

const handleColorChange = (shapeId, event) => {
  const newColor = event.target.value
  jsonStore.updateShapeColor(shapeId, newColor)
}

const startEditing = (interactionId, currentName) => {
  editingId.value = interactionId
  editingName.value = currentName
}

const finishEditing = (interactionId) => {
  if (editingName.value.trim() && editingName.value !== '') {
    // Update the interaction name in the store
    jsonStore.updateInteractionName(interactionId, editingName.value.trim())
  }
  editingId.value = null
  editingName.value = ''
}

const cancelEditing = () => {
  editingId.value = null
  editingName.value = ''
}

const handleStateChange = (stateIndex) => {
  // Finalize any drawing in progress before changing state
  if (jsonStore.currentDrawingVertices.length >= 3 && jsonStore.selectedShapeId) {
    jsonStore.finalizeDrawing(jsonStore.selectedShapeId)
  }
  jsonStore.setCurrentState(stateIndex)
}

const startEditingState = (stateIndex, currentName) => {
  editingStateIndex.value = stateIndex
  editingStateName.value = currentName
}

const finishEditingState = (stateIndex) => {
  if (editingStateName.value.trim() && editingStateName.value !== '') {
    jsonStore.updateStateName(stateIndex, editingStateName.value.trim())
  }
  editingStateIndex.value = null
  editingStateName.value = ''
}

const cancelEditingState = () => {
  editingStateIndex.value = null
  editingStateName.value = ''
}

const handleInfoLayerChange = (infoLayerName) => {
  // Finalize any drawing in progress before changing to infolayer
  if (jsonStore.currentDrawingVertices.length >= 3 && jsonStore.selectedShapeId) {
    jsonStore.finalizeDrawing(jsonStore.selectedShapeId)
  }
  jsonStore.setCurrentInfolayer(infoLayerName)
}

const startEditingInfoLayer = (infoLayerId, currentName) => {
  editingInfoLayerId.value = infoLayerId
  editingInfoLayerName.value = currentName
}

const finishEditingInfoLayer = (infoLayerId) => {
  if (editingInfoLayerName.value.trim() && editingInfoLayerName.value !== '') {
    jsonStore.updateInfoLayerName(infoLayerId, editingInfoLayerName.value.trim())
  }
  editingInfoLayerId.value = null
  editingInfoLayerName.value = ''
}

const cancelEditingInfoLayer = () => {
  editingInfoLayerId.value = null
  editingInfoLayerName.value = ''
}

const handleDragStart = (interactionId, event) => {
  draggedId.value = interactionId
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', interactionId)
}

const handleDragOver = (interactionId, event) => {
  event.preventDefault() // CRITICAL: allows drop
  event.dataTransfer.dropEffect = 'move'

  if (draggedId.value === interactionId) {
    dropTargetId.value = null
    return
  }

  // Determine if we're in the top or bottom half of the element
  const rect = event.currentTarget.getBoundingClientRect()
  const mouseY = event.clientY
  const elementMiddle = rect.top + rect.height / 2

  dropTargetId.value = interactionId
  dropPosition.value = mouseY < elementMiddle ? 'before' : 'after'
}

const handleDragEnd = () => {
  // Clean up when drag ends (whether dropped or cancelled)
  draggedId.value = null
  dropTargetId.value = null
  dropPosition.value = null
  isDragging.value = false
}

const handleContainerDragOver = (event) => {
  // Handle dragover on the container (gaps between items)
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

const handleContainerDrop = (event) => {
  // Handle drops on the container (gaps between items)
  // Use the last known dropTargetId from the indicator
  if (dropTargetId.value !== null) {
    handleDrop(dropTargetId.value, event)
  }
}

const handleDrop = (targetId, event) => {
  event.preventDefault()

  if (draggedId.value === null || draggedId.value === targetId) {
    draggedId.value = null
    dropTargetId.value = null
    dropPosition.value = null
    return
  }

  // Reorder in sidebar display
  const fromSidebarIndex = sidebarOrder.value.indexOf(draggedId.value)
  const toSidebarIndex = sidebarOrder.value.indexOf(targetId)

  if (fromSidebarIndex !== -1 && toSidebarIndex !== -1) {
    // Remove from old position
    const [movedId] = sidebarOrder.value.splice(fromSidebarIndex, 1)

    // Calculate insert position based on dropPosition
    let insertIndex = toSidebarIndex

    // Adjust for the removed item
    if (fromSidebarIndex < toSidebarIndex) {
      insertIndex = toSidebarIndex - 1
    }

    // Apply before/after positioning
    if (dropPosition.value === 'after') {
      insertIndex += 1
    }

    // Insert at new position
    sidebarOrder.value.splice(insertIndex, 0, movedId)
  }

  // Also reorder in shapes array if both have shapes
  const fromShapeIndex = jsonStore.currentInteractionShapes.findIndex(
    (s) => s.id === draggedId.value,
  )
  const toShapeIndex = jsonStore.currentInteractionShapes.findIndex((s) => s.id === targetId)

  if (fromShapeIndex !== -1 && toShapeIndex !== -1) {
    jsonStore.reorderInteractionShapes(fromShapeIndex, toShapeIndex)
  }

  draggedId.value = null
  dropTargetId.value = null
  dropPosition.value = null
  isDragging.value = false
}
</script>

<template>
  <aside @dragover="handleContainerDragOver">
    <section class="states">
      <p>States</p>
      <ul>
        <li
          v-for="(state, index) in jsonStore.states"
          :key="state.name"
          :class="{
            active: index === jsonStore.currentStateIndex,
            editing: editingStateIndex === index,
          }"
          @click="editingStateIndex !== index && handleStateChange(index)"
          @dblclick="editingStateIndex !== index && startEditingState(index, state.name)"
        >
          <input
            v-if="editingStateIndex === index"
            v-model="editingStateName"
            type="text"
            class="rename-input"
            @blur="finishEditingState(index)"
            @keydown.enter="finishEditingState(index)"
            @keydown.esc="cancelEditingState"
            @click.stop
            @dblclick.stop
          />
          <span v-else class="interaction-name" :title="state.name">{{ state.name }}</span>
        </li>
      </ul>
    </section>
    <section class="interactions" @dragover="handleContainerDragOver">
      <div class="header">
        <p>Interactions</p>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#000000" @click="toggleHistory">
          <path
            d="m16.112 20l-.689-.688l2.1-2.1l-2.1-2.1l.689-.689l2.1 2.1l2.1-2.1l.688.689l-2.075 2.1l2.075 2.1l-.688.688l-2.1-2.075zm-4.15 0q-3.046 0-5.311-1.99q-2.264-1.989-2.62-5.01h1.011q.408 2.58 2.351 4.29T11.962 19q.275 0 .541-.012t.536-.063v1.006q-.27.044-.536.056t-.541.013m-7-11.538V4.307h1v2.388q1.16-1.273 2.718-1.984T11.962 4q3.327 0 5.663 2.337T19.962 12v.27h-1V12q0-2.925-2.038-4.962T11.962 5q-1.552 0-2.918.656q-1.365.656-2.41 1.806h2.482v1zm8.965 6.153l-2.408-2.407V7h1v4.792l1.939 1.939z"
          />
        </svg>
      </div>
      <ul
        @dragover="handleContainerDragOver"
        @drop="handleContainerDrop"
        :class="{ dragging: isDragging }"
      >
        <li
          v-for="interaction in allInteractions"
          :key="interaction.id"
          :class="{
            active: interaction.id === jsonStore.selectedShapeId,
            'no-shape': !interaction.shape,
            'drop-before': dropTargetId === interaction.id && dropPosition === 'before',
            'drop-after': dropTargetId === interaction.id && dropPosition === 'after',
            editing: editingId === interaction.id,
          }"
          @click="editingId !== interaction.id && handleSidebarClick(interaction.id)"
          @dblclick="editingId !== interaction.id && startEditing(interaction.id, interaction.name)"
          :draggable="editingId !== interaction.id"
          @dragstart="handleDragStart(interaction.id, $event)"
          @dragover="handleDragOver(interaction.id, $event)"
          @dragend="handleDragEnd"
          @drop="handleDrop(interaction.id, $event)"
        >
          <input
            v-if="editingId === interaction.id"
            v-model="editingName"
            type="text"
            class="rename-input"
            @blur="finishEditing(interaction.id)"
            @keydown.enter="finishEditing(interaction.id)"
            @keydown.esc="cancelEditing"
            @click.stop
            @dblclick.stop
            ref="renameInput"
          />
          <span v-else class="interaction-name" :title="interaction.name">{{
            interaction.name
          }}</span>
          <div class="interaction-actions">
           <svg 
             @click.stop="jsonStore.toggleShapeVisibility(interaction.id)"
             width="30px" 
             height="30px" 
             viewBox="0 0 24 24" 
             fill="none" 
             xmlns="http://www.w3.org/2000/svg"
             :style="{ opacity: jsonStore.hiddenShapeIds.includes(interaction.id) ? 0.3 : 1, cursor: 'pointer' }"
             :title="jsonStore.hiddenShapeIds.includes(interaction.id) ? 'Show shape' : 'Hide shape'"
           ><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M15.5778 13.6334C16.2396 12.1831 15.9738 10.4133 14.7803 9.21976C13.5868 8.02628 11.817 7.76042 10.3667 8.4222L11.5537 9.60918C12.315 9.46778 13.1307 9.69153 13.7196 10.2804C14.3085 10.8693 14.5323 11.6851 14.3909 12.4464L15.5778 13.6334Z" fill="#000000"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M5.86339 7.80781C5.60443 8.02054 5.35893 8.23562 5.12798 8.44832C4.28009 9.22922 3.59623 10.0078 3.1244 10.5906C2.88801 10.8825 2.70365 11.1268 2.57733 11.2997C2.51414 11.3862 2.46539 11.4549 2.43184 11.5029C2.41506 11.5269 2.40207 11.5457 2.39297 11.559L2.38224 11.5747L2.37908 11.5794L2.37806 11.5809L2.09656 12L2.37741 12.4181L2.37806 12.4191L2.37908 12.4206L2.38224 12.4253L2.39297 12.441C2.40207 12.4543 2.41506 12.4731 2.43184 12.4971C2.46539 12.5451 2.51414 12.6138 2.57733 12.7003C2.70365 12.8732 2.88801 13.1175 3.1244 13.4094C3.59623 13.9922 4.28009 14.7708 5.12798 15.5517C6.79696 17.0888 9.22583 18.75 12 18.75C13.3694 18.75 14.6547 18.3452 15.806 17.7504L14.6832 16.6277C13.8289 17.0123 12.9256 17.25 12 17.25C9.80366 17.25 7.73254 15.9112 6.14416 14.4483C5.36337 13.7292 4.72921 13.0078 4.29019 12.4656C4.14681 12.2885 4.02475 12.1311 3.92572 12C4.02475 11.8689 4.14681 11.7115 4.29019 11.5344C4.72921 10.9922 5.36337 10.2708 6.14416 9.55168C6.39447 9.32114 6.65677 9.09369 6.92965 8.87408L5.86339 7.80781ZM17.0705 15.1258C17.3434 14.9063 17.6056 14.6788 17.8559 14.4483C18.6367 13.7292 19.2708 13.0078 19.7099 12.4656C19.8532 12.2885 19.9753 12.1311 20.0743 12C19.9753 11.8689 19.8532 11.7115 19.7099 11.5344C19.2708 10.9922 18.6367 10.2708 17.8559 9.55168C16.2675 8.08879 14.1964 6.75 12 6.75C11.0745 6.75 10.1712 6.98772 9.31694 7.37228L8.1942 6.24954C9.34544 5.65475 10.6307 5.25 12 5.25C14.7742 5.25 17.2031 6.91121 18.8721 8.44832C19.72 9.22922 20.4038 10.0078 20.8757 10.5906C21.112 10.8825 21.2964 11.1268 21.4227 11.2997C21.4859 11.3862 21.5347 11.4549 21.5682 11.5029C21.585 11.5269 21.598 11.5457 21.6071 11.559L21.6178 11.5747L21.621 11.5794L21.622 11.5809L21.9035 12L21.6224 12.4186L21.621 12.4206L21.6178 12.4253L21.6071 12.441C21.598 12.4543 21.585 12.4731 21.5682 12.4971C21.5347 12.5451 21.4859 12.6138 21.4227 12.7003C21.2964 12.8732 21.112 13.1175 20.8757 13.4094C20.4038 13.9922 19.72 14.7708 18.8721 15.5517C18.6412 15.7644 18.3957 15.9794 18.1368 16.1921L17.0705 15.1258Z" fill="#000000"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M18.75 19.8107L3.75 4.81066L4.81066 3.75L19.8107 18.75L18.75 19.8107Z" fill="#000000"></path> </g></svg>
            <svg
              width="34px"
              height="34px"
              viewBox="0 0 50 50"
              @click.stop="deleteInteractionLayer(interaction.id)"
            >
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
              @click.stop="actionStore.toggleActionContainerVisibility(interaction.id)"
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
            <input
              type="color"
              :value="interaction.color"
              @change="handleColorChange(interaction.id, $event)"
            />
          </div>
        </li>
      </ul>
      <button
        class="add-layer-btn"
        v-if="jsonStore.jsonData"
        @click="jsonStore.addNewInteractionLayer()"
      >
        + Add Interaction
      </button>
      <div class="delete-history" v-if="showHistory">
        <div class="header">
          <p>
            {{ currentStateDeletedItems.length >= 1 ? 'Deleted Items' : 'No items to restore' }}
          </p>
          <svg
            fill="#000000"
            width="22px"
            height="22px"
            viewBox="0 0 32 32"
            version="1.1"
            @click="toggleHistory"
          >
            <path
              d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14 6.28 14 14-6.28 14.032-14 14.032zM21.657 10.344c-0.39-0.39-1.023-0.39-1.414 0l-4.242 4.242-4.242-4.242c-0.39-0.39-1.024-0.39-1.415 0s-0.39 1.024 0 1.414l4.242 4.242-4.242 4.242c-0.39 0.39-0.39 1.024 0 1.414s1.024 0.39 1.415 0l4.242-4.242 4.242 4.242c0.39 0.39 1.023 0.39 1.414 0s0.39-1.024 0-1.414l-4.242-4.242 4.242-4.242c0.391-0.391 0.391-1.024 0-1.414z"
            ></path>
          </svg>
        </div>

        <ul>
          <li v-for="item in currentStateDeletedItems" :key="item.id">
            {{ item.shapeData?.name || item.interactionData?.meta?.name || item.id }}
            <div class="interaction-actions">
              <svg
                width="30px"
                height="30px"
                viewBox="0 0 40 40"
                @click.stop="restoreInteractionLayer(item.id)"
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
    </section>
    <section class="info-layer">
      <p>Info Layer</p>
      <div v-if="jsonStore.currentInfolayer && jsonStore.currentInfolayer.length">
        <ul>
          <li
            v-for="(infoItem, index) in jsonStore.currentInfolayer"
            :key="index"
            :class="{
              active: infoItem.name === jsonStore.selectedInfolayerId,
              editing: editingInfoLayerId === infoItem.id,
            }"
            @click="editingInfoLayerId !== infoItem.id && handleInfoLayerChange(infoItem.name)"
            @dblclick="
              editingInfoLayerId !== infoItem.id &&
              startEditingInfoLayer(infoItem.id, infoItem.name)
            "
          >
            <input
              v-if="editingInfoLayerId === infoItem.id"
              v-model="editingInfoLayerName"
              type="text"
              class="rename-input"
              @blur="finishEditingInfoLayer(infoItem.id)"
              @keydown.enter="finishEditingInfoLayer(infoItem.id)"
              @keydown.esc="cancelEditingInfoLayer"
              @click.stop
              @dblclick.stop
            />
            <span v-else class="interaction-name" :title="infoItem.name">{{ infoItem.name }}</span>
          </li>
        </ul>
      </div>
    </section>
  </aside>
</template>

<style scoped>
aside {
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  padding: 10px;
}

p {
  background-color: #ccc;
  text-align: center;
  font-size: 18px;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.header {
  position: relative;
  background-color: #ccc;
  text-align: center; /* Centers the p tag */
  padding: 4px 4px;
}
.header svg {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}
li {
  cursor: pointer;
  padding: 4px 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  position: relative; /* For absolute positioning of drop indicator */

  &:hover {
    background-color: #d0d0d0;
  }

  /* Active state styling */
  &.active {
    background-color: #007acc;
    color: white;
    font-weight: bold;
  }

  &.active:hover {
    background-color: #005999;
  }

  /* Drop indicator lines using pseudo-elements (no layout shift) */
  &.drop-before::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #007acc;
    border-radius: 2px;
    z-index: 10;
    pointer-events: none;
  }

  &.drop-after::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #007acc;
    border-radius: 2px;
    z-index: 10;
    pointer-events: none;
  }
}
.open-actions-icon {
  width: 24px;
  height: 24px;
  vertical-align: middle;
}

.interactions li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.interaction-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  margin-right: 8px;
}
.add-layer-btn {
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 4px;
}
.add-layer-btn:hover {
  background-color: #005999;
}
/* Disable pointer events on children only during active drag */
.interactions ul.dragging li * {
  pointer-events: none;
}

.interaction-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.interactions {
  position: relative;
}

.rename-input {
  width: 70%;
  padding: 2px 4px;
  border: 1px solid #007acc;
  border-radius: 2px;
  background-color: white;
  font-size: inherit;
  outline: none;
}

li.editing {
  padding: 2px 4px;
}
.delete-history {
  background-color: #e0e0e0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.delete-history li {
  cursor: default;
}
.delete-history li svg {
  cursor: pointer;
}
</style>
