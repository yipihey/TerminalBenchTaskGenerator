import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Workspace, HarborFile, ValidationIssue } from '../../shared/types'

interface WorkspaceState {
  workspaces: Record<string, Workspace>
  activeWorkspaceId: string | null
  workspaceFiles: Record<string, HarborFile[]> // keyed by workspace id
  validationIssues: Record<string, ValidationIssue[]>
  loading: boolean

  // Actions
  setActiveWorkspace: (id: string | null) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void
  removeWorkspace: (id: string) => void
  setWorkspaceFiles: (workspaceId: string, files: HarborFile[]) => void
  updateFileContent: (workspaceId: string, filePath: string, content: string) => void
  setValidationIssues: (workspaceId: string, issues: ValidationIssue[]) => void
  setLoading: (loading: boolean) => void

  // Derived
  activeWorkspace: () => Workspace | null
  activeFiles: () => HarborFile[]
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set, get) => ({
    workspaces: {},
    activeWorkspaceId: null,
    workspaceFiles: {},
    validationIssues: {},
    loading: false,

    setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

    addWorkspace: (workspace) =>
      set((state) => {
        state.workspaces[workspace.id] = workspace
        state.activeWorkspaceId = workspace.id
      }),

    updateWorkspace: (id, updates) =>
      set((state) => {
        if (state.workspaces[id]) {
          Object.assign(state.workspaces[id], updates)
        }
      }),

    removeWorkspace: (id) =>
      set((state) => {
        delete state.workspaces[id]
        delete state.workspaceFiles[id]
        delete state.validationIssues[id]
        if (state.activeWorkspaceId === id) {
          const ids = Object.keys(state.workspaces)
          state.activeWorkspaceId = ids.length > 0 ? ids[0] : null
        }
      }),

    setWorkspaceFiles: (workspaceId, files) =>
      set((state) => {
        state.workspaceFiles[workspaceId] = files
      }),

    updateFileContent: (workspaceId, filePath, content) =>
      set((state) => {
        const files = state.workspaceFiles[workspaceId]
        if (files) {
          const file = files.find((f) => f.path === filePath)
          if (file) {
            file.content = content
          }
        }
      }),

    setValidationIssues: (workspaceId, issues) =>
      set((state) => {
        state.validationIssues[workspaceId] = issues
      }),

    setLoading: (loading) => set({ loading }),

    activeWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get()
      return activeWorkspaceId ? workspaces[activeWorkspaceId] ?? null : null
    },

    activeFiles: () => {
      const { workspaceFiles, activeWorkspaceId } = get()
      return activeWorkspaceId ? workspaceFiles[activeWorkspaceId] ?? [] : []
    },
  }))
)
