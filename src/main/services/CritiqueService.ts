import { spawn } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from './DatabaseService'
import type {
  CritiqueResult,
  CritiqueDimension,
  CritiqueSuggestion
} from '../../shared/types'

/**
 * Critique agent service.
 * Uses Claude CLI with read-only tools and non-streaming JSON output
 * to evaluate Harbor task quality across scored dimensions.
 */

/** System prompt that asks for structured JSON critique output */
const critiqueSystemPrompt = `You are a rigorous reviewer of Terminal-Bench-Science benchmark tasks in Harbor format.

Evaluate the task across these dimensions and return your analysis as a JSON object:

1. **Clarity** - Is the instruction.md clear, unambiguous, and complete?
2. **Correctness** - Is the reference solution (solve.sh) correct? Does test.sh properly verify it?
3. **Difficulty Calibration** - Does the stated difficulty match the actual complexity?
4. **Isolation** - Is the task fully self-contained? No external dependencies or network access needed?
5. **Verifiability** - Does test.sh reliably distinguish correct from incorrect solutions?
6. **Scientific Rigor** - Is the scientific content accurate and appropriate for the domain?

Return ONLY a JSON object with this exact schema:
{
  "dimensions": [
    {
      "name": "Clarity",
      "score": <1-5>,
      "feedback": "<detailed feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }
    // ... one object per dimension
  ],
  "overallScore": <1.0-5.0>,
  "prioritizedSuggestions": [
    {
      "dimension": "<dimension name>",
      "severity": "critical" | "important" | "minor",
      "title": "<short title>",
      "description": "<detailed description of what to fix>"
    }
  ]
}

Read all workspace files before forming your critique. Be thorough but constructive.`

export class CritiqueService {
  private dbService: DatabaseService

  constructor(dbService: DatabaseService) {
    this.dbService = dbService
  }

  /**
   * Run a full critique on the Harbor task files in a workspace.
   * Spawns Claude CLI with read-only tools and JSON output format.
   */
  async runCritique(workspaceId: string): Promise<CritiqueResult> {
    const workspace = this.dbService.getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }

    const workspacePath = workspace.path

    const message =
      'Please review all Harbor task files in this workspace and provide a structured critique. Read task.toml, instruction.md, Dockerfile, solve.sh, and test.sh before responding.'

    const args = [
      '--print',
      '--output-format', 'json',
      '--append-system-prompt', critiqueSystemPrompt,
      '--allowedTools', 'Read,Glob,Grep',
      '--cwd', workspacePath,
      '-p', message
    ]

    return new Promise<CritiqueResult>((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf-8')
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf-8')
      })

      child.on('close', (code: number | null) => {
        if (code !== 0 && !stdout.trim()) {
          reject(
            new Error(
              `Critique process exited with code ${code}: ${stderr.trim()}`
            )
          )
          return
        }

        try {
          const result = this.parseResponse(workspaceId, stdout)
          resolve(result)
        } catch (err) {
          reject(
            new Error(
              `Failed to parse critique response: ${err instanceof Error ? err.message : String(err)}`
            )
          )
        }
      })

      child.on('error', (err: Error) => {
        reject(
          new Error(`Failed to spawn critique process: ${err.message}`)
        )
      })
    })
  }

  /**
   * Apply a suggestion by running the agent with instructions to fix
   * the identified issue. Returns once the fix has been applied.
   */
  async applySuggestion(
    workspaceId: string,
    suggestionId: string
  ): Promise<void> {
    const workspace = this.dbService.getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }

    // For now, this is a placeholder. In a full implementation,
    // we would retrieve the stored critique result, find the suggestion,
    // and send a targeted fix request to the agent.
    const message = `Apply the following suggestion (ID: ${suggestionId}) to improve the Harbor task files. Read the files first, then make the necessary changes.`

    const args = [
      '--print',
      '--output-format', 'json',
      '--allowedTools', 'Read,Edit,Write,Bash,Glob,Grep',
      '--cwd', workspace.path,
      '-p', message
    ]

    return new Promise<void>((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      })

      child.on('close', (code: number | null) => {
        if (code !== 0) {
          reject(
            new Error(
              `Apply suggestion process exited with code ${code}`
            )
          )
        } else {
          resolve()
        }
      })

      child.on('error', (err: Error) => {
        reject(new Error(`Failed to apply suggestion: ${err.message}`))
      })
    })
  }

  /**
   * Parse the Claude CLI JSON output into a CritiqueResult.
   * The response may be wrapped in a JSON envelope from --output-format json.
   */
  private parseResponse(
    workspaceId: string,
    rawOutput: string
  ): CritiqueResult {
    const critiqueId = uuidv4()
    const timestamp = Date.now()

    // Try to extract the JSON critique from the response
    let parsed: Record<string, unknown>

    try {
      // The --output-format json wraps the output; try parsing the whole thing
      const envelope = JSON.parse(rawOutput.trim()) as Record<string, unknown>

      // The actual content may be in a result field or the text content
      const resultText =
        (envelope.result as string) ||
        (envelope.content as string) ||
        rawOutput

      // Try to find a JSON block in the text
      const jsonContent = this.extractJson(resultText)
      parsed = JSON.parse(jsonContent)
    } catch {
      // Fall back to extracting JSON from raw output
      const jsonContent = this.extractJson(rawOutput)
      parsed = JSON.parse(jsonContent)
    }

    // Map parsed dimensions
    const rawDimensions = (parsed.dimensions as Array<Record<string, unknown>>) || []
    const dimensions: CritiqueDimension[] = rawDimensions.map((d) => ({
      name: (d.name as string) || 'Unknown',
      score: Math.min(5, Math.max(1, Number(d.score) || 3)),
      feedback: (d.feedback as string) || '',
      suggestions: (d.suggestions as string[]) || []
    }))

    // Map prioritized suggestions
    const rawSuggestions = (parsed.prioritizedSuggestions as Array<Record<string, unknown>>) || []
    const prioritizedSuggestions: CritiqueSuggestion[] =
      rawSuggestions.map((s) => ({
        id: uuidv4(),
        dimension: (s.dimension as string) || 'General',
        severity: (s.severity as 'critical' | 'important' | 'minor') || 'minor',
        title: (s.title as string) || '',
        description: (s.description as string) || '',
        applied: false
      }))

    const overallScore = Number(parsed.overallScore) ||
      (dimensions.length > 0
        ? dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
        : 0)

    return {
      id: critiqueId,
      workspaceId,
      timestamp,
      dimensions,
      overallScore,
      prioritizedSuggestions
    }
  }

  /**
   * Extract a JSON object from a string that may contain surrounding text.
   * Looks for the outermost { ... } pair.
   */
  private extractJson(text: string): string {
    const start = text.indexOf('{')
    if (start === -1) {
      throw new Error('No JSON object found in response')
    }

    let depth = 0
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++
      if (text[i] === '}') depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }

    throw new Error('Unbalanced JSON braces in response')
  }
}
