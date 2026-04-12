import { create } from 'zustand'
import type { SavedView } from '../../shared/types'

interface ViewState {
  views: SavedView[]
  activeViewId: string | null

  saveView: (view: Omit<SavedView, 'id' | 'createdAt'>) => void
  removeView: (id: string) => void
  setActive: (id: string | null) => void
  getView: (id: string) => SavedView | undefined
}

export const useViewStore = create<ViewState>((set, get) => ({
  views: [
    {
      id: 'default-global',
      name: 'Global Overview',
      camera: { longitude: 30, latitude: 20, altitude: 22000000, heading: 0, pitch: -90 },
      filters: { domains: ['CONFLICT', 'CYBER', 'INTEL', 'FINANCE'], severity: null, searchQuery: '', timeRange: '24h' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'europe-conflict',
      name: 'Europe - Conflict',
      camera: { longitude: 25, latitude: 50, altitude: 5000000, heading: 0, pitch: -90 },
      filters: { domains: ['CONFLICT', 'INTEL'], severity: null, searchQuery: '', timeRange: '7d' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cyber-global',
      name: 'Cyber Threats',
      camera: { longitude: 30, latitude: 20, altitude: 22000000, heading: 0, pitch: -90 },
      filters: { domains: ['CYBER'], severity: null, searchQuery: '', timeRange: '24h' },
      createdAt: new Date().toISOString(),
    },
  ],
  activeViewId: null,

  saveView: (view) =>
    set((state) => ({
      views: [
        ...state.views,
        { ...view, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ],
    })),

  removeView: (id) =>
    set((state) => ({
      views: state.views.filter((v) => v.id !== id),
      activeViewId: state.activeViewId === id ? null : state.activeViewId,
    })),

  setActive: (id) => set({ activeViewId: id }),

  getView: (id) => get().views.find((v) => v.id === id),
}))
