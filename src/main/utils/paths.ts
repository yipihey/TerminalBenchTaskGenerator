import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Resolves application data paths for workspace storage,
 * database location, and other persistent data.
 */

/** Root directory for all app-managed data */
export function getAppDataPath(): string {
  return path.join(app.getPath('userData'), 'TerminalBenchTaskGenerator')
}

/** Directory where workspace folders are stored */
export function getWorkspacesRoot(): string {
  return path.join(getAppDataPath(), 'workspaces')
}

/** Path to the SQLite database file */
export function getDatabasePath(): string {
  return path.join(getAppDataPath(), 'app.db')
}

/** Path to logs directory */
export function getLogsPath(): string {
  return path.join(getAppDataPath(), 'logs')
}

/** Ensure all required directories exist */
export function ensureAppDirectories(): void {
  const dirs = [getAppDataPath(), getWorkspacesRoot(), getLogsPath()]
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/** Resolve a workspace path by ID */
export function getWorkspacePath(workspaceId: string): string {
  return path.join(getWorkspacesRoot(), workspaceId)
}
