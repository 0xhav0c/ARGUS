import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MapAnnotation {
  id: string
  type: 'marker' | 'note' | 'circle' | 'line'
  latitude: number
  longitude: number
  title: string
  description: string
  color: string
  radius?: number
  endLat?: number
  endLng?: number
  createdAt: string
  author: string
  watching?: boolean
  watchRadius?: number
}

const SAMPLE_ANNOTATIONS: MapAnnotation[] = [
  {
    id: 'ann-sample-hq',
    type: 'marker',
    latitude: 38.8977,
    longitude: -77.0365,
    title: 'Watchpoint Alpha',
    description: 'Coordination node — sample annotation',
    color: '#00d4ff',
    createdAt: '2026-01-15T12:00:00.000Z',
    author: 'Demo',
  },
  {
    id: 'ann-sample-note',
    type: 'note',
    latitude: 51.5074,
    longitude: -0.1278,
    title: 'Briefing note',
    description: 'Regional briefing anchor (London)',
    color: '#f5c542',
    createdAt: '2026-01-15T12:00:00.000Z',
    author: 'Demo',
  },
  {
    id: 'ann-sample-circle',
    type: 'circle',
    latitude: 35.6762,
    longitude: 139.6503,
    title: '250 km AOI',
    description: 'Example area of interest',
    color: '#ff6b35',
    radius: 250,
    createdAt: '2026-01-15T12:00:00.000Z',
    author: 'Demo',
  },
  {
    id: 'ann-sample-line',
    type: 'line',
    latitude: 25.2048,
    longitude: 55.2708,
    title: 'Corridor',
    description: 'Sample corridor line',
    color: '#00ff87',
    endLat: 30.0444,
    endLng: 31.2357,
    createdAt: '2026-01-15T12:00:00.000Z',
    author: 'Demo',
  },
]

function cloneSamples(): MapAnnotation[] {
  return SAMPLE_ANNOTATIONS.map((a) => ({ ...a }))
}

interface AnnotationState {
  annotations: MapAnnotation[]
  activeToolType: 'marker' | 'note' | 'circle' | 'line' | null
  addAnnotation: (a: Omit<MapAnnotation, 'id' | 'createdAt'>) => void
  removeAnnotation: (id: string) => void
  updateAnnotation: (id: string, updates: Partial<MapAnnotation>) => void
  setActiveTool: (tool: 'marker' | 'note' | 'circle' | 'line' | null) => void
  toggleWatch: (id: string) => void
  getWatchedZones: () => MapAnnotation[]
  clearAll: () => void
}

export const useAnnotationStore = create<AnnotationState>()(
  persist(
    (set, get) => ({
      annotations: [],
      activeToolType: null,

      addAnnotation: (a) =>
        set((s) => ({
          annotations: [
            ...s.annotations,
            {
              ...a,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeAnnotation: (id) =>
        set((s) => ({
          annotations: s.annotations.filter((x) => x.id !== id),
        })),

      updateAnnotation: (id, updates) =>
        set((s) => ({
          annotations: s.annotations.map((x) =>
            x.id === id ? { ...x, ...updates } : x
          ),
        })),

      setActiveTool: (tool) => set({ activeToolType: tool }),

      toggleWatch: (id) =>
        set((s) => ({
          annotations: s.annotations.map((x) =>
            x.id === id ? { ...x, watching: !x.watching, watchRadius: x.watchRadius || x.radius || 100 } : x
          ),
        })),

      getWatchedZones: () => get().annotations.filter((a) => a.watching),

      clearAll: () => set({ annotations: [] }),
    }),
    {
      name: 'argus-map-annotations',
      version: 2,
      migrate: (persisted: any) => ({ annotations: Array.isArray(persisted?.annotations) ? persisted.annotations : [], activeToolType: null }),
      partialize: (s) => ({
        annotations: s.annotations,
      }),
    }
  )
)
