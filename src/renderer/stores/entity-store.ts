import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TrackedEntity {
  id: string
  name: string
  type: 'person' | 'organization' | 'topic' | 'location'
  keywords: string[]
  enabled: boolean
  color: string
  matchCount: number
  lastSeen?: string
  createdAt: string
}

const DEFAULT_ENTITIES: TrackedEntity[] = [
  {
    id: 'ent-netanyahu',
    name: 'Netanyahu',
    type: 'person',
    keywords: ['Bibi', 'Israeli PM'],
    enabled: true,
    color: '#4a9eff',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-erdogan',
    name: 'Erdogan',
    type: 'person',
    keywords: ['Erdoğan', 'Türkiye president'],
    enabled: true,
    color: '#e63946',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-putin',
    name: 'Putin',
    type: 'person',
    keywords: ['Kremlin', 'Russian president'],
    enabled: true,
    color: '#9b59b6',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-zelensky',
    name: 'Zelensky',
    type: 'person',
    keywords: ['Zelenskyy', 'Ukraine president'],
    enabled: true,
    color: '#f5c542',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-nato',
    name: 'NATO',
    type: 'organization',
    keywords: ['North Atlantic', 'Alliance'],
    enabled: true,
    color: '#00d4ff',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-wagner',
    name: 'Wagner',
    type: 'organization',
    keywords: ['Wagner Group', 'PMC Wagner'],
    enabled: true,
    color: '#ff6b35',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-hezbollah',
    name: 'Hezbollah',
    type: 'organization',
    keywords: ['Hizbullah', 'Hezbollah'],
    enabled: true,
    color: '#00ff87',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-hamas',
    name: 'Hamas',
    type: 'organization',
    keywords: ['Al-Qassam'],
    enabled: true,
    color: '#ff3b5c',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-opec',
    name: 'OPEC',
    type: 'organization',
    keywords: ['OPEC+', 'oil cartel'],
    enabled: true,
    color: '#f5c542',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-fed',
    name: 'Federal Reserve',
    type: 'organization',
    keywords: ['Fed', 'FOMC', 'Jerome Powell'],
    enabled: true,
    color: '#4a9eff',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ent-spacex',
    name: 'SpaceX',
    type: 'organization',
    keywords: ['Starship', 'Falcon'],
    enabled: true,
    color: '#c8d6e5',
    matchCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

function cloneDefaultEntities(): TrackedEntity[] {
  return DEFAULT_ENTITIES.map((e) => ({ ...e }))
}

interface EntityState {
  entities: TrackedEntity[]
  addEntity: (e: Omit<TrackedEntity, 'id' | 'matchCount' | 'createdAt'>) => void
  removeEntity: (id: string) => void
  toggleEntity: (id: string) => void
  updateMatchCount: (id: string, count: number, lastSeen: string) => void
  getActiveKeywords: () => string[]
}

export const useEntityStore = create<EntityState>()(
  persist(
    (set, get) => ({
      entities: cloneDefaultEntities(),

      addEntity: (e) =>
        set((state) => ({
          entities: [
            ...state.entities,
            {
              ...e,
              id: crypto.randomUUID(),
              matchCount: 0,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeEntity: (id) =>
        set((state) => ({ entities: state.entities.filter((x) => x.id !== id) })),

      toggleEntity: (id) =>
        set((state) => ({
          entities: state.entities.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x
          ),
        })),

      updateMatchCount: (id, count, lastSeen) =>
        set((state) => ({
          entities: state.entities.map((x) =>
            x.id === id ? { ...x, matchCount: count, lastSeen: lastSeen || undefined } : x
          ),
        })),

      getActiveKeywords: () => {
        const seen = new Set<string>()
        const out: string[] = []
        for (const x of get().entities) {
          if (!x.enabled) continue
          for (const term of [x.name, ...x.keywords]) {
            const t = term.trim()
            if (!t) continue
            const k = t.toLowerCase()
            if (seen.has(k)) continue
            seen.add(k)
            out.push(t)
          }
        }
        return out
      },
    }),
    {
      name: 'argus-entity-tracker',
      partialize: (s) => ({ entities: s.entities }),
    }
  )
)
