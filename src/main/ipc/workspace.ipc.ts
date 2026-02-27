import { ipcMain, BrowserWindow } from 'electron'
import { DatabaseService } from '../services/DatabaseService'
import { WorkspaceService } from '../services/WorkspaceService'
import { GitService } from '../services/GitService'

let dbService: DatabaseService
let workspaceService: WorkspaceService
let gitService: GitService
let initPromise: Promise<void> | null = null

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      console.log('[workspace.ipc] Starting initialization...')
      dbService = new DatabaseService()
      await dbService.initDb()
      workspaceService = new WorkspaceService(dbService)
      gitService = new GitService()
      console.log('[workspace.ipc] Initialization complete')
    })()
  }
  return initPromise
}

export function getDbService(): DatabaseService {
  return dbService
}

export function register(_mainWindow: BrowserWindow): void {
  ensureInit()

  ipcMain.handle(
    'workspace:create',
    async (_event, name: string, domain?: string, field?: string, template?: string) => {
      console.log('[workspace:create] Creating workspace:', name)
      try {
        await ensureInit()
        const workspace = await workspaceService.createWorkspace(name, domain, field, template)
        console.log('[workspace:create] Workspace created:', workspace.id, 'at', workspace.path)
        try {
          await gitService.initRepo(workspace.path)
          console.log('[workspace:create] Git repo initialized')
        } catch (err) {
          console.error('[workspace:create] Failed to init git repo:', err)
        }
        return workspace
      } catch (err) {
        console.error('[workspace:create] FAILED:', err)
        throw err
      }
    }
  )

  ipcMain.handle('workspace:open', async (_event, workspacePath: string) => {
    await ensureInit()
    return workspaceService.openWorkspace(workspacePath)
  })

  ipcMain.handle('workspace:list', async () => {
    await ensureInit()
    return workspaceService.listWorkspaces()
  })

  ipcMain.handle('workspace:delete', async (_event, id: string) => {
    await ensureInit()
    return workspaceService.deleteWorkspace(id)
  })

  ipcMain.handle('workspace:get-files', async (_event, workspaceId: string) => {
    await ensureInit()
    return workspaceService.getWorkspaceFiles(workspaceId)
  })
}
