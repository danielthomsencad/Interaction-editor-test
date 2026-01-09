import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'

export function registerIpcHandlers() {
  ipcMain.handle('load-json', (event, filePath) => {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  })

  ipcMain.handle('save-json', (event, filePath, data) => {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('show-open-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({})
    if (!canceled) {
      return JSON.parse(readFileSync(filePaths[0], 'utf-8'))
    }
  })

  ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender)  // Get parent window
  
    const result = await dialog.showMessageBox(parentWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Delete'],
      defaultId: 0,
      cancelId: 0,
      title: 'Confirm Delete',
      message: options.message,
      detail: options.detail,
    })
    return result.response === 1 // Returns true if "Delete" clicked
  })
}
