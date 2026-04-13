import type { RFEvent } from '../../shared/types'

let cached: RFEvent[] = []
let lastFetch = 0
const TTL = 300000

export class SigintService {
  async getRFEvents(): Promise<RFEvent[]> {
    if (cached.length > 0 && Date.now() - lastFetch < TTL) return cached

    try {
      const live = await this.fetchGPSJamData()
      cached = live
      lastFetch = Date.now()
    } catch {
      cached = []
    }

    console.log(`[SIGINT] ${cached.length} RF events`)
    return cached
  }

  private async fetchGPSJamData(): Promise<RFEvent[]> {
    const events: RFEvent[] = []
    try {
      const res = await fetch('https://gpsjam.org/api/data', { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data: any = await res.json()
        if (Array.isArray(data)) {
          for (const item of data.slice(0, 50)) {
            if (item.lat && item.lng) {
              events.push({
                id: `gpsjam-${item.lat}-${item.lng}`,
                type: 'jamming',
                latitude: item.lat,
                longitude: item.lng,
                frequency: 'GPS L1',
                band: 'L-Band',
                description: `GPS interference level: ${item.level || 'unknown'}`,
                detectedAt: new Date().toISOString(),
                source: 'GPSJAM',
              })
            }
          }
        }
      }
    } catch { /* API unavailable — return empty */ }
    return events
  }
}
// Removed: KNOWN_JAMMING_ZONES — 10 hardcoded fake RF events with Math.random() timestamps
// that contaminated even live data and made everything appear freshly detected.
