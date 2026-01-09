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

// Local state to maintain sidebar display order
const sidebarOrder = ref([])

// Watch for changes in interactions and initialize/update order
watch(
  () => jsonStore.currentInteractionShapes,
  (shapes) => {
    if (!shapes || shapes.length === 0) return

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
  { immediate: true },
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
const deleteShape = async (shapeId) => {
  const interaction = allInteractions.value.find((i) => i.id === shapeId)
  const name = interaction?.name || shapeId

  const confirmed = await window.api.showConfirmDialog({
    message: `Delete "${name}"?`,
    detail: 'You can restore it from the history panel.',
  })

  if (!confirmed) return

  historyStore.deleteShape(shapeId)
  const itemTodeleteIndex = sidebarOrder.value.indexOf(shapeId)
  if (itemTodeleteIndex !== -1) {
    sidebarOrder.value.splice(itemTodeleteIndex, 1)
  }
  console.log('deleted items from sidebar:', historyStore.deleteShapeHistory)
}
const restoreShape = (shapeId) => {
  console.log('restore shape called', shapeId)
  historyStore.restoreShape(shapeId)
  // Re-add to sidebar order at the end
  if (!sidebarOrder.value.includes(shapeId)) {
    sidebarOrder.value.push(shapeId)
  }
  if (!showHistory.value && autoCloseTimeout.value) {
    clearTimeout(autoCloseTimeout.value)
    autoCloseTimeout.value = null
  }

  if (showHistory.value && historyStore.deleteShapeHistory.length === 0) {
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

  if (showHistory.value && historyStore.deleteShapeHistory.length === 0) {
    autoCloseTimeout.value = setTimeout(() => {
      showHistory.value = false
      autoCloseTimeout.value = null
    }, 3000)
  }
}

const handleColorChange = (shapeId, event) => {
  const newColor = event.target.value
  jsonStore.updateShapeColor(shapeId, newColor)
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
          :class="{ active: index === jsonStore.currentStateIndex }"
          @click="jsonStore.setCurrentState(index)"
        >
          {{ state.name }}
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
          }"
          @click="jsonStore.setInteractionShapeById(interaction.id)"
          draggable="true"
          @dragstart="handleDragStart(interaction.id, $event)"
          @dragover="handleDragOver(interaction.id, $event)"
          @dragend="handleDragEnd"
          @drop="handleDrop(interaction.id, $event)"
        >
          {{ interaction.name }}
          <div class="interaction-actions">
            <svg
              width="34px"
              height="34px"
              viewBox="0 0 50 50"
              @click.stop="deleteShape(interaction.id)"
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
      <div class="delete-history" v-if="showHistory">
        <div class="header">
          <p>
            {{
              historyStore.deleteShapeHistory.length >= 1 ? 'Deleted Items' : 'No items to restore'
            }}
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
          <li v-for="item in historyStore.deleteShapeHistory" :key="item.id">
            {{ item.shapeData?.name || item.interactionData?.meta?.name || item.id }}
            <div class="interaction-actions">
              <svg
                width="30px"
                height="30px"
                viewBox="0 0 40 40"
                @click.stop="restoreShape(item.id)"
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
            :class="{ active: infoItem.name === jsonStore.selectedInfolayerId }"
            @click="jsonStore.setCurrentInfolayer(infoItem.name)"
          >
            {{ infoItem.name }}
          </li>
        </ul>
      </div>
    </section>
  </aside>
</template>

<style scoped>
aside {
  width: 300px;
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
