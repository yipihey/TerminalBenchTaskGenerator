import { useState } from 'react'
import type { GitDiff } from '../../../shared/types'

interface DiffViewerProps {
  diffs: GitDiff[]
}

function computeUnifiedDiff(oldContent: string, newContent: string): { type: 'add' | 'remove' | 'context'; text: string }[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const result: { type: 'add' | 'remove' | 'context'; text: string }[] = []

  // Simple line-by-line diff: walk both arrays using a basic LCS-style approach
  // For display purposes, use a straightforward comparison
  const maxLen = Math.max(oldLines.length, newLines.length)
  let oi = 0
  let ni = 0

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: 'context', text: oldLines[oi] })
      oi++
      ni++
    } else if (oi < oldLines.length && ni < newLines.length) {
      // Lines differ -- show removal then addition
      result.push({ type: 'remove', text: oldLines[oi] })
      result.push({ type: 'add', text: newLines[ni] })
      oi++
      ni++
    } else if (oi < oldLines.length) {
      result.push({ type: 'remove', text: oldLines[oi] })
      oi++
    } else {
      result.push({ type: 'add', text: newLines[ni] })
      ni++
    }
  }

  return result
}

export function DiffViewer({ diffs }: DiffViewerProps) {
  const [activeTab, setActiveTab] = useState(0)

  if (diffs.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-sm text-zinc-500">No changes in this commit.</p>
      </div>
    )
  }

  const activeDiff = diffs[activeTab]
  const lines = activeDiff
    ? computeUnifiedDiff(activeDiff.oldContent, activeDiff.newContent)
    : []

  return (
    <div className="flex flex-col gap-2">
      {/* File tabs */}
      {diffs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {diffs.map((diff, index) => (
            <button
              key={diff.filepath}
              type="button"
              onClick={() => setActiveTab(index)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
                activeTab === index
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent'
              }`}
            >
              {diff.filepath.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {/* File path header */}
      {activeDiff && (
        <div className="rounded-t-lg bg-zinc-800 border border-zinc-700/50 px-3 py-1.5">
          <span className="text-xs font-mono text-zinc-400">{activeDiff.filepath}</span>
        </div>
      )}

      {/* Diff lines */}
      <div className="max-h-80 overflow-y-auto rounded-b-lg bg-zinc-950 border border-t-0 border-zinc-800">
        <table className="w-full">
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={index}
                className={
                  line.type === 'add'
                    ? 'bg-green-500/10'
                    : line.type === 'remove'
                      ? 'bg-red-500/10'
                      : ''
                }
              >
                <td className="w-5 select-none px-2 text-right align-top font-mono text-[11px] text-zinc-600">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </td>
                <td className="px-2 py-px">
                  <pre
                    className={`font-mono text-xs whitespace-pre-wrap break-all ${
                      line.type === 'add'
                        ? 'text-green-400'
                        : line.type === 'remove'
                          ? 'text-red-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {line.text}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
