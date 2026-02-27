import { useCallback } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import type { ChatMessage } from '../../shared/types'

const EMPTY_MESSAGES: ChatMessage[] = []

export function useAgent(workspaceId: string | null) {
  const addUserMessage = useChatStore((s) => s.addUserMessage)
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace)

  // Subscribe directly to the messages and status slices so the component
  // re-renders when agent events arrive via IPC.
  // Use a stable empty array reference to avoid infinite re-renders.
  const messages = useChatStore((s) =>
    workspaceId ? (s.messages[workspaceId] || EMPTY_MESSAGES) : EMPTY_MESSAGES
  )
  const status = useChatStore((s) =>
    workspaceId ? (s.agentStatus[workspaceId] || 'idle') : 'idle'
  )

  const sendMessage = useCallback(
    async (message: string) => {
      if (!workspaceId) return
      addUserMessage(workspaceId, message)
      updateWorkspace(workspaceId, { status: 'agent-active' })
      try {
        await window.api.sendMessage(workspaceId, message)
      } catch (err) {
        console.error('Failed to send message:', err)
      }
    },
    [workspaceId]
  )

  const stop = useCallback(async () => {
    if (!workspaceId) return
    await window.api.stopAgent(workspaceId)
    updateWorkspace(workspaceId, { status: 'dirty' })
  }, [workspaceId])

  return { messages, status, sendMessage, stop }
}
