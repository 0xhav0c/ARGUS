import type { WeatherAlert } from '../../shared/types'

let cache: WeatherAlert[] = []
let lastFetch = 0
const TTL = 300000

export class WeatherService {
  async getAlerts(): Promise<WeatherAlert[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache

    const [nws, gdacs] = await Promise.allSettled([this.fetchNWS(), this.fetchGDACS()])

    const alerts: WeatherAlert[] = []
    if (nws.status === 'fulfilled') alerts.push(...nws.value)
    if (gdacs.status === 'fulfilled') alerts.push(...gdacs.value)

    cache = alerts
    lastFetch = Date.now()

    const nwsCount = nws.status === 'fulfilled' ? nws.value.length : 0
    const gdacsCount = gdacs.status === 'fulfilled' ? gdacs.value.length : 0
    console.log(`[Weather] ${cache.length} alerts loaded (NWS: ${nwsCount}, GDACS: ${gdacsCount})`)

    return cache
  }

  private async fetchNWS(): Promise<WeatherAlert[]> {
    const alerts: WeatherAlert[] = []
    const res = await fetch(
      'https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe',
      { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Argus/1.0' } }
    )
    if (!res.ok) return alerts

    const data: any = await res.json()
    for (const f of (data.features || []).slice(0, 30)) {
      const p = f.properties || {}
      const geo = f.geometry?.coordinates
      let lat = 0, lng = 0
      if (geo) {
        if (Array.isArray(geo[0])) {
          const flat = geo.flat(2)
          lat = flat[1] || 0
          lng = flat[0] || 0
        } else {
          lng = geo[0]
          lat = geo[1]
        }
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
    return alerts
  }

  private async fetchGDACS(): Promise<WeatherAlert[]> {
    const alerts: WeatherAlert[] = []
    const res = await fetch('https://www.gdacs.org/xml/rss.xml', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Argus/1.0', 'Accept': 'application/xml, text/xml, */*' },
    })
    if (!res.ok) return alerts

    const xml = await res.text()

    const typeMap: Record<string, WeatherAlert['type']> = {
      'TC': 'hurricane', 'FL': 'flood', 'VO': 'storm',
      'DR': 'heatwave', 'WF': 'storm', 'EQ': 'storm',
    }
    const severityMap: Record<string, WeatherAlert['severity']> = {
      'Red': 'EXTREME', 'Orange': 'SEVERE', 'Green': 'MODERATE',
    }

    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      const title = item.match(/<title>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/title>/i)?.[1]
        || item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
        || 'GDACS Alert'

      const description = item.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/i)?.[1]
        || item.match(/<description>([\s\S]*?)<\/description>/i)?.[1]
        || ''

      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || ''

      const severityRaw = item.match(/<gdacs:severity[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/i)?.[1]
        || item.match(/<gdacs:severity[^>]*>([\s\S]*?)<\/gdacs:severity>/i)?.[1]
        || ''

      const eventType = item.match(/<gdacs:eventtype>([\s\S]*?)<\/gdacs:eventtype>/i)?.[1]?.trim() || ''

      const geoPoint = item.match(/<georss:point>([\s\S]*?)<\/georss:point>/i)?.[1]?.trim() || ''
      const [latStr, lngStr] = geoPoint.split(/\s+/)
      const lat = parseFloat(latStr) || 0
      const lng = parseFloat(lngStr) || 0

      const severityColor = severityRaw.match(/\b(Red|Orange|Green)\b/i)?.[1] || ''
      const severity = severityMap[severityColor] || 'MODERATE'
      const type = typeMap[eventType] || 'storm'

      alerts.push({
        id: `gdacs-${i}`,
        type,
        title: title.trim(),
        latitude: lat,
        longitude: lng,
        severity,
        description: description.replace(/<[^>]*>/g, '').trim().substring(0, 300),
        source: 'GDACS',
        validFrom: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        validTo: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
    }
    return alerts
  }
}
