import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AlertProfile } from '../../shared/types'

interface AlertProfileState {
  profiles: AlertProfile[]
  activeProfileId: string | null
  addProfile: (profile: Omit<AlertProfile, 'id'>) => void
  removeProfile: (id: string) => void
  updateProfile: (id: string, updates: Partial<AlertProfile>) => void
  setActive: (id: string) => void
  getActiveProfile: () => AlertProfile | null
}

const DEFAULT_PROFILES: AlertProfile[] = [
  { id: 'work', name: 'Work', icon: '💼', active: true, rules: { domains: ['CONFLICT', 'CYBER', 'INTEL', 'FINANCE'], minSeverity: 'MEDIUM', soundEnabled: true, quietHoursStart: undefined, quietHoursEnd: undefined } },
  { id: 'sleep', name: 'Sleep', icon: '🌙', active: false, rules: { domains: ['CONFLICT', 'CYBER'], minSeverity: 'CRITICAL', soundEnabled: false, quietHoursStart: '23:00', quietHoursEnd: '07:00' } },
  { id: 'travel', name: 'Travel', icon: '✈', active: false, rules: { domains: ['CONFLICT', 'INTEL'], minSeverity: 'HIGH', regions: [], soundEnabled: true } },
]

export const useAlertProfileStore = create<AlertProfileState>()(
  persist(
    (set, get) => ({
      profiles: DEFAULT_PROFILES,
      activeProfileId: 'work',
      addProfile: (profile) => {
        const id = crypto.randomUUID()
        set(s => ({ profiles: [...s.profiles, { ...profile, id }] }))
      },
      removeProfile: (id) => set(s => {
        const filtered = s.profiles.filter(p => p.id !== id)
        return {
          profiles: filtered,
          activeProfileId: s.activeProfileId === id ? (filtered[0]?.id ?? null) : s.activeProfileId,
        }
      }),
      updateProfile: (id, updates) => set(s => ({
        profiles: s.profiles.map(p => p.id === id ? { ...p, ...updates } : p),
      })),
      setActive: (id) => set(s => ({
        activeProfileId: id,
        profiles: s.profiles.map(p => ({ ...p, active: p.id === id })),
      })),
      getActiveProfile: () => {
        const s = get()
        return s.profiles.find(p => p.id === s.activeProfileId) || s.profiles[0] || null
      },
    }),
    { name: 'argus-alert-profiles' }
  )
)
