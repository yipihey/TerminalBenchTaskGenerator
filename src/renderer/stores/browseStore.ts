import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { TerminalBenchTaskMeta } from '../../shared/types'

export type BrowseStatus = 'idle' | 'loading' | 'loaded' | 'error'
export type ImportStatus = 'idle' | 'importing' | 'imported' | 'error'

interface BrowseState {
  tasks: TerminalBenchTaskMeta[]
  status: BrowseStatus
  error: string | null
  searchQuery: string
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard'
  categoryFilter: string // empty string = all
  selectedSlug: string | null
  importStatus: Record<string, ImportStatus> // keyed by slug

  // Actions
  setTasks: (tasks: TerminalBenchTaskMeta[]) => void
  setStatus: (status: BrowseStatus) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  setDifficultyFilter: (filter: 'all' | 'easy' | 'medium' | 'hard') => void
  setCategoryFilter: (category: string) => void
  setSelectedSlug: (slug: string | null) => void
  setImportStatus: (slug: string, status: ImportStatus) => void
}

export const useBrowseStore = create<BrowseState>()(
  immer((set) => ({
    tasks: [],
    status: 'idle',
    error: null,
    searchQuery: '',
    difficultyFilter: 'all',
    categoryFilter: '',
    selectedSlug: null,
    importStatus: {},

    setTasks: (tasks) => set({ tasks }),
    setStatus: (status) => set({ status }),
    setError: (error) => set({ error }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setDifficultyFilter: (filter) => set({ difficultyFilter: filter }),
    setCategoryFilter: (category) => set({ categoryFilter: category }),
    setSelectedSlug: (slug) => set({ selectedSlug: slug }),
    setImportStatus: (slug, status) =>
      set((state) => {
        state.importStatus[slug] = status
      }),
  }))
)

// ── Derived selectors (pure functions, used with useMemo in components) ──

export function filterTasks(
  tasks: TerminalBenchTaskMeta[],
  searchQuery: string,
  difficultyFilter: string,
  categoryFilter: string
): TerminalBenchTaskMeta[] {
  const q = searchQuery.toLowerCase()

  return tasks.filter((task) => {
    if (difficultyFilter !== 'all' && task.difficulty !== difficultyFilter) return false
    if (categoryFilter && task.category !== categoryFilter) return false
    if (q) {
      const haystack = [task.slug, task.instruction, task.category, ...task.tags]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

export function getCategories(tasks: TerminalBenchTaskMeta[]): string[] {
  const cats = new Set(tasks.map((t) => t.category))
  return Array.from(cats).sort()
}
