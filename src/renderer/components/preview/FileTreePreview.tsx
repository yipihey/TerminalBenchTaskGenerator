import { useMemo } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useEditorStore, type EditorTabId } from '../../stores/editorStore'

interface FileTreePreviewProps {
  workspaceId: string
}

// ── Tree data structure ──

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
}

/** Build a tree structure from a flat list of file paths. */
function buildTree(filePaths: string[], rootName: string): TreeNode {
  const root: TreeNode = {
    name: rootName,
    path: '',
    isDirectory: true,
    children: [],
  }

  for (const fullPath of filePaths) {
    // Extract the relative path after the workspace root (last segment that matches rootName)
    const parts = fullPath.split('/')
    // Find the root folder index (the task name folder)
    const rootIdx = parts.lastIndexOf(rootName)
    const relativeParts = rootIdx >= 0 ? parts.slice(rootIdx + 1) : parts

    let current = root
    for (let i = 0; i < relativeParts.length; i++) {
      const segment = relativeParts[i]
      const isLast = i === relativeParts.length - 1

      let child = current.children.find((c) => c.name === segment)
      if (!child) {
        child = {
          name: segment,
          path: fullPath,
          isDirectory: !isLast,
          children: [],
        }
        current.children.push(child)
      }
      current = child
    }
  }

  // Sort: directories first, then alphabetically
  function sortTree(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
    for (const child of node.children) {
      sortTree(child)
    }
  }

  sortTree(root)
  return root
}

/** Map a file name to an editor tab id, if it matches one. */
function fileNameToTabId(name: string): EditorTabId | null {
  const mapping: Record<string, EditorTabId> = {
    'task.toml': 'task.toml',
    'instruction.md': 'instruction.md',
    'Dockerfile': 'Dockerfile',
    'solve.sh': 'solve.sh',
    'test.sh': 'test.sh',
  }
  return mapping[name] ?? null
}

// ── Tree Node Component ──

function TreeNodeItem({
  node,
  depth,
  onFileClick,
}: {
  node: TreeNode
  depth: number
  onFileClick: (tabId: EditorTabId) => void
}) {
  const tabId = !node.isDirectory ? fileNameToTabId(node.name) : null
  const isClickable = tabId !== null

  const handleClick = () => {
    if (tabId) {
      onFileClick(tabId)
    }
  }

  return (
    <>
      <div
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClick()
                }
              }
            : undefined
        }
        className={`flex items-center gap-1.5 py-1 pr-2 text-sm select-none ${
          isClickable
            ? 'cursor-pointer text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded'
            : 'text-zinc-400'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="shrink-0 text-xs w-4 text-center" aria-hidden="true">
          {node.isDirectory ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}
        </span>
        <span className="truncate">{node.name}</span>
      </div>

      {node.isDirectory &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.path || child.name}
            node={child}
            depth={depth + 1}
            onFileClick={onFileClick}
          />
        ))}
    </>
  )
}

// ── Main Component ──

export function FileTreePreview({ workspaceId }: FileTreePreviewProps) {
  const workspaceFiles = useWorkspaceStore((s) => s.workspaceFiles)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)

  const workspace = workspaces[workspaceId]
  const files = workspaceFiles[workspaceId] ?? []
  const taskName = workspace?.name ?? 'task'

  const tree = useMemo(
    () => buildTree(files.map((f) => f.path), taskName),
    [files, taskName],
  )

  const handleFileClick = (tabId: EditorTabId) => {
    setActiveTab(tabId)
  }

  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        No files in workspace.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto py-2">
      <TreeNodeItem node={tree} depth={0} onFileClick={handleFileClick} />
    </div>
  )
}
