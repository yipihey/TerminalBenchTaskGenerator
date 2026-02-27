import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import { getDbService } from './workspace.ipc'

const watchers = new Map<string, FSWatcher>()

export function register(mainWindow: BrowserWindow): void {
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    return fs.readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('fs:watch-start', async (_event, workspaceId: string) => {
    const existing = watchers.get(workspaceId)
    if (existing) {
      await existing.close()
    }

    const workspace = getDbService().getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }

    const watcher = watch(workspace.path, {
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/.*'],
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    })

    watcher.on('change', (changedPath: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const content = fs.readFileSync(changedPath, 'utf-8')
          mainWindow.webContents.send('fs:file-changed', workspaceId, changedPath, content)
        } catch {
          // File might have been deleted
        }
      }
    })

    watcher.on('add', (addedPath: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const content = fs.readFileSync(addedPath, 'utf-8')
          mainWindow.webContents.send('fs:file-changed', workspaceId, addedPath, content)
        } catch {
          // File might be binary or inaccessible
        }
      }
    })

    watchers.set(workspaceId, watcher)
  })

  ipcMain.handle('fs:watch-stop', async (_event, workspaceId: string) => {
    const watcher = watchers.get(workspaceId)
    if (watcher) {
      await watcher.close()
      watchers.delete(workspaceId)
    }
  })
}
