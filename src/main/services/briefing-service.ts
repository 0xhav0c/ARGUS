import type { DailyBriefing, Incident, IncidentDomain, IncidentSeverity } from '../../shared/types'

export class BriefingService {
  generateBriefing(incidents: Incident[]): DailyBriefing {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const dayStart = new Date(today).getTime()
    const todayIncidents = incidents.filter(i => new Date(i.timestamp).getTime() >= dayStart)
    const weekIncidents = incidents.filter(i => new Date(i.timestamp).getTime() >= Date.now() - 604800000)

    const domainCounts: Record<string, number> = {}
    const countryCounts: Record<string, { total: number; critical: number }> = {}
    const sevCounts: Record<string, number> = {}
    for (const i of weekIncidents) {
      domainCounts[i.domain] = (domainCounts[i.domain] || 0) + 1
      sevCounts[i.severity] = (sevCounts[i.severity] || 0) + 1
      const c = i.country || 'Unknown'
      if (!countryCounts[c]) countryCounts[c] = { total: 0, critical: 0 }
      countryCounts[c].total++
      if (i.severity === 'CRITICAL' || i.severity === 'HIGH') countryCounts[c].critical++
    }

    const topEvents = todayIncidents
      .sort((a, b) => this.sevScore(b.severity) - this.sevScore(a.severity))
      .slice(0, 10)
      .map(i => ({ id: i.id, title: i.title, domain: i.domain, severity: i.severity, country: i.country, latitude: i.latitude, longitude: i.longitude }))

    const regionAlerts = Object.entries(countryCounts)
      .filter(([, v]) => v.total >= 3)
      .sort(([, a], [, b]) => b.critical - a.critical)
      .slice(0, 8)
      .map(([region, data]) => ({
        region,
        riskLevel: data.critical >= 5 ? 'CRITICAL' : data.critical >= 2 ? 'HIGH' : data.total >= 10 ? 'MEDIUM' : 'LOW',
        summary: `${data.total} events (${data.critical} critical/high) in the past 7 days.`,
      }))

    const trending = Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([d]) => d)

    const summaryParts: string[] = []
    if (todayIncidents.length > 0) summaryParts.push(`${todayIncidents.length} new events detected today.`)
    const critToday = todayIncidents.filter(i => i.severity === 'CRITICAL').length
    if (critToday > 0) summaryParts.push(`${critToday} CRITICAL alerts require immediate attention.`)
    const topDomain = trending[0]
    if (topDomain) summaryParts.push(`${topDomain} domain dominates with ${domainCounts[topDomain]} events this week.`)
    if (regionAlerts.length > 0) summaryParts.push(`Key hotspots: ${regionAlerts.slice(0, 3).map(r => r.region).join(', ')}.`)

    return {
      id: `briefing-${today}`,
      date: today,
      generatedAt: now.toISOString(),
      summary: summaryParts.join(' ') || 'No significant events detected.',
      topEvents,
      regionAlerts,
      stats: { total: weekIncidents.length, critical: sevCounts['CRITICAL'] || 0, newToday: todayIncidents.length, trending },
    }
  }

  private sevScore(s: IncidentSeverity): number {
    return { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }[s] || 0
  }
}
