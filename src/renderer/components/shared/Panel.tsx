import React from 'react'

interface PanelProps {
  title?: string
  headerActions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Panel({ title, headerActions, className = '', children }: PanelProps) {
  return (
    <div
      className={`flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden ${className}`}
    >
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
          {title && (
            <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
          )}
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
