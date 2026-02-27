import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dialog } from './components/shared/Dialog'
import { ChatImportDialog } from './components/import/ChatImportDialog'
import { useUiStore } from './stores/uiStore'
import { useWorkspace } from './hooks/useWorkspace'

function NewWorkspaceDialog() {
  const open = useUiStore((s) => s.showNewWorkspaceDialog)
  const setOpen = useUiStore((s) => s.setShowNewWorkspaceDialog)
  const { createWorkspace } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (name: string) => {
    setCreating(true)
    setError(null)
    try {
      console.log('Creating workspace:', name)
      await createWorkspace(name)
      console.log('Workspace created successfully')
      setOpen(false)
    } catch (err) {
      console.error('Failed to create workspace:', err)
      setError(String(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!creating) {
          setOpen(v)
          setError(null)
        }
      }}
      title="New Workspace"
      description="Create a new Harbor task workspace."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
          if (name && !creating) handleCreate(name)
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Task Name</label>
          <input
            name="name"
            type="text"
            placeholder="e.g. genomics-alignment"
            autoFocus
            disabled={creating}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Workspace'}
        </button>
      </form>
    </Dialog>
  )
}

export default function App() {
  const { loadWorkspaces } = useWorkspace()
  const showImportDialog = useUiStore((s) => s.showImportDialog)
  const setShowImportDialog = useUiStore((s) => s.setShowImportDialog)

  useEffect(() => {
    console.log('App mounted, loading workspaces...')
    loadWorkspaces().then(() => {
      console.log('Workspaces loaded')
    })
  }, [loadWorkspaces])

  return (
    <>
      <AppShell />
      <NewWorkspaceDialog />
      <ChatImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
    </>
  )
}
