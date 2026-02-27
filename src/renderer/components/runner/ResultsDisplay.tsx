import { Badge } from '../shared/Badge'
import type { RunResult, RunMode } from '../../../shared/types'

interface ResultsDisplayProps {
  result: RunResult
}

const MODE_LABELS: Record<RunMode, string> = {
  'verify-solution': 'Verify Solution',
  'agent-trial': 'Agent Trial',
  'harbor-cli': 'Harbor CLI',
}

function formatDuration(startedAt: number, finishedAt?: number): string {
  if (!finishedAt) return '--'
  const ms = finishedAt - startedAt
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const isPassed = result.status === 'passed'
  const isFailed = result.status === 'failed'
  const isError = result.status === 'error'

  return (
    <div className="flex flex-col gap-4">
      {/* Status indicator */}
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
            isPassed
              ? 'bg-green-500/20 text-green-400'
              : isFailed
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {isPassed && (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {isFailed && (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {isError && (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
        </div>

        <div className="flex flex-col">
          <span
            className={`text-lg font-semibold ${
              isPassed ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            {isPassed ? 'Passed' : isFailed ? 'Failed' : 'Error'}
          </span>
          <span className="text-xs text-zinc-500">
            {formatDuration(result.startedAt, result.finishedAt)}
          </span>
        </div>

        {/* Reward score */}
        {result.reward != null && (
          <div className="ml-auto flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Reward</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                result.reward >= 0.8
                  ? 'text-green-400'
                  : result.reward >= 0.5
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {result.reward.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Run mode badge */}
      <div className="flex items-center gap-2">
        <Badge variant="neutral">{MODE_LABELS[result.mode]}</Badge>
      </div>

      {/* Collapsible log output */}
      {result.logs && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            View run logs
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3">
            <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap">
              {result.logs}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
