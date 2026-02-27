import { useState, useEffect, useCallback } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { CommitCard } from './CommitCard'
import { DiffViewer } from './DiffViewer'
import type { GitCommit, GitDiff } from '../../../shared/types'

export function VersionHistory() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [selectedOid, setSelectedOid] = useState<string | null>(null)
  const [diffs, setDiffs] = useState<GitDiff[]>([])
  const [loading, setLoading] = useState(false)

  // Load commits on mount or workspace change
  useEffect(() => {
    if (!activeWorkspaceId) {
      setCommits([])
      setSelectedOid(null)
      setDiffs([])
      return
    }

    let cancelled = false

    async function loadCommits() {
      setLoading(true)
      try {
        const log = await window.api.getGitLog(activeWorkspaceId!)
        if (!cancelled) {
          setCommits(log)
          setSelectedOid(null)
          setDiffs([])
        }
      } catch (err) {
        console.error('Failed to load git log:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCommits()
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  const handleSelectCommit = useCallback(
    async (oid: string) => {
      if (!activeWorkspaceId) return
      setSelectedOid(oid)
      try {
        const diff = await window.api.getGitDiff(activeWorkspaceId, oid)
        setDiffs(diff)
      } catch (err) {
        console.error('Failed to load diff:', err)
        setDiffs([])
      }
    },
    [activeWorkspaceId]
  )

  const handleRestore = useCallback(
    async (oid: string) => {
      if (!activeWorkspaceId) return
      try {
        await window.api.restoreVersion(activeWorkspaceId, oid)
        // Reload commits after restore
        const log = await window.api.getGitLog(activeWorkspaceId)
        setCommits(log)
        setSelectedOid(null)
        setDiffs([])
      } catch (err) {
        console.error('Failed to restore version:', err)
      }
    },
    [activeWorkspaceId]
  )

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center border-b border-zinc-800 px-4 py-2 shrink-0">
        <h3 className="text-sm font-medium text-zinc-300">Version History</h3>
        {commits.length > 0 && (
          <span className="ml-2 text-xs text-zinc-500">{commits.length} {commits.length === 1 ? 'commit' : 'commits'}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center p-8">
            <svg
              className="h-5 w-5 animate-spin text-zinc-400"
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
          </div>
        )}

        {/* Empty state */}
        {!loading && commits.length === 0 && (
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-sm text-zinc-500 text-center max-w-xs">
              No version history yet. Changes are auto-committed after agent conversations.
            </p>
          </div>
        )}

        {/* Commit timeline */}
        {!loading && commits.length > 0 && (
          <div className="flex flex-col p-4">
            <div className="relative flex flex-col">
              {commits.map((commit, index) => (
                <div key={commit.oid} className="relative">
                  {/* Connector line */}
                  {index < commits.length - 1 && (
                    <div className="absolute left-[7px] top-5 bottom-0 w-px bg-zinc-700" />
                  )}
                  <CommitCard
                    commit={commit}
                    isSelected={selectedOid === commit.oid}
                    onSelect={() => handleSelectCommit(commit.oid)}
                    onRestore={() => handleRestore(commit.oid)}
                  />
                </div>
              ))}
            </div>

            {/* Diff viewer */}
            {selectedOid && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <DiffViewer diffs={diffs} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
