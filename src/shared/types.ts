// ─── Harbor Task Types ───

export interface HarborTaskToml {
  task: {
    name: string
    description: string
    domain: 'life-sciences' | 'physical-sciences' | 'earth-sciences'
    field: string
    subfield?: string
    difficulty: 'easy' | 'medium' | 'hard' | 'expert'
    tags?: string[]
    canary_string?: string
  }
  environment: {
    base_image?: string
    timeout_seconds: number
    memory_limit_mb?: number
    cpu_limit?: number
    gpu?: boolean
  }
  agent: {
    model?: string
    max_tokens?: number
    timeout_seconds: number
  }
  verifier: {
    type: 'script'
    script: string
  }
}

export interface HarborFile {
  path: string
  content: string
  language: string // monaco language id
}

// ─── Workspace Types ───

export type WorkspaceStatus = 'clean' | 'dirty' | 'agent-active' | 'run-failed' | 'run-passed'

export interface Workspace {
  id: string
  name: string
  path: string
  status: WorkspaceStatus
  createdAt: string
  updatedAt: string
  domain?: string
  field?: string
  agentSessionId?: string
}

// ─── Chat / Agent Types ───

export type AgentEventType =
  | 'assistant_message'
  | 'user_message'
  | 'tool_use'
  | 'tool_result'
  | 'thinking'
  | 'error'
  | 'done'

export interface AgentEvent {
  type: AgentEventType
  timestamp: number
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isExpanded?: boolean
}

// ─── Critique Types ───

export interface CritiqueDimension {
  name: string
  score: number // 1-5
  feedback: string
  suggestions: string[]
}

export interface CritiqueResult {
  id: string
  workspaceId: string
  timestamp: number
  dimensions: CritiqueDimension[]
  overallScore: number
  prioritizedSuggestions: CritiqueSuggestion[]
}

export interface CritiqueSuggestion {
  id: string
  dimension: string
  severity: 'critical' | 'important' | 'minor'
  title: string
  description: string
  applied: boolean
}

// ─── Runner Types ───

export type RunMode = 'verify-solution' | 'agent-trial' | 'harbor-cli'

export type RunStatus = 'idle' | 'building' | 'running' | 'passed' | 'failed' | 'error'

export interface RunResult {
  id: string
  workspaceId: string
  mode: RunMode
  status: RunStatus
  reward?: number
  startedAt: number
  finishedAt?: number
  logs: string
  trace?: AgentEvent[]
}

// ─── Git Types ───

export interface GitCommit {
  oid: string
  message: string
  author: string
  timestamp: number
}

export interface GitDiff {
  filepath: string
  oldContent: string
  newContent: string
}

// ─── Validation Types ───

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  file: string
  line?: number
  column?: number
  severity: ValidationSeverity
  message: string
  code: string
}

// ─── Browse Types ───

export interface TerminalBenchTaskMeta {
  slug: string                    // dir name, e.g. "hello-world"
  instruction: string
  authorName: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  tags: string[]
  maxAgentTimeoutSec: number
  maxTestTimeoutSec: number
  files: string[]                 // relative file paths in the task dir
}

export interface TerminalBenchIndex {
  tasks: TerminalBenchTaskMeta[]
  fetchedAt: number               // epoch ms for TTL
}

// ─── IPC Channel Types ───

export interface IpcChannels {
  // Workspace
  'workspace:create': (name: string, domain?: string, field?: string, template?: string) => Promise<Workspace>
  'workspace:open': (path: string) => Promise<Workspace>
  'workspace:list': () => Promise<Workspace[]>
  'workspace:delete': (id: string) => Promise<void>
  'workspace:get-files': (workspaceId: string) => Promise<HarborFile[]>

  // Filesystem
  'fs:read-file': (filePath: string) => Promise<string>
  'fs:write-file': (filePath: string, content: string) => Promise<void>
  'fs:watch-start': (workspaceId: string) => Promise<void>
  'fs:watch-stop': (workspaceId: string) => Promise<void>

  // Agent
  'agent:send-message': (workspaceId: string, message: string) => Promise<void>
  'agent:stop': (workspaceId: string) => Promise<void>
  'agent:get-status': (workspaceId: string) => Promise<'idle' | 'thinking' | 'writing'>

  // Critique
  'critique:run': (workspaceId: string) => Promise<CritiqueResult>
  'critique:apply-suggestion': (workspaceId: string, suggestionId: string) => Promise<void>

  // Git
  'git:log': (workspaceId: string) => Promise<GitCommit[]>
  'git:diff': (workspaceId: string, oid: string) => Promise<GitDiff[]>
  'git:restore': (workspaceId: string, oid: string) => Promise<void>

  // Docker / Runner
  'runner:verify-solution': (workspaceId: string) => Promise<RunResult>
  'runner:agent-trial': (workspaceId: string) => Promise<RunResult>
  'runner:stop': (workspaceId: string) => Promise<void>

  // Validation
  'validation:validate': (workspaceId: string) => Promise<ValidationIssue[]>

  // Import
  'import:from-json': (filePath: string) => Promise<Workspace>
  'import:from-text': (text: string) => Promise<Workspace>

  // Browse
  'browse:fetch-index': (forceRefresh?: boolean) => Promise<TerminalBenchIndex>
  'browse:fetch-task-detail': (slug: string) => Promise<TerminalBenchTaskMeta>
  'browse:import-task': (slug: string) => Promise<Workspace>
}

// IPC event channels (main → renderer)
export interface IpcEvents {
  'agent:event': (workspaceId: string, event: AgentEvent) => void
  'agent:status-changed': (workspaceId: string, status: 'idle' | 'thinking' | 'writing') => void
  'fs:file-changed': (workspaceId: string, filePath: string, content: string) => void
  'runner:log': (workspaceId: string, line: string) => void
  'runner:status-changed': (workspaceId: string, status: RunStatus) => void
  'validation:issues': (workspaceId: string, issues: ValidationIssue[]) => void
}
