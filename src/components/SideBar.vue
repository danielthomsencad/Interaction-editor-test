<script setup>
import { useJsonStore, useActionStore } from '@/stores/store'
import { computed, ref, watch } from 'vue'

const jsonStore = useJsonStore()
const actionStore = useActionStore()
const draggedId = ref(null)
const dropTargetId = ref(null)
const dropPosition = ref(null) // 'before' or 'after'

// Local state to maintain sidebar display order
const sidebarOrder = ref([])

// Watch for changes in interactions and initialize/update order
watch(
  () => jsonStore.currentInteractionShapes,
  (shapes) => {
    if (!shapes || shapes.length === 0) return
    
    // Initialize from shapes array to keep order in sync
    const shapeIds = shapes.map(s => s.id)
    
    if (sidebarOrder.value.length === 0) {
      // First time: use shape order, then add any interactions without shapes
      const interactionIds = Object.keys(jsonStore.currentInteractions)
      const idsWithoutShapes = interactionIds.filter(id => !shapeIds.includes(id))
      sidebarOrder.value = [...shapeIds, ...idsWithoutShapes]
    } else {
      // Update: add new IDs, remove deleted ones, but preserve custom order
      const allCurrentIds = Object.keys(jsonStore.currentInteractions)
      
      // Add new IDs
      const newIds = allCurrentIds.filter(id => !sidebarOrder.value.includes(id))
      if (newIds.length > 0) {
        sidebarOrder.value.push(...newIds)
      }
      
      // Remove IDs that no longer exist
      sidebarOrder.value = sidebarOrder.value.filter(id => allCurrentIds.includes(id))
    }
  },
  { immediate: true }
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
    .map(id => interactions.find(i => i.id === id))
    .filter(i => i !== undefined)
})

const handleColorChange = (shapeId, event) => {
  const newColor = event.target.value
  jsonStore.updateShapeColor(shapeId, newColor)
}

const handleDragStart = (interactionId, event) => {
  draggedId.value = interactionId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', interactionId)
}

const handleDragOver = (interactionId, event) => {
  event.preventDefault()  // CRITICAL: allows drop
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

const handleDragLeave = () => {
  // Clear drop indicator when leaving an item
  dropTargetId.value = null
  dropPosition.value = null
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
    
    // Calculate new insert position (account for the removed item)
    const adjustedToIndex = fromSidebarIndex < toSidebarIndex ? toSidebarIndex - 1 : toSidebarIndex
    
    // Insert at new position
    sidebarOrder.value.splice(adjustedToIndex, 0, movedId)
  }
  
  // Also reorder in shapes array if both have shapes
  const fromShapeIndex = jsonStore.currentInteractionShapes.findIndex(s => s.id === draggedId.value)
  const toShapeIndex = jsonStore.currentInteractionShapes.findIndex(s => s.id === targetId)
  
  if (fromShapeIndex !== -1 && toShapeIndex !== -1) {
    jsonStore.reorderInteractionShapes(fromShapeIndex, toShapeIndex)
  }
  
  draggedId.value = null
  dropTargetId.value = null
  dropPosition.value = null
}


</script>

<template>
  <aside>
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
    <section class="interactions">
      <p>Interactions</p>
      <ul>
        <li
          v-for="interaction in allInteractions"
          :key="interaction.id"
          :class="{ 
            active: interaction.id === jsonStore.selectedShapeId, 
            'no-shape': !interaction.shape,
            'drop-before': dropTargetId === interaction.id && dropPosition === 'before',
            'drop-after': dropTargetId === interaction.id && dropPosition === 'after'
          }"
          @click="jsonStore.setInteractionShapeById(interaction.id)"
          draggable="true"
          @dragstart="handleDragStart(interaction.id, $event)"
          @dragover="handleDragOver(interaction.id, $event)"
          @dragleave="handleDragLeave"
          @drop="handleDrop(interaction.id, $event)"
        >
          {{ interaction.name }}
          <div class="interaction-actions">
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
           <input type="color" 
       :value="interaction.color" 
       @change="handleColorChange(interaction.id, $event)" />
          </div>
        </li>
      </ul>
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
  border-radius: 4px;
}
li {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 2px;
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
    top: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background-color: #007acc;
    border-radius: 2px;
    z-index: 10;
  }
  
  &.drop-after::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background-color: #007acc;
    border-radius: 2px;
    z-index: 10;
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
.interaction-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
