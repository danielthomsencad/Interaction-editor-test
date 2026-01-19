<script setup>
import { ref, onMounted, onUnmounted, watchEffect, watch, computed } from 'vue'
import { useJsonStore, useTransformStore } from '@/stores/store'
import {
  isPointInPolygon,
  isPointInBoundingBox,
  isPolygonIntersectingRectangle,
} from '@/composables/useGeometry'
import bitmapFontConfig from '@/styles/bitmapfonts/vestas/config.json'
import fontImageUrl from '@/styles/bitmapfonts/vestas/font.gif'

const props = defineProps({
  canvasId: {
    type: String,
    required: true,
  },
})
const jsonStore = useJsonStore()
const transformStore = useTransformStore()

const fontImage = new Image()
fontImage.src = fontImageUrl

// Image cache to prevent reloading images on every render
const imageCache = new Map()

const isInfoLayerMode = computed(() => transformStore.grayscale)
const canvas = ref(null)
const infoLayerCanvas = ref(null)

let ctx = null
let infoLayerCtx = null
let lastClickTime = 0
let lastClickedShape = null
const DOUBLE_CLICK_DELAY = 300 // ms
let lastMouseMoveTime = 0
const MOUSE_MOVE_THROTTLE = 16 // ms (~60fps)

// Drag selection state
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragEnd = ref({ x: 0, y: 0 })
const dragOccurred = ref(false)

// Space and Ctrl key state for cursor management
const isSpacePressed = ref(false)
const isCtrlPressed = ref(false)

onMounted(() => {
  canvas.value = document.getElementById(props.canvasId)
  infoLayerCanvas.value = document.getElementById(props.canvasId + '-infoLayer')
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    console.log('Canvas context initialized:', !!ctx)
    // Try to render if we already have shapes
    if (jsonStore.currentInteractionShapes?.length > 0) {
      console.log('Rendering existing shapes after canvas mount')
      renderShapes()
    }
  }
  if (infoLayerCanvas.value) {
    infoLayerCtx = infoLayerCanvas.value.getContext('2d')
    console.log('Info layer canvas context initialized:', !!infoLayerCtx)
    // Try to render info layer if we already have data
    console.log('Info layer mode:', jsonStore.currentInfolayer, transformStore.grayscale)
    if (jsonStore.currentInfolayer?.length > 0) {
      console.log('Rendering existing infolayer after canvas mount')
      renderInfoLayer()
    }
  }
  // Add global mouseup listener to handle drag end outside canvas
  document.addEventListener('mouseup', handleGlobalMouseUp)

  // Add space key listeners for grab cursor
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
})

const handleGlobalMouseUp = () => {
  if (isDragging.value) {
    handleMouseUp()
  }
}

const handleKeyDown = (event) => {
  // Don't intercept space if user is typing in an input or textarea
  if (event.code === 'Space' && !event.repeat) {
    const activeElement = document.activeElement
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return // Let the input handle the space key
    }
    event.preventDefault() // Prevent page scroll
    isSpacePressed.value = true
    updateCursor()
  } else if (event.ctrlKey && !isCtrlPressed.value) {
    console.log('Ctrl key pressed')
    isCtrlPressed.value = true
    updateCursor()
  }
}

const handleKeyUp = (event) => {
  if (event.code === 'Space') {
    isSpacePressed.value = false
    updateCursor()
  } else if (event.key === 'Control') {
    isCtrlPressed.value = false
    updateCursor()
  }
}

const updateCursor = () => {
  if (!canvas.value) return

  // Priority order: Ctrl (zoom) > Space (grab) > normal behavior
  if (isCtrlPressed.value) {
    canvas.value.style.cursor = 'zoom-in'
    return
  }

  if (isSpacePressed.value) {
    canvas.value.style.cursor = 'grab'
    return
  }

  // When keys are released, immediately determine correct cursor based on current state
  if (!ctx || !jsonStore.currentInteractionShapes) {
    canvas.value.style.cursor = 'default'
    return
  }

  // Check if ViewContainer is in pan mode
  const viewContainer = canvas.value?.closest('.view-container')
  if (
    viewContainer &&
    (viewContainer.style.cursor === 'grab' || viewContainer.style.cursor === 'grabbing')
  ) {
    return
  }

  // Default to normal cursor - will be updated on next mouse movement
  canvas.value.style.cursor = 'default'
}

