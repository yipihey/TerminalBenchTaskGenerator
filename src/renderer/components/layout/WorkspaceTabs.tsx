import React from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useUiStore } from '../../stores/uiStore'
import type { WorkspaceStatus } from '../../../shared/types'

const statusDotColor: Record<WorkspaceStatus, string> = {
  clean: 'bg-zinc-500',
  dirty: 'bg-amber-400',
  'agent-active': 'bg-indigo-400 animate-pulse',
  'run-failed': 'bg-red-500',
  'run-passed': 'bg-green-500',
}

export function WorkspaceTabs() {
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace)
  const setShowNewWorkspaceDialog = useUiStore((s) => s.setShowNewWorkspaceDialog)

  const workspaceList = Object.values(workspaces)

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeWorkspace(id)
  }

  return (
    <div
      className="flex items-center h-10 bg-zinc-950 border-b border-zinc-800 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* macOS traffic lights spacing */}
      <div className="w-20 shrink-0" />

      {/* Tabs */}
      <div
        className="flex items-center gap-0.5 h-full overflow-x-auto no-scrollbar"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {workspaceList.map((ws) => {
          const isActive = ws.id === activeWorkspaceId
          return (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className={`group flex items-center gap-2 h-full px-4 text-xs font-medium transition-colors duration-100 border-b-2 ${
                isActive
                  ? 'bg-zinc-900 text-zinc-100 border-indigo-500'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50 border-transparent'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor[ws.status]}`}
              />
              <span className="truncate max-w-[120px]">{ws.name}</span>
              <span
                onClick={(e) => handleClose(e, ws.id)}
                className="ml-1 p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </button>
          )
        })}

        {/* New workspace button */}
        <button
          onClick={() => setShowNewWorkspaceDialog(true)}
          className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors mx-1"
          title="New workspace"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Spacer to fill remaining draggable area */}
      <div className="flex-1" />
    </div>
  )
}
