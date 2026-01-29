/* global process */

import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './electron/ipcHandlers.js'
import { join } from 'path'
import { fileURLToPath } from 'url'

function createWindow() {
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const preloadPath = join(__dirname, 'electron/preload.js')
  console.log('Preload path:', preloadPath)
  const isDev = !app.isPackaged;

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      webSecurity: false, // Disable web security to allow local file access
      allowRunningInsecureContent: true,
    },
  })

 if (isDev) {
  win.loadURL('http://localhost:5173');
} else {
  win.loadFile('dist/index.html');
}
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
