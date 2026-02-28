import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useUiStore } from './stores/uiStore'
import { useChatStore } from './stores/chatStore'
import { useEditorStore } from './stores/editorStore'
import { useBrowseStore } from './stores/browseStore'

// Expose stores on window for E2E testing via CDP
;(window as any).__stores = {
  workspace: useWorkspaceStore,
  ui: useUiStore,
  chat: useChatStore,
  editor: useEditorStore,
  browse: useBrowseStore,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
