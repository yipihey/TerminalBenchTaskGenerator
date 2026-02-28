import React, { useEffect, useMemo } from 'react'
import { useBrowse } from '../../hooks/useBrowse'
import { useBrowseStore, filterTasks, getCategories } from '../../stores/browseStore'
import { TaskCard } from './TaskCard'
import { Button } from '../shared/Button'

export function BrowsePanel() {
  const { loadIndex } = useBrowse()

  const status = useBrowseStore((s) => s.status)
  const error = useBrowseStore((s) => s.error)
  const tasks = useBrowseStore((s) => s.tasks)
  const searchQuery = useBrowseStore((s) => s.searchQuery)
  const setSearchQuery = useBrowseStore((s) => s.setSearchQuery)
  const difficultyFilter = useBrowseStore((s) => s.difficultyFilter)
  const setDifficultyFilter = useBrowseStore((s) => s.setDifficultyFilter)
  const categoryFilter = useBrowseStore((s) => s.categoryFilter)
  const setCategoryFilter = useBrowseStore((s) => s.setCategoryFilter)
  const selectedSlug = useBrowseStore((s) => s.selectedSlug)
  const setSelectedSlug = useBrowseStore((s) => s.setSelectedSlug)

  const filteredTasks = useMemo(
    () => filterTasks(tasks, searchQuery, difficultyFilter, categoryFilter),
    [tasks, searchQuery, difficultyFilter, categoryFilter]
  )

  const categories = useMemo(() => getCategories(tasks), [tasks])

  // Auto-load on first mount
  useEffect(() => {
    if (status === 'idle') {
      loadIndex()
    }
  }, [status, loadIndex])

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">Terminal Bench Tasks</h2>
            {status === 'loaded' && (
              <span className="text-xs text-zinc-500">
                {filteredTasks.length}/{tasks.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadIndex(true)}
            disabled={status === 'loading'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={status === 'loading' ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-8 pr-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficultyFilter(level)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                difficultyFilter === level
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {status === 'loading' && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin text-indigo-500"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <p className="text-sm text-zinc-500">Loading task index from GitHub...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-red-400">Failed to load tasks</p>
            <p className="text-xs text-zinc-500">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => loadIndex(true)}>
              Retry
            </Button>
          </div>
        )}

        {status === 'loaded' && filteredTasks.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-zinc-500">
            No tasks match your filters.
          </div>
        )}

        {filteredTasks.length > 0 && (
          <div className="flex flex-col gap-2">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.slug}
                task={task}
                isSelected={selectedSlug === task.slug}
                onClick={() => setSelectedSlug(task.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
