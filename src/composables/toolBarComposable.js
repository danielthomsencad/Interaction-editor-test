import { useJsonStore } from '@/stores/store'

const useToolBar = () => {
  const jsonStore = useJsonStore()

  const openFile = async () => {
    try {
      // Check for unsaved changes
      console.log('Opening file, hasUnsavedChanges:', jsonStore.hasUnsavedChanges)
      if (jsonStore.hasUnsavedChanges) {
        console.log('Showing save changes dialog...')
        const response = await window.api.showSaveChangesDialog()
        // 0 = Cancel, 1 = Don't Save, 2 = Save
        if (response === 0) {
          return // User cancelled
        } else if (response === 2) {
          // User wants to save
          const saved = await jsonStore.saveToFile()
          if (!saved) {
            return // Save failed, don't proceed
          }
        }
        // If response === 1, user chose "Don't Save", continue
      }

      const result = await window.api.showOpenDialog()
      if (!result) return

      const { data, filePath } = result

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
      jsonStore.currentFilePath = null
      jsonStore.hiddenShapeIds = []
      jsonStore.hasUnsavedChanges = false

      //load in new data
      jsonStore.jsonData = data
      jsonStore.states = data.states || []
      jsonStore.currentFilePath = filePath
      if (data.states && data.states.length > 0) {
        jsonStore.setCurrentState(0) // This will set currentImg AND currentInteractionShapes!
      }
      console.log('File opened successfully:', filePath)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const saveFile = async () => {
    try {
      // Show confirmation dialog
      const confirmed = await window.api.showSaveConfirmDialog()
      if (!confirmed) {
        console.log('Save cancelled by user')
        return
      }

      const success = await jsonStore.saveToFile()
      if (success) {
        console.log('Save completed successfully')
      }
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  return {
    openFile,
    saveFile,
  }
}

export default useToolBar
