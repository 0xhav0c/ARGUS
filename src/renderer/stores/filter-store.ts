import { create } from 'zustand'
import type { IncidentDomain, IncidentSeverity } from '../../shared/types'

export type PlaybackSpeed = 0.5 | 1 | 2 | 4 | 8

interface FilterState {
  searchQuery: string
  severityFilter: IncidentSeverity | null
  dateRange: { start: string | null; end: string | null }
  selectedRegion: string | null
  sourceFilter: string | null
  countryFilter: string | null
  domainFilter: IncidentDomain | null

  playbackActive: boolean
  playbackSpeed: PlaybackSpeed
  playbackCursor: number | null

  setSearchQuery: (query: string) => void
  setSeverityFilter: (severity: IncidentSeverity | null) => void
  setDateRange: (start: string | null, end: string | null) => void
  setSelectedRegion: (region: string | null) => void
  setSourceFilter: (source: string | null) => void
  setCountryFilter: (country: string | null) => void
  setDomainFilter: (domain: IncidentDomain | null) => void
  clearFilters: () => void

  togglePlayback: () => void
  setPlaybackSpeed: (speed: PlaybackSpeed) => void
  setPlaybackCursor: (ts: number | null) => void
  stopPlayback: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: '',
  severityFilter: null,
  dateRange: { start: null, end: null },
  selectedRegion: null,
  sourceFilter: null,
  countryFilter: null,
  domainFilter: null,

  playbackActive: false,
  playbackSpeed: 1,
  playbackCursor: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSeverityFilter: (severity) => set({ severityFilter: severity }),
  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSourceFilter: (source) => set({ sourceFilter: source }),
  setCountryFilter: (country) => set({ countryFilter: country }),
  setDomainFilter: (domain) => set({ domainFilter: domain }),

  togglePlayback: () => set((s) => ({ playbackActive: !s.playbackActive })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setPlaybackCursor: (ts) => set({ playbackCursor: ts }),
  stopPlayback: () => set({ playbackActive: false, playbackCursor: null }),

  clearFilters: () =>
    set({
      searchQuery: '',
      severityFilter: null,
      dateRange: { start: null, end: null },
      selectedRegion: null,
      sourceFilter: null,
      countryFilter: null,
      domainFilter: null,
      playbackActive: false,
      playbackSpeed: 1,
      playbackCursor: null,
    })
}))
