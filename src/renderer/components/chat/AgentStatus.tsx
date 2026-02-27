interface AgentStatusProps {
  status: 'idle' | 'thinking' | 'writing'
}

export function AgentStatus({ status }: AgentStatusProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {status === 'idle' && (
        <>
          <span className="h-2 w-2 rounded-full bg-zinc-500" />
          <span className="text-xs text-zinc-500">Ready</span>
        </>
      )}
      {status === 'thinking' && (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
          <span className="text-xs text-yellow-400">Thinking...</span>
        </>
      )}
      {status === 'writing' && (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          <span className="text-xs text-blue-400">Writing...</span>
        </>
      )}
    </div>
  )
}
