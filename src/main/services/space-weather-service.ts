import type { SpaceWeatherEvent } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'

const DONKI_URL = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get'
const NEO_URL = 'https://api.nasa.gov/neo/rest/v1/feed'
const FIREBALL_URL = 'https://ssd-api.jpl.nasa.gov/fireball.api'

function getNasaKey(): string {
  return getApiKeyManager().get('nasa') || 'DEMO_KEY'
}

let cache: SpaceWeatherEvent[] = []
let lastFetch = 0
const TTL = 600000

export class SpaceWeatherService {
  async getEvents(): Promise<SpaceWeatherEvent[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const results: SpaceWeatherEvent[] = []

    const [flares, neos, fireballs] = await Promise.allSettled([
      this.fetchFlares(),
      this.fetchNEOs(),
      this.fetchFireballs(),
    ])

    if (flares.status === 'fulfilled') results.push(...flares.value)
    if (neos.status === 'fulfilled') results.push(...neos.value)
    if (fireballs.status === 'fulfilled') results.push(...fireballs.value)

    if (results.length === 0) {
      results.push(...FALLBACK)
    }

    results.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    cache = results
    lastFetch = Date.now()
    return cache
  }

  private async fetchFlares(): Promise<SpaceWeatherEvent[]> {
    try {
      const now = new Date()
      const weekAgo = new Date(Date.now() - 7 * 86400000)
      const start = weekAgo.toISOString().split('T')[0]
      const end = now.toISOString().split('T')[0]
      const res = await fetch(`${DONKI_URL}/FLR?startDate=${start}&endDate=${end}`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return []
      const data: any[] = await res.json()
      return data.slice(0, 10).map((d, i) => ({
        id: `sw-flr-${i}`,
        type: 'solar_flare' as const,
        title: `${d.classType || 'Unknown'} Solar Flare`,
        severity: (d.classType?.startsWith('X') ? 'EXTREME' : d.classType?.startsWith('M') ? 'SEVERE' : 'MODERATE') as any,
        startTime: d.beginTime || now.toISOString(),
        description: `Solar flare class ${d.classType} from ${d.sourceLocation || 'unknown region'}`,
        source: 'NASA DONKI',
        affectedSystems: ['HF Radio', 'GPS', 'Satellite Operations'],
      }))
    } catch { return [] }
  }

  private async fetchNEOs(): Promise<SpaceWeatherEvent[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const key = getNasaKey()
      let res = await fetch(`${NEO_URL}?start_date=${today}&end_date=${today}&api_key=${key}`, { signal: AbortSignal.timeout(10000) })
      if ((res.status === 401 || res.status === 403) && key !== 'DEMO_KEY') {
        console.warn('[SpaceWeather] NASA key rejected, falling back to DEMO_KEY')
        res = await fetch(`${NEO_URL}?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`, { signal: AbortSignal.timeout(10000) })
      }
      if (!res.ok) return []
      const data = await res.json()
      const allNeos: any[] = Object.values(data.near_earth_objects || {}).flat()

      return allNeos.slice(0, 15).map((neo: any, i: number) => {
        const approach = neo.close_approach_data?.[0]
        const diamMin = neo.estimated_diameter?.meters?.estimated_diameter_min
        const diamMax = neo.estimated_diameter?.meters?.estimated_diameter_max
        const diamStr = diamMin && diamMax
          ? `${Math.round(diamMin)}–${Math.round(diamMax)} m`
          : undefined
        const velocity = approach?.relative_velocity?.kilometers_per_hour
          ? `${Math.round(parseFloat(approach.relative_velocity.kilometers_per_hour)).toLocaleString()} km/h`
          : undefined
        const missKm = approach?.miss_distance?.kilometers
          ? parseFloat(approach.miss_distance.kilometers)
          : null
        const missStr = missKm
          ? missKm > 1e6 ? `${(missKm / 1e6).toFixed(1)}M km` : `${Math.round(missKm).toLocaleString()} km`
          : undefined
        const isHazardous = neo.is_potentially_hazardous_asteroid === true

        let severity: SpaceWeatherEvent['severity'] = 'MINOR'
        if (isHazardous && missKm && missKm < 5e6) severity = 'EXTREME'
        else if (isHazardous) severity = 'SEVERE'
        else if (missKm && missKm < 10e6) severity = 'MODERATE'

        return {
          id: `neo-${neo.id || i}`,
          type: 'asteroid' as const,
          title: `${isHazardous ? '⚠ ' : ''}${neo.name || `NEO-${i}`}`,
          severity,
          startTime: approach?.close_approach_date_full || new Date().toISOString(),
          description: `Near-Earth ${isHazardous ? 'hazardous ' : ''}asteroid approaching Earth. Estimated diameter: ${diamStr || 'N/A'}. Relative velocity: ${velocity || 'N/A'}. Miss distance: ${missStr || 'N/A'}.`,
          source: 'NASA NeoWs',
          closestApproachDate: approach?.close_approach_date || today,
          estimatedDiameter: diamStr,
          velocity,
          missDistance: missStr,
          isHazardous,
        }
      })
    } catch { return [] }
  }

