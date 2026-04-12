import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomDataSource } from '../../shared/types'

interface PluginState {
  sources: CustomDataSource[]
  addSource: (source: Omit<CustomDataSource, 'id' | 'addedAt'>) => void
  removeSource: (id: string) => void
  toggleSource: (id: string) => void
  updateSource: (id: string, updates: Partial<CustomDataSource>) => void
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set) => ({
      sources: [],
      addSource: (source) => {
        const full: CustomDataSource = { ...source, id: crypto.randomUUID(), addedAt: new Date().toISOString() }
        set(s => ({ sources: [...s.sources, full] }))
      },
      removeSource: (id) => set(s => ({ sources: s.sources.filter(p => p.id !== id) })),
      toggleSource: (id) => set(s => ({ sources: s.sources.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p) })),
      updateSource: (id, updates) => set(s => ({ sources: s.sources.map(p => p.id === id ? { ...p, ...updates } : p) })),
    }),
    { name: 'argus-plugins' }
  )
)