const drawPolygon = (shape, isLayerSelected = false, isIndividualSelected = false) => {
  if (!ctx || !shape.elements) return

  shape.elements.forEach((element) => {
    if (element.type === 'Polygon' && element.vertices) {
      ctx.beginPath()
      // Move to first vertex
      const firstVertex = element.vertices[0]
      ctx.moveTo(element.x + firstVertex.x, element.y + firstVertex.y)

      // Draw lines to all other vertices
      for (let i = 1; i < element.vertices.length; i++) {
        const vertex = element.vertices[i]
        ctx.lineTo(element.x + vertex.x, element.y + vertex.y)
      }

      ctx.closePath()

      // Check if this specific element is individually selected
      const isThisElementSelected =
        isIndividualSelected &&
        jsonStore.selectedElementCoords &&
        jsonStore.selectedElementCoords.x === element.x &&
        jsonStore.selectedElementCoords.y === element.y

      if (
        isThisElementSelected ||
        jsonStore.selectedElementCoordsArray.some(
          (coord) => coord.x === element.x && coord.y === element.y,
        )
      ) {
        // Individual element selected: red border
        ctx.fillStyle = shape.color + '80'
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 2
      } else if (isLayerSelected) {
        // Layer selected: white border
        ctx.fillStyle = shape.color + '80'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
      } else {
        // Normal state: full opacity, shape color border
        ctx.fillStyle = shape.color
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 1
      }
      ctx.fill()
      ctx.stroke()
    }
  })

  // Draw anchors for all shapes
  if (Array.isArray(shape.anchors)) {
    shape.anchors.forEach((anchor) => {
      drawAnchorPoint(ctx, anchor.x, anchor.y, isIndividualSelected)
    })
  }
}

const drawAnchorPoint = (ctx, x, y, state = false) => {
  const gap = 2
  const size = 5
  const lineWidth = 1

  ctx.beginPath()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = state ? '#00ff00' : '#000000'

  // Top
  ctx.moveTo(x, y - gap)
  ctx.lineTo(x, y - gap - size)
  // Right
  ctx.moveTo(x + gap, y)
  ctx.lineTo(x + gap + size, y)
  // Bottom
  ctx.moveTo(x, y + gap)
  ctx.lineTo(x, y + gap + size)
  // Left
  ctx.moveTo(x - gap, y)
  ctx.lineTo(x - gap - size, y)

  ctx.stroke()
  ctx.closePath()
}

const drawText = (element) => {
  infoLayerCtx.save()
  infoLayerCtx.translate(element.x, element.y)
  // infoLayerCtx.rotate(element.rotation || 0)
  infoLayerCtx.scale(element.scaleX || 1, element.scaleY || 1)
  infoLayerCtx.font = element.font || '8px Arial'
  infoLayerCtx.fillStyle = element.color || 'white'
  const lines = (element.text || '').split('\n')
  const lineHeight = 8
  lines.forEach((line, i) => {
    // ctx.fillText(line, 0, i * lineHeight)
    drawBitmapText(infoLayerCtx, line, 0, i * lineHeight, fontImage)
  })
  infoLayerCtx.restore()
}

function drawBitmapText(ctx, text, x, y) {
  let cursorX = x
  let cursorY = y
  const atlas = bitmapFontConfig.atlas
  const charMap = Object.fromEntries(atlas.character.map((c) => [c.id, c]))

  for (const line of text.split('\n')) {
    for (const char of line) {
      const charInfo = charMap[char] || charMap[' '] // fallback to space
      const sx = charInfo.col * atlas.cellWidth
      const sy = charInfo.row * atlas.cellHeight
      infoLayerCtx.drawImage(
        fontImage,
        sx,
        sy,
        atlas.cellWidth,
        atlas.cellHeight,
        cursorX,
        cursorY,
        atlas.cellWidth,
        atlas.cellHeight,
      )
      cursorX +=
        charInfo.letterSpacing !== undefined ? charInfo.letterSpacing : atlas.letterSpacing || 0
    }
    cursorX = x
    cursorY += atlas.cellHeight + atlas.lineHeight
  }
}
const drawImage = (img, x, y) => {
  if (!infoLayerCtx) return
  infoLayerCtx.drawImage(img, x, y, img.naturalWidth, img.naturalHeight)
}
const renderShapes = () => {
  if (!ctx || !jsonStore.currentInteractionShapes) return

  // Only clear and redraw if needed
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  console.log('is infomode selected', isInfoLayerMode.value)
  jsonStore.currentInteractionShapes.forEach((shape) => {
    const isLayerSelected = jsonStore.selectedShapeId === shape.id
    const isIndividualSelected = jsonStore.selectedIndividualShapeId === shape.id
    if (isInfoLayerMode.value) {
      return // Don't draw anything
    }
    drawPolygon(shape, isLayerSelected, isIndividualSelected)
  })
}

