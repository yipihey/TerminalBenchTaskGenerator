import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { WorkspaceService } from './WorkspaceService'
import { GitService } from './GitService'
import { getAppDataPath } from '../utils/paths'
import type { TerminalBenchTaskMeta, TerminalBenchIndex, Workspace } from '../../shared/types'

const REPO_OWNER = 'laude-institute'
const REPO_NAME = 'terminal-bench'
const BRANCH = 'main'
const TASK_DIR = 'original-tasks'
const CACHE_FILE = 'browse-cache.json'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_CONCURRENT_FETCHES = 15

/**
 * Service for browsing and importing tasks from the laude-institute/terminal-bench
 * GitHub repository. Fetches an index of all tasks, caches locally, and can
 * import individual tasks as new workspaces with Harbor format conversion.
 */
export class BrowseService {
  private workspaceService: WorkspaceService
  private gitService: GitService

  constructor(workspaceService: WorkspaceService, gitService: GitService) {
    this.workspaceService = workspaceService
    this.gitService = gitService
  }

  private get cachePath(): string {
    return path.join(getAppDataPath(), CACHE_FILE)
  }

  /**
   * Fetch the index of all terminal-bench tasks.
   * Uses a local JSON cache with 1-hour TTL unless forceRefresh is true.
   */
  async fetchIndex(forceRefresh = false): Promise<TerminalBenchIndex> {
    // Check cache
    if (!forceRefresh) {
      const cached = this.readCache()
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached
      }
    }

    console.log('[BrowseService] Fetching task index from GitHub...')

