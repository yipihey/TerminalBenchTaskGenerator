import type {
  Workspace,
  HarborFile,
  ChatMessage,
  CritiqueResult,
  GitCommit,
  GitDiff,
  RunResult,
  ValidationIssue,
  AgentEvent,
  RunStatus,
  TerminalBenchIndex,
  TerminalBenchTaskMeta,
} from '../shared/types'

export interface ElectronAPI {
  // Workspace
  createWorkspace(name: string, domain?: string, field?: string, template?: string): Promise<Workspace>
  openWorkspace(path: string): Promise<Workspace>
  listWorkspaces(): Promise<Workspace[]>
  updateWorkspace(id: string, updates: { name?: string }): Promise<Workspace>
  deleteWorkspace(id: string): Promise<void>
  getWorkspaceFiles(workspaceId: string): Promise<HarborFile[]>

  // Filesystem
  readFile(filePath: string): Promise<string>
  writeFile(filePath: string, content: string): Promise<void>
  startFileWatch(workspaceId: string): Promise<void>
  stopFileWatch(workspaceId: string): Promise<void>
  openFileExternal(filePath: string): Promise<string>
  readFileBase64(filePath: string): Promise<string>

  // Agent
  sendMessage(workspaceId: string, message: string): Promise<void>
  stopAgent(workspaceId: string): Promise<void>
  getAgentStatus(workspaceId: string): Promise<'idle' | 'thinking' | 'writing'>

  // Chat persistence
  saveChatMessages(workspaceId: string, messagesJson: string): Promise<void>
  loadChatMessages(workspaceId: string): Promise<string | null>

  // Critique
  runCritique(workspaceId: string): Promise<CritiqueResult>
  applySuggestion(workspaceId: string, suggestionId: string): Promise<void>

  // Git
  getGitLog(workspaceId: string): Promise<GitCommit[]>
  getGitDiff(workspaceId: string, oid: string): Promise<GitDiff[]>
  restoreVersion(workspaceId: string, oid: string): Promise<void>

  // Runner
  verifySolution(workspaceId: string): Promise<RunResult>
  runAgentTrial(workspaceId: string): Promise<RunResult>
  stopRunner(workspaceId: string): Promise<void>

  // Validation
  validate(workspaceId: string): Promise<ValidationIssue[]>

  // Import
  importFromJson(filePath: string): Promise<Workspace>
  importFromText(text: string): Promise<Workspace>

  // Browse
  fetchBrowseIndex(forceRefresh?: boolean): Promise<TerminalBenchIndex>
  fetchBrowseTaskDetail(slug: string): Promise<TerminalBenchTaskMeta>
  importBrowseTask(slug: string): Promise<Workspace>

  // Event listeners (returns unsubscribe function)
  onAgentEvent(callback: (workspaceId: string, event: AgentEvent) => void): () => void
  onAgentStatusChanged(callback: (workspaceId: string, status: 'idle' | 'thinking' | 'writing') => void): () => void
  onFileChanged(callback: (workspaceId: string, filePath: string, content: string) => void): () => void
  onRunnerLog(callback: (workspaceId: string, line: string) => void): () => void
  onRunnerStatusChanged(callback: (workspaceId: string, status: RunStatus) => void): () => void
  onValidationIssues(callback: (workspaceId: string, issues: ValidationIssue[]) => void): () => void
}
