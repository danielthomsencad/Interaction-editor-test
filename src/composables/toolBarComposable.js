import { useJsonStore } from '@/stores/store'

const useToolBar = () => {
  const jsonStore = useJsonStore()

  const openFile = async () => {
    try {
      const data = await window.api.showOpenDialog()
      //clear existing data
      jsonStore.jsonData = null
      jsonStore.states = []
      jsonStore.currentImg = null
      jsonStore.currentStateIndex = 0
      jsonStore.currentInteractions = {}
      jsonStore.currentInteractionShapes = []
      jsonStore.currentInfolayer = []
      jsonStore.selectedShapeId = null
      jsonStore.selectedInfolayerId = null
      jsonStore.selectedIndividualShapeId = null
      jsonStore.selectedElementCoords = null
      jsonStore.selectedElementCoordsArray = []
      jsonStore.currentInteractionIndex = null

      //load in new data
      jsonStore.jsonData = data
      jsonStore.states = data.states || []
      if (data.states && data.states.length > 0) {
        jsonStore.setCurrentState(0) // This will set currentImg AND currentInteractionShapes!
      }
      console.log('File opened successfully', jsonStore.currentActions)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  return {
    openFile,
  }
}

export default useToolBar