    // 1. Get the full repo tree via Git Trees API
    const treeUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`
    const treeResp = await fetch(treeUrl, {
      headers: { 'User-Agent': 'TerminalBenchTaskGenerator' }
    })
    if (!treeResp.ok) {
      throw new Error(`GitHub API error: ${treeResp.status} ${treeResp.statusText}`)
    }

    const treeData = (await treeResp.json()) as {
      tree: Array<{ path: string; type: string }>
    }

    // 2. Extract task slugs and their file listings
    const taskFiles = new Map<string, string[]>()
    const taskYamlSlugs: string[] = []

    for (const entry of treeData.tree) {
      const match = entry.path.match(new RegExp(`^${TASK_DIR}/([^/]+)/(.+)$`))
      if (match) {
        const slug = match[1]
        const relPath = match[2]
        if (!taskFiles.has(slug)) {
          taskFiles.set(slug, [])
        }
        if (entry.type === 'blob') {
          taskFiles.get(slug)!.push(relPath)
        }
        if (relPath === 'task.yaml') {
          taskYamlSlugs.push(slug)
        }
      }
    }

    console.log(`[BrowseService] Found ${taskYamlSlugs.length} tasks with task.yaml`)

    // 3. Fetch each task.yaml concurrently (batched)
    const tasks: TerminalBenchTaskMeta[] = []

    for (let i = 0; i < taskYamlSlugs.length; i += MAX_CONCURRENT_FETCHES) {
      const batch = taskYamlSlugs.slice(i, i + MAX_CONCURRENT_FETCHES)
      const results = await Promise.allSettled(
        batch.map(async (slug) => {
          const yamlUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${TASK_DIR}/${slug}/task.yaml`
          const resp = await fetch(yamlUrl)
          if (!resp.ok) return null
          const text = await resp.text()
          return { slug, text }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { slug, text } = result.value
          try {
            const meta = this.parseTaskYaml(slug, text, taskFiles.get(slug) || [])
            if (meta) tasks.push(meta)
          } catch (err) {
            console.warn(`[BrowseService] Failed to parse task.yaml for ${slug}:`, err)
          }
        }
      }
    }

    // Sort alphabetically by slug
    tasks.sort((a, b) => a.slug.localeCompare(b.slug))

    const index: TerminalBenchIndex = {
      tasks,
      fetchedAt: Date.now()
    }

    // Cache the result
    this.writeCache(index)

    console.log(`[BrowseService] Indexed ${tasks.length} tasks`)
    return index
  }

  /**
   * Get the full detail for a single task by slug.
   * Returns from cached index if available.
   */
  async fetchTaskDetail(slug: string): Promise<TerminalBenchTaskMeta> {
    const index = await this.fetchIndex()
    const task = index.tasks.find((t) => t.slug === slug)
    if (!task) {
      throw new Error(`Task not found: ${slug}`)
    }
    return task
  }

  /**
   * Import a terminal-bench task as a new workspace.
   * Downloads all files, converts task.yaml → task.toml, and creates workspace.
   */
  async importTask(slug: string): Promise<Workspace> {
    console.log(`[BrowseService] Importing task: ${slug}`)

    // Get task metadata
    const meta = await this.fetchTaskDetail(slug)

    // 1. Download all files from the task directory
    const fileContents = new Map<string, string>()
    const binaryFiles = new Map<string, Buffer>()

    for (let i = 0; i < meta.files.length; i += MAX_CONCURRENT_FETCHES) {
      const batch = meta.files.slice(i, i + MAX_CONCURRENT_FETCHES)
      const results = await Promise.allSettled(
        batch.map(async (relPath) => {
          const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${TASK_DIR}/${slug}/${relPath}`
          const resp = await fetch(url)
          if (!resp.ok) return null
          // Check if it's likely a text file
          if (this.isTextFile(relPath)) {
            return { relPath, content: await resp.text(), binary: false as const }
          } else {
            const buf = Buffer.from(await resp.arrayBuffer())
            return { relPath, content: buf, binary: true as const }
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const val = result.value
          if (val.binary) {
            binaryFiles.set(val.relPath, val.content as Buffer)
          } else {
            fileContents.set(val.relPath, val.content as string)
          }
        }
      }
    }

    // 2. Create workspace via WorkspaceService
    const domain = this.mapCategoryToDomain(meta.category)
    const workspace = await this.workspaceService.createWorkspace(
      slug,
      domain,
      meta.category
    )

    // 3. Overwrite boilerplate files with converted content

    // task.yaml → task.toml
    const toml = this.convertToTaskToml(meta)
    fs.writeFileSync(path.join(workspace.path, 'task.toml'), toml, 'utf-8')

    // instruction field → instruction.md
    const instructionMd = `# ${slug}\n\n${meta.instruction}`
    fs.writeFileSync(path.join(workspace.path, 'instruction.md'), instructionMd, 'utf-8')

    // Dockerfile — copy as-is if present
    const dockerfile = fileContents.get('Dockerfile')
    if (dockerfile) {
      fs.writeFileSync(path.join(workspace.path, 'Dockerfile'), dockerfile, 'utf-8')
    }

    // solution.sh → solve.sh
    const solutionSh = fileContents.get('solution.sh')
    if (solutionSh) {
      fs.writeFileSync(path.join(workspace.path, 'solve.sh'), solutionSh, 'utf-8')
      fs.chmodSync(path.join(workspace.path, 'solve.sh'), 0o755)
    }

    // run-tests.sh → test.sh (wrap with reward.txt output)
    const runTestsSh = fileContents.get('run-tests.sh')
    if (runTestsSh) {
      const wrappedTestSh = this.wrapTestScript(runTestsSh)
      fs.writeFileSync(path.join(workspace.path, 'test.sh'), wrappedTestSh, 'utf-8')
      fs.chmodSync(path.join(workspace.path, 'test.sh'), 0o755)
    }

    // 4. Copy remaining files (skip already-handled ones)
    const handledFiles = new Set([
      'task.yaml', 'Dockerfile', 'solution.sh', 'run-tests.sh'
    ])

    for (const [relPath, content] of fileContents) {
      if (handledFiles.has(relPath)) continue
      const destPath = path.join(workspace.path, relPath)
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.writeFileSync(destPath, content, 'utf-8')
    }

    for (const [relPath, buf] of binaryFiles) {
      if (handledFiles.has(relPath)) continue
      const destPath = path.join(workspace.path, relPath)
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.writeFileSync(destPath, buf)
    }

    // 5. Init git repo with imported content
    try {
      // Remove the auto-created .git from createWorkspace, re-init with all files
      const gitDir = path.join(workspace.path, '.git')
      if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true })
      }
      await this.gitService.initRepo(workspace.path)
    } catch (err) {
      console.error(`[BrowseService] Failed to init git repo for ${slug}:`, err)
    }

    console.log(`[BrowseService] Imported task ${slug} as workspace ${workspace.id}`)
    return workspace
  }

  // ── Private helpers ──

  private parseTaskYaml(
    slug: string,
    yamlText: string,
    files: string[]
  ): TerminalBenchTaskMeta | null {
    const doc = parseYaml(yamlText) as Record<string, unknown>
    if (!doc) return null

    const instruction = String(doc.instruction || doc.description || '')
    const authorName = String(doc.author_name || doc.author || 'Unknown')
    const rawDifficulty = String(doc.difficulty || 'medium').toLowerCase()
    const difficulty = (['easy', 'medium', 'hard'].includes(rawDifficulty)
      ? rawDifficulty
      : 'medium') as 'easy' | 'medium' | 'hard'
    const category = String(doc.category || doc.domain || 'general')
    const tags = Array.isArray(doc.tags)
      ? doc.tags.map(String)
      : typeof doc.tags === 'string'
        ? doc.tags.split(',').map((t: string) => t.trim())
        : []
    const maxAgentTimeoutSec = Number(doc.max_agent_timeout_sec || doc.agent_timeout || 3600)
    const maxTestTimeoutSec = Number(doc.max_test_timeout_sec || doc.test_timeout || 3600)

    return {
      slug,
      instruction,
      authorName,
      difficulty,
      category,
      tags,
      maxAgentTimeoutSec,
      maxTestTimeoutSec,
      files
    }
  }

  private convertToTaskToml(meta: TerminalBenchTaskMeta): string {
    const desc = meta.instruction.slice(0, 200).replace(/"/g, '\\"').replace(/\n/g, ' ')
    const tagsStr = meta.tags.map((t) => `"${t}"`).join(', ')
    const domain = this.mapCategoryToDomain(meta.category)

    return `[task]
name = "${meta.slug}"
description = "${desc}"
domain = "${domain}"
field = "${meta.category}"
difficulty = "${meta.difficulty}"
tags = [${tagsStr}]

[environment]
timeout_seconds = ${meta.maxTestTimeoutSec}

[agent]
timeout_seconds = ${meta.maxAgentTimeoutSec}

[verifier]
type = "script"
script = "test.sh"
`
  }

  private mapCategoryToDomain(category: string): string {
    const cat = category.toLowerCase()
    if (cat.includes('bio') || cat.includes('life') || cat.includes('genetics') || cat.includes('medical')) {
      return 'life-sciences'
    }
    if (cat.includes('earth') || cat.includes('geo') || cat.includes('climate') || cat.includes('ocean')) {
      return 'earth-sciences'
    }
    // Default to physical-sciences for engineering, CS, math, physics, etc.
    return 'physical-sciences'
  }

  private wrapTestScript(originalScript: string): string {
    return `#!/usr/bin/env bash
# test.sh - Harbor verification wrapper
# Original: run-tests.sh from terminal-bench
set -euo pipefail

REWARD_FILE="/logs/verifier/reward.txt"
mkdir -p "$(dirname "$REWARD_FILE")"

# Run the original test logic
run_tests() {
${originalScript.split('\n').map((l) => '  ' + l).join('\n')}
}

if run_tests; then
  echo "1.0" > "$REWARD_FILE"
else
  echo "0.0" > "$REWARD_FILE"
fi
`
  }

  private isTextFile(filename: string): boolean {
    const binaryExts = new Set([
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
      '.zip', '.gz', '.tar', '.bz2', '.xz', '.7z',
      '.bin', '.dat', '.pkl', '.npy', '.npz', '.h5', '.hdf5',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.pyc', '.so', '.dll', '.exe'
    ])
    const ext = path.extname(filename).toLowerCase()
    return !binaryExts.has(ext)
  }

  private readCache(): TerminalBenchIndex | null {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf-8')
        return JSON.parse(data) as TerminalBenchIndex
      }
    } catch {
      // Corrupt cache — ignore
    }
    return null
  }

  private writeCache(index: TerminalBenchIndex): void {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(index), 'utf-8')
    } catch (err) {
      console.warn('[BrowseService] Failed to write cache:', err)
    }
  }
}
