import fs from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from './DatabaseService'
import { getWorkspacePath, getWorkspacesRoot } from '../utils/paths'
import type { Workspace, HarborFile } from '../../shared/types'

/**
 * Workspace CRUD service.
 * Creates workspace directories with Harbor boilerplate files,
 * manages workspace lifecycle, and retrieves file listings.
 */

// ── Harbor Boilerplate Templates ──

function defaultTaskToml(
  name: string,
  domain?: string,
  field?: string
): string {
  return `[task]
name = "${name}"
description = ""
domain = "${domain || 'life-sciences'}"
field = "${field || ''}"
# subfield = ""
difficulty = "medium"
# tags = []
# canary_string = "CANARY_PLACEHOLDER"

[environment]
base_image = "python:3.11-slim"
timeout_seconds = 3600
# memory_limit_mb = 4096
# cpu_limit = 2.0
# gpu = false

[agent]
# model = "claude-sonnet-4-20250514"
# max_tokens = 16384
timeout_seconds = 3600

[verifier]
type = "script"
script = "test.sh"
`
}

function defaultInstructionMd(): string {
  return `# Task Instruction

## Background
<!-- Describe the scientific background and context -->

## Objective
<!-- Clearly state what the agent must accomplish -->

## Data
<!-- Describe input data available in the workspace -->

## Expected Output
<!-- Describe the expected output format and location -->

## Constraints
- Do not use external network access.
- All work must be done within the workspace directory.
`
}

function defaultDockerfile(): string {
  return `FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Copy task files
COPY . /app/

# Create required directories
RUN mkdir -p /logs/verifier

# Set up any Python dependencies
# RUN pip install --no-cache-dir -r requirements.txt

CMD ["bash"]
`
}

function defaultSolveSh(): string {
  return `#!/usr/bin/env bash
# solve.sh - Reference solution script
# This script demonstrates a correct solution for the task.
# It is used to verify that the task is solvable.

set -euo pipefail

echo "TODO: Implement reference solution"
`
}

function defaultTestSh(): string {
  return `#!/usr/bin/env bash
# test.sh - Verification script
# This script checks whether the agent's solution is correct.
# It must write a reward value (0.0 or 1.0) to /logs/verifier/reward.txt

set -euo pipefail

REWARD_FILE="/logs/verifier/reward.txt"

# TODO: Implement verification logic
# Example:
# if [ -f "/app/output.txt" ]; then
#   expected="expected_answer"
#   actual=$(cat /app/output.txt | tr -d '[:space:]')
#   if [ "$actual" = "$expected" ]; then
#     echo "1.0" > "$REWARD_FILE"
#   else
#     echo "0.0" > "$REWARD_FILE"
#   fi
# else
#   echo "0.0" > "$REWARD_FILE"
# fi

echo "0.0" > "$REWARD_FILE"
echo "Verification not yet implemented"
`
}

// ── Pre-built templates ──

interface TemplateFiles {
  'task.toml': string
  'instruction.md': string
  Dockerfile: string
  'solve.sh': string
  'test.sh': string
}

function getTemplate(
  templateName: string,
  name: string,
  domain?: string,
  field?: string
): TemplateFiles | null {
  switch (templateName) {
    case 'data-analysis':
      return {
        'task.toml': defaultTaskToml(name, domain || 'life-sciences', field || 'bioinformatics'),
        'instruction.md': `# ${name}\n\n## Background\nThis is a data analysis task.\n\n## Objective\nAnalyze the provided dataset and produce results.\n\n## Data\nInput data is in \`data/\` directory.\n\n## Expected Output\nWrite results to \`output.txt\`.\n`,
        Dockerfile: defaultDockerfile(),
        'solve.sh': defaultSolveSh(),
        'test.sh': defaultTestSh()
      }
    case 'simulation':
      return {
        'task.toml': defaultTaskToml(name, domain || 'physical-sciences', field || 'physics'),
        'instruction.md': `# ${name}\n\n## Background\nThis is a simulation task.\n\n## Objective\nRun the simulation and report results.\n\n## Data\nSimulation parameters are in \`config.json\`.\n\n## Expected Output\nWrite simulation results to \`output.txt\`.\n`,
        Dockerfile: defaultDockerfile(),
        'solve.sh': defaultSolveSh(),
        'test.sh': defaultTestSh()
      }
    default:
      return null
  }
}

// ── Language mapping for Monaco ──

function languageForFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.toml': 'toml',
    '.md': 'markdown',
    '.sh': 'shell',
    '.bash': 'shell',
    '.py': 'python',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.txt': 'plaintext',
    '.dockerfile': 'dockerfile'
  }
  if (filename === 'Dockerfile') return 'dockerfile'
  return map[ext] || 'plaintext'
}

export class WorkspaceService {
  private dbService: DatabaseService

  constructor(dbService: DatabaseService) {
    this.dbService = dbService
  }

  /**
   * Create a new workspace with Harbor boilerplate files.
   */
  async createWorkspace(
    name: string,
    domain?: string,
    field?: string,
    template?: string
  ): Promise<Workspace> {
    const id = uuidv4()
    const workspacePath = getWorkspacePath(id)
    const now = new Date().toISOString()

    // Create workspace directory
    fs.mkdirSync(workspacePath, { recursive: true })

    // Determine files to write
    let files: TemplateFiles
    if (template) {
      const templateFiles = getTemplate(template, name, domain, field)
      if (templateFiles) {
        files = templateFiles
      } else {
        files = {
          'task.toml': defaultTaskToml(name, domain, field),
          'instruction.md': defaultInstructionMd(),
          Dockerfile: defaultDockerfile(),
          'solve.sh': defaultSolveSh(),
          'test.sh': defaultTestSh()
        }
      }
    } else {
      files = {
        'task.toml': defaultTaskToml(name, domain, field),
        'instruction.md': defaultInstructionMd(),
        Dockerfile: defaultDockerfile(),
        'solve.sh': defaultSolveSh(),
        'test.sh': defaultTestSh()
      }
    }

    // Write boilerplate files
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(workspacePath, filename)
      fs.writeFileSync(filePath, content, 'utf-8')
    }

    // Make shell scripts executable
    fs.chmodSync(path.join(workspacePath, 'solve.sh'), 0o755)
    fs.chmodSync(path.join(workspacePath, 'test.sh'), 0o755)

    // Create the workspace record
    const workspace: Workspace = {
      id,
      name,
      path: workspacePath,
      status: 'clean',
      createdAt: now,
      updatedAt: now,
      domain,
      field,
      agentSessionId: id // use the workspace id as the initial session id
    }

    this.dbService.saveWorkspace(workspace)

    return workspace
  }

  /**
   * Open an existing workspace directory (not managed by app).
   * Registers it in the database.
   */
  async openWorkspace(workspacePath: string): Promise<Workspace> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const name = path.basename(workspacePath)

    const workspace: Workspace = {
      id,
      name,
      path: workspacePath,
      status: 'clean',
      createdAt: now,
      updatedAt: now,
      agentSessionId: id
    }

    this.dbService.saveWorkspace(workspace)

    return workspace
  }

  /** List all workspaces from the database */
  async listWorkspaces(): Promise<Workspace[]> {
    return this.dbService.getWorkspaces()
  }

  /** Delete a workspace and its directory */
  async deleteWorkspace(id: string): Promise<void> {
    const workspace = this.dbService.getWorkspace(id)
    if (workspace) {
      // Only remove if it lives inside our managed workspaces root
      const root = getWorkspacesRoot()
      if (workspace.path.startsWith(root)) {
        fs.rmSync(workspace.path, { recursive: true, force: true })
      }
      this.dbService.deleteWorkspace(id)
    }
  }

  /**
   * Read all Harbor files from a workspace directory.
   * Returns the standard Harbor files plus any extra files found.
   */
  async getWorkspaceFiles(workspaceId: string): Promise<HarborFile[]> {
    const workspace = this.dbService.getWorkspace(workspaceId)
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`)
    }

    const workspacePath = workspace.path
    const harborFiles: HarborFile[] = []

    // Standard Harbor files to look for
    const standardFiles = [
      'task.toml',
      'instruction.md',
      'Dockerfile',
      'solve.sh',
      'test.sh'
    ]

    for (const filename of standardFiles) {
      const filePath = path.join(workspacePath, filename)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        harborFiles.push({
          path: filePath,
          content,
          language: languageForFile(filename)
        })
      }
    }

    // Also include any additional files at the workspace root
    const allEntries = fs.readdirSync(workspacePath, { withFileTypes: true })
    for (const entry of allEntries) {
      if (
        entry.isFile() &&
        !standardFiles.includes(entry.name) &&
        !entry.name.startsWith('.')
      ) {
        const filePath = path.join(workspacePath, entry.name)
        const content = fs.readFileSync(filePath, 'utf-8')
        harborFiles.push({
          path: filePath,
          content,
          language: languageForFile(entry.name)
        })
      }
    }

    return harborFiles
  }
}
