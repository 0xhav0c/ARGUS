import { create } from 'zustand'
import type { FlightData, VesselData, EarthquakeData, NaturalDisaster, SatelliteData, TrackingLayer } from '../../shared/types'

interface TrackingState {
  enabledLayers: Record<TrackingLayer, boolean>
  flights: FlightData[]
  vessels: VesselData[]
  earthquakes: EarthquakeData[]
  disasters: NaturalDisaster[]
  satellites: SatelliteData[]
  loading: Record<TrackingLayer, boolean>

  toggleLayer: (layer: TrackingLayer) => void
  isLayerEnabled: (layer: TrackingLayer) => boolean
  fetchFlights: () => Promise<void>
  fetchVessels: () => Promise<void>
  fetchEarthquakes: () => Promise<void>
  fetchDisasters: () => Promise<void>
  fetchSatellites: () => Promise<void>
  refreshEnabled: () => Promise<void>
}

const fetchGen: Record<string, number> = { flights: 0, vessels: 0, earthquakes: 0, disasters: 0, satellites: 0 }

export const useTrackingStore = create<TrackingState>((set, get) => ({
  enabledLayers: {
    flights: false, vessels: false, earthquakes: false, disasters: false, satellites: false,
    conflictZones: false, tradeRoutes: false, sigint: false,
    weather: false, pandemic: false, nuclear: false, military: false,
    energy: false, migration: false, internet: false,
  } as any,
  flights: [],
  vessels: [],
  earthquakes: [],
  disasters: [],
  satellites: [],
  loading: { flights: false, vessels: false, earthquakes: false, disasters: false, satellites: false },

  toggleLayer: (layer) => {
    const wasEnabled = get().enabledLayers[layer]
    set(s => ({
      enabledLayers: { ...s.enabledLayers, [layer]: !wasEnabled }
    }))
    if (!wasEnabled) {
      switch (layer) {
        case 'flights': get().fetchFlights(); break
        case 'vessels': get().fetchVessels(); break
        case 'earthquakes': get().fetchEarthquakes(); break
        case 'disasters': get().fetchDisasters(); break
        case 'satellites': get().fetchSatellites(); break
      }
    }
  },

  isLayerEnabled: (layer) => get().enabledLayers[layer],

  fetchFlights: async () => {
    const gen = ++fetchGen.flights
    set(s => ({ loading: { ...s.loading, flights: true } }))
    try {
      const flights = await window.argus.getFlights()
      if (fetchGen.flights === gen) set(s => ({ flights, loading: { ...s.loading, flights: false } }))
    } catch (err) {
      console.error('[Tracking] Flight fetch error:', err)
      if (fetchGen.flights === gen) set(s => ({ loading: { ...s.loading, flights: false } }))
    }
  },

  fetchVessels: async () => {
    const gen = ++fetchGen.vessels
    set(s => ({ loading: { ...s.loading, vessels: true } }))
    try {
      const vessels = await window.argus.getVessels()
      if (fetchGen.vessels === gen) set(s => ({ vessels, loading: { ...s.loading, vessels: false } }))
    } catch (err) {
      console.error('[Tracking] Vessel fetch error:', err)
      if (fetchGen.vessels === gen) set(s => ({ loading: { ...s.loading, vessels: false } }))
    }
  },

  fetchEarthquakes: async () => {
    const gen = ++fetchGen.earthquakes
    set(s => ({ loading: { ...s.loading, earthquakes: true } }))
    try {
      const earthquakes = await window.argus.getEarthquakes()
      if (fetchGen.earthquakes === gen) set(s => ({ earthquakes, loading: { ...s.loading, earthquakes: false } }))
    } catch (err) {
      console.error('[Tracking] Earthquake fetch error:', err)
      if (fetchGen.earthquakes === gen) set(s => ({ loading: { ...s.loading, earthquakes: false } }))
    }
  },

  fetchDisasters: async () => {
    const gen = ++fetchGen.disasters
    set(s => ({ loading: { ...s.loading, disasters: true } }))
    try {
      const disasters = await window.argus.getDisasters()
      if (fetchGen.disasters === gen) set(s => ({ disasters, loading: { ...s.loading, disasters: false } }))
    } catch (err) {
      console.error('[Tracking] Disaster fetch error:', err)
      if (fetchGen.disasters === gen) set(s => ({ loading: { ...s.loading, disasters: false } }))
    }
  },

  fetchSatellites: async () => {
    const gen = ++fetchGen.satellites
    set(s => ({ loading: { ...s.loading, satellites: true } }))
    try {
      const satellites = await window.argus.getSatellites()
      if (fetchGen.satellites === gen) set(s => ({ satellites, loading: { ...s.loading, satellites: false } }))
    } catch (err) {
      console.error('[Tracking] Satellite fetch error:', err)
      if (fetchGen.satellites === gen) set(s => ({ loading: { ...s.loading, satellites: false } }))
    }
  },

  refreshEnabled: async () => {
    const enabled = get().enabledLayers
    const promises: Promise<void>[] = []
    if (enabled.flights) promises.push(get().fetchFlights())
    if (enabled.vessels) promises.push(get().fetchVessels())
    if (enabled.earthquakes) promises.push(get().fetchEarthquakes())
    if (enabled.disasters) promises.push(get().fetchDisasters())
    if (enabled.satellites) promises.push(get().fetchSatellites())
    await Promise.allSettled(promises)
  },
}))