const renderInfoLayer = () => {
  if (!infoLayerCtx || !jsonStore.currentInfolayer) return

  infoLayerCtx.clearRect(0, 0, infoLayerCanvas.value.width, infoLayerCanvas.value.height)

  const infoLayerHasText =
    Array.isArray(jsonStore.currentInfolayer) &&
    jsonStore.currentInfolayer.length > 0 &&
    Array.isArray(jsonStore.currentInfolayer[0]?.elements) &&
    jsonStore.currentInfolayer[0].elements.length > 0

  if (transformStore.grayscale || jsonStore.selectedInfolayerId) {
    if (infoLayerHasText) {
      jsonStore.currentInfolayer[0].elements.forEach((element) => {
        if (element.type === 'Text') {
          drawText(element)
        } else if (element.type === 'ImageObject' && element.image) {
          const imagePath = `data/${element.image}`

          // Check cache first
          if (imageCache.has(imagePath)) {
            const cachedImg = imageCache.get(imagePath)
            drawImage(cachedImg, element.x, element.y)
          } else {
            // Load and cache the image
            const img = new Image()
            img.src = imagePath
            img.onload = () => {
              imageCache.set(imagePath, img)
              drawImage(img, element.x, element.y)
            }
          }
        }
      })
    }
  } else if (infoLayerHasText) {
    jsonStore.currentInfolayer[0].elements.forEach((element) => {
      if (element.type === 'Text') {
        drawText(element)
      } else if (element.type === 'ImageObject' && element.image) {
        const imagePath = `data/${element.image}`

        // Check cache first
        if (imageCache.has(imagePath)) {
          const cachedImg = imageCache.get(imagePath)
          drawImage(cachedImg, element.x, element.y)
        } else {
          // Load and cache the image
          const img = new Image()
          img.src = imagePath
          img.onload = () => {
            imageCache.set(imagePath, img)
            drawImage(img, element.x, element.y)
          }
        }
      }
    })
  }
}

const handleCanvasClick = (event) => {
  if (!ctx || !jsonStore.currentInteractionShapes) return

  // Don't process click if we just finished dragging
  if (dragOccurred.value) {
    dragOccurred.value = false // Reset for next interaction
    return
  }

  // Don't select shapes if any modifier keys or space key are pressed
  if (
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.metaKey ||
    isSpacePressed.value ||
    isCtrlPressed.value
  ) {
    return
  }

  // Don't select if space is being used for panning
  // Check if parent ViewContainer is in space-pressed mode
  const viewContainer = canvas.value?.closest('.view-container')
  if (viewContainer && viewContainer.style.cursor === 'grab') {
    return
  }
  // Don't select shapes if in infolayer grayscale mode
  if (jsonStore.selectedInfolayerId && transformStore.grayscale) {
    return
  }
  const currentTime = Date.now()
  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Check shapes from top to bottom (reverse order)
  for (let i = jsonStore.currentInteractionShapes.length - 1; i >= 0; i--) {
    const shape = jsonStore.currentInteractionShapes[i]

    // Fast bounding box check for all elements in the shape
    let found = false
    let clickedElement = null
    for (const element of shape.elements) {
      if (element.type === 'Polygon' && element.vertices) {
        if (!isPointInBoundingBox(x, y, element)) continue // Fast skip
        if (isPointInPolygon(x, y, element)) {
          clickedElement = element
          found = true
          break
        }
      }
    }
    if (found) {
      // Check for double-click on the same shape
      const isDoubleClick =
        currentTime - lastClickTime < DOUBLE_CLICK_DELAY && lastClickedShape === shape.id

      if (isDoubleClick && clickedElement) {
        // Double-click: select individual element
        jsonStore.setIndividualElement(shape.id, { x: clickedElement.x, y: clickedElement.y })
        console.log(
          'Double-click: Individual element selected at:',
          clickedElement.x,
          clickedElement.y,
        )
      } else {
        // Single click: select layer (interaction)
        jsonStore.setCurrentInteraction(i)
        console.log('Single click: Layer selected:', shape.name)
      }

      lastClickTime = currentTime
      lastClickedShape = shape.id
      return
    }
  }

  // No shape clicked, clear all selections including sidebar active item
  jsonStore.clearCurrentInteraction()
  lastClickedShape = null
}

