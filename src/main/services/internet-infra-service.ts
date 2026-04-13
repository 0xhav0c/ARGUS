import type { InternetOutage, SubmarineCable } from '../../shared/types'

let outageCache: InternetOutage[] = []
let lastFetch = 0
const TTL = 300000

const COUNTRY_COORDS: Record<string, [number, number]> = {
  'IR': [32.4, 53.7], 'MM': [19.8, 96.2], 'SD': [15.5, 32.5], 'SY': [35.0, 38.0],
  'UA': [48.4, 31.2], 'RU': [55.8, 37.6], 'CN': [35.9, 104.2], 'IN': [20.6, 78.9],
  'PK': [30.4, 69.3], 'AF': [33.9, 67.7], 'IQ': [33.2, 43.7], 'YE': [15.6, 48.5],
  'LY': [26.3, 17.2], 'ET': [9.1, 40.5], 'NG': [9.1, 7.5], 'VE': [6.4, -66.6],
  'CU': [21.5, -79.9], 'KP': [40.3, 127.5], 'EG': [26.8, 30.8], 'BD': [23.7, 90.4],
  'TR': [39.9, 32.9], 'BR': [-14.2, -51.9], 'MX': [23.6, -102.6], 'KE': [-0.2, 36.8],
  'ZA': [-30.6, 22.9], 'TH': [15.9, 100.9], 'ID': [-0.8, 113.9], 'PH': [12.9, 121.8],
}

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
    const [cf, ioda] = await Promise.allSettled([this.fetchCloudflare(), this.fetchIODA()])
    const outages: InternetOutage[] = []
    if (cf.status === 'fulfilled') outages.push(...cf.value)
    if (ioda.status === 'fulfilled') outages.push(...ioda.value)
    outageCache = outages
    lastFetch = Date.now()
    console.log(`[InternetInfra] ${outageCache.length} outages loaded`)
    return outageCache
  }

  getCables(): SubmarineCable[] { return SUBMARINE_CABLES }

  private async fetchCloudflare(): Promise<InternetOutage[]> {
    const outages: InternetOutage[] = []
    try {
      const res = await fetch('https://radar.cloudflare.com/api/v1/annotations/outages?limit=20&dateRange=1d', { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data: any = await res.json()
        for (const o of (data.result?.annotations || []).slice(0, 20)) {
          const cc = o.locations?.[0] || ''
          outages.push({
            id: `outage-${o.id || Math.random()}`,
            country: cc || 'Unknown',
            countryCode: cc,
            latitude: COUNTRY_COORDS[cc]?.[0] || 0,
            longitude: COUNTRY_COORDS[cc]?.[1] || 0,
            severity: 'moderate',
            asn: o.asns?.[0],
            startedAt: o.startDate || new Date().toISOString(),
            description: o.description || 'Internet outage detected',
            source: 'Cloudflare Radar',
          })
        }
      }
    } catch { /* API unavailable */ }
    return outages
  }

  private async fetchIODA(): Promise<InternetOutage[]> {
    try {
      const res = await fetch('https://api.ioda.inetintel.cc.gatech.edu/v2/alerts/ongoing', { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return []
      const data: any = await res.json()
      const results: InternetOutage[] = []
      for (const alert of (data.data || []).slice(0, 20)) {
        const cc = alert.entity?.code || ''
        const coords = COUNTRY_COORDS[cc]
        if (!coords) continue
        results.push({
          id: `ioda-${alert.entity?.code}-${alert.time?.start || Date.now()}`,
          country: alert.entity?.name || cc,
          countryCode: cc,
          latitude: coords[0],
          longitude: coords[1],
          severity: alert.level === 'critical' ? 'major' : 'moderate',
          startedAt: alert.time?.start ? new Date(alert.time.start * 1000).toISOString() : new Date().toISOString(),
          description: `Internet outage detected: ${alert.datasource || 'BGP/Active Probing'} shows ${alert.condition || 'significant drop'} in connectivity`,
          source: 'IODA',
          asn: alert.entity?.type === 'asn' ? alert.entity.code : undefined,
        })
      }
      return results
    } catch { return [] }
  }
}
