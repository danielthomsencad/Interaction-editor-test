import { defineStore } from 'pinia'

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
    currentInteractionIndex: null, // Add this for interaction selection
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
    setCurrentInfolayer(name) {
      console.log('Selecting infolayer:', name)
      this.selectedInfolayerId = name
      this.selectedShapeId = null
      this.selectedIndividualShapeId = null
      this.selectedElementCoords = null
      this.selectedElementCoordsArray = []
    },
    setInteractionShapeById(shapeId) {
      this.selectedShapeId = shapeId
      this.selectedInfolayerId = null
      this.selectedIndividualShapeId = null
      this.selectedElementCoords = null
      this.selectedElementCoordsArray = []
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
  }),
  actions: {
    deleteShape(shapeId) {
      const jsonStore = useJsonStore()

      // Try to find shape (might not exist for template items)
      const shapeIndex = jsonStore.currentInteractionShapes.findIndex((s) => s.id === shapeId)
      const shapeData = shapeIndex !== -1 ? jsonStore.currentInteractionShapes[shapeIndex] : null

      // Get interaction data (should always exist)
      const interactionData = jsonStore.currentInteractions[shapeId]

      // Remove shape only if it exists
      if (shapeIndex !== -1) {
        jsonStore.currentInteractionShapes.splice(shapeIndex, 1)
      }

      // Always remove from interactions
      delete jsonStore.currentInteractions[shapeId]

      // Clear selection if the deleted shape was selected
      if (jsonStore.selectedShapeId === shapeId) {
        jsonStore.clearCurrentInteraction()
      }

      // Add to delete history for undo functionality (shapeData can be null)
      this.deleteShapeHistory.push({
        id: shapeId,
        shapeData: shapeData,
        interactionData: interactionData,
        deletedAt: Date.now(),
      })
    },
    restoreShape(shapeId) {
      const jsonStore = useJsonStore()
      if (this.deleteShapeHistory.length === 0) {
        return // Nothing to restore
      }
      // Find the deleted shape in history
      const historyIndex = this.deleteShapeHistory.findIndex((item) => item.id === shapeId)
      if (historyIndex === -1) {
        return // Shape not found in history
      }
      const deletedItem = this.deleteShapeHistory[historyIndex]

      // Restore shape data if it exists
      if (deletedItem.shapeData) {
        jsonStore.currentInteractionShapes.push(deletedItem.shapeData)
      }

      // Restore interaction data
      jsonStore.currentInteractions[shapeId] = deletedItem.interactionData

      // Remove from delete history
      this.deleteShapeHistory.splice(historyIndex, 1)
    },
    deleteInteractionTool(toolName) {
      const jsonStore = useJsonStore()
      const affectedInteractions = []

      for (const interactionId in jsonStore.currentInteractions) {
        const interaction = jsonStore.currentInteractions[interactionId]
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

      // Add to delete history for undo functionality
      this.deleteInteractionToolHistory.push({
        toolName: toolName,
        affectedInteractions: affectedInteractions,
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

      // Restore tool data to affected interactions
      for (const entry of deletedItem.affectedInteractions) {
        const interaction = jsonStore.currentInteractions[entry.interactionId]
        if (interaction) {
          interaction[toolName] = entry.toolData
        }
      }

      // Remove from delete history
      this.deleteInteractionToolHistory.splice(historyIndex, 1)
    },
  },
})
export { useJsonStore, useTransformStore, useActionStore, useHistoryStore }