const handleMouseMove = (event) => {
  if (!ctx || !jsonStore.currentInteractionShapes || !canvas.value) return

  // Throttle mousemove updates for better performance
  const now = performance.now()
  const shouldUpdate = now - lastMouseMoveTime >= MOUSE_MOVE_THROTTLE

  // Check if we should start dragging (mouse moved far enough)
  if (!isDragging.value && dragStart.value.x !== 0) {
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.width / rect.width
    const scaleY = canvas.value.height / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    const deltaX = Math.abs(x - dragStart.value.x)
    const deltaY = Math.abs(y - dragStart.value.y)

    // Start dragging if mouse moved more than 5 pixels AND we have an active layer
    if ((deltaX > 5 || deltaY > 5) && jsonStore.selectedShapeId) {
      isDragging.value = true
      dragOccurred.value = true
      // Prevent click event from firing
      event.preventDefault()
    }
  }

  // Handle drag selection - just update position, no rendering needed (div overlay handles visuals)
  if (isDragging.value) {
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.width / rect.width
    const scaleY = canvas.value.height / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    dragEnd.value = { x, y }
    return
  }

  // Skip expensive cursor updates if throttled
  if (!shouldUpdate) return
  lastMouseMoveTime = now

  // Check modifier keys first - Ctrl takes priority, then Space
  if (isCtrlPressed.value) {
    canvas.value.style.cursor = 'zoom-in'
    return
  }

  if (isSpacePressed.value) {
    canvas.value.style.cursor = 'grab'
    return
  }

  // Don't change cursor if ViewContainer is in pan mode
  const viewContainer = canvas.value?.closest('.view-container')
  if (
    viewContainer &&
    (viewContainer.style.cursor === 'grab' || viewContainer.style.cursor === 'grabbing')
  ) {
    return
  }

  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Check if mouse is over any shape
  let overShape = false
  for (let i = jsonStore.currentInteractionShapes.length - 1; i >= 0; i--) {
    const shape = jsonStore.currentInteractionShapes[i]
    if (isPointInShape(x, y, shape)) {
      overShape = true
      break
    }
  }

  // Update cursor style
  canvas.value.style.cursor = overShape ? 'pointer' : 'default'
}

const handleMouseDown = (event) => {
  if (!ctx || !jsonStore.currentInteractionShapes) return

  // Don't start drag if modifier keys or space is pressed
  if (
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.metaKey ||
    isSpacePressed.value ||
    isCtrlPressed.value
  )
    return

  const viewContainer = canvas.value?.closest('.view-container')
  if (viewContainer && viewContainer.style.cursor === 'grab') return

  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Always track drag start for click detection, but only enable drag selection if we have an active layer
  dragStart.value = { x, y }
  dragEnd.value = { x, y }
  dragOccurred.value = false

  // Don't set isDragging yet - wait for actual mouse movement
}

const handleMouseUp = () => {
  if (!isDragging.value) {
    // Reset drag start position if no drag occurred
    dragStart.value = { x: 0, y: 0 }
    // Keep dragOccurred flag for click prevention
    return
  }

  isDragging.value = false

  // Calculate selection box bounds
  const minX = Math.min(dragStart.value.x, dragEnd.value.x)
  const maxX = Math.max(dragStart.value.x, dragEnd.value.x)
  const minY = Math.min(dragStart.value.y, dragEnd.value.y)
  const maxY = Math.max(dragStart.value.y, dragEnd.value.y)

  // Only check elements from the currently selected layer
  if (!jsonStore.selectedShapeId) {
    dragStart.value = { x: 0, y: 0 }
    return
  }

  const selectedElements = []

  // Find the active layer shape
  const activeLayerShape = jsonStore.currentInteractionShapes.find(
    (shape) => shape.id === jsonStore.selectedShapeId,
  )
  if (!activeLayerShape) {
    dragStart.value = { x: 0, y: 0 }
    return
  }

  // Check each element in the active layer
  activeLayerShape.elements.forEach((element) => {
    if (element.type === 'Polygon' && element.vertices) {
      // More precise selection: check if selection box intersects with actual polygon
      const isSelected = isPolygonIntersectingRectangle(element, minX, minY, maxX, maxY)

      if (isSelected) {
        selectedElements.push({ x: element.x, y: element.y })
      }
    }
  })
  console.log('Drag selection completed. Selected elements:', selectedElements)
  // Update store with selected element coordinates (same system as double-click)
  jsonStore.setMultipleElementCoords(selectedElements)

  // Reset drag state
  dragStart.value = { x: 0, y: 0 }
}

