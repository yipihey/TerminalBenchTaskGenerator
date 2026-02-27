import React from 'react'
import { useUiStore, type SidebarMode } from '../../stores/uiStore'

interface SidebarButton {
  mode: SidebarMode
  label: string
  icon: React.ReactNode
}

const sidebarButtons: SidebarButton[] = [
  {
    mode: 'chat',
    label: 'Chat',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    mode: 'edit',
    label: 'Edit',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    mode: 'run',
    label: 'Run',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    mode: 'history',
    label: 'History',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
    ),
  },
  {
    mode: 'critique',
    label: 'Critique',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const sidebarMode = useUiStore((s) => s.sidebarMode)
  const setSidebarMode = useUiStore((s) => s.setSidebarMode)

  return (
    <div className="flex flex-col items-center w-14 shrink-0 bg-zinc-900 border-r border-zinc-800 py-3 gap-1">
      {sidebarButtons.map((btn) => {
        const isActive = sidebarMode === btn.mode
        return (
          <button
            key={btn.mode}
            onClick={() => setSidebarMode(btn.mode)}
            title={btn.label}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-150 ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {btn.icon}
          </button>
        )
      })}
    </div>
  )
}