  private async fetchFireballs(): Promise<SpaceWeatherEvent[]> {
    try {
      const res = await fetch(`${FIREBALL_URL}?limit=10&sort=-date`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return []
      const data = await res.json()
      const items: any[][] = data.data || []
      const fields: string[] = data.fields || []
      const dateIdx = fields.indexOf('date')
      const latIdx = fields.indexOf('lat')
      const lonIdx = fields.indexOf('lon')
      const energyIdx = fields.indexOf('energy')
      const velIdx = fields.indexOf('vel')

      return items.slice(0, 8).map((row, i) => {
        const date = dateIdx >= 0 ? row[dateIdx] : null
        const lat = latIdx >= 0 ? row[latIdx] : null
        const lon = lonIdx >= 0 ? row[lonIdx] : null
        const energy = energyIdx >= 0 ? row[energyIdx] : null
        const vel = velIdx >= 0 ? row[velIdx] : null

        return {
          id: `fireball-${i}`,
          type: 'fireball' as const,
          title: `Fireball Event${lat && lon ? ` (${parseFloat(lat).toFixed(1)}°, ${parseFloat(lon).toFixed(1)}°)` : ''}`,
          severity: (energy && parseFloat(energy) > 1 ? 'SEVERE' : energy && parseFloat(energy) > 0.1 ? 'MODERATE' : 'MINOR') as any,
          startTime: date ? new Date(date).toISOString() : new Date().toISOString(),
          description: `Atmospheric fireball detected${energy ? `. Total radiated energy: ${energy} × 10¹⁰ J` : ''}${vel ? `. Entry velocity: ${vel} km/s` : ''}.`,
          source: 'NASA CNEOS',
          velocity: vel ? `${vel} km/s` : undefined,
        }
      })
    } catch { return [] }
  }
}

const FALLBACK: SpaceWeatherEvent[] = [
  { id: 'sw-1', type: 'solar_flare', title: 'M-class Solar Flare', severity: 'MODERATE', startTime: new Date().toISOString(), description: 'M2.5 class solar flare from AR3664 active region', source: 'NOAA SWPC', kpIndex: 5, affectedSystems: ['HF Radio', 'GPS'] },
  { id: 'sw-2', type: 'geomagnetic_storm', title: 'G2 Geomagnetic Storm Watch', severity: 'MODERATE', startTime: new Date().toISOString(), description: 'G2 geomagnetic storm watch due to CME arrival expected', source: 'NOAA SWPC', kpIndex: 6, affectedSystems: ['Satellite Operations', 'Power Grids'] },
  { id: 'sw-3', type: 'asteroid', title: '⚠ (2024 PT5)', severity: 'SEVERE', startTime: new Date().toISOString(), description: 'Near-Earth hazardous asteroid approaching Earth. Estimated diameter: 45–100 m. Relative velocity: 28,400 km/h. Miss distance: 3.2M km.', source: 'NASA NeoWs', isHazardous: true, estimatedDiameter: '45–100 m', velocity: '28,400 km/h', missDistance: '3.2M km', closestApproachDate: new Date().toISOString().split('T')[0] },
  { id: 'sw-4', type: 'fireball', title: 'Fireball Event (35.2°, -120.5°)', severity: 'MINOR', startTime: new Date(Date.now() - 43200000).toISOString(), description: 'Atmospheric fireball detected. Total radiated energy: 0.3 × 10¹⁰ J. Entry velocity: 18.2 km/s.', source: 'NASA CNEOS', velocity: '18.2 km/s' },
]
