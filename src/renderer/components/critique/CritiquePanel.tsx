import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useCritique } from '../../hooks/useCritique'
import { Button } from '../shared/Button'
import { SuggestionCard } from './SuggestionCard'

function ScoreDots({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i < score
              ? score <= 2
                ? 'bg-red-400'
                : score <= 3
                  ? 'bg-amber-400'
                  : 'bg-green-400'
              : 'bg-zinc-700'
          }`}
        />
      ))}
    </div>
  )
}

function scoreColor(score: number): string {
  if (score <= 2) return 'text-red-400'
  if (score <= 3) return 'text-amber-400'
  return 'text-green-400'
}

export function CritiquePanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const { result, status, runCritique, applySuggestion } = useCritique(activeWorkspaceId)

  const isRunning = status === 'running'

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 shrink-0">
        <h3 className="text-sm font-medium text-zinc-300">Critique</h3>
        <Button
          variant="primary"
          size="sm"
          disabled={!activeWorkspaceId || isRunning}
          onClick={runCritique}
        >
          {isRunning && (
            <svg
              className="mr-1.5 h-3 w-3 animate-spin"
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
          )}
          {isRunning ? 'Running...' : 'Run Critique'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Empty state */}
        {!result && !isRunning && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500 text-center max-w-xs">
              Run a critique to evaluate your task against Harbor best practices.
            </p>
          </div>
        )}

        {/* Loading state */}
        {isRunning && !result && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="h-8 w-8 animate-spin text-indigo-400"
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
              <p className="text-sm text-zinc-400">Analyzing your task...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex flex-col gap-6">
            {/* Overall score */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`text-4xl font-bold tabular-nums ${scoreColor(result.overallScore)}`}
                >
                  {result.overallScore.toFixed(1)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
                  Overall
                </span>
              </div>
              <div className="h-12 w-px bg-zinc-800" />
              <p className="text-xs text-zinc-400">
                Scored across {result.dimensions.length} dimensions on a 1-5 scale.
              </p>
            </div>

            {/* Dimension cards grid */}
            <div className="grid grid-cols-1 gap-3">
              {result.dimensions.map((dim) => (
                <div
                  key={dim.name}
                  className="rounded-lg bg-zinc-800 border border-zinc-700/50 p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-zinc-200">{dim.name}</span>
                    <ScoreDots score={dim.score} />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{dim.feedback}</p>
                </div>
              ))}
            </div>

            {/* Prioritized suggestions */}
            {result.prioritizedSuggestions.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Suggestions
                </h4>
                {result.prioritizedSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApply={() => applySuggestion(suggestion.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
