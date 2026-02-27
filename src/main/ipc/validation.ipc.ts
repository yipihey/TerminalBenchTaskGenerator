import { ipcMain, BrowserWindow } from 'electron'
import { HarborValidationService } from '../services/HarborValidationService'
import { getDbService } from './workspace.ipc'

export function register(_mainWindow: BrowserWindow): void {
  const validationService = new HarborValidationService()

  ipcMain.handle('validation:validate', async (_event, workspaceId: string) => {
    const workspace = getDbService().getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }
    return validationService.validate(workspace.path)
  })
}
