/* global process */

import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './electron/ipcHandlers.js'
import { join } from 'path'
import { fileURLToPath } from 'url'

function createWindow() {
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'electron/preload.js'),
    },
  })

  win.loadURL('http://localhost:5173') // Vite default dev server
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
