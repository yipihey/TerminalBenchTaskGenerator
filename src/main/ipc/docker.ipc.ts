import { ipcMain, BrowserWindow } from 'electron'
import { DockerService } from '../services/DockerService'
import { getDbService } from './workspace.ipc'

export function register(mainWindow: BrowserWindow): void {
  const dockerService = new DockerService()
  dockerService.setMainWindow(mainWindow)

  function getWorkspacePath(workspaceId: string): string {
    const workspace = getDbService().getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }
    return workspace.path
  }

  ipcMain.handle('runner:verify-solution', async (_event, workspaceId: string) => {
    const workspacePath = getWorkspacePath(workspaceId)
    return dockerService.runSolution(workspacePath)
  })

  ipcMain.handle('runner:agent-trial', async (_event, workspaceId: string) => {
    const workspacePath = getWorkspacePath(workspaceId)
    return dockerService.runAgentTrial(workspacePath)
  })

  ipcMain.handle('runner:stop', async (_event, workspaceId: string) => {
    dockerService.stop(workspaceId)
  })
}
