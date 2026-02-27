import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { WorkspaceService } from './WorkspaceService'
import type { Workspace } from '../../shared/types'

/**
 * Import existing Claude Code chats and convert them into
 * Harbor-format workspace files.
 */

/** System prompt for the import conversion agent */
const importSystemPrompt = `You are a conversion assistant. You have been given the contents of a previous Claude Code conversation.

Your job is to analyze the conversation and extract any scientific task or benchmark-relevant content, then generate proper Harbor format files in this workspace:

1. task.toml - Fill in all metadata based on the conversation context
2. instruction.md - Write clear task instructions based on what was discussed
3. Dockerfile - Create an appropriate container setup
4. solve.sh - Write a reference solution if one can be inferred
5. test.sh - Write a verification script that writes reward to /logs/verifier/reward.txt

Read the existing boilerplate files first, then update them with content derived from the conversation.
If the conversation does not contain enough information for some files, fill them in with reasonable defaults and add TODO comments.`

export class ChatImportService {
  private workspaceService: WorkspaceService

  constructor(workspaceService: WorkspaceService) {
    this.workspaceService = workspaceService
  }

  /**
   * Import a chat from a JSON file (e.g., exported Claude Code session).
   * Reads the file, extracts messages, and spawns Claude to generate
   * Harbor files from the conversation content.
   */
  async importFromJson(filePath: string): Promise<Workspace> {
    const rawContent = fs.readFileSync(filePath, 'utf-8')
    let conversationText: string

    try {
      const parsed = JSON.parse(rawContent) as
        | Array<Record<string, unknown>>
        | Record<string, unknown>

      if (Array.isArray(parsed)) {
        // Array of message objects
        conversationText = parsed
          .map((msg) => {
            const role = (msg.role as string) || 'unknown'
            const content = (msg.content as string) ||
              (typeof msg.text === 'string' ? msg.text : JSON.stringify(msg))
            return `[${role}]: ${content}`
          })
          .join('\n\n')
      } else if (parsed.messages && Array.isArray(parsed.messages)) {
        // Object with messages array
        conversationText = (parsed.messages as Array<Record<string, unknown>>)
          .map((msg) => {
            const role = (msg.role as string) || 'unknown'
            const content = (msg.content as string) ||
              (typeof msg.text === 'string' ? msg.text : JSON.stringify(msg))
            return `[${role}]: ${content}`
          })
          .join('\n\n')
      } else {
        // Unknown format; just stringify
        conversationText = JSON.stringify(parsed, null, 2)
      }
    } catch {
      // Not valid JSON; treat as plain text
      conversationText = rawContent
    }

    return this.convertConversationToWorkspace(conversationText, filePath)
  }

  /**
   * Import a chat from raw text input.
   * Spawns Claude to generate Harbor files from the text content.
   */
  async importFromText(text: string): Promise<Workspace> {
    return this.convertConversationToWorkspace(text)
  }

  /**
   * Create a new workspace and run the import agent to populate files
   * from the conversation content.
   */
  private async convertConversationToWorkspace(
    conversationText: string,
    sourcePath?: string
  ): Promise<Workspace> {
    // Derive a workspace name from the content
    const namePreview = conversationText.slice(0, 80).replace(/[^\w\s-]/g, '').trim()
    const workspaceName = `Imported: ${namePreview || 'Chat'}`.slice(0, 100)

    // Create workspace with default boilerplate
    const workspace = await this.workspaceService.createWorkspace(workspaceName)

    // Build the prompt with the conversation content
    const truncatedConversation = conversationText.slice(0, 50000)
    const prompt = `Here is a previous conversation to convert into Harbor task files:\n\n---\n${truncatedConversation}\n---\n\nPlease read the existing boilerplate files in this workspace and update them based on the conversation content above.`

    // Spawn Claude to do the conversion
    const args = [
      '--print',
      '--output-format', 'json',
      '--append-system-prompt', importSystemPrompt,
      '--allowedTools', 'Read,Edit,Write,Bash,Glob,Grep',
      '--cwd', workspace.path,
      '-p', prompt
    ]

    return new Promise<Workspace>((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      })

      child.on('close', (code: number | null) => {
        if (code !== 0) {
          // Even if the agent fails, we still have the workspace with boilerplate
          console.error(
            `Import conversion agent exited with code ${code}`
          )
        }
        resolve(workspace)
      })

      child.on('error', (err: Error) => {
        // Still return the workspace; the user can manually fill in files
        console.error(
          `Failed to spawn import conversion agent: ${err.message}`
        )
        resolve(workspace)
      })
    })
  }
}
