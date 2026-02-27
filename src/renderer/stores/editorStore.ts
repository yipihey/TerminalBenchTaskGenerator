import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type EditorTabId = 'task.toml' | 'instruction.md' | 'Dockerfile' | 'solve.sh' | 'test.sh'
export type TaskTomlViewMode = 'form' | 'raw'

interface EditorTab {
  id: EditorTabId
  label: string
  language: string
  dirty: boolean
}

const DEFAULT_TABS: EditorTab[] = [
  { id: 'task.toml', label: 'task.toml', language: 'toml', dirty: false },
  { id: 'instruction.md', label: 'instruction.md', language: 'markdown', dirty: false },
  { id: 'Dockerfile', label: 'Dockerfile', language: 'dockerfile', dirty: false },
  { id: 'solve.sh', label: 'solve.sh', language: 'shell', dirty: false },
  { id: 'test.sh', label: 'test.sh', language: 'shell', dirty: false },
]

interface EditorState {
  activeTab: EditorTabId
  tabs: EditorTab[]
  taskTomlViewMode: TaskTomlViewMode
  changedFiles: Record<string, Set<string>> // workspace id -> set of changed file paths

  setActiveTab: (tab: EditorTabId) => void
  setTaskTomlViewMode: (mode: TaskTomlViewMode) => void
  markDirty: (tabId: EditorTabId, dirty: boolean) => void
  markFileChanged: (workspaceId: string, filePath: string) => void
  clearChangedFiles: (workspaceId: string) => void
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    activeTab: 'task.toml',
    tabs: DEFAULT_TABS,
    taskTomlViewMode: 'form',
    changedFiles: {},

    setActiveTab: (tab) => set({ activeTab: tab }),

    setTaskTomlViewMode: (mode) => set({ taskTomlViewMode: mode }),

    markDirty: (tabId, dirty) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (tab) tab.dirty = dirty
      }),

    markFileChanged: (workspaceId, filePath) =>
      set((state) => {
        if (!state.changedFiles[workspaceId]) {
          state.changedFiles[workspaceId] = new Set()
        }
        state.changedFiles[workspaceId].add(filePath)
      }),

    clearChangedFiles: (workspaceId) =>
      set((state) => {
        delete state.changedFiles[workspaceId]
      }),
  }))
)
