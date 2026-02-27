import { ipcMain, BrowserWindow } from 'electron'
import { AgentService } from '../services/AgentService'
import { getDbService } from './workspace.ipc'

export function register(mainWindow: BrowserWindow): void {
  const agentService = new AgentService()
  agentService.setMainWindow(mainWindow)

  ipcMain.handle(
    'agent:send-message',
    async (_event, workspaceId: string, message: string) => {
      console.log(`[agent:send-message] workspaceId=${workspaceId}, msg="${message.substring(0, 80)}..."`)
      try {
        const db = getDbService()
        if (!db) {
          throw new Error('DatabaseService not initialized')
        }
        const workspace = db.getWorkspace(workspaceId)
        if (!workspace) {
          throw new Error(`Workspace not found: ${workspaceId}`)
        }
        console.log(`[agent:send-message] Found workspace at: ${workspace.path}`)
        await agentService.sendMessage(workspaceId, message, workspace.path)
        console.log(`[agent:send-message] sendMessage returned`)
      } catch (err) {
        console.error(`[agent:send-message] ERROR:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('agent:stop', async (_event, workspaceId: string) => {
    agentService.stop(workspaceId)
  })

  ipcMain.handle('agent:get-status', async (_event, workspaceId: string) => {
    return agentService.getStatus(workspaceId)
  })
}
