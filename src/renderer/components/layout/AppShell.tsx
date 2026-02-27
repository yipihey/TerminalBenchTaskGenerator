import React from 'react'
import { useUiStore, type SidebarMode } from '../../stores/uiStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useChatStore } from '../../stores/chatStore'
import { useCritiqueStore } from '../../stores/critiqueStore'
import { Sidebar } from './Sidebar'
import { WorkspaceTabs } from './WorkspaceTabs'
import { StatusBar } from './StatusBar'
import { Panel } from '../shared/Panel'
import { ChatPanel } from '../chat/ChatPanel'
import { EditorPanel } from '../editor/EditorPanel'
import { RunnerPanel } from '../runner/RunnerPanel'
import { VersionHistory } from '../history/VersionHistory'
import { CritiquePanel } from '../critique/CritiquePanel'

/** Mini file list shown in the right panel during Chat mode */
function MiniEditor() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const workspaceFiles = useWorkspaceStore((s) => s.workspaceFiles)
  const setSidebarMode = useUiStore((s) => s.setSidebarMode)
  const files = activeWorkspaceId ? workspaceFiles[activeWorkspaceId] ?? [] : []

  if (!activeWorkspaceId || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm px-4 text-center">
        No files yet. Start a conversation to generate Harbor files.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Workspace Files</p>
      {files.map((f) => {
        const name = f.path.split('/').pop() || f.path
        const lines = f.content.split('\n').length
        return (
          <button
            key={f.path}
            onClick={() => setSidebarMode('edit')}
            className="flex items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-zinc-800 group"
          >
            <span className="text-zinc-300 group-hover:text-zinc-100 truncate">{name}</span>
            <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{lines}L</span>
          </button>
        )
      })}
    </div>
  )
}

/** Recent chat messages shown in the right panel during Editor mode */
function LiveChat() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const getMessages = useChatStore((s) => s.getMessages)
  const setSidebarMode = useUiStore((s) => s.setSidebarMode)
  const messages = activeWorkspaceId ? getMessages(activeWorkspaceId) : []
  const recent = messages.slice(-5)

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm px-4 text-center">
        No messages yet. Switch to Chat to start a conversation.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {recent.map((msg) => (
            <div key={msg.id} className="rounded-md bg-zinc-800/50 p-2">
              <p className="text-[10px] font-medium text-zinc-500 mb-0.5">
                {msg.role === 'user' ? 'You' : 'Agent'}
              </p>
              <p className="text-xs text-zinc-400 line-clamp-3">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setSidebarMode('chat')}
        className="mx-3 mb-3 rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        Open full chat
      </button>
    </div>
  )
}

/** Score summary shown in the right panel during Critique mode */
function ScoresPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const getResult = useCritiqueStore((s) => s.getResult)
  const result = activeWorkspaceId ? getResult(activeWorkspaceId) : null

  if (!result || result.dimensions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm px-4 text-center">
        Run a critique to see scores.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Dimension Scores</p>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-zinc-400">Overall:</span>
        <span className="text-sm font-medium text-indigo-400">{result.overallScore.toFixed(1)}/5</span>
      </div>
      {result.dimensions.map((dim) => (
        <div key={dim.name} className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 capitalize truncate mr-2">{dim.name.replace(/_/g, ' ')}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${(dim.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 w-6 text-right">{dim.score}/5</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Validation summary shown in right panel during Runner mode */
function ValidationSummary() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const validationIssues = useWorkspaceStore((s) => s.validationIssues)
  const issues = activeWorkspaceId ? validationIssues[activeWorkspaceId] ?? [] : []

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Validation</p>
      {issues.length === 0 ? (
        <p className="text-xs text-zinc-500">No validation run yet. Switch to Editor to see inline issues.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            {errors > 0 && (
              <span className="text-xs text-red-400">{errors} error{errors !== 1 ? 's' : ''}</span>
            )}
            {warnings > 0 && (
              <span className="text-xs text-yellow-400">{warnings} warning{warnings !== 1 ? 's' : ''}</span>
            )}
            {errors === 0 && warnings === 0 && (
              <span className="text-xs text-green-400">All checks passed</span>
            )}
          </div>
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {issues.slice(0, 10).map((issue, i) => (
              <div key={i} className="text-[11px] text-zinc-500 flex gap-1.5">
                <span className={issue.severity === 'error' ? 'text-red-400' : issue.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}>
                  {issue.severity === 'error' ? '!!' : issue.severity === 'warning' ? '!' : 'i'}
                </span>
                <span className="truncate">{issue.message}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const mainPanelContent: Record<SidebarMode, React.ReactNode> = {
  chat: <ChatPanel />,
  edit: <EditorPanel />,
  run: <RunnerPanel />,
  history: <VersionHistory />,
  critique: <CritiquePanel />,
}

const rightPanelContent: Record<SidebarMode, { title: string; content: React.ReactNode }> = {
  chat: { title: 'Mini Editor', content: <MiniEditor /> },
  edit: { title: 'Live Chat', content: <LiveChat /> },
  run: { title: 'Validation', content: <ValidationSummary /> },
  history: { title: 'Diff View', content: <ValidationSummary /> },
  critique: { title: 'Scores', content: <ScoresPanel /> },
}

export function AppShell() {
  const sidebarMode = useUiStore((s) => s.sidebarMode)
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen)
  const rightPanelWidth = useUiStore((s) => s.rightPanelWidth)
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel)

  const rightPanel = rightPanelContent[sidebarMode]

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <WorkspaceTabs />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-hidden bg-zinc-950">
          {mainPanelContent[sidebarMode]}
        </div>

        {rightPanelOpen && (
          <div
            className="shrink-0 border-l border-zinc-800 overflow-hidden"
            style={{ width: rightPanelWidth }}
          >
            <Panel
              title={rightPanel.title}
              headerActions={
                <button
                  onClick={toggleRightPanel}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Close panel"
                >
                  <svg
                    width="14"
                    height="14"
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
                </button>
              }
              className="h-full rounded-none border-0"
            >
              {rightPanel.content}
            </Panel>
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  )
}
