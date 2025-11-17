<script setup>
import { ref } from 'vue'
import { useTransformStore } from '@/stores/store'

const viewContainer = ref(null)
const transformStore = useTransformStore()

const ZOOM_STEP = 0.1 // 10% increments
const MIN_ZOOM = 0.5 // 50% minimum
const MAX_ZOOM = 3.0 // 300 % maximum
const DEFAULT_ZOOM = 1.0

const isSpacePressed = ref(false)
const isPanning = ref(false) // Currently dragging?
const dragStartX = ref(0) // Mouse position when drag started
const dragStartY = ref(0)
const initialPanX = ref(0) // Pan position when drag started
const initialPanY = ref(0)

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

  // Boundary calculation that gives more freedom at higher zoom levels
  const zoomFactor = transformStore.zoomLevel
  const scaledImageWidth = transformStore.contentWidth * zoomFactor
  const scaledImageHeight = transformStore.contentHeight * zoomFactor

  // Progressive offscreen allowance: more zoom = more freedom
  // At 1x zoom: 75% can go offscreen
  // At 2x zoom: 87.5% can go offscreen
  // At 3x zoom: 91.7% can go offscreen
  // At 5x zoom: 95% can go offscreen
  const baseAllowance = 0.75
  const zoomBonus = Math.min(0.2, (zoomFactor - 1) * 0.1) // Cap bonus at 20%
  const offscreenRatio = baseAllowance + zoomBonus

  const allowedOffscreenX = scaledImageWidth * offscreenRatio
  const allowedOffscreenY = scaledImageHeight * offscreenRatio

  // Calculate boundaries
  // Minimum pan: image can move left/up with progressive offscreen allowance
  const minX = -allowedOffscreenX
  const minY = -allowedOffscreenY

  // Maximum pan: image can move right/down with progressive offscreen allowance
  const maxX = containerWidth - scaledImageWidth + allowedOffscreenX
  const maxY = containerHeight - scaledImageHeight + allowedOffscreenY

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
    }
  } else if (event.key === ' ') {
    isSpacePressed.value = true
    //enter pan mode
    viewContainer.value.style.cursor = 'grab'
    event.preventDefault() // Prevent page scroll
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
    viewContainer.value.style.cursor = 'default'
    //exit pan mode
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
    // Change cursor to "grabbing"
    viewContainer.value.style.cursor = 'grabbing'
  }
}
const handleMouseUp = () => {
  if (isPanning.value) {
    // Apply boundaries when drag ends
    const boundedPan = clampPanToBounds(transformStore.panX, transformStore.panY)
    transformStore.panX = boundedPan.x
    transformStore.panY = boundedPan.y

    // End panning
    viewContainer.value.style.cursor = isSpacePressed.value ? 'grab' : 'default'
    isPanning.value = false
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
