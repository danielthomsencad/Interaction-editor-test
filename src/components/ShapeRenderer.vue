<script setup>
import { ref, onMounted, onUnmounted, watchEffect, watch, computed, defineEmits } from 'vue'
import { useJsonStore, useTransformStore, useHistoryStore } from '@/stores/store'
import {
  isPointInImage,
  isPointInText,
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
const historyStore = useHistoryStore()

const fontImage = new Image()
fontImage.src = fontImageUrl

// Image cache to prevent reloading images on every render
const imageCache = new Map()

const emit = defineEmits(['openTextEditor'])

const isInfoLayerMode = computed(() => transformStore.grayscale)
const canvas = ref(null)
const infoLayerCanvas = ref(null)
const infoLayerOverlay = ref(null)

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

// Creation mode rubber band state
const rubberBandEnd = ref({ x: 0, y: 0 })

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
  // Ctrl+Z: Undo based on mode
  if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()

    if (jsonStore.isCreationToolActive) {
      // In creation mode: undo last step (vertex or deletion)
      jsonStore.undoCreationStep()
      renderShapes() // Re-render to show changes
    } else {
      // Not in creation mode: only undo deletions
      jsonStore.undoRegularDeletion()
      renderShapes()
    }
    return
  }

  // Escape key: finalize drawing if in creation mode
  if (event.key === 'Escape' && jsonStore.isCreationToolActive) {
    if (jsonStore.currentDrawingVertices.length >= 3 && jsonStore.selectedShapeId) {
      jsonStore.finalizeDrawing(jsonStore.selectedShapeId)
      renderShapes()
      return
    } else if (jsonStore.currentDrawingVertices.length > 0) {
      // Discard incomplete drawing
      jsonStore.currentDrawingVertices = []
      jsonStore.creationModeHistory = []
      renderShapes() // Re-render to clear preview
      return
    }
  }

  // Don't intercept space if user is typing in an input or textarea
  if (event.code === 'Space' && !event.repeat) {
    const activeElement = document.activeElement
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
    ) {
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

  // Priority order: Ctrl (zoom) > Space (grab) > Creation tool (crosshair) > normal behavior
  if (isCtrlPressed.value) {
    canvas.value.style.cursor = 'zoom-in'
    if (infoLayerOverlay.value) {
      infoLayerOverlay.value.style.cursor = 'zoom-in'
    }
    return
  }

  if (isSpacePressed.value) {
    canvas.value.style.cursor = 'grab'
    if (infoLayerOverlay.value) {
      infoLayerOverlay.value.style.cursor = 'grab'
    }
    return
  }

  // Creation tool active - show crosshair
  if (jsonStore.isCreationToolActive) {
    canvas.value.style.cursor = 'crosshair'
    if (infoLayerOverlay.value) {
      infoLayerOverlay.value.style.cursor = 'crosshair'
    }
    return
  }

  // When keys are released, immediately determine correct cursor based on current state
  if (!ctx || !jsonStore.currentInteractionShapes) {
    canvas.value.style.cursor = 'default'
    if (infoLayerOverlay.value) {
      infoLayerOverlay.value.style.cursor = 'default'
    }
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
  if (infoLayerOverlay.value) {
    infoLayerOverlay.value.style.cursor = 'default'
  }
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
      drawAnchorPoint(ctx, anchor.x, anchor.y)
    })
  }
}

const drawAnchorPoint = (ctx, x, y) => {
  const gap = 2
  const size = 5
  const lineWidth = 1

  ctx.beginPath()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = '#000000'

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

  // Draw creation preview if in drawing mode
  if (jsonStore.isCreationToolActive && jsonStore.currentDrawingVertices.length > 0) {
    renderCreationPreview()
  }
}

