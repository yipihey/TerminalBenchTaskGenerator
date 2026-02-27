import { useCallback, useEffect } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useChatStore } from '../stores/chatStore'
import { useEditorStore } from '../stores/editorStore'

export function useWorkspace() {
  const store = useWorkspaceStore()
  const processAgentEvent = useChatStore((s) => s.processAgentEvent)
  const markFileChanged = useEditorStore((s) => s.markFileChanged)

  useEffect(() => {
    const unsubFileChanged = window.api.onFileChanged((workspaceId, filePath, content) => {
      store.updateFileContent(workspaceId, filePath, content)
      markFileChanged(workspaceId, filePath)
    })

    const unsubAgent = window.api.onAgentEvent((workspaceId, event) => {
      processAgentEvent(workspaceId, event)
    })

    const setAgentStatus = useChatStore.getState().setAgentStatus
    const unsubAgentStatus = window.api.onAgentStatusChanged((workspaceId, status) => {
      setAgentStatus(workspaceId, status)
    })

    const unsubValidation = window.api.onValidationIssues((workspaceId, issues) => {
      store.setValidationIssues(workspaceId, issues)
    })

    return () => {
      unsubFileChanged()
      unsubAgent()
      unsubAgentStatus()
      unsubValidation()
    }
  }, [])

  const createWorkspace = useCallback(
    async (name: string, domain?: string, field?: string, template?: string) => {
      store.setLoading(true)
      try {
        const workspace = await window.api.createWorkspace(name, domain, field, template)
        store.addWorkspace(workspace)
        try {
          const files = await window.api.getWorkspaceFiles(workspace.id)
          store.setWorkspaceFiles(workspace.id, files)
        } catch (err) {
          console.error('Failed to load workspace files:', err)
        }
        try {
          await window.api.startFileWatch(workspace.id)
        } catch (err) {
          console.error('Failed to start file watch:', err)
        }
        return workspace
      } catch (err) {
        console.error('Failed to create workspace:', err)
        throw err
      } finally {
        store.setLoading(false)
      }
    },
    []
  )

  const openWorkspace = useCallback(async (path: string) => {
    store.setLoading(true)
    try {
      const workspace = await window.api.openWorkspace(path)
      store.addWorkspace(workspace)
      const files = await window.api.getWorkspaceFiles(workspace.id)
      store.setWorkspaceFiles(workspace.id, files)
      await window.api.startFileWatch(workspace.id)
      return workspace
    } finally {
      store.setLoading(false)
    }
  }, [])

  const closeWorkspace = useCallback(async (id: string) => {
    try {
      await window.api.stopFileWatch(id)
    } catch {
      // ignore
    }
    store.removeWorkspace(id)
  }, [])

  const saveFile = useCallback(async (workspaceId: string, filePath: string, content: string) => {
    await window.api.writeFile(filePath, content)
    store.updateFileContent(workspaceId, filePath, content)
  }, [])

  const loadWorkspaces = useCallback(async () => {
    store.setLoading(true)
    try {
      const workspaces = await window.api.listWorkspaces()
      for (const ws of workspaces) {
        store.addWorkspace(ws)
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    } finally {
      store.setLoading(false)
    }
  }, [])

  return {
    ...store,
    createWorkspace,
    openWorkspace,
    closeWorkspace,
    saveFile,
    loadWorkspaces,
  }
}
