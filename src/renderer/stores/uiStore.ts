import { create } from 'zustand'

export type SidebarMode = 'chat' | 'edit' | 'run' | 'history' | 'critique' | 'browse'
export type Theme = 'dark' | 'light'

interface UiState {
  sidebarMode: SidebarMode
  theme: Theme
  rightPanelOpen: boolean
  rightPanelWidth: number
  mainSplitRatio: number // 0-1, left portion of main content
  showImportDialog: boolean
  showNewWorkspaceDialog: boolean

  setSidebarMode: (mode: SidebarMode) => void
  setTheme: (theme: Theme) => void
  toggleRightPanel: () => void
  setRightPanelWidth: (width: number) => void
  setMainSplitRatio: (ratio: number) => void
  setShowImportDialog: (show: boolean) => void
  setShowNewWorkspaceDialog: (show: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarMode: 'chat',
  theme: 'dark',
  rightPanelOpen: true,
  rightPanelWidth: 320,
  mainSplitRatio: 0.5,
  showImportDialog: false,
  showNewWorkspaceDialog: false,

  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  setTheme: (theme) => set({ theme }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  setMainSplitRatio: (ratio) => set({ mainSplitRatio: ratio }),
  setShowImportDialog: (show) => set({ showImportDialog: show }),
  setShowNewWorkspaceDialog: (show) => set({ showNewWorkspaceDialog: show }),
}))