const renderCreationPreview = () => {
  if (!ctx || jsonStore.currentDrawingVertices.length === 0) return

  const vertices = jsonStore.currentDrawingVertices

  // Draw lines connecting vertices
  ctx.strokeStyle = '#00aaff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(vertices[0].x, vertices[0].y)
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y)
  }
  ctx.stroke()

  // Draw vertex dots
  ctx.fillStyle = 'white'
  ctx.strokeStyle = 'black'
  ctx.lineWidth = 1
  for (const vertex of vertices) {
    ctx.beginPath()
    ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

const getTextBoundingBox = (element) => {
  const atlas = bitmapFontConfig.atlas
  const charMap = Object.fromEntries(atlas.character.map((c) => [c.id, c]))

  const lines = element.text.split('\n')
  let maxWidth = 0

  for (const line of lines) {
    let lineWidth = 0
    for (const char of line) {
      const charInfo = charMap[char] || charMap[' ']
      lineWidth +=
        charInfo.letterSpacing !== undefined ? charInfo.letterSpacing : atlas.letterSpacing || 0
    }
    maxWidth = Math.max(maxWidth, lineWidth)
  }

  const totalHeight = lines.length * 8

  const padding = 2 // pixels of space around text
  return {
    x: element.x - padding - 1,
    y: element.y - padding - 1,
    width: maxWidth + 2 * padding,
    height: totalHeight + 2 * padding,
  }
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
      // Render selection boxes for multiple selected elements
      if (jsonStore.selectedInfoLayerElements && jsonStore.selectedInfoLayerElements.length > 0) {
        jsonStore.selectedInfoLayerElements.forEach((coords) => {
          const element = jsonStore.currentInfolayer[0].elements.find(
            (el) => el.x === coords.x && el.y === coords.y,
          )

          if (element) {
            if (element.type === 'Text') {
              const bbox = getTextBoundingBox(element)
              infoLayerCtx.strokeStyle = '#00aaff'
              infoLayerCtx.lineWidth = 2
              infoLayerCtx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height)
            } else if (element.type === 'ImageObject' && element.image) {
              const imagePath = `data/${element.image}`
              const cachedImg = imageCache.get(imagePath)
              if (cachedImg) {
                infoLayerCtx.strokeStyle = '#00aaff'
                infoLayerCtx.lineWidth = 2
                infoLayerCtx.strokeRect(
                  element.x - 2,
                  element.y - 2,
                  cachedImg.naturalWidth + 4,
                  cachedImg.naturalHeight + 4,
                )
              }
            }
          }
        })
      }
      // Render selection box for single text element (only if no multiple selection)
      else if (jsonStore.selectedTextCoords) {
        const selectedElement = jsonStore.currentInfolayer[0].elements.find(
          (el) =>
            el.type === 'Text' &&
            el.x === jsonStore.selectedTextCoords.x &&
            el.y === jsonStore.selectedTextCoords.y,
        )

        if (selectedElement) {
          const bbox = getTextBoundingBox(selectedElement)
          infoLayerCtx.strokeStyle = '#00aaff'
          infoLayerCtx.lineWidth = 2
          infoLayerCtx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height)
        }
      }
      // Render selection box for single image element (only if no multiple selection)
      else if (jsonStore.selectedImageCoords) {
        const selectedImage = jsonStore.currentInfolayer[0].elements.find(
          (el) =>
            el.type === 'ImageObject' &&
            el.x === jsonStore.selectedImageCoords.x &&
            el.y === jsonStore.selectedImageCoords.y,
        )

        if (selectedImage) {
          const imagePath = `data/${selectedImage.image}`
          const cachedImg = imageCache.get(imagePath)
          if (cachedImg) {
            infoLayerCtx.strokeStyle = '#00aaff'
            infoLayerCtx.lineWidth = 2
            infoLayerCtx.strokeRect(
              selectedImage.x - 2,
              selectedImage.y - 2,
              cachedImg.naturalWidth + 4,
              cachedImg.naturalHeight + 4,
            )
          }
        }
      }
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
const handleCreationClick = (x, y, isShiftPressed) => {
  // First vertex requires shift
  if (jsonStore.currentDrawingVertices.length === 0) {
    if (!isShiftPressed) return
    // Start drawing with history tracking
    jsonStore.addVertex(x, y)
    // Initialize rubber band end to first vertex position
    rubberBandEnd.value = { x, y }
    renderShapes()
    return
  }

  // Shift+click while drawing: finalize current and start new
  if (isShiftPressed && jsonStore.currentDrawingVertices.length >= 3) {
    jsonStore.finalizeDrawing(jsonStore.selectedShapeId)
    jsonStore.addVertex(x, y) // Start new shape
    // Initialize rubber band end to first vertex position of new shape
    rubberBandEnd.value = { x, y }
    renderShapes()
    return
  }

  // Subsequent vertices - add with history tracking
  jsonStore.addVertex(x, y)
  renderShapes() // Trigger preview update
}

