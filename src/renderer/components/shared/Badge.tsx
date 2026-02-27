import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  neutral: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
