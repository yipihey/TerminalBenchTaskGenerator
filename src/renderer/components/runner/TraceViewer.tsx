import { useState, useMemo } from 'react'
import { Badge } from '../shared/Badge'
import type { AgentEvent, AgentEventType } from '../../../shared/types'

interface TraceViewerProps {
  trace: AgentEvent[]
}

const EVENT_TYPE_BADGE: Record<AgentEventType, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  assistant_message: { label: 'Assistant', variant: 'info' },
  user_message: { label: 'User', variant: 'neutral' },
  tool_use: { label: 'Tool Call', variant: 'warning' },
  tool_result: { label: 'Tool Result', variant: 'success' },
  thinking: { label: 'Thinking', variant: 'neutral' },
  error: { label: 'Error', variant: 'danger' },
  done: { label: 'Done', variant: 'success' },
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function CollapsibleJson({ data, label }: { data: unknown; label: string }) {
  const [expanded, setExpanded] = useState(false)
  const json = JSON.stringify(data, null, 2)

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        {expanded ? 'Hide' : 'Show'} {label}
      </button>
      {expanded && (
        <pre className="mt-1 rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs text-zinc-400 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
          {json}
        </pre>
      )}
    </div>
  )
}

export function TraceViewer({ trace }: TraceViewerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const stats = useMemo(() => {
    if (trace.length === 0) return null
    const first = trace[0].timestamp
    const last = trace[trace.length - 1].timestamp
    const durationMs = last - first
    const durationSec = Math.round(durationMs / 1000)
    const toolCallCount = trace.filter((e) => e.type === 'tool_use').length

    return {
      totalEvents: trace.length,
      duration: durationSec >= 60
        ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
        : `${durationSec}s`,
      toolCallCount,
    }
  }, [trace])

  if (trace.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-zinc-500">
          No trace data. Run an agent trial to see the trace.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Statistics summary */}
      {stats && (
        <div className="flex items-center gap-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-2.5">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Events</span>
            <span className="text-sm font-medium text-zinc-200">{stats.totalEvents}</span>
          </div>
          <div className="h-6 w-px bg-zinc-700" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Duration</span>
            <span className="text-sm font-medium text-zinc-200">{stats.duration}</span>
          </div>
          <div className="h-6 w-px bg-zinc-700" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Tool Calls</span>
            <span className="text-sm font-medium text-zinc-200">{stats.toolCallCount}</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative flex flex-col">
        {trace.map((event, index) => {
          const isExpanded = expandedIndex === index
          const badgeInfo = EVENT_TYPE_BADGE[event.type]
          const isThinking = event.type === 'thinking'

          return (
            <div key={index} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Vertical connector line */}
              {index < trace.length - 1 && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-zinc-700" />
              )}

              {/* Dot */}
              <div
                className={`relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                  event.type === 'error'
                    ? 'border-red-500 bg-red-500/20'
                    : event.type === 'tool_use'
                      ? 'border-amber-500 bg-amber-500/20'
                      : event.type === 'done'
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-zinc-500 bg-zinc-500/20'
                }`}
              />

              {/* Content */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                  {event.toolName && (
                    <span className="text-xs font-mono text-amber-400">{event.toolName}</span>
                  )}
                </div>

                {/* Content preview */}
                <p
                  className={`mt-0.5 text-xs text-zinc-400 truncate ${
                    isThinking ? 'italic text-zinc-500' : ''
                  }`}
                >
                  {event.content.slice(0, 120)}
                  {event.content.length > 120 ? '...' : ''}
                </p>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
                    <pre
                      className={`text-xs whitespace-pre-wrap break-words ${
                        isThinking
                          ? 'italic text-zinc-500'
                          : 'text-zinc-300'
                      }`}
                    >
                      {event.content}
                    </pre>

                    {event.toolInput && (
                      <CollapsibleJson data={event.toolInput} label="input" />
                    )}

                    {event.toolResult && (
                      <div className="mt-1">
                        <details>
                          <summary className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
                            Show result
                          </summary>
                          <pre className="mt-1 rounded bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs text-zinc-400 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {event.toolResult}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
