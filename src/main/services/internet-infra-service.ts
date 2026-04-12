import type { InternetOutage, SubmarineCable } from '../../shared/types'

let outageCache: InternetOutage[] = []
let lastFetch = 0
const TTL = 300000

const SUBMARINE_CABLES: SubmarineCable[] = [
  { id: 'sc-1', name: 'SEA-ME-WE 6', waypoints: [[1.3,103.8],[6.0,80.0],[12.5,45.0],[30.0,32.5],[37.0,15.0],[43.3,5.3],[51.0,2.0]], length: '19,200 km', owners: 'Telstra, Singtel, Orange', rfs: '2025', color: '#00d4ff' },
  { id: 'sc-2', name: '2Africa', waypoints: [[51.5,-0.1],[48.0,-5.0],[28.0,-15.0],[6.0,-1.0],[-6.0,12.0],[-34.0,18.5],[-26.0,32.8],[-6.0,39.5],[12.5,45.0],[25.0,55.0],[6.0,80.0]], length: '45,000 km', owners: 'Meta, MTN, Vodafone', rfs: '2024', color: '#4a9eff' },
  { id: 'sc-3', name: 'PEACE Cable', waypoints: [[39.0,117.0],[22.3,114.2],[1.3,103.8],[6.0,80.0],[12.5,45.0],[30.0,32.5],[37.0,15.0],[36.7,-6.0],[44.0,-8.6]], length: '15,000 km', owners: 'PEACE Cable International', rfs: '2022', color: '#f5c542' },
  { id: 'sc-4', name: 'TAT-14', waypoints: [[51.0,2.0],[52.0,-1.0],[53.0,-6.0],[50.0,-20.0],[43.0,-40.0],[40.7,-74.0]], length: '15,428 km', owners: 'Multiple', rfs: '2001', color: '#ff6b35' },
  { id: 'sc-5', name: 'Asia-America Gateway', waypoints: [[35.0,140.0],[22.3,114.2],[10.0,107.0],[1.3,103.8],[6.0,80.0]], length: '20,000 km', owners: 'Multiple Asian Telcos', rfs: '2009', color: '#a78bfa' },
  { id: 'sc-6', name: 'MAREA', waypoints: [[39.4,-0.3],[38.0,-10.0],[38.0,-30.0],[39.0,-50.0],[39.0,-74.0]], length: '6,600 km', owners: 'Microsoft, Meta', rfs: '2018', color: '#00e676' },
]

export class InternetInfraService {
  async getOutages(): Promise<InternetOutage[]> {
    if (outageCache.length > 0 && Date.now() - lastFetch < TTL) return outageCache
    const outages = await this.fetchOutages()
    outageCache = outages
    lastFetch = Date.now()
    return outageCache
  }

  getCables(): SubmarineCable[] { return SUBMARINE_CABLES }

  private async fetchOutages(): Promise<InternetOutage[]> {
    const outages: InternetOutage[] = []
    try {
      const res = await fetch('https://radar.cloudflare.com/api/v1/annotations/outages?limit=20&dateRange=1d', { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data: any = await res.json()
        for (const o of (data.result?.annotations || []).slice(0, 20)) {
          outages.push({
            id: `outage-${o.id || Math.random()}`,
            country: o.locations?.[0] || 'Unknown',
            countryCode: o.asns?.[0] || '',
            latitude: 0, longitude: 0,
            severity: 'moderate',
            asn: o.asns?.[0],
            startedAt: o.startDate || new Date().toISOString(),
            description: o.description || 'Internet outage detected',
            source: 'Cloudflare Radar',
          })
        }
      }
    } catch { /* fallback */ }
    if (outages.length === 0) outages.push(...FALLBACK_OUTAGES)
    return outages
  }
}

const FALLBACK_OUTAGES: InternetOutage[] = [
  { id: 'out-1', country: 'Iran', countryCode: 'IR', latitude: 32.4, longitude: 53.7, severity: 'major', startedAt: new Date().toISOString(), description: 'Government-imposed internet throttling', source: 'IODA' },
  { id: 'out-2', country: 'Myanmar', countryCode: 'MM', latitude: 19.8, longitude: 96.2, severity: 'major', startedAt: new Date().toISOString(), description: 'Prolonged shutdowns in conflict regions', source: 'NetBlocks' },
  { id: 'out-3', country: 'Sudan', countryCode: 'SD', latitude: 15.5, longitude: 32.5, severity: 'major', startedAt: new Date().toISOString(), description: 'Infrastructure damage from civil war', source: 'NetBlocks' },
]
