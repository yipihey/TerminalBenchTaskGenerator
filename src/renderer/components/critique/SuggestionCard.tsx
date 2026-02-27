import { Badge } from '../shared/Badge'
import { Button } from '../shared/Button'
import type { CritiqueSuggestion } from '../../../shared/types'

interface SuggestionCardProps {
  suggestion: CritiqueSuggestion
  onApply: () => void
}

const SEVERITY_VARIANT: Record<CritiqueSuggestion['severity'], 'danger' | 'warning' | 'neutral'> = {
  critical: 'danger',
  important: 'warning',
  minor: 'neutral',
}

export function SuggestionCard({ suggestion, onApply }: SuggestionCardProps) {
  return (
    <div className="rounded-lg bg-zinc-800 border border-zinc-700/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={SEVERITY_VARIANT[suggestion.severity]}>
              {suggestion.severity}
            </Badge>
            <span className="text-xs text-zinc-500">{suggestion.dimension}</span>
          </div>
          <span className="text-sm font-medium text-zinc-200">{suggestion.title}</span>
          <p className="text-xs text-zinc-400 leading-relaxed">{suggestion.description}</p>
        </div>

        <div className="shrink-0 pt-1">
          {suggestion.applied ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Applied
            </span>
          ) : (
            <Button variant="primary" size="sm" onClick={onApply}>
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
