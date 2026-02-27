import { ipcMain, BrowserWindow } from 'electron'
import { ChatImportService } from '../services/ChatImportService'
import { WorkspaceService } from '../services/WorkspaceService'
import { getDbService } from './workspace.ipc'

export function register(_mainWindow: BrowserWindow): void {
  let importService: ChatImportService | null = null

  function getImportService(): ChatImportService {
    if (!importService) {
      importService = new ChatImportService(new WorkspaceService(getDbService()))
    }
    return importService
  }

  ipcMain.handle('import:from-json', async (_event, filePath: string) => {
    return getImportService().importFromJson(filePath)
  })

  ipcMain.handle('import:from-text', async (_event, text: string) => {
    return getImportService().importFromText(text)
  })
}
