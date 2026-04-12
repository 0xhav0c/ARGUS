import { create } from 'zustand'
import type { WatchlistItem } from '../../shared/types'

interface WatchlistState {
  items: WatchlistItem[]
  addItem: (item: Omit<WatchlistItem, 'id' | 'createdAt' | 'matchCount'>) => void
  removeItem: (id: string) => void
  toggleItem: (id: string) => void
  incrementMatch: (id: string) => void
  getActiveKeywords: () => string[]
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          matchCount: 0,
        },
      ],
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  toggleItem: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, enabled: !i.enabled } : i
      ),
    })),

  incrementMatch: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, matchCount: i.matchCount + 1 } : i
      ),
    })),

  getActiveKeywords: () =>
    get()
      .items.filter((i) => i.enabled && i.type === 'keyword')
      .map((i) => i.value),
}))
