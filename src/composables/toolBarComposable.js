import { useJsonStore } from '@/stores/store'

const useToolBar = () => {
  const jsonStore = useJsonStore()

  const openFile = async () => {
    try {
      const data = await window.api.showOpenDialog()
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
