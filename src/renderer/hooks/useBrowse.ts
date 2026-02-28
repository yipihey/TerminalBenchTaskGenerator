import { useCallback } from 'react'
import { useBrowseStore } from '../stores/browseStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useUiStore } from '../stores/uiStore'

export function useBrowse() {
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace)
  const setWorkspaceFiles = useWorkspaceStore((s) => s.setWorkspaceFiles)
  const setSidebarMode = useUiStore((s) => s.setSidebarMode)

  const loadIndex = useCallback(async (forceRefresh = false) => {
    const { setStatus, setError, setTasks } = useBrowseStore.getState()
    setStatus('loading')
    setError(null)
    try {
      const index = await window.api.fetchBrowseIndex(forceRefresh)
      setTasks(index.tasks)
      setStatus('loaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch index'
      setError(message)
      setStatus('error')
    }
  }, [])

  const importTask = useCallback(async (slug: string) => {
    const { setImportStatus } = useBrowseStore.getState()
    setImportStatus(slug, 'importing')
    try {
      const workspace = await window.api.importBrowseTask(slug)
      addWorkspace(workspace)

      try {
        const files = await window.api.getWorkspaceFiles(workspace.id)
        setWorkspaceFiles(workspace.id, files)
      } catch (err) {
        console.error('Failed to load imported workspace files:', err)
      }

      try {
        await window.api.startFileWatch(workspace.id)
      } catch (err) {
        console.error('Failed to start file watch:', err)
      }

      setImportStatus(slug, 'imported')
      setSidebarMode('edit')
    } catch (err) {
      console.error('Failed to import task:', err)
      setImportStatus(slug, 'error')
    }
  }, [])

  return { loadIndex, importTask }
}
