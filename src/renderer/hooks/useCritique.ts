import { useCallback } from 'react'
import { useCritiqueStore } from '../stores/critiqueStore'

export function useCritique(workspaceId: string | null) {
  const store = useCritiqueStore()

  const result = workspaceId ? store.getResult(workspaceId) : null
  const status = workspaceId ? store.getStatus(workspaceId) : 'idle'

  const runCritique = useCallback(async () => {
    if (!workspaceId) return
    store.setStatus(workspaceId, 'running')
    try {
      const result = await window.api.runCritique(workspaceId)
      store.setResult(workspaceId, result)
      store.setStatus(workspaceId, 'done')
    } catch (err) {
      store.setError(workspaceId, String(err))
      store.setStatus(workspaceId, 'error')
    }
  }, [workspaceId])

  const applySuggestion = useCallback(
    async (suggestionId: string) => {
      if (!workspaceId) return
      await window.api.applySuggestion(workspaceId, suggestionId)
      store.markSuggestionApplied(workspaceId, suggestionId)
    },
    [workspaceId]
  )

  return { result, status, runCritique, applySuggestion }
}
