// eslint-disable-next-line no-undef
const { contextBridge, ipcRenderer } = require('electron') 

contextBridge.exposeInMainWorld('api', {
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  saveJson: (filePath, data) => ipcRenderer.invoke('save-json', filePath, data),
})
