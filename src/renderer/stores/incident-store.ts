import { create } from 'zustand'
import type { Incident, IncidentDomain, IncidentSeverity } from '../../shared/types'

interface IncidentState {
  incidents: Incident[]
  selectedIncident: Incident | null
  loading: boolean
  lastUpdated: string | null

  setIncidents: (incidents: Incident[]) => void
  addIncident: (incident: Incident) => void
  selectIncident: (incident: Incident | null) => void
  setLoading: (loading: boolean) => void

  getByDomain: (domain: IncidentDomain) => Incident[]
  getBySeverity: (severity: IncidentSeverity) => Incident[]
  getCriticalCount: () => number
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  selectedIncident: null,
  loading: false,
  lastUpdated: null,

  setIncidents: (incidents) =>
    set(s => ({
      incidents,
      lastUpdated: new Date().toISOString(),
      selectedIncident: s.selectedIncident
        ? incidents.find(i => i.id === s.selectedIncident!.id) ?? null
        : null,
    })),

  addIncident: (incident) =>
    set((state) => {
      const exists = state.incidents.findIndex(i => i.id === incident.id)
      if (exists >= 0) {
        const updated = [...state.incidents]
        updated[exists] = incident
        return { incidents: updated, lastUpdated: new Date().toISOString() }
      }
      return {
        incidents: [incident, ...state.incidents].slice(0, 2000),
        lastUpdated: new Date().toISOString()
      }
    }),

  selectIncident: (incident) => set({ selectedIncident: incident }),
  setLoading: (loading) => set({ loading }),

  getByDomain: (domain) => get().incidents.filter(i => i.domain === domain),
  getBySeverity: (severity) => get().incidents.filter(i => i.severity === severity),
  getCriticalCount: () => get().incidents.filter(i => i.severity === 'CRITICAL').length
}))
