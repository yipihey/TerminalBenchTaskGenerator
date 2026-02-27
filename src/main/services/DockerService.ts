import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import type { BrowserWindow } from 'electron'
import type { RunResult, RunStatus } from '../../shared/types'

/**
 * Docker build/run service.
 * Spawns docker CLI commands as child processes and streams output.
 */
export class DockerService {
  private processes: Map<string, ChildProcess> = new Map()
  private mainWindow: BrowserWindow | null = null

  constructor() {}

  /** Set the main window reference for sending IPC events */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Build a Docker image for the workspace.
   */
  async buildImage(workspacePath: string): Promise<void> {
    const imageName = `tbtg-${path.basename(workspacePath)}`.toLowerCase()

    return new Promise<void>((resolve, reject) => {
      const child = spawn('docker', ['build', '-t', imageName, '.'], {
        cwd: workspacePath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      child.stdout?.on('data', (chunk: Buffer) => {
        this.emitLog(path.basename(workspacePath), chunk.toString('utf-8'))
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        this.emitLog(path.basename(workspacePath), chunk.toString('utf-8'))
      })

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Docker build failed with exit code ${code}`))
        }
      })

      child.on('error', (err: Error) => {
        reject(new Error(`Failed to spawn docker: ${err.message}`))
      })
    })
  }

  /**
   * Run the reference solution (solve.sh) inside the Docker container.
   */
  async runSolution(workspacePath: string): Promise<RunResult> {
    const workspaceId = path.basename(workspacePath)
    return this.runContainer(workspacePath, workspaceId, 'verify-solution', [
      'bash',
      '/app/solve.sh'
    ])
  }

  /**
   * Run the test/verification script (test.sh) inside the Docker container.
   */
  async runTests(workspacePath: string): Promise<RunResult> {
    const workspaceId = path.basename(workspacePath)
    return this.runContainer(workspacePath, workspaceId, 'verify-solution', [
      'bash',
      '/app/test.sh'
    ])
  }

  /**
   * Run a full agent trial: build, solve, then verify.
   */
  async runAgentTrial(workspacePath: string): Promise<RunResult> {
    const workspaceId = path.basename(workspacePath)
    const runId = uuidv4()
    const startedAt = Date.now()

    this.emitStatusChange(workspaceId, 'building')

    try {
      // Build the image first
      await this.buildImage(workspacePath)
      this.emitStatusChange(workspaceId, 'running')

      // Run solve.sh then test.sh
      const imageName = `tbtg-${workspaceId}`.toLowerCase()
      const result = await this.runDockerSequence(
        workspacePath,
        workspaceId,
        imageName,
        runId,
        startedAt
      )

      return result
    } catch (err) {
      this.emitStatusChange(workspaceId, 'error')
      return {
        id: runId,
        workspaceId,
        mode: 'agent-trial',
        status: 'error',
        startedAt,
        finishedAt: Date.now(),
        logs: `Error: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  /**
   * Stop a running Docker process for a workspace.
   */
  stop(workspaceId: string): void {
    const child = this.processes.get(workspaceId)
    if (child) {
      child.kill('SIGTERM')
      this.processes.delete(workspaceId)
      this.emitStatusChange(workspaceId, 'idle')
    }
  }

  private async runContainer(
    workspacePath: string,
    workspaceId: string,
    mode: 'verify-solution' | 'agent-trial',
    command: string[]
  ): Promise<RunResult> {
    const runId = uuidv4()
    const startedAt = Date.now()
    const imageName = `tbtg-${workspaceId}`.toLowerCase()

    this.emitStatusChange(workspaceId, 'building')

    try {
      await this.buildImage(workspacePath)
    } catch (err) {
      this.emitStatusChange(workspaceId, 'error')
      return {
        id: runId,
        workspaceId,
        mode,
        status: 'error',
        startedAt,
        finishedAt: Date.now(),
        logs: `Build failed: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    this.emitStatusChange(workspaceId, 'running')

    return new Promise<RunResult>((resolve) => {
      let logs = ''

      const child = spawn(
        'docker',
        ['run', '--rm', '--name', `tbtg-run-${runId.slice(0, 8)}`, imageName, ...command],
        {
          cwd: workspacePath,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      )

      this.processes.set(workspaceId, child)

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        logs += text
        this.emitLog(workspaceId, text)
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        logs += text
        this.emitLog(workspaceId, text)
      })

      child.on('close', (code: number | null) => {
        this.processes.delete(workspaceId)
        const status: RunStatus = code === 0 ? 'passed' : 'failed'
        this.emitStatusChange(workspaceId, status)

        resolve({
          id: runId,
          workspaceId,
          mode,
          status,
          startedAt,
          finishedAt: Date.now(),
          logs
        })
      })

      child.on('error', (err: Error) => {
        this.processes.delete(workspaceId)
        this.emitStatusChange(workspaceId, 'error')

        resolve({
          id: runId,
          workspaceId,
          mode,
          status: 'error',
          startedAt,
          finishedAt: Date.now(),
          logs: `Process error: ${err.message}`
        })
      })
    })
  }

  /**
   * Run solve.sh then test.sh in sequence in the same container.
   */
  private async runDockerSequence(
    workspacePath: string,
    workspaceId: string,
    imageName: string,
    runId: string,
    startedAt: number
  ): Promise<RunResult> {
    return new Promise<RunResult>((resolve) => {
      let logs = ''

      // Run a container that executes solve.sh, then test.sh
      const child = spawn(
        'docker',
        [
          'run',
          '--rm',
          '--name',
          `tbtg-trial-${runId.slice(0, 8)}`,
          imageName,
          'bash',
          '-c',
          'bash /app/solve.sh && bash /app/test.sh && cat /logs/verifier/reward.txt'
        ],
        {
          cwd: workspacePath,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      )

      this.processes.set(workspaceId, child)

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        logs += text
        this.emitLog(workspaceId, text)
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        logs += text
        this.emitLog(workspaceId, text)
      })

      child.on('close', (code: number | null) => {
        this.processes.delete(workspaceId)

        // Try to extract reward from the last line of output
        const lines = logs.trim().split('\n')
        const lastLine = lines[lines.length - 1]?.trim()
        const reward = parseFloat(lastLine)

        const status: RunStatus =
          code === 0 && !isNaN(reward) && reward > 0 ? 'passed' : 'failed'

        this.emitStatusChange(workspaceId, status)

        resolve({
          id: runId,
          workspaceId,
          mode: 'agent-trial',
          status,
          reward: isNaN(reward) ? undefined : reward,
          startedAt,
          finishedAt: Date.now(),
          logs
        })
      })

      child.on('error', (err: Error) => {
        this.processes.delete(workspaceId)
        this.emitStatusChange(workspaceId, 'error')

        resolve({
          id: runId,
          workspaceId,
          mode: 'agent-trial',
          status: 'error',
          startedAt,
          finishedAt: Date.now(),
          logs: `Process error: ${err.message}`
        })
      })
    })
  }

  /** Emit a log line to the renderer */
  private emitLog(workspaceId: string, line: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('runner:log', workspaceId, line)
    }
  }

  /** Emit a status change to the renderer */
  private emitStatusChange(workspaceId: string, status: RunStatus): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(
        'runner:status-changed',
        workspaceId,
        status
      )
    }
  }
}
