import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  loadJson: (filePath) => ipcRenderer.invoke('load-json', filePath),
  saveJson: (filePath, data) => ipcRenderer.invoke('save-json', filePath, data),
})
