import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ensureAppDirectories } from './utils/paths'
import * as workspaceIpc from './ipc/workspace.ipc'
import * as agentIpc from './ipc/agent.ipc'
import * as gitIpc from './ipc/git.ipc'
import * as filesystemIpc from './ipc/filesystem.ipc'
import * as dockerIpc from './ipc/docker.ipc'
import * as terminalIpc from './ipc/terminal.ipc'
import * as validationIpc from './ipc/validation.ipc'
import * as critiqueIpc from './ipc/critique.ipc'
import * as importIpc from './ipc/import.ipc'

/**
 * Electron main entry point.
 * Creates BrowserWindow, loads the renderer, and registers all IPC handlers.
 */

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    title: 'Terminal Bench Task Generator',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev && !process.argv.includes('--no-devtools')) {
      mainWindow.webContents.openDevTools({ mode: 'bottom' })
    }
  })

  // Log renderer console messages to main process stdout
  mainWindow.webContents.on('console-message', (_e, level, message) => {
    const prefix = ['LOG', 'WARN', 'ERR', 'INFO'][level] || 'LOG'
    console.log(`[renderer:${prefix}] ${message}`)
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer: dev server in development, built files in production
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window when a second instance is launched
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const win = windows[0]
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.terminalbench.taskgenerator')

    // Optimize window shortcuts for development
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Ensure app data directories exist
    ensureAppDirectories()

    // Create the main window
    const mainWindow = createWindow()

    // Register all IPC handlers
    workspaceIpc.register(mainWindow)
    agentIpc.register(mainWindow)
    gitIpc.register(mainWindow)
    filesystemIpc.register(mainWindow)
    dockerIpc.register(mainWindow)
    terminalIpc.register(mainWindow)
    validationIpc.register(mainWindow)
    critiqueIpc.register(mainWindow)
    importIpc.register(mainWindow)

    // macOS: re-create window when dock icon is clicked and no windows exist
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const newWindow = createWindow()
        workspaceIpc.register(newWindow)
        agentIpc.register(newWindow)
        gitIpc.register(newWindow)
        filesystemIpc.register(newWindow)
        dockerIpc.register(newWindow)
        terminalIpc.register(newWindow)
      }
    })
  })

  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
