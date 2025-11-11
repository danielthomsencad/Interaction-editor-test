import { ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'

export function registerIpcHandlers() {
  ipcMain.handle('load-json', (event, filePath) => {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  })

  ipcMain.handle('save-json', (event, filePath, data) => {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  })
}
