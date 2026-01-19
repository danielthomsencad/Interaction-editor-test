<script setup>
import { ref } from 'vue'
import { useTransformStore, useJsonStore, useHistoryStore } from '@/stores/store'

const viewContainer = ref(null)
const transformStore = useTransformStore()
const jsonStore = useJsonStore()
const historyStore = useHistoryStore()
const ZOOM_STEP = 0.1 // 10% increments
const MIN_ZOOM = 0.15 // 15% minimum
const MAX_ZOOM = 2.5 // 250% maximum
const DEFAULT_ZOOM = 1.0

const isSpacePressed = ref(false)
const isCtrlPressed = ref(false)
const isPanning = ref(false) // Currently dragging?
const dragStartX = ref(0) // Mouse position when drag started
const dragStartY = ref(0)
const initialPanX = ref(0) // Pan position when drag started
const initialPanY = ref(0)
const activeMovementModifier = ref(null) // Track first-pressed modifier: 'ctrl' | 'shift' | null

const clampPanToBounds = (panX, panY) => {
  // Get ViewContainer dimensions
  if (!viewContainer.value) return { x: panX, y: panY }

  const rect = viewContainer.value.getBoundingClientRect()
  const containerWidth = rect.width
  const containerHeight = rect.height

  // If no content dimensions available yet, use generous boundaries
  if (!transformStore.contentWidth || !transformStore.contentHeight) {
    const maxPanX = containerWidth * 2
    const maxPanY = containerHeight * 2
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panY)),
    }
  }

  // Boundary calculation: ensure at least some % of image remains visible
  // More zoom = more freedom (smaller visible percentage required)
  const zoomFactor = transformStore.zoomLevel
  const scaledImageWidth = transformStore.contentWidth * zoomFactor
  const scaledImageHeight = transformStore.contentHeight * zoomFactor

  // Progressive visible requirement: more zoom = less needs to stay visible
  // At 1x zoom: 10% must stay visible
  // At 2x zoom: 5% must stay visible
  // At 3x zoom: 2.5% must stay visible (97.5% can go offscreen!)
  const baseVisibleRatio = 0.1
  const zoomBonus = Math.min(0.075, (zoomFactor - 1) * 0.05) // Max 7.5% bonus
  const minVisibleRatio = baseVisibleRatio - zoomBonus

  const minVisibleWidth = scaledImageWidth * minVisibleRatio
  const minVisibleHeight = scaledImageHeight * minVisibleRatio

  // Calculate boundaries based on keeping minimum visible
  // Can pan right until only minimum % is visible on the left side
  const minX = -scaledImageWidth + minVisibleWidth

  // Can pan left until only minimum % is visible on the right side
  const maxX = containerWidth - minVisibleWidth

  // Can pan up (negative direction) until only minimum % is visible at the bottom
  const minY = -scaledImageHeight + minVisibleHeight

  // Can pan down (positive direction) until only minimum % is visible at the top
  const maxY = containerHeight - minVisibleHeight

  // Apply boundaries with soft resistance instead of hard snapping
  let clampedX = panX
  let clampedY = panY

  // Only apply boundaries when actually exceeding them
  if (panX < minX) clampedX = minX
  if (panX > maxX) clampedX = maxX
  if (panY < minY) clampedY = minY
  if (panY > maxY) clampedY = maxY
  return {
    x: clampedX,
    y: clampedY,
  }
}

const activateListener = () => {
  viewContainer.value?.addEventListener('keydown', handleKeyDown)
  viewContainer.value?.addEventListener('keyup', handleKeyUp)
  viewContainer.value?.addEventListener('wheel', handleMouseWheel)
  viewContainer.value?.addEventListener('mousedown', handleMouseDown)
  viewContainer.value?.addEventListener('mouseup', handleMouseUp)
  viewContainer.value?.addEventListener('mousemove', handleMouseMove)
}

