import fs from 'node:fs'
import path from 'node:path'
import { getDatabasePath } from '../utils/paths'
import type { Workspace, WorkspaceStatus } from '../../shared/types'

interface DbData {
  workspaces: Record<string, Workspace>
  sessions: Record<string, {
    id: string
    workspaceId: string
    messages: string
    createdAt: string
    updatedAt: string
  }>
}

/**
 * Simple JSON file-based persistence for workspace metadata and sessions.
 */
export class DatabaseService {
  private data: DbData = { workspaces: {}, sessions: {} }
  private dbPath: string = ''

  constructor() {}

  async initDb(): Promise<void> {
    this.dbPath = getDatabasePath().replace(/\.db$/, '.json')
    const dir = path.dirname(this.dbPath)
    fs.mkdirSync(dir, { recursive: true })

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8')
        this.data = JSON.parse(raw)
      } catch {
        console.error('Failed to parse database file, starting fresh')
        this.data = { workspaces: {}, sessions: {} }
      }
    }
    this.persist()
    console.log('[DatabaseService] Initialized at', this.dbPath)
  }

  private persist(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  saveWorkspace(workspace: Workspace): void {
    this.data.workspaces[workspace.id] = workspace
    this.persist()
  }

  getWorkspaces(): Workspace[] {
    return Object.values(this.data.workspaces).sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt)
    )
  }

  getWorkspace(id: string): Workspace | null {
    return this.data.workspaces[id] ?? null
  }

  deleteWorkspace(id: string): void {
    delete this.data.workspaces[id]
    // Also delete associated sessions
    for (const [sid, session] of Object.entries(this.data.sessions)) {
      if (session.workspaceId === id) {
        delete this.data.sessions[sid]
      }
    }
    this.persist()
  }

  saveSession(session: {
    id: string
    workspaceId: string
    messages: string
    createdAt: string
    updatedAt: string
  }): void {
    this.data.sessions[session.id] = session
    this.persist()
  }

  getSession(id: string): {
    id: string
    workspaceId: string
    messages: string
    createdAt: string
    updatedAt: string
  } | null {
    return this.data.sessions[id] ?? null
  }

  getSessionsByWorkspace(workspaceId: string): Array<{
    id: string
    workspaceId: string
    messages: string
    createdAt: string
    updatedAt: string
  }> {
    return Object.values(this.data.sessions)
      .filter((s) => s.workspaceId === workspaceId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  close(): void {
    this.persist()
  }
}
