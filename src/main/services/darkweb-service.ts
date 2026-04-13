import type { DarkWebAlert } from '../../shared/types'

let cache: DarkWebAlert[] = []
let lastFetch = 0
const TTL = 600000

export class DarkWebService {
  async getAlerts(): Promise<DarkWebAlert[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const alerts: DarkWebAlert[] = []
    try {
      const res = await fetch('https://raw.githubusercontent.com/joshhighet/ransomwatch/main/posts.json', { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const data: any[] = await res.json()
        for (const item of data.slice(-20).reverse()) {
          alerts.push({
            id: `dw-${item.post_title?.substring(0, 20) || Math.random()}`,
            type: 'ransomware',
            title: item.post_title || 'Unknown Ransomware Post',
            severity: 'HIGH',
            source: item.group_name || 'Unknown Group',
            discoveredAt: item.discovered || new Date().toISOString(),
            description: `Ransomware group "${item.group_name}" posted about "${item.post_title}"`,
            threatActor: item.group_name,
            affectedOrg: item.post_title,
          })
        }
      }
    } catch { /* API unavailable */ }
    // No fake fallback — return empty if API fails
    cache = alerts
    lastFetch = Date.now()
    console.log(`[DarkWeb] ${cache.length} alerts loaded`)
    return cache
  }
}
// Removed: 5 hardcoded fake dark web alerts (fake LockBit victim "Financial Corp",
// fake "Government Database Leaked", fake zero-day, etc.) that were silently injected
// with new Date().toISOString() timestamps when the API failed.
