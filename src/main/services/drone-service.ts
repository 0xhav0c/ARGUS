import type { DroneActivity } from '../../shared/types'

let cache: DroneActivity[] = []
let lastFetch = 0
const TTL = 300000

const KNOWN_ACTIVITIES: DroneActivity[] = [
  { id: 'dr-1', type: 'military', latitude: 34.5, longitude: 44.0, altitude: 5000, country: 'Iraq', description: 'MQ-9 Reaper ISR mission reported over northern Iraq', detectedAt: new Date().toISOString(), source: 'OSINT' },
  { id: 'dr-2', type: 'military', latitude: 48.5, longitude: 37.8, altitude: 4000, country: 'Ukraine', description: 'Bayraktar TB2 drone operations near front line', detectedAt: new Date().toISOString(), source: 'Military Tracker' },
  { id: 'dr-3', type: 'military', latitude: 31.5, longitude: 34.5, altitude: 3500, country: 'Israel', description: 'Hermes 900 patrol along border', detectedAt: new Date().toISOString(), source: 'OSINT' },
  { id: 'dr-4', type: 'military', latitude: 15.5, longitude: 44.0, altitude: 6000, country: 'Yemen', description: 'Shahed-136 drone attack reported', detectedAt: new Date(Date.now() - 3600000).toISOString(), source: 'Conflict Monitor' },
  { id: 'dr-5', type: 'military', latitude: 36.2, longitude: 37.1, altitude: 4500, country: 'Syria', description: 'Turkish Anka-S surveillance flight', detectedAt: new Date(Date.now() - 7200000).toISOString(), source: 'OSINT' },
  { id: 'dr-6', type: 'unknown', latitude: 25.3, longitude: 55.4, altitude: 1200, country: 'UAE', description: 'Unauthorized drone detected near critical infrastructure', detectedAt: new Date(Date.now() - 14400000).toISOString(), source: 'ADS-B Exchange' },
  { id: 'dr-7', type: 'military', latitude: 38.9, longitude: 125.7, altitude: 8000, country: 'North Korea', description: 'RQ-4 Global Hawk ISR patrol near DMZ', detectedAt: new Date(Date.now() - 10800000).toISOString(), source: 'Military Tracker' },
  { id: 'dr-8', type: 'military', latitude: 13.0, longitude: 43.0, altitude: 5500, country: 'Djibouti', description: 'MQ-9 operating from Camp Lemonnier', detectedAt: new Date(Date.now() - 18000000).toISOString(), source: 'OSINT' },
]

export class DroneService {
  async getActivities(): Promise<DroneActivity[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    cache = KNOWN_ACTIVITIES.map(d => ({ ...d, detectedAt: new Date(Date.now() - Math.random() * 86400000).toISOString() }))
    lastFetch = Date.now()
    return cache
  }
}
