import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CritiqueResult, CritiqueSuggestion } from '../../shared/types'

type CritiqueStatus = 'idle' | 'running' | 'done' | 'error'

interface CritiqueState {
  results: Record<string, CritiqueResult> // keyed by workspace id
  status: Record<string, CritiqueStatus>
  error: Record<string, string>

  setResult: (workspaceId: string, result: CritiqueResult) => void
  setStatus: (workspaceId: string, status: CritiqueStatus) => void
  setError: (workspaceId: string, error: string) => void
  markSuggestionApplied: (workspaceId: string, suggestionId: string) => void

  getResult: (workspaceId: string) => CritiqueResult | null
  getStatus: (workspaceId: string) => CritiqueStatus
}

export const useCritiqueStore = create<CritiqueState>()(
  immer((set, get) => ({
    results: {},
    status: {},
    error: {},

    setResult: (workspaceId, result) =>
      set((state) => {
        state.results[workspaceId] = result
      }),

    setStatus: (workspaceId, status) =>
      set((state) => {
        state.status[workspaceId] = status
      }),

    setError: (workspaceId, error) =>
      set((state) => {
        state.error[workspaceId] = error
      }),

    markSuggestionApplied: (workspaceId, suggestionId) =>
      set((state) => {
        const result = state.results[workspaceId]
        if (!result) return
        const suggestion = result.prioritizedSuggestions.find(
          (s: CritiqueSuggestion) => s.id === suggestionId
        )
        if (suggestion) suggestion.applied = true
      }),

    getResult: (workspaceId) => get().results[workspaceId] ?? null,
    getStatus: (workspaceId) => get().status[workspaceId] ?? 'idle',
  }))
)
