import React, { useMemo } from 'react'
import { Badge } from '../shared/Badge'
import { Button } from '../shared/Button'
import { useBrowseStore } from '../../stores/browseStore'
import { useBrowse } from '../../hooks/useBrowse'

const difficultyVariant = {
  easy: 'success' as const,
  medium: 'warning' as const,
  hard: 'danger' as const,
}

export function TaskPreview() {
  const tasks = useBrowseStore((s) => s.tasks)
  const selectedSlug = useBrowseStore((s) => s.selectedSlug)
  const importStatus = useBrowseStore((s) => s.importStatus)
  const { importTask } = useBrowse()

  const selectedTask = useMemo(
    () => (selectedSlug ? tasks.find((t) => t.slug === selectedSlug) ?? null : null),
    [tasks, selectedSlug]
  )

  if (!selectedTask) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm px-4 text-center">
        Select a task to see its details.
      </div>
    )
  }

  const slug = selectedTask.slug
  const status = importStatus[slug] || 'idle'

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-zinc-200 truncate">{selectedTask.slug}</h3>
          <Badge variant={difficultyVariant[selectedTask.difficulty]}>
            {selectedTask.difficulty}
          </Badge>
        </div>

        {/* Metadata table */}
        <div className="flex flex-col gap-1.5 mb-3">
          <MetaRow label="Category" value={selectedTask.category} />
          <MetaRow label="Author" value={selectedTask.authorName} />
          <MetaRow label="Agent Timeout" value={`${selectedTask.maxAgentTimeoutSec}s`} />
          <MetaRow label="Test Timeout" value={`${selectedTask.maxTestTimeoutSec}s`} />
        </div>

        {/* Tags */}
        {selectedTask.tags.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {selectedTask.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instruction */}
        <div className="mb-3">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Instruction</p>
          <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {selectedTask.instruction}
          </p>
        </div>

        {/* Files */}
        <div className="mb-3">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
            Files ({selectedTask.files.length})
          </p>
          <div className="flex flex-col gap-0.5">
            {selectedTask.files.map((f) => (
              <span key={f} className="text-[11px] text-zinc-500 font-mono truncate">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Import button */}
      <div className="p-3 border-t border-zinc-800">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={status === 'importing' || status === 'imported'}
          onClick={() => importTask(slug)}
        >
          {status === 'importing'
            ? 'Importing...'
            : status === 'imported'
              ? 'Imported'
              : 'Import as Workspace'}
        </Button>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className="text-[11px] text-zinc-300">{value}</span>
    </div>
  )
}
