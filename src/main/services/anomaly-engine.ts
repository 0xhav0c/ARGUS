import type { Incident } from '../../shared/types'

export interface AnomalyResult {
  id: string
  type: 'spike' | 'pattern' | 'correlation' | 'silence' | 'cascade' | 'escalation'
  title: string
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  relatedIncidents: string[]
  detectedAt: string
  region?: string
}

export interface PredictiveRisk {
  region: string
  riskScore: number
  trend: 'increasing' | 'stable' | 'decreasing'
  factors: string[]
  prediction: string
}

interface CascadeRule {
  name: string
  triggerDomains: string[]
  minEvents: number
  timeWindowMs: number
  radiusKm: number
  severity: 'HIGH' | 'MEDIUM'
}

const CASCADE_RULES: CascadeRule[] = [
  { name: 'Military + Cyber Escalation', triggerDomains: ['CONFLICT', 'CYBER'], minEvents: 2, timeWindowMs: 6 * 3600000, radiusKm: 500, severity: 'HIGH' },
  { name: 'Conflict + Intel Surge', triggerDomains: ['CONFLICT', 'INTEL'], minEvents: 3, timeWindowMs: 12 * 3600000, radiusKm: 800, severity: 'HIGH' },
  { name: 'Finance + Conflict Disruption', triggerDomains: ['FINANCE', 'CONFLICT'], minEvents: 2, timeWindowMs: 24 * 3600000, radiusKm: 1500, severity: 'MEDIUM' },
  { name: 'Cyber + Finance Crisis', triggerDomains: ['CYBER', 'FINANCE'], minEvents: 2, timeWindowMs: 12 * 3600000, radiusKm: 2000, severity: 'MEDIUM' },
  { name: 'Multi-Vector Attack', triggerDomains: ['CONFLICT', 'CYBER', 'INTEL'], minEvents: 3, timeWindowMs: 6 * 3600000, radiusKm: 600, severity: 'HIGH' },
]

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export class AnomalyEngine {
  private lastAlertIds = new Set<string>()
  private onCascadeAlert?: (alert: AnomalyResult) => void

  setCascadeCallback(cb: (alert: AnomalyResult) => void) { this.onCascadeAlert = cb }

  detectAnomalies(incidents: Incident[]): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const now = Date.now()
    const last24h = incidents.filter(i => now - new Date(i.timestamp).getTime() < 86400000)
    const last48h = incidents.filter(i => now - new Date(i.timestamp).getTime() < 172800000)

    const domainCounts24: Record<string, number> = {}
    const domainCounts48: Record<string, number> = {}
    for (const i of last24h) domainCounts24[i.domain] = (domainCounts24[i.domain] || 0) + 1
    for (const i of last48h) domainCounts48[i.domain] = (domainCounts48[i.domain] || 0) + 1

    for (const [domain, count] of Object.entries(domainCounts24)) {
      const prevCount = (domainCounts48[domain] || 0) - count
      if (prevCount > 0 && count / prevCount > 2) {
        results.push({
          id: `spike-${domain}`, type: 'spike', title: `${domain} Spike Detected`,
          description: `${domain} events surged ${Math.round((count / prevCount - 1) * 100)}% vs previous 24h (${count} vs ${prevCount}).`,
          severity: count / prevCount > 3 ? 'HIGH' : 'MEDIUM', relatedIncidents: last24h.filter(i => i.domain === domain).map(i => i.id).slice(0, 10),
          detectedAt: new Date().toISOString(),
        })
      }
    }

    const countryCritical: Record<string, Incident[]> = {}
    for (const i of last24h) {
      if (i.severity === 'CRITICAL' || i.severity === 'HIGH') {
        const c = i.country || 'Unknown'
        if (!countryCritical[c]) countryCritical[c] = []
        countryCritical[c].push(i)
      }
    }
    for (const [country, incs] of Object.entries(countryCritical)) {
      if (incs.length >= 3) {
        const domains = [...new Set(incs.map(i => i.domain))]
        if (domains.length >= 2) {
          results.push({
            id: `corr-${country}`, type: 'correlation', title: `Multi-domain crisis: ${country}`,
            description: `${incs.length} high/critical events across ${domains.join(', ')} in ${country}.`,
            severity: 'HIGH', relatedIncidents: incs.map(i => i.id),
            detectedAt: new Date().toISOString(), region: country,
          })
        }
      }
    }

    results.push(...this.detectCascades(incidents))

    const silentDomains = ['CONFLICT', 'CYBER', 'INTEL', 'FINANCE'].filter(d => {
      const prev = (domainCounts48[d] || 0) - (domainCounts24[d] || 0)
      return prev >= 5 && (domainCounts24[d] || 0) === 0
    })
    for (const d of silentDomains) {
      results.push({
        id: `silence-${d}`, type: 'silence', title: `${d} Silence Alert`,
        description: `No ${d} events in last 24h after ${(domainCounts48[d] || 0) - (domainCounts24[d] || 0)} in prior 24h — possible data gap or calm before storm.`,
        severity: 'MEDIUM', relatedIncidents: [], detectedAt: new Date().toISOString(),
      })
    }

    return results
  }

  detectCascades(incidents: Incident[]): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const now = Date.now()

    for (const rule of CASCADE_RULES) {
      const windowIncidents = incidents.filter(i =>
        now - new Date(i.timestamp).getTime() < rule.timeWindowMs &&
        rule.triggerDomains.includes(i.domain) &&
        (i.severity === 'CRITICAL' || i.severity === 'HIGH')
      )

      const clusters: Incident[][] = []
      const used = new Set<string>()

      for (const inc of windowIncidents) {
        if (used.has(inc.id) || inc.latitude == null || inc.longitude == null) continue
        const cluster = [inc]
        used.add(inc.id)
        for (const other of windowIncidents) {
          if (used.has(other.id) || other.latitude == null || other.longitude == null) continue
          if (other.domain === inc.domain) continue
          const dist = haversineKm(inc.latitude, inc.longitude, other.latitude, other.longitude)
          if (dist <= rule.radiusKm) {
            cluster.push(other)
            used.add(other.id)
          }
        }
        const clusterDomains = new Set(cluster.map(c => c.domain))
        if (cluster.length >= rule.minEvents && clusterDomains.size >= 2) {
          clusters.push(cluster)
        }
      }

      for (const cluster of clusters) {
        const domains = [...new Set(cluster.map(c => c.domain))]
        const countries = [...new Set(cluster.map(c => c.country).filter(Boolean))]
        const alertId = `cascade-${rule.name.replace(/\s+/g, '-')}-${countries.join('-')}`

        const alert: AnomalyResult = {
          id: alertId, type: 'cascade',
          title: `CASCADE: ${rule.name}`,
          description: `${cluster.length} cross-domain events (${domains.join(' + ')}) detected within ${Math.round(rule.timeWindowMs / 3600000)}h / ${rule.radiusKm}km in ${countries.join(', ') || 'multiple regions'}. Possible coordinated activity.`,
          severity: rule.severity,
          relatedIncidents: cluster.map(c => c.id),
          detectedAt: new Date().toISOString(),
          region: countries[0],
        }
        results.push(alert)

        if (this.onCascadeAlert && !this.lastAlertIds.has(alertId)) {
          this.lastAlertIds.add(alertId)
          this.onCascadeAlert(alert)
          setTimeout(() => this.lastAlertIds.delete(alertId), rule.timeWindowMs)
        }
      }
    }

    return results
  }

  predictRisk(incidents: Incident[]): PredictiveRisk[] {
    const now = Date.now()
    const last7d = incidents.filter(i => now - new Date(i.timestamp).getTime() < 604800000)
    const countryCounts: Record<string, { total: number; critical: number; domains: Set<string> }> = {}
    for (const i of last7d) {
      const c = i.country || 'Global'
      if (!countryCounts[c]) countryCounts[c] = { total: 0, critical: 0, domains: new Set() }
      countryCounts[c].total++
      if (i.severity === 'CRITICAL' || i.severity === 'HIGH') countryCounts[c].critical++
      countryCounts[c].domains.add(i.domain)
    }

    return Object.entries(countryCounts)
      .filter(([, v]) => v.total >= 3)
      .sort(([, a], [, b]) => b.critical - a.critical)
      .slice(0, 15)
      .map(([region, data]) => {
        const score = Math.min(100, Math.round(data.critical * 15 + data.total * 3 + data.domains.size * 5))
        return {
          region,
          riskScore: score,
          trend: data.critical >= 5 ? 'increasing' : data.critical >= 2 ? 'stable' : 'decreasing',
          factors: [...data.domains],
          prediction: score >= 70 ? 'High probability of escalation' : score >= 40 ? 'Moderate risk, monitor closely' : 'Situation stabilizing',
        }
      })
  }
}
