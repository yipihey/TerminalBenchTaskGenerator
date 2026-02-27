import { ipcMain, BrowserWindow } from 'electron'
import { CritiqueService } from '../services/CritiqueService'
import { getDbService } from './workspace.ipc'

export function register(_mainWindow: BrowserWindow): void {
  // CritiqueService will be initialized lazily since getDbService() might not be ready yet
  let critiqueService: CritiqueService | null = null

  function getCritiqueService(): CritiqueService {
    if (!critiqueService) {
      critiqueService = new CritiqueService(getDbService())
    }
    return critiqueService
  }

  ipcMain.handle('critique:run', async (_event, workspaceId: string) => {
    return getCritiqueService().runCritique(workspaceId)
  })

  ipcMain.handle('critique:apply-suggestion', async (_event, workspaceId: string, suggestionId: string) => {
    return getCritiqueService().applySuggestion(workspaceId, suggestionId)
  })
}
