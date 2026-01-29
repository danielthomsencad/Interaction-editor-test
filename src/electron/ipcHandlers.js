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
      const data = JSON.parse(readFileSync(filePaths[0], 'utf-8'))
      return { data, filePath: filePaths[0] }
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

  ipcMain.handle('show-save-changes-dialog', async (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender)
  
    const result = await dialog.showMessageBox(parentWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Don\'t Save', 'Save'],
      defaultId: 2,
      cancelId: 0,
      title: 'Save Changes?',
      message: 'Do you want to save changes to this file?',
      detail: 'Your changes will be lost if you don\'t save them.',
    })
    // Returns: 0 = Cancel, 1 = Don't Save, 2 = Save
    return result.response
  })

  ipcMain.handle('show-save-confirm-dialog', async (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender)
  
    const result = await dialog.showMessageBox(parentWindow, {
      type: 'question',
      buttons: ['Cancel', 'Save'],
      defaultId: 1,
      cancelId: 0,
      title: 'Confirm Save',
      message: 'Are you sure you want to save this file?',
      detail: 'This will overwrite the existing file with your changes.',
    })
    return result.response === 1 // Returns true if "Save" clicked
  })

  ipcMain.handle('load-image', (event, filePath) => {
    try {
      const imageBuffer = readFileSync(filePath)
      const base64 = imageBuffer.toString('base64')
      // Determine MIME type from file extension
      const ext = filePath.split('.').pop().toLowerCase()
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('Failed to load image:', filePath, error)
      return null
    }
  })
}
