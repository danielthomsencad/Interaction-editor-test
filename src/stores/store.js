import { defineStore } from 'pinia'

const useJsonStore = defineStore('jsonStore', {
  state: () => ({
    jsonData: null,
    states: [],
    currentImg: null,
    currentStateIndex: 0,
    currentInteractionShapes: [],
    selectedShapeId: null,
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
  },
  actions: {
    setCurrentState(index) {
      if (this.states && index >= 0 && index < this.states.length) {
        this.currentStateIndex = index
        this.currentImg = `data/${this.states[index].img}`
        this.currentInteractionShapes = this.states[index].interactionShapes || []
        this.selectedShapeId = null
        this.currentInteractionIndex = null // Clear interaction selection when changing states
      }
    },
    setCurrentInteraction(index) {
      if (
        this.currentInteractionShapes &&
        index >= 0 &&
        index < this.currentInteractionShapes.length
      ) {
        this.currentInteractionIndex = index
        this.selectedShapeId = this.currentInteractionShapes[index].id
      }
    },
  },
})

const useTransformStore = defineStore('transformStore', {
  state: () => ({
    panX: 0,
    panY: 0,
    zoomLevel: 1,
    contentWidth: 0,
    contentHeight: 0,
    initialCenterX: 0,
    initialCenterY: 0,
  }),
})

export { useJsonStore, useTransformStore }
