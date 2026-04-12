import type { PandemicEvent } from '../../shared/types'

let cache: PandemicEvent[] = []
let lastFetch = 0
const TTL = 600000

export class PandemicService {
  async getEvents(): Promise<PandemicEvent[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const [who, outbreak] = await Promise.all([this.fetchWHO(), this.getKnownOutbreaks()])
    cache = [...who, ...outbreak]
    lastFetch = Date.now()
    console.log(`[Pandemic] ${cache.length} events loaded`)
    return cache
  }

  private async fetchWHO(): Promise<PandemicEvent[]> {
    try {
      const res = await fetch('https://disease.sh/v3/covid-19/countries?sort=todayCases', { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return []
      const data: any = await res.json()
      return (Array.isArray(data) ? data : []).filter((c: any) => c.todayCases > 1000).slice(0, 20).map((c: any) => ({
        id: `covid-${c.countryInfo?._id || c.country}`,
        disease: 'COVID-19',
        country: c.country,
        latitude: c.countryInfo?.lat || 0,
        longitude: c.countryInfo?.long || 0,
        cases: c.todayCases,
        deaths: c.todayDeaths,
        alertLevel: c.todayCases > 50000 ? 'EMERGENCY' : c.todayCases > 10000 ? 'HIGH' : c.todayCases > 5000 ? 'MODERATE' : 'LOW',
        source: 'disease.sh',
        reportedAt: new Date(c.updated).toISOString(),
        description: `${c.country}: ${c.todayCases.toLocaleString()} new cases, ${c.todayDeaths} deaths today. Total: ${c.cases?.toLocaleString()} cases.`,
      }))
    } catch { return [] }
  }

  private getKnownOutbreaks(): PandemicEvent[] {
    return [
      { id: 'mpox-drc', disease: 'Mpox (Clade Ib)', country: 'DR Congo', latitude: -4.3, longitude: 15.3, cases: 32000, deaths: 990, alertLevel: 'HIGH', source: 'WHO', reportedAt: new Date().toISOString(), description: 'Ongoing Mpox outbreak in DRC with cross-border spread.' },
      { id: 'cholera-multi', disease: 'Cholera', country: 'Multi-country', latitude: -15.4, longitude: 28.3, cases: 85000, deaths: 1200, alertLevel: 'HIGH', source: 'WHO', reportedAt: new Date().toISOString(), description: 'Multi-country cholera outbreaks across southern/eastern Africa.' },
      { id: 'dengue-brazil', disease: 'Dengue', country: 'Brazil', latitude: -15.8, longitude: -47.9, cases: 4500000, deaths: 3200, alertLevel: 'EMERGENCY', source: 'PAHO', reportedAt: new Date().toISOString(), description: 'Record dengue season in Brazil with over 4.5M cases.' },
      { id: 'avian-flu', disease: 'H5N1 Avian Influenza', country: 'Global', latitude: 40.0, longitude: -95.0, cases: 65, deaths: 2, alertLevel: 'MODERATE', source: 'CDC', reportedAt: new Date().toISOString(), description: 'H5N1 spreading in dairy cattle with sporadic human cases.' },
    ]
  }
}
