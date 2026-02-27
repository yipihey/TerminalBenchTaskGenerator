import { useCallback, useEffect } from 'react'
import { useEditorStore, type EditorTabId } from '../../stores/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { MonacoEditor } from './MonacoEditor'
import { TaskTomlEditor } from './TaskTomlEditor'
import { SplitView } from '../shared/SplitView'
import { MarkdownPreview } from '../preview/MarkdownPreview'

/** Map a tab id to the matching file path suffix. */
function tabToFileSuffix(tabId: EditorTabId): string {
  switch (tabId) {
    case 'Dockerfile':
      return 'environment/Dockerfile'
    case 'solve.sh':
      return 'solution/solve.sh'
    case 'test.sh':
      return 'tests/test.sh'
    default:
      return tabId
  }
}

/** Determine Monaco language from tab id. */
function tabLanguage(tabId: EditorTabId): string {
  switch (tabId) {
    case 'task.toml':
      return 'toml'
    case 'instruction.md':
      return 'markdown'
    case 'Dockerfile':
      return 'dockerfile'
    case 'solve.sh':
    case 'test.sh':
      return 'shell'
    default:
      return 'plaintext'
  }
}

export function EditorPanel() {
  const activeTab = useEditorStore((s) => s.activeTab)
  const tabs = useEditorStore((s) => s.tabs)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const markDirty = useEditorStore((s) => s.markDirty)

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const activeFiles = useWorkspaceStore((s) => s.activeFiles)
  const updateFileContent = useWorkspaceStore((s) => s.updateFileContent)
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)

  const files = activeFiles()
  const workspace = activeWorkspace()

  /** Find the HarborFile matching the current active tab. */
  const getFileForTab = useCallback(
    (tabId: EditorTabId) => {
      const suffix = tabToFileSuffix(tabId)
      return files.find((f) => f.path.endsWith(suffix)) ?? null
    },
    [files],
  )

  const activeFile = getFileForTab(activeTab)

  /** Handle content change from editor. */
  const handleChange = useCallback(
    (tabId: EditorTabId, value: string) => {
      if (!activeWorkspaceId) return

      const file = getFileForTab(tabId)
      if (!file) return

      updateFileContent(activeWorkspaceId, file.path, value)
      markDirty(tabId, true)
    },
    [activeWorkspaceId, getFileForTab, updateFileContent, markDirty],
  )

  /** Save the active file via IPC. */
  const saveActiveFile = useCallback(async () => {
    if (!activeFile || !activeWorkspaceId) return

    try {
      await window.api.writeFile(activeFile.path, activeFile.content)
      markDirty(activeTab, false)
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }, [activeFile, activeWorkspaceId, activeTab, markDirty])

  /** Ctrl/Cmd+S keyboard shortcut. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveActiveFile()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveActiveFile])

  /** Render the content area for the active tab. */
  const renderContent = () => {
    if (!activeFile) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
          {activeWorkspaceId
            ? 'File not found. Create workspace files first.'
            : 'No workspace selected.'}
        </div>
      )
    }

    // task.toml: use the structured/raw editor
    if (activeTab === 'task.toml') {
      return (
        <TaskTomlEditor
          content={activeFile.content}
          onChange={(value) => handleChange('task.toml', value)}
        />
      )
    }

    // instruction.md: split view with editor + markdown preview
    if (activeTab === 'instruction.md') {
      return (
        <SplitView
          left={
            <MonacoEditor
              filePath={activeFile.path}
              content={activeFile.content}
              language="markdown"
              onChange={(value) => handleChange('instruction.md', value)}
            />
          }
          right={<MarkdownPreview content={activeFile.content} />}
          initialRatio={0.5}
          minLeftWidth={300}
          minRightWidth={300}
        />
      )
    }

    // All other files: plain Monaco editor
    return (
      <MonacoEditor
        filePath={activeFile.path}
        content={activeFile.content}
        language={tabLanguage(activeTab)}
        onChange={(value) => handleChange(activeTab, value)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-900 shrink-0 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'text-zinc-100 border-indigo-500 bg-zinc-950'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.dirty && (
                <span
                  className="inline-block h-2 w-2 rounded-full bg-amber-400"
                  title="Unsaved changes"
                />
              )}
            </button>
          )
        })}

        {/* Workspace name indicator */}
        {workspace && (
          <div className="ml-auto px-4 py-2 text-xs text-zinc-600 truncate max-w-48">
            {workspace.name}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">{renderContent()}</div>
    </div>
  )
}
