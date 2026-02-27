import { useState, useRef } from 'react'
import { Dialog } from '../shared/Dialog'
import { Button } from '../shared/Button'

interface ChatImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportTab = 'upload' | 'paste'

export function ChatImportDialog({ open, onOpenChange }: ChatImportDialogProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canImport =
    (activeTab === 'upload' && selectedFile !== null) ||
    (activeTab === 'paste' && pasteText.trim().length > 0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setError(null)
  }

  const handleImport = async () => {
    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'upload' && selectedFile) {
        // Use the file path from the input — in Electron we can get the path
        const filePath = (selectedFile as File & { path?: string }).path
        if (filePath) {
          await window.api.importFromJson(filePath)
        } else {
          // Fallback: read as text and import
          const text = await selectedFile.text()
          await window.api.importFromText(text)
        }
      } else if (activeTab === 'paste') {
        await window.api.importFromText(pasteText)
      }
      onOpenChange(false)
      resetState()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setPasteText('')
    setError(null)
    setActiveTab('upload')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetState()
        onOpenChange(newOpen)
      }}
      title="Import Chat"
      description="Import a Claude Code conversation to bootstrap a Harbor task."
    >
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-800 p-1 mb-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('upload')
            setError(null)
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Upload JSON
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('paste')
            setError(null)
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'paste'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* Upload tab */}
      {activeTab === 'upload' && (
        <div className="flex flex-col gap-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/50 p-6 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg
              className="h-8 w-8 text-zinc-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            {selectedFile ? (
              <span className="text-sm text-zinc-200">{selectedFile.name}</span>
            ) : (
              <span className="text-sm text-zinc-500">Click to select a .json file</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Paste tab */}
      {activeTab === 'paste' && (
        <div className="flex flex-col gap-3">
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value)
              setError(null)
            }}
            placeholder="Paste your conversation text here..."
            rows={10}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!canImport || loading}
          onClick={handleImport}
        >
          {loading && (
            <svg
              className="mr-1.5 h-3 w-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {loading ? 'Importing...' : 'Import'}
        </Button>
      </div>
    </Dialog>
  )
}
