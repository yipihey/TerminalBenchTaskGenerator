import { ipcMain, BrowserWindow } from 'electron'
import { GitService } from '../services/GitService'
import { getDbService } from './workspace.ipc'

export function register(_mainWindow: BrowserWindow): void {
  const gitService = new GitService()

  function getWorkspacePath(workspaceId: string): string {
    const workspace = getDbService().getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }
    return workspace.path
  }

  ipcMain.handle('git:log', async (_event, workspaceId: string) => {
    const workspacePath = getWorkspacePath(workspaceId)
    return gitService.getLog(workspacePath)
  })

  ipcMain.handle('git:diff', async (_event, workspaceId: string, oid: string) => {
    const workspacePath = getWorkspacePath(workspaceId)
    return gitService.getDiff(workspacePath, oid)
  })

  ipcMain.handle('git:restore', async (_event, workspaceId: string, oid: string) => {
    const workspacePath = getWorkspacePath(workspaceId)
    await gitService.restoreToCommit(workspacePath, oid)
  })
}
