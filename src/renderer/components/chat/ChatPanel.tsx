import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useUiStore } from '../../stores/uiStore'
import { useAgent } from '../../hooks/useAgent'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { AgentStatus } from './AgentStatus'

const SUGGESTED_PROMPTS = [
  'Create a data analysis task for genomics',
  'Help me write a molecular dynamics simulation task',
  'I want to create a climate modeling benchmark',
]

export function ChatPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const { messages, status, sendMessage, stop } = useAgent(activeWorkspaceId)
  const setShowNewWorkspaceDialog = useUiStore((s) => s.setShowNewWorkspaceDialog)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAgentActive = status === 'thinking' || status === 'writing'

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSend = (message: string) => {
    sendMessage(message)
  }

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt)
  }

  // No workspace selected — show welcome screen
  if (!activeWorkspaceId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-zinc-900 px-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-zinc-200">
            Terminal Bench Task Generator
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Create benchmark tasks for Terminal-Bench-Science in the Harbor format.
            Start by creating a workspace, then chat with an AI agent to build your task.
          </p>
        </div>
        <button
          onClick={() => setShowNewWorkspaceDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New Workspace
        </button>
        <p className="text-xs text-zinc-600">
          Or click the + button in the tab bar above
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header / Status */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-1.5">
        <AgentStatus status={status} />
        {isAgentActive && (
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-1.5 rounded-md bg-red-600/20 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/30"
          >
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="2" width="8" height="8" rx="1" />
            </svg>
            Stop
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-zinc-300">
                Start a conversation to create your Harbor task
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Describe what kind of scientific benchmark task you want to build.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-indigo-500/50 hover:bg-zinc-800/80 hover:text-zinc-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 p-3">
        <ChatInput
          onSend={handleSend}
          disabled={isAgentActive}
          placeholder={
            isAgentActive
              ? 'Agent is working...'
              : 'Describe the task you want to create...'
          }
        />
        <p className="mt-1.5 text-center text-[11px] text-zinc-600">
          {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to send
        </p>
      </div>
    </div>
  )
}
