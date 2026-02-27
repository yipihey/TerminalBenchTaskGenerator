import { spawn, type ChildProcess } from 'node:child_process'
import type { BrowserWindow } from 'electron'
import type { AgentEvent, AgentEventType } from '../../shared/types'

/**
 * Claude Code CLI subprocess manager.
 * Manages one subprocess per workspace, streaming agent events
 * to the renderer process.
 */

interface ActiveProcess {
  process: ChildProcess
  status: 'idle' | 'thinking' | 'writing'
}

export class AgentService {
  private processes: Map<string, ActiveProcess> = new Map()
  /** Track which workspace sessions have been used (for --resume vs --session-id) */
  private usedSessions: Set<string> = new Set()
  private mainWindow: BrowserWindow | null = null

  /** Harbor-aware system prompt instructing Claude to create/update task files */
  private harborSystemPrompt = `You are an assistant helping to create and refine Terminal-Bench-Science benchmark tasks in Harbor format.

The workspace contains the following standard Harbor files:
- task.toml: Task metadata and configuration (TOML format)
- instruction.md: Natural language instructions for the AI agent
- Dockerfile: Container image definition for the task environment
- solve.sh: Reference solution script (proves the task is solvable)
- test.sh: Verification script that checks agent output and writes reward (0.0 or 1.0) to /logs/verifier/reward.txt

Key Harbor conventions:
1. The Dockerfile MUST use WORKDIR /app and create /logs/verifier/ directory
2. test.sh MUST write a numeric reward value to /logs/verifier/reward.txt
3. instruction.md should NOT contain absolute file paths or reveal the canary string
4. task.toml domains: life-sciences, physical-sciences, earth-sciences
5. task.toml difficulty levels: easy, medium, hard, expert
6. All task data and scripts must be self-contained within the workspace

When the user asks you to create or modify task files, read existing files first, then make precise edits. Explain your changes.`

  constructor() {}

  /** Set the main window reference for sending IPC events */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Send a message to the Claude agent for a given workspace.
   * Spawns a new claude CLI subprocess with stream-json output.
   */
  async sendMessage(
    workspaceId: string,
    message: string,
    workspacePath: string
  ): Promise<void> {
    // Stop any existing process for this workspace
    this.stop(workspaceId)

    const isResume = this.usedSessions.has(workspaceId)
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
      // First message: create session with --session-id
      // Subsequent messages: resume existing session with --resume
      ...(isResume
        ? ['--resume', workspaceId]
        : ['--session-id', workspaceId, '--append-system-prompt', this.harborSystemPrompt]),
      '-p', message
    ]
    this.usedSessions.add(workspaceId)

    // Strip all Claude Code env vars to avoid "nested session" block when
    // the app is launched from within a Claude Code terminal session
    const env = { ...process.env }
    delete env.CLAUDECODE
    delete env.CLAUDE_CODE_ENTRYPOINT

    console.log(`[AgentService] Spawning claude with args:`, args.map((a, i) => i === args.indexOf(this.harborSystemPrompt) ? '<system-prompt>' : a))
    console.log(`[AgentService] cwd: ${workspacePath}`)

    const child = spawn('claude', args, {
      cwd: workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    })

    // Close stdin immediately — the CLI hangs waiting for stdin EOF in --print mode
    child.stdin?.end()

    console.log(`[AgentService] Spawned PID: ${child.pid}`)

    const activeProcess: ActiveProcess = {
      process: child,
      status: 'thinking'
    }
    this.processes.set(workspaceId, activeProcess)

    // Notify renderer of status change
    this.emitStatusChange(workspaceId, 'thinking')