const handleContextMenu = (event) => {
  // In creation mode, right-click finalizes the drawing
  if (jsonStore.isCreationToolActive) {
    event.preventDefault() // Prevent default context menu
    
    if (jsonStore.currentDrawingVertices.length >= 3 && jsonStore.selectedShapeId) {
      jsonStore.finalizeDrawing(jsonStore.selectedShapeId)
      renderShapes()
    } else if (jsonStore.currentDrawingVertices.length > 0) {
      // Discard incomplete drawing
      jsonStore.currentDrawingVertices = []
      jsonStore.creationModeHistory = []
      renderShapes()
    }
  }
}

const handleCanvasClick = (event) => {
  if (!ctx || !jsonStore.currentInteractionShapes) return

  // Don't process click if we just finished dragging
  if (dragOccurred.value) {
    dragOccurred.value = false // Reset for next interaction
    return
  }

  const currentTime = Date.now()
  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Priority 0: Creation tool mode - only handle vertex placement
  if (jsonStore.isCreationToolActive) {
    handleCreationClick(x, y, event.shiftKey)
    return
  }

  if (event.shiftKey && jsonStore.selectedInfolayerId && transformStore.grayscale) {
    console.log('Shift+click: Adding popup image at:', x, y)
    const newImageElement = {
      type: 'ImageObject',
      image: 'images/Popup.png',
      x: Math.round(x),
      y: Math.round(y),
    }
    jsonStore.currentInfolayer[0].elements.push(newImageElement)
    historyStore.addInfoLayerAction({
      type: 'add',
      element: newImageElement,
    })
    renderInfoLayer()
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
    // Check if click is on a text or image element
    let clickedOnElement = false
    if (jsonStore.currentInfolayer?.[0]?.elements) {
      for (const element of jsonStore.currentInfolayer[0].elements) {
        if (element.type === 'ImageObject' && element.image) {
          const imagePath = `data/${element.image}`
          const cachedImg = imageCache.get(imagePath)

          if (cachedImg && isPointInImage(x, y, element, cachedImg)) {
            clickedOnElement = true
            console.log('Image clicked at:', element.x, element.y)
            // Clear multiple selection and set single selection
            jsonStore.setMultipleInfoLayerElements([])
            jsonStore.setSelectedImageCoords({ x: element.x, y: element.y })
            jsonStore.setSelectedTextCoords(null) // Clear text selection
            lastClickTime = currentTime
            return
          }
        }
        if (element.type === 'Text') {
          if (isPointInText(x, y, element, bitmapFontConfig)) {
            clickedOnElement = true
            // Check for double-click FIRST
            const isDoubleClick =
              currentTime - lastClickTime < DOUBLE_CLICK_DELAY &&
              lastClickedShape === element.x + ',' + element.y // Use unique ID

            if (isDoubleClick) {
              console.log('Double-click: Text element at:', element.x, element.y)
              // Clear multiple selection before editing
              jsonStore.setMultipleInfoLayerElements([])
              emit('openTextEditor', element)
            } else {
              console.log('Single click: Text selected at:', element.x, element.y)
              // Clear multiple selection and set single selection
              jsonStore.setMultipleInfoLayerElements([])
              jsonStore.setSelectedTextCoords({ x: element.x, y: element.y })
              jsonStore.setSelectedImageCoords(null) // Clear image selection
            }

            lastClickTime = currentTime
            lastClickedShape = element.x + ',' + element.y // Track last clicked text
            return
          }
        }
      }
    }

    if (!clickedOnElement) {
      const isDoubleClick =
        currentTime - lastClickTime < DOUBLE_CLICK_DELAY && lastClickedShape === 'empty'

      if (isDoubleClick) {
        console.log('Double-click on empty area - creating new text at:', x, y)
        // Create a new empty text element
        const newTextElement = {
          type: 'Text',
          text: '',
          x: Math.round(x),
          y: Math.round(y),
          rotation: 0,
          color: 'white',
        }
        emit('openTextEditor', newTextElement)
      } else {
        console.log('Clicked in info layer mode but not on any text')
        jsonStore.setMultipleInfoLayerElements([])
        jsonStore.setSelectedTextCoords(null)
        jsonStore.setSelectedImageCoords(null)
      }

      lastClickTime = currentTime
      lastClickedShape = 'empty'
    }
    return
  }

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

  // Handle creation mode rubber band preview
  if (jsonStore.isCreationToolActive && jsonStore.currentDrawingVertices.length > 0) {
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.width / rect.width
    const scaleY = canvas.value.height / rect.height
    const mouseX = (event.clientX - rect.left) * scaleX
    const mouseY = (event.clientY - rect.top) * scaleY

    // Just update position - div overlay will handle rendering
    rubberBandEnd.value = { x: mouseX, y: mouseY }
    return
  }

  // Check if we should start dragging (mouse moved far enough)
  if (!isDragging.value && dragStart.value.x !== 0) {
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.width / rect.width
    const scaleY = canvas.value.height / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    const deltaX = Math.abs(x - dragStart.value.x)
    const deltaY = Math.abs(y - dragStart.value.y)

    // Start dragging if mouse moved more than 5 pixels AND we have an active layer (interaction or infolayer)
    if (
      (deltaX > 5 || deltaY > 5) &&
      (jsonStore.selectedShapeId || (jsonStore.selectedInfolayerId && transformStore.grayscale))
    ) {
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
const handleInfoLayerMouseMove = (event) => {
  if (!infoLayerOverlay.value || !jsonStore.selectedInfolayerId) return

  const rect = infoLayerOverlay.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Check if we should start dragging (mouse moved far enough)
  if (!isDragging.value && dragStart.value.x !== 0) {
    const deltaX = Math.abs(x - dragStart.value.x)
    const deltaY = Math.abs(y - dragStart.value.y)

    // Start dragging if mouse moved more than 5 pixels
    if (deltaX > 5 || deltaY > 5) {
      isDragging.value = true
      dragOccurred.value = true
      event.preventDefault()
    }
  }

  // Handle drag selection - update drag end position
  if (isDragging.value) {
    dragEnd.value = { x, y }
    return
  }

  // Check modifier keys first - Ctrl takes priority, then Space
  if (isCtrlPressed.value) {
    infoLayerOverlay.value.style.cursor = 'zoom-in'
    return
  }

  if (isSpacePressed.value) {
    infoLayerOverlay.value.style.cursor = 'grab'
    return
  }

  // Don't change cursor if ViewContainer is in pan mode
  const viewContainer = infoLayerOverlay.value?.closest('.view-container')
  if (
    viewContainer &&
    (viewContainer.style.cursor === 'grab' || viewContainer.style.cursor === 'grabbing')
  ) {
    return
  }

  // Find the selected infolayer
  const infoLayer = jsonStore.currentInfolayer.find(
    (info) => info.name === jsonStore.selectedInfolayerId,
  )

  if (!infoLayer || !infoLayer.elements) {
    infoLayerOverlay.value.style.cursor = 'default'
    return
  }

  // Check text elements (reverse order for top-to-bottom hit detection)
  for (let i = infoLayer.elements.length - 1; i >= 0; i--) {
    const element = infoLayer.elements[i]

    if (element.type === 'Text') {
      if (isPointInText(x, y, element, bitmapFontConfig)) {
        infoLayerOverlay.value.style.cursor = 'pointer'
        return
      }
    } else if (element.type === 'ImageObject' && element.image) {
      const imagePath = `data/${element.image}`
      const cachedImage = imageCache.get(imagePath)
      if (cachedImage && cachedImage.complete) {
        if (isPointInImage(x, y, element, cachedImage)) {
          infoLayerOverlay.value.style.cursor = 'pointer'
          return
        }
      }
    }
  }

  // Not over any clickable element
  infoLayerOverlay.value.style.cursor = 'default'
}

const handleMouseDown = (event) => {
  // Allow mousedown in both interaction mode and infolayer mode
  if (!ctx && !transformStore.grayscale) return

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

  // Use infolayer overlay rect if in infolayer mode, otherwise use canvas rect
  const targetElement =
    jsonStore.selectedInfolayerId && transformStore.grayscale && infoLayerOverlay.value
      ? infoLayerOverlay.value
      : canvas.value

  if (!targetElement) return

  const rect = targetElement.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  // Always track drag start for click detection
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

  // Handle infolayer drag selection
  if (jsonStore.selectedInfolayerId && transformStore.grayscale) {
    const selectedElements = []
    const infoLayer = jsonStore.currentInfolayer.find(
      (info) => info.name === jsonStore.selectedInfolayerId,
    )

    if (infoLayer && infoLayer.elements) {
      infoLayer.elements.forEach((element) => {
        if (element.type === 'Text') {
          const bbox = getTextBoundingBox(element)
          // Check if text bounding box intersects with selection box
          if (
            bbox.x < maxX &&
            bbox.x + bbox.width > minX &&
            bbox.y < maxY &&
            bbox.y + bbox.height > minY
          ) {
            selectedElements.push({ x: element.x, y: element.y })
          }
        } else if (element.type === 'ImageObject' && element.image) {
          const imagePath = `data/${element.image}`
          const cachedImage = imageCache.get(imagePath)
          if (cachedImage && cachedImage.complete) {
            const imgWidth = cachedImage.naturalWidth
            const imgHeight = cachedImage.naturalHeight
            // Check if image intersects with selection box
            if (
              element.x < maxX &&
              element.x + imgWidth > minX &&
              element.y < maxY &&
              element.y + imgHeight > minY
            ) {
              selectedElements.push({ x: element.x, y: element.y })
            }
          }
        }
      })
    }

    console.log('Infolayer drag selection completed. Selected elements:', selectedElements)
    jsonStore.setMultipleInfoLayerElements(selectedElements)
    dragStart.value = { x: 0, y: 0 }
    return
  }

  // Handle interaction shape drag selection
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

watch(
  () => jsonStore.isCreationToolActive,
  () => {
    updateCursor()
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
    @contextmenu="handleContextMenu"
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

  <!-- Creation mode rubber band line (SVG for performance) -->
  <svg
    v-if="jsonStore.isCreationToolActive && jsonStore.currentDrawingVertices.length > 0"
    style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 26;
    "
  >
    <line
      :x1="jsonStore.currentDrawingVertices[jsonStore.currentDrawingVertices.length - 1].x"
      :y1="jsonStore.currentDrawingVertices[jsonStore.currentDrawingVertices.length - 1].y"
      :x2="rubberBandEnd.x"
      :y2="rubberBandEnd.y"
      stroke="#00aaff"
      stroke-width="1"
      stroke-dasharray="5,5"
    />
  </svg>

  <div
    v-if="isInfoLayerMode"
    ref="infoLayerOverlay"
    style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 20;
      background: transparent;
      user-select: none;
      cursor: default;
    "
    @click="handleCanvasClick"
    @mousedown="handleMouseDown"
    @mousemove="handleInfoLayerMouseMove"
    @mouseup="handleMouseUp"
  ></div>
  <!-- Text editing textarea -->
</template>
<style scoped>
.drag-selection-box {
  position: absolute;
  border: 1px dashed #0066ff;
  background-color: rgba(0, 102, 255, 0.1);
  pointer-events: none;
  z-index: 25;
}
</style>
