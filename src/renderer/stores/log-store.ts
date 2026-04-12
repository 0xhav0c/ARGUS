import { create } from 'zustand'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory =
  | 'feed'
  | 'api'
  | 'twitter'
  | 'finance'
  | 'tracking'
  | 'globe'
  | 'ai'
  | 'ipc'
  | 'ui'
  | 'system'
  | 'network'
  | 'database'

export interface LogEntry {
  id: number
  timestamp: number
  level: LogLevel
  category: LogCategory
  message: string
  detail?: string
}

interface LogState {
  entries: LogEntry[]
  enabled: boolean
  maxEntries: number
  nextId: number
  setEnabled: (v: boolean) => void
  addLog: (level: LogLevel, category: LogCategory, message: string, detail?: string) => void
  clear: () => void
}

const LOG_ENABLED_KEY = 'argus_logging_enabled'

function loadEnabled(): boolean {
  try { const v = localStorage.getItem(LOG_ENABLED_KEY); return v === null ? true : v === 'true' } catch { return true }
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  enabled: loadEnabled(),
  maxEntries: 2000,
  nextId: 1,
  setEnabled: (v) => {
    try { localStorage.setItem(LOG_ENABLED_KEY, v ? 'true' : 'false') } catch {}
    set({ enabled: v })
  },
  addLog: (level, category, message, detail) => {
    if (!get().enabled) return
    set(s => {
      const entry: LogEntry = { id: s.nextId, timestamp: Date.now(), level, category, message, detail }
      return {
        entries: [entry, ...s.entries].slice(0, s.maxEntries),
        nextId: s.nextId + 1,
      }
    })
  },
  clear: () => set({ entries: [], nextId: 1 }),
}))

export function argusLog(level: LogLevel, category: LogCategory, message: string, detail?: string) {
  useLogStore.getState().addLog(level, category, message, detail)
}
