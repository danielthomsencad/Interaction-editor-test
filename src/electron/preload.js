// eslint-disable-next-line no-undef
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  saveJson: (filePath, data) => ipcRenderer.invoke('save-json', filePath, data),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  showSaveChangesDialog: () => ipcRenderer.invoke('show-save-changes-dialog'),
  showSaveConfirmDialog: () => ipcRenderer.invoke('show-save-confirm-dialog'),
  loadImage: (filePath) => ipcRenderer.invoke('load-image', filePath),
})