    let buffer = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      console.log(`[AgentService] stdout (${text.length} bytes):`, text.substring(0, 200))
      buffer += text
      const lines = buffer.split('\n')
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          this.parseStreamLine(workspaceId, line.trim())
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const errorText = chunk.toString('utf-8').trim()
      console.log(`[AgentService] stderr:`, errorText.substring(0, 300))
      if (errorText) {
        this.emitEvent(workspaceId, {
          type: 'error',
          timestamp: Date.now(),
          content: errorText
        })
      }
    })

    child.on('close', (code: number | null) => {
      console.log(`[AgentService] Process closed with code: ${code}`)
      // Process any remaining buffer content
      if (buffer.trim()) {
        this.parseStreamLine(workspaceId, buffer.trim())
      }

      this.emitEvent(workspaceId, {
        type: 'done',
        timestamp: Date.now(),
        content: ''
      })
      this.emitStatusChange(workspaceId, 'idle')
      this.processes.delete(workspaceId)
    })

    child.on('error', (err: Error) => {
      this.emitEvent(workspaceId, {
        type: 'error',
        timestamp: Date.now(),
        content: `Failed to spawn claude process: ${err.message}`
      })
      this.emitStatusChange(workspaceId, 'idle')
      this.processes.delete(workspaceId)
    })
  }

  /** Stop the agent subprocess for a workspace */
  stop(workspaceId: string): void {
    const active = this.processes.get(workspaceId)
    if (active) {
      active.process.kill('SIGTERM')
      this.processes.delete(workspaceId)
      this.emitStatusChange(workspaceId, 'idle')
    }
  }

  /** Get the current status of the agent for a workspace */
  getStatus(workspaceId: string): 'idle' | 'thinking' | 'writing' {
    const active = this.processes.get(workspaceId)
    return active?.status ?? 'idle'
  }

  /**
   * Parse a single line of stream-json output from the Claude CLI.
   *
   * The actual stream-json format (with --verbose) emits these top-level types:
   *   - system (subtype=init): session metadata
   *   - assistant: wraps message.content[] with thinking/tool_use/text blocks
   *   - user: contains tool_result content blocks
   *   - result (subtype=success|error): final summary
   *   - rate_limit_event: rate limit info (ignored)
   *   - error: top-level errors
   */
  private parseStreamLine(workspaceId: string, line: string): void {
    try {
      const data = JSON.parse(line) as Record<string, unknown>
      const events = this.mapToAgentEvents(data)
      const active = this.processes.get(workspaceId)

      for (const event of events) {
        if (active) {
          if (event.type === 'tool_use') {
            active.status = 'writing'
            this.emitStatusChange(workspaceId, 'writing')
          } else if (
            event.type === 'assistant_message' ||
            event.type === 'thinking'
          ) {
            active.status = 'thinking'
            this.emitStatusChange(workspaceId, 'thinking')
          }
        }
        this.emitEvent(workspaceId, event)
      }
    } catch {
      // Non-JSON line; ignore
    }
  }

  /**
   * Map a parsed JSON object from Claude CLI stream-json to AgentEvents.
   * One line can produce multiple events (e.g. an assistant message with
   * both thinking and text content blocks).
   */
  private mapToAgentEvents(
    data: Record<string, unknown>
  ): AgentEvent[] {
    const type = data.type as string | undefined
    const events: AgentEvent[] = []

    // ── assistant messages: unwrap message.content[] blocks ──
    if (type === 'assistant') {
      const message = data.message as Record<string, unknown> | undefined
      const contentBlocks = (message?.content as Array<Record<string, unknown>>) ?? []

      for (const block of contentBlocks) {
        const blockType = block.type as string

        if (blockType === 'thinking') {
          events.push({
            type: 'thinking',
            timestamp: Date.now(),
            content: (block.thinking as string) || ''
          })
        } else if (blockType === 'text') {
          events.push({
            type: 'assistant_message',
            timestamp: Date.now(),
            content: (block.text as string) || ''
          })
        } else if (blockType === 'tool_use') {
          events.push({
            type: 'tool_use',
            timestamp: Date.now(),
            content: JSON.stringify(block.input ?? {}),
            toolName: block.name as string,
            toolInput: (block.input as Record<string, unknown>) ?? {}
          })
        }
      }
      return events
    }

    // ── user messages (tool results) ──
    if (type === 'user') {
      const message = data.message as Record<string, unknown> | undefined
      const contentBlocks = (message?.content as Array<Record<string, unknown>>) ?? []

      for (const block of contentBlocks) {
        if ((block.type as string) === 'tool_result') {
          const resultContent = block.content as string | Array<Record<string, unknown>> | undefined
          const text = typeof resultContent === 'string'
            ? resultContent
            : Array.isArray(resultContent)
              ? resultContent.map(c => (c.text as string) || '').join('\n')
              : ''
          events.push({
            type: 'tool_result',
            timestamp: Date.now(),
            content: text.substring(0, 2000), // Truncate large tool outputs
            toolResult: text.substring(0, 2000)
          })
        }
      }
      return events
    }

    // ── result: final summary (ignored — assistant events already contain the text) ──
    if (type === 'result') {
      return events
    }

    // ── top-level error ──
    if (type === 'error') {
      events.push({
        type: 'error',
        timestamp: Date.now(),
        content:
          (data.error as string) ||
          (data.message as string) ||
          JSON.stringify(data)
      })
      return events
    }

    // system, rate_limit_event, etc. — ignored
    return events
  }

  /** Emit an agent event to the renderer */
  private emitEvent(workspaceId: string, event: AgentEvent): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:event', workspaceId, event)
    }
  }

  /** Emit a status change to the renderer */
  private emitStatusChange(
    workspaceId: string,
    status: 'idle' | 'thinking' | 'writing'
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(
        'agent:status-changed',
        workspaceId,
        status
      )
    }
  }
}
