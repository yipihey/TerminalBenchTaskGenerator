import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 border border-transparent',
  secondary:
    'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700',
  ghost:
    'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700 border border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded',
  md: 'px-3.5 py-1.5 text-sm rounded-md',
  lg: 'px-5 py-2.5 text-sm rounded-md',
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className = '',
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  )
}
