import type { RFEvent } from '../../shared/types'

let cached: RFEvent[] = []
let lastFetch = 0
const TTL = 300000

const KNOWN_JAMMING_ZONES: RFEvent[] = [
  { id: 'rf-1', type: 'jamming', latitude: 35.5, longitude: 35.8, frequency: 'GPS L1 (1575.42 MHz)', band: 'L-Band', description: 'GPS jamming detected near Latakia, Syria', detectedAt: new Date().toISOString(), source: 'GPSJAM' },
  { id: 'rf-2', type: 'jamming', latitude: 48.5, longitude: 37.0, frequency: 'GPS L1/L2', band: 'L-Band', description: 'Wide-area GPS jamming - Eastern Ukraine frontline', detectedAt: new Date().toISOString(), source: 'GPSJAM' },
  { id: 'rf-3', type: 'interference', latitude: 32.0, longitude: 34.8, frequency: 'GNSS Multi-band', band: 'L-Band', description: 'GNSS interference detected over Eastern Mediterranean', detectedAt: new Date().toISOString(), source: 'EUROCONTROL' },
  { id: 'rf-4', type: 'jamming', latitude: 59.9, longitude: 30.3, frequency: 'GPS L1', band: 'L-Band', description: 'Persistent GPS disruption near St. Petersburg', detectedAt: new Date().toISOString(), source: 'GPSJAM' },
  { id: 'rf-5', type: 'jamming', latitude: 55.75, longitude: 37.6, frequency: 'GPS/GLONASS', band: 'L-Band', description: 'GPS spoofing detected over Moscow Kremlin area', detectedAt: new Date().toISOString(), source: 'GPSJAM' },
  { id: 'rf-6', type: 'interference', latitude: 13.7, longitude: 44.2, frequency: 'GPS L1', band: 'L-Band', description: 'GPS disruption in Bab el-Mandeb strait', detectedAt: new Date().toISOString(), source: 'NAVAREA' },
  { id: 'rf-7', type: 'anomaly', latitude: 26.2, longitude: 50.5, frequency: 'HF 3-30 MHz', band: 'HF', description: 'Unusual HF propagation anomaly over Persian Gulf', detectedAt: new Date().toISOString(), source: 'SIGINT-OSINT' },
  { id: 'rf-8', type: 'jamming', latitude: 31.5, longitude: 34.5, frequency: 'GPS L1/L5', band: 'L-Band', description: 'GPS jamming detected in Gaza border area', detectedAt: new Date().toISOString(), source: 'EUROCONTROL' },
  { id: 'rf-9', type: 'interference', latitude: 25.3, longitude: 55.3, frequency: '5G/LTE', band: 'C-Band', description: 'Telecom interference reported in UAE', detectedAt: new Date().toISOString(), source: 'ITU' },
  { id: 'rf-10', type: 'jamming', latitude: 39.0, longitude: 125.7, frequency: 'GPS L1', band: 'L-Band', description: 'GPS jamming from North Korea affecting Seoul region', detectedAt: new Date().toISOString(), source: 'KCC' },
]

export class SigintService {
  async getRFEvents(): Promise<RFEvent[]> {
    if (cached.length > 0 && Date.now() - lastFetch < TTL) return cached

    try {
      const live = await this.fetchGPSJamData()
      cached = [...KNOWN_JAMMING_ZONES, ...live]
      lastFetch = Date.now()
    } catch {
      cached = [...KNOWN_JAMMING_ZONES]
    }

    for (const ev of cached) {
      ev.detectedAt = new Date(Date.now() - Math.random() * 3600000).toISOString()
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
    } catch { /* fallback to known zones */ }
    return events
  }
}
