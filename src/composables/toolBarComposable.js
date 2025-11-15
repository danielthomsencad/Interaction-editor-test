import { useJsonStore } from '@/stores/store'

const useToolBar = () => {
  const jsonStore = useJsonStore()

  const openFile = async () => {
    try {
      const data = await window.api.showOpenDialog()
      jsonStore.jsonData = data
      jsonStore.states = data.states || []
      jsonStore.currentImg =
        data.states && data.states.length > 0 ? `data/${data.states[0].img}` : null
      console.log('Current Image set to:', jsonStore.currentImg)
      console.log('File opened successfully', jsonStore.states)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  return {
    openFile,
  }
}

export default useToolBar
