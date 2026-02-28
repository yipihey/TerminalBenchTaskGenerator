import { ipcMain, BrowserWindow } from 'electron'
import { BrowseService } from '../services/BrowseService'
import { WorkspaceService } from '../services/WorkspaceService'
import { GitService } from '../services/GitService'
import { getDbService } from './workspace.ipc'

export function register(_mainWindow: BrowserWindow): void {
  let browseService: BrowseService | null = null

  function getBrowseService(): BrowseService {
    if (!browseService) {
      browseService = new BrowseService(
        new WorkspaceService(getDbService()),
        new GitService()
      )
    }
    return browseService
  }

  ipcMain.handle('browse:fetch-index', async (_event, forceRefresh?: boolean) => {
    return getBrowseService().fetchIndex(forceRefresh)
  })

  ipcMain.handle('browse:fetch-task-detail', async (_event, slug: string) => {
    return getBrowseService().fetchTaskDetail(slug)
  })

  ipcMain.handle('browse:import-task', async (_event, slug: string) => {
    return getBrowseService().importTask(slug)
  })
}
