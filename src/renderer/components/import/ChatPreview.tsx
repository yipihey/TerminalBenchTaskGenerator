interface ChatPreviewProps {
  messages: Array<{ role: string; content: string }>
}

const ROLE_STYLES: Record<string, string> = {
  user: 'bg-blue-500/20 text-blue-400',
  assistant: 'bg-indigo-500/20 text-indigo-400',
  system: 'bg-amber-500/20 text-amber-400',
}

function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

export function ChatPreview({ messages }: ChatPreviewProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-zinc-500">No messages to preview.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Message count */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs text-zinc-500">{messages.length} messages</span>
      </div>

      {/* Message list */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className="flex items-start gap-2 rounded-md bg-zinc-800/50 px-2.5 py-2"
          >
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                ROLE_STYLES[msg.role] ?? 'bg-zinc-500/20 text-zinc-400'
              }`}
            >
              {msg.role}
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed min-w-0 break-words">
              {truncate(msg.content)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
