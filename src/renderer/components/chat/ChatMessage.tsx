import { useState } from 'react'
import type { ChatMessage as ChatMessageType, ToolCall } from '../../../shared/types'

interface ChatMessageProps {
  message: ChatMessageType
}

function formatContent(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Split by newlines first, then process inline formatting
  const lines = content.split('\n')

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      nodes.push(<br key={`br-${lineIdx}`} />)
    }

    // Process **bold** and `code` within each line
    const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(line)) !== null) {
      // Push text before the match
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`${lineIdx}-t-${lastIndex}`}>
            {line.slice(lastIndex, match.index)}
          </span>
        )
      }

      if (match[2]) {
        // **bold**
        nodes.push(
          <strong key={`${lineIdx}-b-${match.index}`} className="font-semibold">
            {match[2]}
          </strong>
        )
      } else if (match[3]) {
        // `code`
        nodes.push(
          <code
            key={`${lineIdx}-c-${match.index}`}
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em]"
          >
            {match[3]}
          </code>
        )
      }

      lastIndex = match.index + match[0].length
    }

    // Push remaining text after last match
    if (lastIndex < line.length) {
      nodes.push(
        <span key={`${lineIdx}-t-${lastIndex}`}>{line.slice(lastIndex)}</span>
      )
    }
  })

  return nodes
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(toolCall.isExpanded ?? false)

  const inputPreview = JSON.stringify(toolCall.input)
  const truncatedInput =
    inputPreview.length > 120 ? inputPreview.slice(0, 120) + '...' : inputPreview

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800 transition-colors"
      >
        <svg
          className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4 2l4 4-4 4V2z" />
        </svg>
        <span className="inline-flex items-center rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30">
          {toolCall.name}
        </span>
        <span className="truncate text-xs text-zinc-500 font-mono">
          {truncatedInput}
        </span>
        {toolCall.result && (
          <span className="ml-auto shrink-0 text-xs text-emerald-400">done</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-700 px-3 py-2 space-y-2">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-400">Input</p>
            <pre className="max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-300 font-mono">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-400">Result</p>
              <pre className="max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="max-w-md rounded-lg bg-zinc-700 px-4 py-2 text-center text-xs text-zinc-300">
          {formatContent(message.content)}
        </div>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white">
          {formatContent(message.content)}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100">
          {formatContent(message.content)}
          {message.isStreaming && (
            <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-zinc-300" />
          )}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
