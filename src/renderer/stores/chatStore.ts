import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ChatMessage, ToolCall, AgentEvent } from '../../shared/types'
import { v4 as uuid } from 'uuid'

type AgentStatus = 'idle' | 'thinking' | 'writing'

interface ChatState {
  // Per-workspace chat messages
  messages: Record<string, ChatMessage[]>
  agentStatus: Record<string, AgentStatus>

  // Actions
  addUserMessage: (workspaceId: string, content: string) => void
  addAssistantMessage: (workspaceId: string, content: string) => void
  appendToLastAssistant: (workspaceId: string, content: string) => void
  addToolCall: (workspaceId: string, toolCall: ToolCall) => void
  updateToolCallResult: (workspaceId: string, toolCallId: string, result: string) => void
  setAgentStatus: (workspaceId: string, status: AgentStatus) => void
  processAgentEvent: (workspaceId: string, event: AgentEvent) => void
  clearMessages: (workspaceId: string) => void

  // Derived
  getMessages: (workspaceId: string) => ChatMessage[]
  getAgentStatus: (workspaceId: string) => AgentStatus
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    messages: {},
    agentStatus: {},

    addUserMessage: (workspaceId, content) =>
      set((state) => {
        if (!state.messages[workspaceId]) state.messages[workspaceId] = []
        state.messages[workspaceId].push({
          id: uuid(),
          role: 'user',
          content,
          timestamp: Date.now(),
        })
      }),

    addAssistantMessage: (workspaceId, content) =>
      set((state) => {
        if (!state.messages[workspaceId]) state.messages[workspaceId] = []
        state.messages[workspaceId].push({
          id: uuid(),
          role: 'assistant',
          content,
          timestamp: Date.now(),
          toolCalls: [],
          isStreaming: true,
        })
      }),

    appendToLastAssistant: (workspaceId, content) =>
      set((state) => {
        const msgs = state.messages[workspaceId]
        if (!msgs) return
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant') {
          last.content += content
        }
      }),

    addToolCall: (workspaceId, toolCall) =>
      set((state) => {
        const msgs = state.messages[workspaceId]
        if (!msgs) return
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant') {
          if (!last.toolCalls) last.toolCalls = []
          last.toolCalls.push(toolCall)
        }
      }),

    updateToolCallResult: (workspaceId, toolCallId, result) =>
      set((state) => {
        const msgs = state.messages[workspaceId]
        if (!msgs) return
        for (const msg of msgs) {
          const tc = msg.toolCalls?.find((t) => t.id === toolCallId)
          if (tc) {
            tc.result = result
            break
          }
        }
      }),

    setAgentStatus: (workspaceId, status) =>
      set((state) => {
        state.agentStatus[workspaceId] = status
      }),

    processAgentEvent: (workspaceId, event) => {
      const { addAssistantMessage, appendToLastAssistant, addToolCall, updateToolCallResult, setAgentStatus } = get()

      switch (event.type) {
        case 'assistant_message': {
          const msgs = get().messages[workspaceId] ?? []
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            appendToLastAssistant(workspaceId, event.content)
          } else {
            addAssistantMessage(workspaceId, event.content)
          }
          setAgentStatus(workspaceId, 'writing')
          break
        }
        case 'thinking':
          setAgentStatus(workspaceId, 'thinking')
          break
        case 'tool_use': {
          // Ensure there's a streaming assistant message to attach tool calls to
          const toolMsgs = get().messages[workspaceId] ?? []
          const toolLast = toolMsgs[toolMsgs.length - 1]
          if (!toolLast || toolLast.role !== 'assistant' || !toolLast.isStreaming) {
            addAssistantMessage(workspaceId, '')
          }
          addToolCall(workspaceId, {
            id: uuid(),
            name: event.toolName ?? 'unknown',
            input: event.toolInput ?? {},
          })
          break
        }
        case 'tool_result':
          // Find most recent tool call without result
          set((state) => {
            const msgs = state.messages[workspaceId]
            if (!msgs) return
            for (let i = msgs.length - 1; i >= 0; i--) {
              const tcs = msgs[i].toolCalls
              if (!tcs) continue
              for (let j = tcs.length - 1; j >= 0; j--) {
                if (!tcs[j].result) {
                  tcs[j].result = event.content
                  return
                }
              }
            }
          })
          break
        case 'done':
          // Mark last assistant message as done streaming
          set((state) => {
            const msgs = state.messages[workspaceId]
            if (!msgs) return
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'assistant') {
              last.isStreaming = false
            }
          })
          setAgentStatus(workspaceId, 'idle')
          break
        case 'error':
          set((state) => {
            if (!state.messages[workspaceId]) state.messages[workspaceId] = []
            state.messages[workspaceId].push({
              id: uuid(),
              role: 'system',
              content: `Error: ${event.content}`,
              timestamp: Date.now(),
            })
          })
          setAgentStatus(workspaceId, 'idle')
          break
      }
    },

    clearMessages: (workspaceId) =>
      set((state) => {
        state.messages[workspaceId] = []
      }),

    getMessages: (workspaceId) => get().messages[workspaceId] ?? [],
    getAgentStatus: (workspaceId) => get().agentStatus[workspaceId] ?? 'idle',
  }))
)
