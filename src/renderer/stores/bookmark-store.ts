import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookmarkPin } from '../../shared/types'

interface BookmarkState {
  pins: BookmarkPin[]
  groups: string[]
  addPin: (incidentId: string, group: string, note?: string) => void
  removePin: (id: string) => void
  isBookmarked: (incidentId: string) => boolean
  addGroup: (name: string) => void
  removeGroup: (name: string) => void
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      pins: [],
      groups: ['Important', 'Watch', 'Archive'],
      addPin: (incidentId, group, note) => {
        const pin: BookmarkPin = { id: crypto.randomUUID(), incidentId, group, note, pinnedAt: new Date().toISOString() }
        set(s => ({ pins: [...s.pins, pin] }))
      },
      removePin: (id) => set(s => ({ pins: s.pins.filter(p => p.id !== id) })),
      isBookmarked: (incidentId) => get().pins.some(p => p.incidentId === incidentId),
      addGroup: (name) => set(s => ({ groups: [...new Set([...s.groups, name])] })),
      removeGroup: (name) => set(s => ({ groups: s.groups.filter(g => g !== name), pins: s.pins.filter(p => p.group !== name) })),
    }),
    { name: 'argus-bookmarks' }
  )
)
