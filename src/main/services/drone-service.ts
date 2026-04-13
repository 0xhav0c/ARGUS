import type { DroneActivity } from '../../shared/types'

let cache: DroneActivity[] = []
let lastFetch = 0
const TTL = 600000

export class DroneService {
  async getActivities(): Promise<DroneActivity[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const [gdelt, opensky] = await Promise.allSettled([this.fetchDroneGDELT(), this.fetchOpenSkyDrones()])
    const results: DroneActivity[] = []
    if (gdelt.status === 'fulfilled') results.push(...gdelt.value)
    if (opensky.status === 'fulfilled') results.push(...opensky.value)
    cache = results.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    lastFetch = Date.now()
    console.log(`[Drone] ${cache.length} activities loaded`)
    return cache
  }

  private async fetchDroneGDELT(): Promise<DroneActivity[]> {
    try {
      const query = encodeURIComponent('drone OR UAV OR "unmanned aerial" OR UAS OR "kamikaze drone" OR Shahed OR Bayraktar OR "suicide drone"')
      const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=20&format=json&timespan=3d`, { signal: AbortSignal.timeout(12000) })
      if (!res.ok) return []
      const data: any = await res.json()
      const articles: any[] = data.articles || []

      const COUNTRY_MAP: Record<string, { name: string; lat: number; lng: number }> = {
        'ukraine': { name: 'Ukraine', lat: 48.4, lng: 31.2 },
        'russia': { name: 'Russia', lat: 55.8, lng: 37.6 },
        'yemen': { name: 'Yemen', lat: 15.6, lng: 48.5 },
        'iraq': { name: 'Iraq', lat: 33.2, lng: 43.7 },
        'syria': { name: 'Syria', lat: 35.0, lng: 38.0 },
        'israel': { name: 'Israel', lat: 31.0, lng: 34.8 },
        'iran': { name: 'Iran', lat: 32.4, lng: 53.7 },
        'gaza': { name: 'Palestine', lat: 31.4, lng: 34.4 },
        'lebanon': { name: 'Lebanon', lat: 33.9, lng: 35.5 },
        'myanmar': { name: 'Myanmar', lat: 19.8, lng: 96.2 },
        'pakistan': { name: 'Pakistan', lat: 30.4, lng: 69.3 },
        'libya': { name: 'Libya', lat: 26.3, lng: 17.2 },
        'sudan': { name: 'Sudan', lat: 15.5, lng: 32.5 },
        'taiwan': { name: 'Taiwan', lat: 23.7, lng: 120.9 },
        'china': { name: 'China', lat: 35.9, lng: 104.2 },
        'north korea': { name: 'North Korea', lat: 40.3, lng: 127.5 },
        'dprk': { name: 'North Korea', lat: 40.3, lng: 127.5 },
      }

      return articles.map((a: any, i: number) => {
        const lower = (a.title || '').toLowerCase()
        let country = 'Unknown'; let lat = 0; let lng = 0
        for (const [kw, data] of Object.entries(COUNTRY_MAP)) {
          if (lower.includes(kw)) { country = data.name; lat = data.lat; lng = data.lng; break }
        }
        const isMilitary = /military|combat|strike|attack|intercept|kamikaze|shahed|bayraktar/i.test(lower)
        const date = a.seendate ? new Date(a.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')) : new Date()

        return {
          id: `drone-gdelt-${i}`,
          type: (isMilitary ? 'military' : 'unknown') as DroneActivity['type'],
          latitude: lat, longitude: lng,
          altitude: 0,
          country,
          description: a.title || 'Drone activity reported',
          detectedAt: date.toISOString(),
          source: `GDELT (${a.domain || 'news'})`,
        }
      })
    } catch { return [] }
  }

  private async fetchOpenSkyDrones(): Promise<DroneActivity[]> {
    try {
      const res = await fetch('https://opensky-network.org/api/states/all?lamin=28&lomin=30&lamax=42&lomax=55', { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return []
      const data: any = await res.json()
      const states: any[][] = data.states || []
      const droneCallsigns = /^(RQ|MQ|HERON|HERMES|ANKA|UAV|UAS|DRONE)/i

      return states.filter(s => s[1] && droneCallsigns.test(s[1].trim())).slice(0, 10).map((s, i) => ({
        id: `drone-osky-${s[0] || i}`,
        type: 'military' as DroneActivity['type'],
        latitude: s[6] || 0,
        longitude: s[5] || 0,
        altitude: s[7] || 0,
        country: s[2] || 'Unknown',
        description: `Drone/UAV callsign ${(s[1] || '').trim()} detected via ADS-B at altitude ${Math.round(s[7] || 0)}m`,
        detectedAt: s[3] ? new Date(s[3] * 1000).toISOString() : new Date().toISOString(),
        source: 'OpenSky Network',
      }))
    } catch { return [] }
  }
}
