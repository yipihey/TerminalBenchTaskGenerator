/// <reference types="vite/client" />

import type { ElectronAPI } from '../preload/api'

declare global {
  interface Window {
    api: ElectronAPI
  }
}
