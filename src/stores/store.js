import { defineStore } from 'pinia'
import { isPointInPolygon } from '@/composables/useGeometry'

// Store for managing JSON data and related state
const useJsonStore = defineStore('jsonStore', {
  state: () => ({
    jsonData: null,
    states: [],
    currentImg: null,
    currentStateIndex: 0,
    currentInteractions: {},
    currentInteractionShapes: [],
    currentInfolayer: [], // Added to track current info layer
    selectedShapeId: null,
    selectedInfolayerId: null,
    selectedIndividualShapeId: null, // For individual shape selection within a layer
    selectedElementCoords: null, // For individual element selection (x,y coordinates)
    selectedElementCoordsArray: [], // For multiple element selection via drag box
    selectedInfoLayerElements: [], // For multiple infolayer element selection via drag box
    selectedTextCoords: null, // For text element selection (x,y coordinates)
    selectedImageCoords: null, // For image element selection (x,y coordinates)
    currentInteractionIndex: null, // Add this for interaction selection
    isCreationToolActive: false,
    currentDrawingVertices: [],
    creationModeHistory: [], // Tracks vertices and deletions during creation mode
    deletionHistory: [], // Persistent deletion history (survives exiting creation mode)
  }),
  getters: {
    currentState: (state) => {
      if (state.states && state.states.length > 0 && state.currentStateIndex >= 0) {
        return state.states[state.currentStateIndex]
      }
      return null
    },
    selectedShape: (state) => {
      if (state.currentInteractionShapes && state.selectedShapeId !== null) {
        return state.currentInteractionShapes.find((shape) => shape.id === state.selectedShapeId)
      }
      return null
    },
    selectedIndividualShape: (state) => {
      if (state.currentInteractionShapes && state.selectedIndividualShapeId !== null) {
        return state.currentInteractionShapes.find(
          (shape) => shape.id === state.selectedIndividualShapeId,
        )
      }
      return null
    },
    selectedInfoLayer: (state) => {
      if (state.currentInfolayer && state.selectedInfolayerId !== null) {
        return state.currentInfolayer.find((info) => info.name === state.selectedInfolayerId)
      }
    },
  },
  actions: {
    setCurrentState(index) {
      if (Object.keys(this.currentInteractions).length !== 0) {
        console.log('Saving current state edits before switching states')
        this.saveCurrentStateEdits()
      }

      if (this.states && index >= 0 && index < this.states.length) {
        this.currentStateIndex = index
        this.currentImg = `data/${this.states[index].img}`
        this.currentInteractionShapes = this.states[index].interactionShapes || []
        this.currentInteractions = this.states[index].interactions || {}
        this.selectedInfolayerId = null // Clear info layer selection when changing states
        this.selectedShapeId = null
        this.selectedIndividualShapeId = null // Clear individual selection when changing states
        this.selectedElementCoords = null // Clear element selection when changing states
        this.selectedElementCoordsArray = [] // Clear multiple selection when changing states
        this.selectedInfoLayerElements = [] // Clear multiple infolayer selection when changing states
        this.selectedTextCoords = null // Clear text element selection when changing states
        this.selectedImageCoords = null // Clear image element selection when changing states
        this.currentInteractionIndex = null // Clear interaction selection when changing states

        if (!this.states[index].infolayer) {
          this.states[index].infolayer = []
        } else if (
          typeof this.states[index].infolayer === 'object' &&
          !Array.isArray(this.states[index].infolayer)
        ) {
          if (Object.keys(this.states[index].infolayer).length === 0) {
            this.states[index].infolayer = []
          } else {
            this.states[index].infolayer = [this.states[index].infolayer]
          }
        }
        if (this.states[index].infolayer.length === 0) {
          this.currentInfolayer = this.states[index].infolayer
          this.addNewInfoLayer()
        } else {
          this.currentInfolayer = this.states[index].infolayer
        }
        console.log('setting info layer to:', this.currentInfolayer)
      }
    },
    setSelectedImageCoords(coords) {
      this.selectedImageCoords = coords
    },
    toggleCreationTool() {
      this.isCreationToolActive = !this.isCreationToolActive
      if (!this.isCreationToolActive) {
        // Tool turned off - finalize any drawing in progress
        if (this.currentDrawingVertices.length >= 3 && this.selectedShapeId) {
          this.finalizeDrawing(this.selectedShapeId)
        } else {
          this.currentDrawingVertices = []
        }
        // Clear creation mode history (vertices), but keep deletion history
        this.creationModeHistory = []
      }
    },
    finalizeDrawing(targetInteractionId) {
      if (this.currentDrawingVertices.length < 3) {
        this.currentDrawingVertices = []
        return
      }

      // Find the target shape
      const shape = this.currentInteractionShapes.find((s) => s.id === targetInteractionId)
      const interaction = this.currentInteractions[targetInteractionId]

      if (!shape || !interaction) {
        this.currentDrawingVertices = []
        return
      }

      // Calculate bounding box for relative positioning
      const xCoords = this.currentDrawingVertices.map((v) => v.x)
      const yCoords = this.currentDrawingVertices.map((v) => v.y)
      const minX = Math.min(...xCoords)
      const minY = Math.min(...yCoords)

      // Convert to relative vertices
      const relativeVertices = this.currentDrawingVertices.map((v) => ({
        x: v.x - minX,
        y: v.y - minY,
      }))

      // Create new polygon element with unique ID
      const elementId = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newElement = {
        type: 'Polygon',
        id: elementId,
        x: minX,
        y: minY,
        vertices: relativeVertices,
      }

      // Add to shape's elements
      if (!shape.elements) {
        shape.elements = []
      }
      shape.elements.push(newElement)

      // Track finalized shape in history for undo (store vertices to restore)
      this.creationModeHistory.push({
        type: 'finalizeShape',
        elementId: elementId,
        shapeId: targetInteractionId,
        vertices: [...this.currentDrawingVertices], // Store original absolute vertices
      })

      // Clear only the drawing vertices (keep history for undo)
      this.currentDrawingVertices = []
    },
    addVertex(x, y) {
      // Add vertex to current drawing
      this.currentDrawingVertices.push({ x, y })

      // Track in creation mode history for undo
      this.creationModeHistory.push({
        type: 'addVertex',
        vertex: { x, y },
      })
    },
    undoCreationStep() {
      if (this.creationModeHistory.length === 0) return

      const lastStep = this.creationModeHistory.pop()

      if (lastStep.type === 'addVertex') {
        // Remove last vertex
        this.currentDrawingVertices.pop()
      } else if (lastStep.type === 'finalizeShape') {
        // Un-finalize: remove the element and restore vertices for continued editing
        const shape = this.currentInteractionShapes.find((s) => s.id === lastStep.shapeId)
        if (shape && shape.elements && lastStep.elementId) {
          const index = shape.elements.findIndex((e) => e.id === lastStep.elementId)
          if (index !== -1) {
            shape.elements.splice(index, 1)
            // Restore the vertices to currentDrawingVertices so user can continue editing
            this.currentDrawingVertices = lastStep.vertices || []

            // Switch to the shape this element belongs to (if different)
            if (this.selectedShapeId !== lastStep.shapeId) {
              this.selectedShapeId = lastStep.shapeId
            }
          }
        }
      }
    },
    deleteSelectedElements() {
      // Delete currently selected elements
      if (this.selectedElementCoordsArray && this.selectedElementCoordsArray.length > 0) {
        const shape = this.currentInteractionShapes.find((s) => s.id === this.selectedShapeId)
        if (!shape || !shape.elements) return

        // Store deletions for undo (in reverse order for proper restoration)
        const deletedElements = []

        for (let i = this.selectedElementCoordsArray.length - 1; i >= 0; i--) {
          const coords = this.selectedElementCoordsArray[i]
          const elementIndex = shape.elements.findIndex((e) => e.x === coords.x && e.y === coords.y)

          if (elementIndex !== -1) {
            const deletedElement = shape.elements.splice(elementIndex, 1)[0]
            deletedElements.push({
              element: deletedElement,
              elementIndex,
              shapeId: this.selectedShapeId,
            })
          }
        }

        // Add to deletion history
        deletedElements.forEach((del) => {
          this.deletionHistory.push({
            type: 'deleteElement',
            ...del,
          })
        })

        // Clear selection
        this.selectedElementCoordsArray = []
      } else if (this.selectedElementCoords) {
        // Single element deletion
        const shape = this.currentInteractionShapes.find(
          (s) => s.id === this.selectedIndividualShapeId,
        )
        if (!shape || !shape.elements) return

        const elementIndex = shape.elements.findIndex(
          (e) => e.x === this.selectedElementCoords.x && e.y === this.selectedElementCoords.y,
        )

        if (elementIndex !== -1) {
          const deletedElement = shape.elements.splice(elementIndex, 1)[0]
          const deletion = {
            element: deletedElement,
            elementIndex,
            shapeId: this.selectedIndividualShapeId,
          }

          this.deletionHistory.push({
            type: 'deleteElement',
            ...deletion,
          })
        }

        // Clear selection
        this.selectedElementCoords = null
        this.selectedIndividualShapeId = null
      }
    },
    undoRegularDeletion() {
      // Only undo deletions from deletion history (not in creation mode)
      if (this.deletionHistory.length === 0) return

      const lastDeletion = this.deletionHistory.pop()

      if (lastDeletion.type === 'deleteElement') {
        const shape = this.currentInteractionShapes.find((s) => s.id === lastDeletion.shapeId)
        if (shape && lastDeletion.element) {
          shape.elements.splice(lastDeletion.elementIndex, 0, lastDeletion.element)
        }
      }
    },
    moveSelectedElements(dy, dx) {
      console.log('Move called with dx:', dx, 'dy:', dy)
      console.log('Selection state:', {
        multipleSelected: this.selectedElementCoordsArray?.length,
        individualSelected: !!this.selectedElementCoords,
        layerSelected: this.selectedShapeId,
      })
      // Priority 0: Multiple infolayer elements
      if (this.selectedInfoLayerElements && this.selectedInfoLayerElements.length > 0) {
        for (const coords of this.selectedInfoLayerElements) {
          const element = this.currentInfolayer[0].elements.find(
            (e) => e.x === coords.x && e.y === coords.y,
          )
          if (element) {
            element.x += dx
            element.y += dy
            coords.x += dx
            coords.y += dy
          }
        }
        return
      }
      // Priority 1: Multiple elements
      if (this.selectedElementCoordsArray && this.selectedElementCoordsArray.length > 0) {
        // Step 1: Find the shape
        const shape = this.currentInteractionShapes.find((s) => s.id === this.selectedShapeId)
        if (!shape || !shape.elements) return

        // Step 2: Loop through selected coordinates
        for (const coords of this.selectedElementCoordsArray) {
          // Step 3: Find the matching element
          const element = shape.elements.find((e) => e.x === coords.x && e.y === coords.y)
          const anchorsInElement = shape.anchors.filter((anchor) =>
            isPointInPolygon(anchor.x, anchor.y, element),
          )
          for (const anchor of anchorsInElement) {
            anchor.x += dx
            anchor.y += dy
          }
          if (element) {
            // Step 4: Move the element
            element.x += dx
            element.y += dy

            // Step 5: Update the selection coords to match
            coords.x += dx
            coords.y += dy
          }
        }
        return
      }
      // Priority 2: Single element
      if (this.selectedIndividualShapeId && this.selectedElementCoords) {
        // Find the shape
        const shape = this.currentInteractionShapes.find(
          (s) => s.id === this.selectedIndividualShapeId,
        )
        if (!shape || !shape.elements) return

        // Find the element
        const element = shape.elements.find(
          (e) => e.x === this.selectedElementCoords.x && e.y === this.selectedElementCoords.y,
        )
        const anchorsInElement = shape.anchors.filter((anchor) =>
          isPointInPolygon(anchor.x, anchor.y, element),
        )
        for (const anchor of anchorsInElement) {
          anchor.x += dx
          anchor.y += dy
        }

        if (element) {
          // Move it
          element.x += dx
          element.y += dy

          // Update selection
          this.selectedElementCoords.x += dx
          this.selectedElementCoords.y += dy
        }
        return
      }
      if (this.selectedTextCoords) {
        const text = this.currentInfolayer[0].elements.find(
          (e) => e.x === this.selectedTextCoords.x && e.y === this.selectedTextCoords.y,
        )
        if (text) {
          // Move it
          text.x += dx
          text.y += dy

          // Update selection
          this.selectedTextCoords.x += dx
          this.selectedTextCoords.y += dy
        }
        return
      }
      if (this.selectedImageCoords) {
        const image = this.currentInfolayer[0].elements.find(
          (e) =>
            e.x === this.selectedImageCoords.x &&
            e.y === this.selectedImageCoords.y &&
            e.type === 'ImageObject',
        )
        if (image) {
          image.x += dx
          image.y += dy
          this.selectedImageCoords.x += dx
          this.selectedImageCoords.y += dy
        }
        return
      }

      // Priority 3: Entire layer
      if (this.selectedShapeId) {
        // Find the shape
        const shape = this.currentInteractionShapes.find((s) => s.id === this.selectedShapeId)
        if (!shape || !shape.elements) return

        // Move ALL elements in the layer
        for (const element of shape.elements) {
          element.x += dx
          element.y += dy
        }
        for (const anchor of shape.anchors) {
          anchor.x += dx
          anchor.y += dy
        }
        this.currentInteractionShapes = [...this.currentInteractionShapes]
        return
      }

      // Nothing selected - do nothing
    },

    saveCurrentStateEdits() {
      if (this.states[this.currentStateIndex]) {
        // Deep copy to avoid reference issues
        this.states[this.currentStateIndex].interactions = JSON.parse(
          JSON.stringify(this.currentInteractions),
        )
        this.states[this.currentStateIndex].interactionShapes = JSON.parse(
          JSON.stringify(this.currentInteractionShapes),
        )
        this.states[this.currentStateIndex].infolayer = JSON.parse(
          JSON.stringify(this.currentInfolayer),
        )
        // Add more fields if you have other per-state data (e.g., infolayer)
      }
    },
    reorderInteractionShapes(fromIndex, toIndex) {
      // Remove from old position
      const [movedItem] = this.currentInteractionShapes.splice(fromIndex, 1)

      // Calculate new insert position (account for the removed item)
      const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex

      // Insert at new position
      this.currentInteractionShapes.splice(adjustedToIndex, 0, movedItem)
    },
    setCurrentInteraction(index) {
      if (
        this.currentInteractionShapes &&
        index >= 0 &&
        index < this.currentInteractionShapes.length
      ) {
        this.currentInteractionIndex = index
        this.selectedShapeId = this.currentInteractionShapes[index].id
        this.selectedIndividualShapeId = null // Clear individual selection when selecting layer
        this.selectedElementCoords = null // Clear element selection when selecting layer
        this.selectedElementCoordsArray = [] // Clear multiple selection when selecting layer
      }
    },
    setIndividualElement(shapeId, elementCoords) {
      this.selectedIndividualShapeId = shapeId
      this.selectedElementCoords = elementCoords
      this.selectedElementCoordsArray = [] // Clear multiple selection when selecting individual
      // Keep layer selection but add individual element selection
    },
    setMultipleElementCoords(elementCoordsArray) {
      this.selectedElementCoordsArray = elementCoordsArray
      this.selectedIndividualShapeId = null // Clear individual selection
      this.selectedElementCoords = null // Clear individual coordinates
      // Keep layer selection but add multiple element selection
    },
    setMultipleInfoLayerElements(elementCoordsArray) {
      this.selectedInfoLayerElements = elementCoordsArray
      this.selectedTextCoords = null
      this.selectedImageCoords = null
    },
    setCurrentInfolayer(name) {
      console.log('Selecting infolayer:', name)
      this.selectedInfolayerId = name
      this.selectedShapeId = null
      this.selectedIndividualShapeId = null
      this.selectedElementCoords = null
      this.selectedElementCoordsArray = []
      this.selectedInfoLayerElements = []
    },
    setInteractionShapeById(shapeId) {
      this.selectedShapeId = shapeId
      this.selectedInfolayerId = null
      this.selectedIndividualShapeId = null
      this.selectedElementCoords = null
      this.selectedElementCoordsArray = []
      this.selectedInfoLayerElements = []
      this.selectedTextCoords = null
      this.selectedImageCoords = null
    },
    setSelectedTextCoords(coords) {
      this.selectedTextCoords = coords
    },
    updateShapeColor(shapeId, newColor) {
      // Update color in interactionShapes array (what gets rendered)
      const shape = this.currentInteractionShapes.find((s) => s.id === shapeId)
      if (shape) {
        shape.color = newColor
      }

      // Also update color in interactions meta (for consistency)
      if (this.currentInteractions[shapeId]?.meta) {
        this.currentInteractions[shapeId].meta.color = newColor
      }
    },
    updateInteractionName(shapeId, newName) {
      // Update name in interactions meta
      if (this.currentInteractions[shapeId]?.meta) {
        this.currentInteractions[shapeId].meta.name = newName
      }
    },

    updateInteractionToolName(oldToolName, newToolName) {
      for (const interactionId in this.currentInteractions) {
        const interaction = this.currentInteractions[interactionId]
        if (interaction[oldToolName]) {
          const newInteraction = {}
          for (const key of Object.keys(interaction)) {
            if (key === oldToolName) {
              newInteraction[newToolName] = interaction[oldToolName]
            } else {
              newInteraction[key] = interaction[key]
            }
          }
          this.currentInteractions[interactionId] = newInteraction
        }
      }
    },
    updateStateName(stateIndex, newName) {
      if (this.states[stateIndex]) {
        this.states[stateIndex].name = newName
      }
    },
    updateInfoLayerName(infoLayerId, newName) {
      const infoLayer = this.currentInfolayer.find((info) => info.id === infoLayerId)
      if (infoLayer) {
        infoLayer.name = newName
      }
    },
    updateInteractionData(interactionId, tool, action) {
      try {
        const parsed = JSON.parse(action)
        // Assuming the value is an array, update the first element
        if (Array.isArray(this.currentInteractions[interactionId][tool])) {
          this.currentInteractions[interactionId][tool][0] = parsed
        } else {
          // fallback if not array
          this.currentInteractions[interactionId][tool] = [parsed]
        }
      } catch (e) {
        // Handle parse error (show message, etc.)
        console.error('Invalid JSON:', e)
      }
    },
    clearCurrentInteraction() {
      this.currentInteractionIndex = null
      this.selectedShapeId = null
      this.selectedIndividualShapeId = null
      this.selectedElementCoords = null
      this.selectedElementCoordsArray = []
    },
    addInterActionTool() {
      for (const interactionId in this.currentInteractions) {
        let toolName = 'newtool'
        let counter = 1
        while (this.currentInteractions[interactionId][toolName]) {
          toolName = `newtool ${counter}`
          counter++
        }
        this.currentInteractions[interactionId][toolName] = [{}]
      }
    },
    addNewInteractionLayer() {
      const newId = crypto.randomUUID()

      // Get first interaction as template
      const interactionIds = Object.keys(this.currentInteractions)
      if (interactionIds.length === 0) {
        console.error('No existing interactions to use as template')
        return
      }

      const templateInteraction = this.currentInteractions[interactionIds[0]]

      // Build new interaction with same structure
      const newInteraction = {}

      for (const key in templateInteraction) {
        if (key === 'meta') {
          // Create unique meta
          newInteraction.meta = {
            color: '#121212',
            name: 'New Interaction',
            ref: newId,
          }
        } else {
          // Copy array structure with empty object
          newInteraction[key] = [{}]
        }
      }

      this.currentInteractions[newId] = newInteraction
    },
    addNewInfoLayer() {
      if (!this.currentInfolayer) {
        this.currentInfolayer = []
      }
      const newInfoLayer = {
        id: crypto.randomUUID(),
        name: `Info Layer ${this.currentInfolayer.length + 1}`,
        elements: [],
      }

      this.currentInfolayer.push(newInfoLayer)

      // Update the current state's infolayer
      if (this.states[this.currentStateIndex]) {
        this.states[this.currentStateIndex].infolayer = this.currentInfolayer
      }
    },
  },
})

