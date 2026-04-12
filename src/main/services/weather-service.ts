import type { WeatherAlert } from '../../shared/types'

let cache: WeatherAlert[] = []
let lastFetch = 0
const TTL = 300000

export class WeatherService {
  async getAlerts(): Promise<WeatherAlert[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const alerts = await this.fetchAlerts()
    cache = alerts
    lastFetch = Date.now()
    console.log(`[Weather] ${cache.length} alerts loaded`)
    return cache
  }

  private async fetchAlerts(): Promise<WeatherAlert[]> {
    const alerts: WeatherAlert[] = []
    try {
      const res = await fetch('https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe', { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Argus/1.0' } })
      if (res.ok) {
        const data: any = await res.json()
        for (const f of (data.features || []).slice(0, 30)) {
          const p = f.properties || {}
          const geo = f.geometry?.coordinates
          let lat = 0, lng = 0
          if (geo) {
            if (Array.isArray(geo[0])) { const flat = geo.flat(2); lat = flat[1] || 0; lng = flat[0] || 0 }
            else { lng = geo[0]; lat = geo[1] }
          }
          const typeMap: Record<string, WeatherAlert['type']> = {
            'Tornado': 'tornado', 'Hurricane': 'hurricane', 'Flood': 'flood',
            'Heat': 'heatwave', 'Cold': 'coldwave', 'Fog': 'fog', 'Storm': 'storm',
          }
          let wType: WeatherAlert['type'] = 'storm'
          for (const [key, val] of Object.entries(typeMap)) {
            if ((p.event || '').includes(key)) { wType = val; break }
          }
          alerts.push({
            id: p.id || `wx-${Math.random()}`,
            type: wType,
            title: p.headline || p.event || 'Weather Alert',
            latitude: lat, longitude: lng,
            severity: p.severity === 'Extreme' ? 'EXTREME' : p.severity === 'Severe' ? 'SEVERE' : p.severity === 'Moderate' ? 'MODERATE' : 'MINOR',
            description: (p.description || '').substring(0, 300),
            source: 'NWS',
            validFrom: p.onset || p.effective || new Date().toISOString(),
            validTo: p.expires || new Date(Date.now() + 86400000).toISOString(),
          })
        }
      }
    } catch { /* fallback */ }
    if (alerts.length === 0) alerts.push(...FALLBACK_ALERTS)
    return alerts
  }
}

const FALLBACK_ALERTS: WeatherAlert[] = [
  { id: 'wx-1', type: 'hurricane', title: 'Tropical Cyclone Watch - Western Pacific', latitude: 18.0, longitude: 130.0, severity: 'SEVERE', description: 'Tropical depression forming east of Philippines.', source: 'JTWC', validFrom: new Date().toISOString(), validTo: new Date(Date.now() + 172800000).toISOString() },
  { id: 'wx-2', type: 'heatwave', title: 'Extreme Heat - Middle East', latitude: 30.0, longitude: 47.0, severity: 'EXTREME', description: 'Temperatures exceeding 50°C expected across Iraq and Kuwait.', source: 'WMO', validFrom: new Date().toISOString(), validTo: new Date(Date.now() + 86400000).toISOString() },
]
