import type { IoC } from '../../shared/types'

let cache: IoC[] = []
let lastFetch = 0
const TTL = 600000

export class IoCService {
  async getIndicators(): Promise<IoC[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const iocs: IoC[] = []
    try {
      const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'get_iocs', days: 1 }),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const data: any = await res.json()
        for (const item of (data.data || []).slice(0, 50)) {
          iocs.push({
            id: `ioc-${item.id || Math.random()}`,
            type: item.ioc_type?.includes('ip') ? 'ip' : item.ioc_type?.includes('domain') ? 'domain' : item.ioc_type?.includes('url') ? 'url' : item.ioc_type?.includes('md5') || item.ioc_type?.includes('sha') ? 'hash' : 'domain',
            value: item.ioc || '',
            threatType: item.threat_type_desc || item.malware || 'Unknown',
            confidence: item.confidence_level || 75,
            source: 'ThreatFox',
            firstSeen: item.first_seen_utc || new Date().toISOString(),
            lastSeen: item.last_seen_utc || new Date().toISOString(),
            tags: item.tags || [],
          })
        }
      }
    } catch { /* API unavailable */ }
    // No fake fallback — return empty if API fails
    cache = iocs
    lastFetch = Date.now()
    console.log(`[IoC] ${cache.length} indicators loaded`)
    return cache
  }

  extractFromText(text: string): IoC[] {
    const iocs: IoC[] = []
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|io|xyz|ru|cn|tk|ml)\b/gi
    const cveRegex = /CVE-\d{4}-\d{4,}/g
    const hashRegex = /\b[a-f0-9]{32,64}\b/gi
    const now = new Date().toISOString()
    for (const match of text.matchAll(ipRegex)) {
      if (!match[0].startsWith('10.') && !match[0].startsWith('192.168.') && !match[0].startsWith('127.'))
        iocs.push({ id: `ext-ip-${match[0]}`, type: 'ip', value: match[0], threatType: 'Extracted', confidence: 50, source: 'Text Extraction', firstSeen: now, lastSeen: now, tags: ['extracted'] })
    }
    for (const match of text.matchAll(domainRegex)) {
      iocs.push({ id: `ext-dom-${match[0]}`, type: 'domain', value: match[0], threatType: 'Extracted', confidence: 40, source: 'Text Extraction', firstSeen: now, lastSeen: now, tags: ['extracted'] })
    }
    for (const match of text.matchAll(cveRegex)) {
      iocs.push({ id: `ext-cve-${match[0]}`, type: 'cve', value: match[0], threatType: 'Vulnerability', confidence: 90, source: 'Text Extraction', firstSeen: now, lastSeen: now, tags: ['cve'] })
    }
    for (const match of text.matchAll(hashRegex)) {
      iocs.push({ id: `ext-hash-${match[0].substring(0,8)}`, type: 'hash', value: match[0], threatType: 'Extracted', confidence: 60, source: 'Text Extraction', firstSeen: now, lastSeen: now, tags: ['extracted'] })
    }
    return iocs
  }
}
// Removed: 8 hardcoded fake IoCs (fake IPs 185.220.101.1, 45.133.1.23, fake domains
// evil-update.com, fake-microsoft-login.com, etc.) that were silently injected when
// ThreatFox API failed. Presenting fake IPs as malicious is actively dangerous.