const useActionStore = defineStore('actionStore', {
  state: () => ({
    toggleActionContainer: false,
    currentInteractionId: null,
  }),
  actions: {
    toggleActionContainerVisibility(id) {
      this.toggleActionContainer = !this.toggleActionContainer
      this.currentInteractionId = id
    },
  },
})

// Store for managing pan and zoom transformations
const useTransformStore = defineStore('transformStore', {
  state: () => ({
    panX: 0,
    panY: 0,
    zoomLevel: 1,
    contentWidth: 0,
    contentHeight: 0,
    initialCenterX: 0,
    initialCenterY: 0,
    grayscale: false,
  }),
  actions: {
    setGrayscale() {
      this.grayscale = true
    },
    clearGrayscale() {
      this.grayscale = false
    },
  },
})

const useHistoryStore = defineStore('historyStore', {
  state: () => ({
    deleteShapeHistory: [],
    deleteInteractionToolHistory: [],
    deleteInteractionLayerHistory: [],
    infolayerHistory: [],
  }),
  actions: {
    addInfoLayerAction(action) {
      const jsonStore = useJsonStore()
      if (!this.infolayerHistory[jsonStore.currentStateIndex]) {
        this.infolayerHistory[jsonStore.currentStateIndex] = []
      }
      this.infolayerHistory[jsonStore.currentStateIndex].push({
        ...action,
        timestamp: Date.now(),
      })
    },
    undoInfoLayerAction() {
      const jsonStore = useJsonStore()
      const stateHistory = this.infolayerHistory[jsonStore.currentStateIndex]
      if (!stateHistory || stateHistory.length === 0) return

      const lastAction = stateHistory.pop()
      const elements = jsonStore.currentInfolayer[0].elements

      switch (lastAction.type) {
        case 'add': {
          // Remove the added element
          const addIndex = elements.findIndex(
            (el) => el.x === lastAction.element.x && el.y === lastAction.element.y,
          )
          if (addIndex !== -1) {
            elements.splice(addIndex, 1)
          }
          break
        }

        case 'batchDelete': {
          // Restore all deleted elements from batch
          if (lastAction.elements && Array.isArray(lastAction.elements)) {
            lastAction.elements.forEach((element) => {
              elements.push(element)
            })
          }
          break
        }

        case 'delete': {
          // Restore the deleted element
          elements.push(lastAction.element)
          break
        }

        case 'edit': {
          // Restore previous text value
          const editElement = elements.find(
            (el) => el.x === lastAction.element.x && el.y === lastAction.element.y,
          )
          if (editElement && editElement.type === 'Text') {
            editElement.text = lastAction.oldText
          }
          break
        }
      }
    },
    deleteShape() {
      const jsonStore = useJsonStore()
      //lazy init delete history for current state
      if (!this.deleteShapeHistory[jsonStore.currentStateIndex]) {
        this.deleteShapeHistory[jsonStore.currentStateIndex] = []
      }
      //priority 1: multiple elements
      if (jsonStore.selectedElementCoordsArray && jsonStore.selectedElementCoordsArray.length > 0) {
        const shape = jsonStore.currentInteractionShapes.find(
          (s) => s.id === jsonStore.selectedShapeId,
        )
        if (!shape || !shape.elements) return

        const remainingElements = shape.elements.filter(
          (e) =>
            !jsonStore.selectedElementCoordsArray.some(
              (coords) => coords.x === e.x && coords.y === e.y,
            ),
        )

        const deletedShapes = shape.elements.filter((e) =>
          jsonStore.selectedElementCoordsArray.some(
            (coords) => coords.x === e.x && coords.y === e.y,
          ),
        )

        const deletedAnchors = shape.anchors.filter((anchor) =>
          deletedShapes.some((element) => isPointInPolygon(anchor.x, anchor.y, element)),
        )

        const remainingAnchors = shape.anchors.filter(
          (anchor) =>
            !deletedShapes.some((element) => isPointInPolygon(anchor.x, anchor.y, element)),
        )

        // Update shape elements and anchors
        shape.elements = remainingElements
        shape.anchors = remainingAnchors
        // Add to delete history
        this.deleteShapeHistory[jsonStore.currentStateIndex].push({
          type: 'elements',
          id: jsonStore.selectedShapeId,
          deletedElements: { deletedShapes, deletedAnchors },
          deletedAt: Date.now(),
          stateIndex: jsonStore.currentStateIndex,
        })
      }
      //priority 2: single element
      else if (jsonStore.selectedIndividualShapeId && jsonStore.selectedElementCoords) {
        const shape = jsonStore.currentInteractionShapes.find(
          (s) => s.id === jsonStore.selectedIndividualShapeId,
        )
        if (!shape || !shape.elements) return

        const remainingElements = shape.elements.filter(
          (e) =>
            !(
              e.x === jsonStore.selectedElementCoords.x && e.y === jsonStore.selectedElementCoords.y
            ),
        )

        const deletedShapes = shape.elements.filter(
          (e) =>
            e.x === jsonStore.selectedElementCoords.x && e.y === jsonStore.selectedElementCoords.y,
        )

        const deletedAnchors = shape.anchors.filter((anchor) =>
          deletedShapes.some((element) => isPointInPolygon(anchor.x, anchor.y, element)),
        )
        const remainingAnchors = shape.anchors.filter(
          (anchor) =>
            !deletedShapes.some((element) => isPointInPolygon(anchor.x, anchor.y, element)),
        )
        // Update shape elements and anchors
        shape.elements = remainingElements
        shape.anchors = remainingAnchors

        // Add to delete history
        this.deleteShapeHistory[jsonStore.currentStateIndex].push({
          type: 'elements',
          id: jsonStore.selectedIndividualShapeId,
          deletedElements: { deletedShapes, deletedAnchors },
          deletedAt: Date.now(),
          stateIndex: jsonStore.currentStateIndex,
        })
      }
      //priority 3: entire layer
      else if (jsonStore.selectedShapeId) {
        const shapeIndex = jsonStore.currentInteractionShapes.findIndex(
          (s) => s.id === jsonStore.selectedShapeId,
        )
        if (shapeIndex === -1) return

        const shape = jsonStore.currentInteractionShapes[shapeIndex]

        // Remove shape from current interaction shapes
        jsonStore.currentInteractionShapes.splice(shapeIndex, 1)

        // Add all elements to delete history
        this.deleteShapeHistory[jsonStore.currentStateIndex].push({
          type: 'shape',
          id: jsonStore.selectedShapeId,
          deletedElements: {
            id: shape.id,
            color: shape.color,
            elements: shape.elements,
            anchors: shape.anchors,
          },
          deletedAt: Date.now(),
          stateIndex: jsonStore.currentStateIndex,
        })
      }

      // Clear selections after deletion
      jsonStore.selectedElementCoords = null
      jsonStore.selectedIndividualShapeId = null
      jsonStore.selectedElementCoordsArray = []
    },
    restoreShape() {
      const jsonStore = useJsonStore()
      //find the array matching current state index
      const stateHistory = this.deleteShapeHistory[jsonStore.currentStateIndex]
      if (!stateHistory || stateHistory.length === 0) {
        return //nothing to restore for this state
      }
      //get the last deleted shape entry
      const deletedItem = stateHistory.pop()

      if (!jsonStore.currentInteractions[deletedItem.id]) {
        // Restore interaction
        this.restoreInteractionLayer(deletedItem.id)
        this.deleteShapeHistory[jsonStore.currentStateIndex].push(deletedItem)
        return
      }
      if (deletedItem.type === 'elements') {
        // Find existing shape and add elements back
        const shape = jsonStore.currentInteractionShapes.find((s) => s.id === deletedItem.id)
        shape.elements.push(...deletedItem.deletedElements.deletedShapes)
        shape.anchors.push(...deletedItem.deletedElements.deletedAnchors)
      } else if (deletedItem.type === 'shape') {
        // Recreate the entire shape
        jsonStore.currentInteractionShapes.push(deletedItem.deletedElements)
      }
    },
    deleteInteractionLayer(InteractionLayerId) {
      const jsonStore = useJsonStore()

      // Try to find shape (might not exist for template items)
      const shapeIndex = jsonStore.currentInteractionShapes.findIndex(
        (s) => s.id === InteractionLayerId,
      )
      const shapeData = shapeIndex !== -1 ? jsonStore.currentInteractionShapes[shapeIndex] : null

      // Get interaction data (should always exist)
      const interactionData = jsonStore.currentInteractions[InteractionLayerId]
      // Remove shape only if it exists
      if (shapeIndex !== -1) {
        jsonStore.currentInteractionShapes.splice(shapeIndex, 1)
      }

      // Always remove from interactions
      delete jsonStore.currentInteractions[InteractionLayerId]

      // Clear selection if the deleted shape was selected
      if (jsonStore.selectedShapeId === InteractionLayerId) {
        jsonStore.clearCurrentInteraction()
      }

      // Add to delete history for undo functionality (shapeData can be null)
      this.deleteInteractionLayerHistory.push({
        id: InteractionLayerId,
        shapeData: shapeData,
        interactionData: interactionData,
        deletedAt: Date.now(),
        stateIndex: jsonStore.currentStateIndex,
      })
    },
    restoreInteractionLayer(InteractionLayerId) {
      const jsonStore = useJsonStore()
      if (this.deleteInteractionLayerHistory.length === 0) {
        return // Nothing to restore
      }
      // Find the deleted interactionlayer in history
      const historyIndex = this.deleteInteractionLayerHistory.findIndex(
        (item) => item.id === InteractionLayerId && item.stateIndex === jsonStore.currentStateIndex,
      )
      if (historyIndex === -1) {
        return // interactionlayer not found in history
      }
      const deletedItem = this.deleteInteractionLayerHistory[historyIndex]

      // Restore interactionlayer data if it exists
      if (deletedItem.shapeData) {
        jsonStore.currentInteractionShapes.push(deletedItem.shapeData)
      }

      // Restore interaction data
      jsonStore.currentInteractions[InteractionLayerId] = deletedItem.interactionData

      // Remove from delete history
      this.deleteInteractionLayerHistory.splice(historyIndex, 1)
    },
    deleteInteractionTool(toolName) {
      const jsonStore = useJsonStore()
      const affectedStates = []

      // Loop through all states
      for (let stateIndex = 0; stateIndex < jsonStore.states.length; stateIndex++) {
        const state = jsonStore.states[stateIndex]
        const affectedInteractions = []

        // Delete tool from each interaction in this state
        for (const interactionId in state.interactions) {
          const interaction = state.interactions[interactionId]
          if (interaction[toolName]) {
            // Store the interaction data for undo
            affectedInteractions.push({
              interactionId: interactionId,
              toolData: interaction[toolName],
            })
            // Delete the tool from the interaction
            delete interaction[toolName]
          }
        }

        // Store affected interactions for this state
        if (affectedInteractions.length > 0) {
          affectedStates.push({
            stateIndex: stateIndex,
            affectedInteractions: affectedInteractions,
          })
        }
      }

      // Also update current state in memory
      for (const interactionId in jsonStore.currentInteractions) {
        const interaction = jsonStore.currentInteractions[interactionId]
        if (interaction[toolName]) {
          delete interaction[toolName]
        }
      }

      // Add to delete history for undo functionality
      this.deleteInteractionToolHistory.push({
        toolName: toolName,
        affectedStates: affectedStates,
        deletedAt: Date.now(),
      })
    },
    restoreInteractionTool(toolName) {
      const jsonStore = useJsonStore()
      if (this.deleteInteractionToolHistory.length === 0) {
        return // Nothing to restore
      }
      // Find the deleted tool in history
      const historyIndex = this.deleteInteractionToolHistory.findIndex(
        (item) => item.toolName === toolName,
      )
      if (historyIndex === -1) {
        return // Tool not found in history
      }
      const deletedItem = this.deleteInteractionToolHistory[historyIndex]

      // Restore tool data to affected interactions in all states
      for (const stateData of deletedItem.affectedStates) {
        const state = jsonStore.states[stateData.stateIndex]
        for (const entry of stateData.affectedInteractions) {
          const interaction = state.interactions[entry.interactionId]
          if (interaction) {
            interaction[toolName] = entry.toolData
          }
        }
      }

      // Also restore in current state in memory
      for (const stateData of deletedItem.affectedStates) {
        if (stateData.stateIndex === jsonStore.currentStateIndex) {
          for (const entry of stateData.affectedInteractions) {
            const interaction = jsonStore.currentInteractions[entry.interactionId]
            if (interaction) {
              interaction[toolName] = entry.toolData
            }
          }
        }
      }

      // Remove from delete history
      this.deleteInteractionToolHistory.splice(historyIndex, 1)
    },
  },
})
export { useJsonStore, useTransformStore, useActionStore, useHistoryStore }
