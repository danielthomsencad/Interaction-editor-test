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
        return state.currentInteractionShapes.find((shape) => shape.id === state.selectedIndividualShapeId)
      }
      return null
    },
    selectedInfoLayer: (state) => {
      if (state.currentInfolayer && state.selectedInfolayerId !== null) {
        return state.currentInfolayer.find((info) => info.name === state.selectedInfolayerId)
      }
    }
  },
  actions: {
    setCurrentState(index) {
      if (this.states && index >= 0 && index < this.states.length) {
        
        this.currentStateIndex = index
        this.currentImg = `data/${this.states[index].img}`
        this.currentInteractionShapes = this.states[index].interactionShapes || []
        this.currentInteractions = this.states[index].interactions || {}
        this.currentInfolayer = this.states[index].infolayer || []; 
        this.selectedInfolayerId = null; // Clear info layer selection when changing states
        this.selectedShapeId = null
        this.selectedIndividualShapeId = null // Clear individual selection when changing states
        this.selectedElementCoords = null // Clear element selection when changing states
        this.selectedElementCoordsArray = [] // Clear multiple selection when changing states
        this.currentInteractionIndex = null // Clear interaction selection when changing states
        console.log('setting info layer to:', this.currentInfolayer);
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
      console.log('Selecting infolayer:', name);
      this.selectedInfolayerId = name;
      this.selectedShapeId = null;
      this.selectedIndividualShapeId = null; 
      this.selectedElementCoords = null; 
      this.selectedElementCoordsArray = [];
    }, 
    setInteractionShapeById(shapeId) {
    this.selectedShapeId = shapeId;
    this.selectedInfolayerId = null;
    this.selectedIndividualShapeId = null; 
    this.selectedElementCoords = null; 
    this.selectedElementCoordsArray = [];
    },
    updateShapeColor(shapeId, newColor) {
      // Update color in interactionShapes array (what gets rendered)
      const shape = this.currentInteractionShapes.find(s => s.id === shapeId)
      if (shape) {
        shape.color = newColor
      }
      
      // Also update color in interactions meta (for consistency)
      if (this.currentInteractions[shapeId]?.meta) {
        this.currentInteractions[shapeId].meta.color = newColor
      }
    },
    clearCurrentInteraction() {
      this.currentInteractionIndex = null
      this.selectedShapeId = null
      this.selectedIndividualShapeId = null
      this.selectedElementCoords = null
      this.selectedElementCoordsArray = []
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
      this.toggleActionContainer = !this.toggleActionContainer;
      this.currentInteractionId = id;
    }
  }
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
    }
  }
})

export { useJsonStore, useTransformStore, useActionStore }
