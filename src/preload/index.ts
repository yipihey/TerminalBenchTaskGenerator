import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './api'

const api: ElectronAPI = {
  // ── Workspace ──
  createWorkspace: (name, domain?, field?, template?) =>
    ipcRenderer.invoke('workspace:create', name, domain, field, template),
  openWorkspace: (path) =>
    ipcRenderer.invoke('workspace:open', path),
  listWorkspaces: () =>
    ipcRenderer.invoke('workspace:list'),
  updateWorkspace: (id, updates) =>
    ipcRenderer.invoke('workspace:update', id, updates),
  deleteWorkspace: (id) =>
    ipcRenderer.invoke('workspace:delete', id),
  getWorkspaceFiles: (workspaceId) =>
    ipcRenderer.invoke('workspace:get-files', workspaceId),

  // ── Filesystem ──
  readFile: (filePath) =>
    ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke('fs:write-file', filePath, content),
  startFileWatch: (workspaceId) =>
    ipcRenderer.invoke('fs:watch-start', workspaceId),
  stopFileWatch: (workspaceId) =>
    ipcRenderer.invoke('fs:watch-stop', workspaceId),
  openFileExternal: (filePath) =>
    ipcRenderer.invoke('fs:open-file-external', filePath),
  readFileBase64: (filePath) =>
    ipcRenderer.invoke('fs:read-file-base64', filePath),

  // ── Agent ──
  sendMessage: (workspaceId, message) =>
    ipcRenderer.invoke('agent:send-message', workspaceId, message),
  stopAgent: (workspaceId) =>
    ipcRenderer.invoke('agent:stop', workspaceId),
  getAgentStatus: (workspaceId) =>
    ipcRenderer.invoke('agent:get-status', workspaceId),

  // ── Chat persistence ──
  saveChatMessages: (workspaceId, messagesJson) =>
    ipcRenderer.invoke('chat:save-messages', workspaceId, messagesJson),
  loadChatMessages: (workspaceId) =>
    ipcRenderer.invoke('chat:load-messages', workspaceId),

  // ── Critique ──
  runCritique: (workspaceId) =>
    ipcRenderer.invoke('critique:run', workspaceId),
  applySuggestion: (workspaceId, suggestionId) =>
    ipcRenderer.invoke('critique:apply-suggestion', workspaceId, suggestionId),

  // ── Git ──
  getGitLog: (workspaceId) =>
    ipcRenderer.invoke('git:log', workspaceId),
  getGitDiff: (workspaceId, oid) =>
    ipcRenderer.invoke('git:diff', workspaceId, oid),
  restoreVersion: (workspaceId, oid) =>
    ipcRenderer.invoke('git:restore', workspaceId, oid),

  // ── Runner ──
  verifySolution: (workspaceId) =>
    ipcRenderer.invoke('runner:verify-solution', workspaceId),
  runAgentTrial: (workspaceId) =>
    ipcRenderer.invoke('runner:agent-trial', workspaceId),
  stopRunner: (workspaceId) =>
    ipcRenderer.invoke('runner:stop', workspaceId),

  // ── Validation ──
  validate: (workspaceId) =>
    ipcRenderer.invoke('validation:validate', workspaceId),

  // ── Import ──
  importFromJson: (filePath) =>
    ipcRenderer.invoke('import:from-json', filePath),
  importFromText: (text) =>
    ipcRenderer.invoke('import:from-text', text),

  // ── Browse ──
  fetchBrowseIndex: (forceRefresh?) =>
    ipcRenderer.invoke('browse:fetch-index', forceRefresh),
  fetchBrowseTaskDetail: (slug) =>
    ipcRenderer.invoke('browse:fetch-task-detail', slug),
  importBrowseTask: (slug) =>
    ipcRenderer.invoke('browse:import-task', slug),

  // ── Event listeners (main -> renderer) ──
  onAgentEvent: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, workspaceId: string, event: any) =>
      callback(workspaceId, event)
    ipcRenderer.on('agent:event', handler)
    return () => { ipcRenderer.removeListener('agent:event', handler) }
  },

  onAgentStatusChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, workspaceId: string, status: any) =>
      callback(workspaceId, status)
    ipcRenderer.on('agent:status-changed', handler)
    return () => { ipcRenderer.removeListener('agent:status-changed', handler) }
  },

  onFileChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, workspaceId: string, filePath: string, content: string) =>
      callback(workspaceId, filePath, content)
    ipcRenderer.on('fs:file-changed', handler)
    return () => { ipcRenderer.removeListener('fs:file-changed', handler) }
  },

  onRunnerLog: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, workspaceId: string, line: string) =>
      callback(workspaceId, line)
    ipcRenderer.on('runner:log', handler)
    return () => { ipcRenderer.removeListener('runner:log', handler) }
  },

  onRunnerStatusChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, workspaceId: string, status: any) =>
      callback(workspaceId, status)
    ipcRenderer.on('runner:status-changed', handler)
    return () => { ipcRenderer.removeListener('runner:status-changed', handler) }
  },

  onValidationIssues: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, workspaceId: string, issues: any) =>
      callback(workspaceId, issues)
    ipcRenderer.on('validation:issues', handler)
    return () => { ipcRenderer.removeListener('validation:issues', handler) }
  },
}

contextBridge.exposeInMainWorld('api', api)
