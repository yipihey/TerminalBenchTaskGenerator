import type { GitCommit } from '../../../shared/types'

interface CommitCardProps {
  commit: GitCommit
  isSelected: boolean
  onSelect: () => void
  onRestore: () => void
}

function relativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function CommitCard({ commit, isSelected, onSelect, onRestore }: CommitCardProps) {
  const shortHash = commit.oid.slice(0, 7)

  return (
    <div
      className={`group relative flex items-start gap-3 pb-4 cursor-pointer ${
        isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'
      }`}
      onClick={onSelect}
    >
      {/* Dot */}
      <div
        className={`relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 transition-colors ${
          isSelected
            ? 'border-indigo-500 bg-indigo-500/20'
            : 'border-zinc-600 bg-zinc-600/20 group-hover:border-zinc-400'
        }`}
      />

      {/* Content */}
      <div className="flex flex-1 min-w-0 items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-indigo-400">{shortHash}</span>
            <span className="text-[11px] text-zinc-500">{relativeTime(commit.timestamp)}</span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-300 truncate">{commit.message}</p>
        </div>

        {/* Restore button (shown on hover) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRestore()
          }}
          className="shrink-0 rounded-md bg-zinc-700/50 px-2 py-1 text-xs text-zinc-400 opacity-0 transition-all hover:bg-zinc-700 hover:text-zinc-200 group-hover:opacity-100"
        >
          Restore
        </button>
      </div>
    </div>
  )
}