const isPointInShape = (x, y, shape) => {
  if (!shape.elements) return false

  return shape.elements.some((element) => {
    if (element.type === 'Polygon' && element.vertices) {
      return isPointInPolygon(x, y, element)
    }
    return false
  })
}

onUnmounted(() => {
  // Clean up global mouseup listener
  document.removeEventListener('mouseup', handleGlobalMouseUp)

  // Clean up space key listeners
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
})

// Precompute bounding boxes for all polygon elements when shapes are loaded/updated
let lastWidth = null
let lastHeight = null
watchEffect(() => {
  let needsRender = false
  let infoLayerNeedsRender = false

  // Precompute bounding boxes if shapes exist
  if (jsonStore.currentInteractionShapes) {
    jsonStore.currentInteractionShapes.forEach((shape) => {
      if (Array.isArray(shape.elements)) {
        shape.elements.forEach((element) => {
          if (element.type === 'Polygon' && element.vertices) {
            // Compute bounding box once and store on the element
            const absVertices = element.vertices.map((v) => ({
              x: element.x + v.x,
              y: element.y + v.y,
            }))
            const xs = absVertices.map((v) => v.x)
            const ys = absVertices.map((v) => v.y)
            const bbox = {
              minX: Math.min(...xs),
              maxX: Math.max(...xs),
              minY: Math.min(...ys),
              maxY: Math.max(...ys),
            }
            // Only update if changed
            if (
              !element.boundingBox ||
              element.boundingBox.minX !== bbox.minX ||
              element.boundingBox.maxX !== bbox.maxX ||
              element.boundingBox.minY !== bbox.minY ||
              element.boundingBox.maxY !== bbox.maxY
            ) {
              element.boundingBox = bbox
              needsRender = true
            }
          }
        })
      }
    })
  }
  // Set canvas size only if it actually changed
  if (canvas.value && transformStore.contentWidth && transformStore.contentHeight) {
    if (
      canvas.value.width !== transformStore.contentWidth ||
      canvas.value.height !== transformStore.contentHeight
    ) {
      canvas.value.width = transformStore.contentWidth
      canvas.value.height = transformStore.contentHeight
      lastWidth = transformStore.contentWidth
      lastHeight = transformStore.contentHeight
      console.log('Canvas size set:', lastWidth, 'x', lastHeight)
      needsRender = true
    }
  }

  if (infoLayerCanvas.value && transformStore.contentWidth && transformStore.contentHeight) {
    if (
      infoLayerCanvas.value.width !== transformStore.contentWidth ||
      infoLayerCanvas.value.height !== transformStore.contentHeight
    ) {
      infoLayerCanvas.value.width = transformStore.contentWidth
      infoLayerCanvas.value.height = transformStore.contentHeight
      lastWidth = transformStore.contentWidth
      lastHeight = transformStore.contentHeight
      console.log('infolayerCanvas size set:', lastWidth, 'x', lastHeight)
      infoLayerNeedsRender = true
    }
  }
  // Only render if needed and context is ready
  if ((needsRender || (jsonStore.currentInteractionShapes && ctx)) && ctx) {
    renderShapes()
  }
  if ((infoLayerNeedsRender || (jsonStore.currentInfolayer && infoLayerCtx)) && infoLayerCtx) {
    renderInfoLayer()
  }
})

watch(
  () => transformStore.grayscale,
  (isGrayscale) => {
    if (isGrayscale && canvas.value) {
      renderShapes()
    }
  },
)
</script>
<template>
  <canvas
    :id="canvasId"
    style="
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: auto;
      z-index: 10;
      user-select: none;
    "
    @click="handleCanvasClick"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
  />
  <canvas
    :id="canvasId + '-infoLayer'"
    style="
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 12;
      user-select: none;
    "
  />
  <!-- Drag selection overlay (HTML div for performance) -->
  <div
    v-if="isDragging"
    class="drag-selection-box"
    :style="{
      left: Math.min(dragStart.x, dragEnd.x) + 'px',
      top: Math.min(dragStart.y, dragEnd.y) + 'px',
      width: Math.abs(dragEnd.x - dragStart.x) + 'px',
      height: Math.abs(dragEnd.y - dragStart.y) + 'px',
    }"
  />
  <div
    v-if="isInfoLayerMode"
    style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 20;
      background: transparent;
      user-select: none;
    "
  ></div>
</template>
<style scoped>
.drag-selection-box {
  position: absolute;
  border: 1px dashed #0066ff;
  background-color: rgba(0, 102, 255, 0.1);
  pointer-events: none;
  z-index: 15;
}
</style>
