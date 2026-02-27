import React from 'react'
import { useUiStore } from '../../stores/uiStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'

const modeLabelMap: Record<string, string> = {
  chat: 'Chat',
  edit: 'Editor',
  run: 'Runner',
  history: 'History',
  critique: 'Critique',
}

export function StatusBar() {
  const sidebarMode = useUiStore((s) => s.sidebarMode)
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const validationIssues = useWorkspaceStore((s) => s.validationIssues)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const workspace = activeWorkspace()
  const issues = activeWorkspaceId ? validationIssues[activeWorkspaceId] ?? [] : []
  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  const agentStatus = workspace?.status === 'agent-active' ? 'thinking' : 'idle'

  return (
    <div className="flex items-center justify-between h-7 px-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 shrink-0 select-none">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {workspace && (
          <span className="text-zinc-400">{workspace.name}</span>
        )}
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              agentStatus === 'idle'
                ? 'bg-zinc-600'
                : 'bg-indigo-400 animate-pulse'
            }`}
          />
          <span className={agentStatus !== 'idle' ? 'text-indigo-400' : ''}>
            Agent: {agentStatus}
          </span>
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {(errorCount > 0 || warningCount > 0) && (
          <span className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {warningCount}
              </span>
            )}
          </span>
        )}
        <span>{modeLabelMap[sidebarMode]}</span>
      </div>
    </div>
  )
}
