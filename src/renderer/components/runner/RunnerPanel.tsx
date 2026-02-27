import { useState, useEffect, useRef, useCallback } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { Button } from '../shared/Button'
import { Badge } from '../shared/Badge'
import { ResultsDisplay } from './ResultsDisplay'
import type { RunStatus, RunResult, RunMode } from '../../../shared/types'

const STATUS_COLORS: Record<RunStatus, string> = {
  idle: 'bg-zinc-500',
  building: 'bg-amber-500 animate-pulse',
  running: 'bg-blue-500 animate-pulse',
  passed: 'bg-green-500',
  failed: 'bg-red-500',
  error: 'bg-amber-500',
}

const STATUS_LABELS: Record<RunStatus, string> = {
  idle: 'Idle',
  building: 'Building...',
  running: 'Running...',
  passed: 'Passed',
  failed: 'Failed',
  error: 'Error',
}

const RUN_MODES: { mode: RunMode; label: string; description: string; color: string }[] = [
  {
    mode: 'verify-solution',
    label: 'Verify Solution',
    description: 'Run the verifier script against the gold solution to confirm the task is solvable.',
    color: 'bg-green-600 hover:bg-green-500 active:bg-green-700',
  },
  {
    mode: 'agent-trial',
    label: 'Agent Trial',
    description: 'Run an AI agent against the task to test difficulty and collect a trace.',
    color: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
  },
  {
    mode: 'harbor-cli',
    label: 'Harbor CLI',
    description: 'Run the full Harbor CLI pipeline including Docker build and evaluation.',
    color: 'bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-700',
  },
]

export function RunnerPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)

  const isRunning = runStatus === 'running' || runStatus === 'building'

  // Auto-scroll logs
  useEffect(() => {
    const el = logContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [logs])

  // Subscribe to runner events
  useEffect(() => {
    const unsubLog = window.api.onRunnerLog((workspaceId: string, line: string) => {
      if (workspaceId === activeWorkspaceId) {
        setLogs((prev) => [...prev, line])
      }
    })

    const unsubStatus = window.api.onRunnerStatusChanged(
      (workspaceId: string, status: RunStatus) => {
        if (workspaceId === activeWorkspaceId) {
          setRunStatus(status)
        }
      }
    )

    return () => {
      unsubLog()
      unsubStatus()
    }
  }, [activeWorkspaceId])

  const handleRun = useCallback(
    async (mode: RunMode) => {
      if (!activeWorkspaceId) return
      setLogs([])
      setRunResult(null)
      setRunStatus('building')

      try {
        let result: RunResult
        if (mode === 'verify-solution') {
          result = await window.api.verifySolution(activeWorkspaceId)
        } else {
          result = await window.api.runAgentTrial(activeWorkspaceId)
        }
        setRunResult(result)
        setRunStatus(result.status)
      } catch (err) {
        setRunStatus('error')
        setLogs((prev) => [...prev, `Error: ${String(err)}`])
      }
    },
    [activeWorkspaceId]
  )

  const handleStop = useCallback(async () => {
    if (!activeWorkspaceId) return
    try {
      await window.api.stopRunner(activeWorkspaceId)
    } catch (err) {
      console.error('Failed to stop runner:', err)
    }
  }, [activeWorkspaceId])

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Task Runner</h3>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[runStatus]}`} />
            <span className="text-xs text-zinc-400">{STATUS_LABELS[runStatus]}</span>
          </div>
        </div>
        {isRunning && (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-1.5 rounded-md bg-red-600/20 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/30"
          >
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="2" width="8" height="8" rx="1" />
            </svg>
            Stop
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Idle state: show run mode buttons */}
        {!isRunning && !runResult && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500 mb-1">
              Select a run mode to test your task.
            </p>
            {RUN_MODES.map(({ mode, label, description, color }) => (
              <button
                key={mode}
                type="button"
                disabled={!activeWorkspaceId}
                onClick={() => handleRun(mode)}
                className={`flex flex-col items-start gap-1 rounded-lg px-4 py-3 text-left transition-colors disabled:opacity-50 disabled:pointer-events-none ${color} text-white`}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-white/70">{description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Running state: show live log output */}
        {isRunning && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm text-zinc-300">{STATUS_LABELS[runStatus]}</span>
            </div>
            <div
              ref={logContainerRef}
              className="max-h-96 overflow-y-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3"
            >
              <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                {logs.length > 0
                  ? logs.join('\n')
                  : 'Waiting for output...'}
              </pre>
            </div>
          </div>
        )}

        {/* Results */}
        {!isRunning && runResult && (
          <div className="flex flex-col gap-4">
            <ResultsDisplay result={runResult} />

            {/* Run again buttons */}
            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRunResult(null)
                  setRunStatus('idle')
                  setLogs([])
                }}
              >
                Clear Results
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRun(runResult.mode)}
              >
                Run Again
              </Button>
            </div>

            {/* Log output */}
            {logs.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  Show full log output ({logs.length} lines)
                </summary>
                <div
                  ref={logContainerRef}
                  className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3"
                >
                  <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                    {logs.join('\n')}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
