import git from 'isomorphic-git'
import fs from 'node:fs'
import path from 'node:path'
import type { GitCommit, GitDiff } from '../../shared/types'

/**
 * isomorphic-git wrapper for workspace version control.
 * Provides init, auto-commit, log, diff, and restore functionality.
 */
export class GitService {
  constructor() {}

  /**
   * Initialize a new git repository in the workspace directory.
   * Creates an initial commit with all boilerplate files.
   */
  async initRepo(workspacePath: string): Promise<void> {
    await git.init({ fs, dir: workspacePath, defaultBranch: 'main' })

    // Stage all existing files
    const entries = fs.readdirSync(workspacePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name !== '.git') {
        await git.add({ fs, dir: workspacePath, filepath: entry.name })
      }
    }

    // Create initial commit
    await git.commit({
      fs,
      dir: workspacePath,
      message: 'Initial Harbor task boilerplate',
      author: {
        name: 'Terminal Bench Task Generator',
        email: 'tbtg@local'
      }
    })
  }

  /**
   * Auto-commit all changes in the workspace with a descriptive message.
   * Used after agent turns and manual saves.
   */
  async autoCommit(
    workspacePath: string,
    message: string
  ): Promise<string | null> {
    // Check for changes
    const status = await git.statusMatrix({
      fs,
      dir: workspacePath
    })

    const changedFiles = status.filter(
      ([_filepath, head, workdir, stage]) =>
        head !== workdir || head !== stage || workdir !== stage
    )

    if (changedFiles.length === 0) {
      return null // Nothing to commit
    }

    // Stage all changes
    for (const [filepath, head, workdir, _stage] of changedFiles) {
      if (workdir === 0) {
        // File was deleted
        await git.remove({ fs, dir: workspacePath, filepath })
      } else {
        await git.add({ fs, dir: workspacePath, filepath })
      }
    }

    // Commit
    const oid = await git.commit({
      fs,
      dir: workspacePath,
      message,
      author: {
        name: 'Terminal Bench Task Generator',
        email: 'tbtg@local'
      }
    })

    return oid
  }

  /**
   * Get the commit log for a workspace repository.
   */
  async getLog(workspacePath: string): Promise<GitCommit[]> {
    try {
      const commits = await git.log({
        fs,
        dir: workspacePath,
        depth: 100
      })

      return commits.map((entry) => ({
        oid: entry.oid,
        message: entry.commit.message,
        author: entry.commit.author.name,
        timestamp: entry.commit.author.timestamp * 1000 // Convert to ms
      }))
    } catch {
      // No commits yet or not a git repo
      return []
    }
  }

  /**
   * Get the diff between a specific commit and its parent.
   * Returns file-level diffs with old and new content.
   */
  async getDiff(workspacePath: string, oid: string): Promise<GitDiff[]> {
    const diffs: GitDiff[] = []

    // Get the commit and its parent
    const commits = await git.log({
      fs,
      dir: workspacePath,
      depth: 2,
      ref: oid
    })

    const commitObj = commits[0]
    const parentOid = commits.length > 1 ? commits[1].oid : undefined

    // Read the tree for this commit
    const currentTree = await this.readTree(workspacePath, commitObj.oid)

    // Read the parent tree if it exists
    const parentTree = parentOid
      ? await this.readTree(workspacePath, parentOid)
      : new Map<string, string>()

    // Compare files
    const allFiles = new Set([
      ...currentTree.keys(),
      ...parentTree.keys()
    ])

    for (const filepath of allFiles) {
      const oldContent = parentTree.get(filepath) || ''
      const newContent = currentTree.get(filepath) || ''

      if (oldContent !== newContent) {
        diffs.push({
          filepath,
          oldContent,
          newContent
        })
      }
    }

    return diffs
  }

  /**
   * Restore the workspace to a specific commit.
   * Checks out all files from the given commit OID.
   */
  async restoreToCommit(
    workspacePath: string,
    oid: string
  ): Promise<void> {
    // Read the tree for the target commit
    const tree = await this.readTree(workspacePath, oid)

    // Remove current files (except .git)
    const entries = fs.readdirSync(workspacePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name !== '.git') {
        const fullPath = path.join(workspacePath, entry.name)
        fs.rmSync(fullPath, { recursive: true, force: true })
      }
    }

    // Write files from the commit tree
    for (const [filepath, content] of tree) {
      const fullPath = path.join(workspacePath, filepath)
      const dir = path.dirname(fullPath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(fullPath, content, 'utf-8')
    }

    // Stage everything and commit the restore
    await this.autoCommit(workspacePath, `Restored to commit ${oid.slice(0, 7)}`)
  }

  /**
   * Read all files from a commit tree into a Map of filepath -> content.
   */
  private async readTree(
    workspacePath: string,
    oid: string
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>()

    const { commit } = await git.readCommit({
      fs,
      dir: workspacePath,
      oid
    })

    const treeOid = commit.tree

    await this.walkTree(workspacePath, treeOid, '', files)

    return files
  }

  /**
   * Recursively walk a git tree and collect file contents.
   */
  private async walkTree(
    workspacePath: string,
    treeOid: string,
    prefix: string,
    files: Map<string, string>
  ): Promise<void> {
    const { tree } = await git.readTree({
      fs,
      dir: workspacePath,
      oid: treeOid
    })

    for (const entry of tree) {
      const filepath = prefix ? `${prefix}/${entry.path}` : entry.path

      if (entry.type === 'blob') {
        try {
          const { blob } = await git.readBlob({
            fs,
            dir: workspacePath,
            oid: entry.oid
          })
          const content = new TextDecoder('utf-8').decode(blob)
          files.set(filepath, content)
        } catch {
          // Skip binary or unreadable files
        }
      } else if (entry.type === 'tree') {
        await this.walkTree(workspacePath, entry.oid, filepath, files)
      }
    }
  }
}
