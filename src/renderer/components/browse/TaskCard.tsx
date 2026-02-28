import React from 'react'
import { Badge } from '../shared/Badge'
import type { TerminalBenchTaskMeta } from '../../../shared/types'

interface TaskCardProps {
  task: TerminalBenchTaskMeta
  isSelected: boolean
  onClick: () => void
}

const difficultyVariant = {
  easy: 'success' as const,
  medium: 'warning' as const,
  hard: 'danger' as const,
}

export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors duration-150 ${
        isSelected
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-zinc-200 truncate">{task.slug}</span>
        <Badge variant={difficultyVariant[task.difficulty]}>{task.difficulty}</Badge>
      </div>
      <p className="text-xs text-zinc-400 line-clamp-2 mb-2">
        {task.instruction.slice(0, 200)}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
          {task.category}
        </span>
        {task.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-zinc-600 bg-zinc-800/50 rounded px-1.5 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}
