import { ipcMain, BrowserWindow } from 'electron'
import { TerminalService } from '../services/TerminalService'

/**
 * Stub IPC handlers for terminal operations.
 * These will be fully implemented once node-pty native compilation is set up.
 */
export function register(mainWindow: BrowserWindow): void {
  const terminalService = new TerminalService()

  ipcMain.handle(
    'terminal:create',
    async (_event, workspaceId: string) => {
      return terminalService.createTerminal(workspaceId)
    }
  )

  ipcMain.handle(
    'terminal:write',
    async (_event, workspaceId: string, data: string) => {
      terminalService.write(workspaceId, data)
    }
  )

  ipcMain.handle(
    'terminal:resize',
    async (
      _event,
      workspaceId: string,
      cols: number,
      rows: number
    ) => {
      terminalService.resize(workspaceId, cols, rows)
    }
  )

  ipcMain.handle(
    'terminal:destroy',
    async (_event, workspaceId: string) => {
      terminalService.destroy(workspaceId)
    }
  )
}