const deactivateListener = () => {
  viewContainer.value?.removeEventListener('keydown', handleKeyDown)
  viewContainer.value?.removeEventListener('keyup', handleKeyUp)
  viewContainer.value?.removeEventListener('wheel', handleMouseWheel)
  viewContainer.value?.removeEventListener('mousedown', handleMouseDown)
  viewContainer.value?.removeEventListener('mouseup', handleMouseUp)
  viewContainer.value?.removeEventListener('mousemove', handleMouseMove)
}
const handleKeyDown = (event) => {
  // Track Ctrl key for movement modifier priority
  if (event.ctrlKey && !isCtrlPressed.value) {
    isCtrlPressed.value = true
    // Set as active movement modifier if none is set
    if (activeMovementModifier.value === null) {
      activeMovementModifier.value = 'ctrl'
    }
    updateCursor()
  }

  // Track Shift key for movement modifier priority
  if (event.shiftKey && activeMovementModifier.value === null) {
    activeMovementModifier.value = 'shift'
  }

  if (event.ctrlKey) {
    switch (event.key) {
      case '+':
      case '=': // Some keyboards use '=' for '+'
        transformStore.zoomLevel = Math.min(transformStore.zoomLevel + ZOOM_STEP, MAX_ZOOM)
        event.preventDefault()
        break
      case '-':
        transformStore.zoomLevel = Math.max(transformStore.zoomLevel - ZOOM_STEP, MIN_ZOOM)
        event.preventDefault()
        break
      case '0':
        transformStore.zoomLevel = DEFAULT_ZOOM
        event.preventDefault()
        break
      case 'z':
        historyStore.restoreShape() 
        event.preventDefault()
        break
    }

  } else if (event.key === ' ') {
    isSpacePressed.value = true
    updateCursor()
    event.preventDefault() // Prevent page scroll
  }
  
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    if (event.repeat) return
    console.log('Arrow key pressed in ViewContainer:', event.key)

    // Determine move amount based on first-pressed modifier
    let moveAmount = 1 // Default
    if (activeMovementModifier.value === 'ctrl') {
      moveAmount = 10
    } else if (activeMovementModifier.value === 'shift') {
      moveAmount = 100
    }

    let dy = 0
    let dx = 0

    switch (event.key) {
      case 'ArrowUp':
        dy = -moveAmount
        break
      case 'ArrowDown':
        dy = moveAmount
        break
      case 'ArrowLeft':
        dx = -moveAmount
        break
      case 'ArrowRight':
        dx = moveAmount
        break
    }
    jsonStore.moveSelectedElements(dy, dx)
    event.preventDefault() // Prevent page scroll
  }
  if (event.key === 'Delete') {
    // Clear active movement modifier on Escape
    console.log('Delete key pressed in ViewContainer')
    historyStore.deleteShape()

  }
}
const handleMouseMove = (event) => {
  if (isPanning.value) {
    // Calculate how far mouse has moved since drag
    const deltaX = event.clientX - dragStartX.value
    const deltaY = event.clientY - dragStartY.value

    // Calculate new pan position - NO boundary clamping during drag
    const newPanX = initialPanX.value + deltaX
    const newPanY = initialPanY.value + deltaY

    // Update pan position directly without boundaries during drag
    transformStore.panX = newPanX
    transformStore.panY = newPanY
  }
}
const handleKeyUp = (event) => {
  if (event.key === ' ') {
    isSpacePressed.value = false
    updateCursor()
  } else if (event.key === 'Control') {
    isCtrlPressed.value = false
    // Clear active movement modifier if Ctrl was the active one
    if (activeMovementModifier.value === 'ctrl') {
      activeMovementModifier.value = null
    }
    updateCursor()
  } else if (event.key === 'Shift') {
    // Clear active movement modifier if Shift was the active one
    if (activeMovementModifier.value === 'shift') {
      activeMovementModifier.value = null
    }
  }
}

const updateCursor = () => {
  if (!viewContainer.value) return

  if (isPanning.value) {
    viewContainer.value.style.cursor = 'grabbing'
  } else if (isCtrlPressed.value) {
    viewContainer.value.style.cursor = 'zoom-in'
  } else if (isSpacePressed.value) {
    viewContainer.value.style.cursor = 'grab'
  } else {
    viewContainer.value.style.cursor = 'default'
  }
}
const handleMouseDown = (event) => {
  if (isSpacePressed.value && event.button === 0) {
    event.preventDefault()
    event.stopPropagation()
    // Start panning!
    isPanning.value = true
    // Record starting positions
    dragStartX.value = event.clientX
    dragStartY.value = event.clientY
    initialPanX.value = transformStore.panX
    initialPanY.value = transformStore.panY
    // Update cursor
    updateCursor()
  }
}
const handleMouseUp = () => {
  if (isPanning.value) {
    // Apply boundaries when drag ends
    const boundedPan = clampPanToBounds(transformStore.panX, transformStore.panY)
    transformStore.panX = boundedPan.x
    transformStore.panY = boundedPan.y

    // End panning
    isPanning.value = false
    updateCursor()
  }
}
const handleMouseWheel = (event) => {
  if (event.ctrlKey) {
    event.preventDefault()
    const delta = Math.sign(event.deltaY)

    // Get mouse position relative to container
    const rect = viewContainer.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Calculate new zoom level
    const oldZoom = transformStore.zoomLevel
    let newZoom
    if (delta < 0) {
      newZoom = Math.min(oldZoom + ZOOM_STEP, MAX_ZOOM)
    } else {
      newZoom = Math.max(oldZoom - ZOOM_STEP, MIN_ZOOM)
    }

    // Calculate what point in the content the mouse is currently over
    const contentPointX = (mouseX - transformStore.panX) / oldZoom
    const contentPointY = (mouseY - transformStore.panY) / oldZoom

    // After zoom, keep that same content point under the mouse
    const newPanX = mouseX - contentPointX * newZoom
    const newPanY = mouseY - contentPointY * newZoom

    // Apply boundary constraints to zoom-adjusted pan
    const boundedPan = clampPanToBounds(newPanX, newPanY)

    transformStore.panX = boundedPan.x
    transformStore.panY = boundedPan.y
    transformStore.zoomLevel = newZoom
  }
}

const onMouseEnter = () => {
  viewContainer.value?.focus()
}

const onMouseLeave = () => {
  viewContainer.value?.blur()
}
</script>
<template>
  <div
    class="view-container"
    tabindex="0"
    @focus="activateListener"
    @blur="deactivateListener"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    ref="viewContainer"
  >
    <slot />
  </div>
</template>
<style scoped>
.view-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
