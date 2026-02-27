import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Describe the task you want to create...',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    // Clamp to ~6 lines (6 * 1.5rem line-height = 9rem = 144px)
    const maxHeight = 144
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    adjustHeight()
  }

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.overflowY = 'hidden'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = value.trim().length === 0

  return (
    <div
      className={`flex items-end gap-2 rounded-xl border bg-zinc-800 px-3 py-2 ${
        disabled ? 'border-zinc-700 opacity-50' : 'border-zinc-700 focus-within:border-zinc-500'
      }`}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none disabled:cursor-not-allowed"
        style={{ overflowY: 'hidden' }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || isEmpty}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
          disabled || isEmpty
            ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer'
        }`}
        aria-label="Send message"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 12V4M8 4L4 8M8 4l4 4" />
        </svg>
      </button>
    </div>
  )
}
