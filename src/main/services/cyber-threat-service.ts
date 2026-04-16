import type { CyberThreat } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'

let cache: CyberThreat[] = []
let lastFetch = 0
const TTL = 300000
const FRESHNESS_WINDOW = 30 * 86400000 // 30 days

export interface ShodanResult {
  ip: string
  port: number
  org?: string
  os?: string
  product?: string
  country?: string
  city?: string
  vulns?: string[]
  lastUpdate?: string
}

export interface AbuseIPDBResult {
  ipAddress: string
  abuseConfidenceScore: number
  countryCode?: string
  isp?: string
  domain?: string
  totalReports: number
  lastReportedAt?: string
  isPublic?: boolean
  isTor?: boolean
}

export interface VirusTotalResult {
  id: string
  type: string
  positives: number
  total: number
  scanDate?: string
  permalink?: string
}

export class CyberThreatService {
  async getThreats(): Promise<CyberThreat[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const [cves, ransom, kev, ghsa] = await Promise.all([
      this.fetchCVEs(),
      this.fetchRansomwareTracker(),
      this.fetchCISAKEV(),
      this.fetchGitHubAdvisories(),
    ])

    const merged = [...kev, ...cves, ...ransom, ...ghsa]
    const seen = new Map<string, CyberThreat>()
    for (const threat of merged) {
      if (threat.cveId) {
        const existing = seen.get(threat.cveId)
        if (!existing || threat.source === 'CISA KEV') {
          seen.set(threat.cveId, threat)
        }
      } else {
        seen.set(threat.id, threat)
      }
    }

    const cutoff = Date.now() - FRESHNESS_WINDOW
    cache = Array.from(seen.values())
      .filter(t => new Date(t.publishedAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    lastFetch = Date.now()
    console.log(`[CTI] ${cache.length} cyber threats loaded`)
    return cache
  }

  async searchShodan(query: string): Promise<ShodanResult[]> {
    const key = getApiKeyManager().get('shodan')
    if (!key) return []
    try {
      const res = await fetch(`https://api.shodan.io/shodan/host/search?key=${key}&query=${encodeURIComponent(query)}&minify=true`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return []
      const data: any = await res.json()
      return (data.matches || []).slice(0, 50).map((m: any) => ({
        ip: m.ip_str,
        port: m.port,
        org: m.org,
        os: m.os,
        product: m.product,
        country: m.location?.country_name,
        city: m.location?.city,
        vulns: m.vulns ? Object.keys(m.vulns) : undefined,
        lastUpdate: m.timestamp,
      }))
    } catch (err) {
      console.error('[CTI] Shodan search failed:', err)
      return []
    }
  }

  async checkAbuseIPDB(ip: string): Promise<AbuseIPDBResult | null> {
    const key = getApiKeyManager().get('abuseipdb')
    if (!key) return null
    try {
      const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`, {
        headers: { Key: key, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const data: any = await res.json()
      const d = data.data
      if (!d) return null
      return {
        ipAddress: d.ipAddress,
        abuseConfidenceScore: d.abuseConfidenceScore || 0,
        countryCode: d.countryCode,
        isp: d.isp,
        domain: d.domain,
        totalReports: d.totalReports || 0,
        lastReportedAt: d.lastReportedAt,
        isPublic: d.isPublic,
        isTor: d.isTor,
      }
    } catch (err) {
      console.error('[CTI] AbuseIPDB check failed:', err)
      return null
    }
  }

  async scanVirusTotal(resource: string, type: 'url' | 'hash' = 'hash'): Promise<VirusTotalResult | null> {
    const key = getApiKeyManager().get('virustotal')
    if (!key) return null
    try {
      let endpoint: string
      if (type === 'url') {
        const urlId = Buffer.from(resource).toString('base64').replace(/=+$/, '')
        endpoint = `https://www.virustotal.com/api/v3/urls/${urlId}`
      } else {
        endpoint = `https://www.virustotal.com/api/v3/files/${resource}`
      }
      const res = await fetch(endpoint, {
        headers: { 'x-apikey': key, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return null
      const data: any = await res.json()
      const stats = data.data?.attributes?.last_analysis_stats || {}
      return {
        id: data.data?.id || resource,
        type: data.data?.type || type,
        positives: (stats.malicious || 0) + (stats.suspicious || 0),
        total: Object.values(stats).reduce((a: number, b: any) => a + (Number(b) || 0), 0),
        scanDate: data.data?.attributes?.last_analysis_date ? new Date(data.data.attributes.last_analysis_date * 1000).toISOString() : undefined,
        permalink: data.data?.links?.self,
      }
    } catch (err) {
      console.error('[CTI] VirusTotal scan failed:', err)
      return null
    }
  }

  private async fetchCVEs(): Promise<CyberThreat[]> {
    try {
      const nvdHeaders: Record<string, string> = { Accept: 'application/json' }
      const nvdKey = getApiKeyManager().get('nvd')
      if (nvdKey) nvdHeaders['apiKey'] = nvdKey
      const now = new Date()
      const weekAgo = new Date(Date.now() - 7 * 86400000)
      const start = weekAgo.toISOString()
      const end = now.toISOString()
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${start}&pubEndDate=${end}&resultsPerPage=30`
      const res = await fetch(url, { headers: nvdHeaders, signal: AbortSignal.timeout(10000) })
      if (!res.ok) return []
      const data: any = await res.json()
      return (data.vulnerabilities || []).slice(0, 30).map((v: any) => {
        const cve = v.cve || {}
        const metrics = cve.metrics?.cvssMetricV31?.[0]?.cvssData || cve.metrics?.cvssMetricV2?.[0]?.cvssData || {}
        const score = metrics.baseScore || 0
        return {
          id: cve.id || `cve-${Math.random()}`,
          type: 'cve' as const,
          title: `${cve.id}: ${(cve.descriptions?.[0]?.value || '').substring(0, 120)}`,
          severity: score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW',
          source: 'NVD',
          publishedAt: cve.published || new Date().toISOString(),
          description: cve.descriptions?.[0]?.value || '',
          cveId: cve.id,
          cvssScore: score,
          sourceUrl: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        }
      })
    } catch { return [] }
  }

  private async fetchRansomwareTracker(): Promise<CyberThreat[]> {
    try {
      const res = await fetch('https://raw.githubusercontent.com/joshhighet/ransomwatch/main/posts.json', { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return []
      const data: any = await res.json()
      const cutoff = Date.now() - FRESHNESS_WINDOW
      return (Array.isArray(data) ? data : [])
        .filter((p: any) => {
          const discovered = p.discovered ? new Date(p.discovered).getTime() : 0
          return discovered > cutoff
        })
        .sort((a: any, b: any) => new Date(b.discovered || 0).getTime() - new Date(a.discovered || 0).getTime())
        .slice(0, 30)
        .map((p: any) => ({
          id: `ransom-${p.post_title?.substring(0, 20) || Math.random()}`,
          type: 'ransomware' as const,
          title: `Ransomware: ${p.group_name} → ${p.post_title || 'Unknown Target'}`,
          severity: 'HIGH' as const,
          source: 'RansomWatch',
          publishedAt: p.discovered || new Date().toISOString(),
          description: `Group: ${p.group_name}. Target: ${p.post_title}`,
          attackerGroup: p.group_name,
          sourceUrl: p.post_url,
        }))
    } catch { return [] }
  }

  private async fetchCISAKEV(): Promise<CyberThreat[]> {
    try {
      const res = await fetch(
        'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
        { signal: AbortSignal.timeout(10000) },
      )
      if (!res.ok) return []
      const data: any = await res.json()
      const cutoff = Date.now() - FRESHNESS_WINDOW
      const vulns: any[] = (data.vulnerabilities || [])
        .filter((v: any) => new Date(v.dateAdded).getTime() > cutoff)
        .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, 20)
      return vulns.map((vuln: any) => ({
        id: `kev-${vuln.cveID}`,
        type: 'cve' as const,
        title: `🔴 Actively Exploited: ${vuln.cveID} — ${vuln.vendorProject} ${vuln.product}`,
        severity: 'CRITICAL' as const,
        source: 'CISA KEV',
        publishedAt: vuln.dateAdded,
        description: `${vuln.shortDescription}. Required action: ${vuln.requiredAction}. Deadline: ${vuln.dueDate}.`,
        cveId: vuln.cveID,
        sourceUrl: `https://nvd.nist.gov/vuln/detail/${vuln.cveID}`,
        attackerGroup: vuln.knownRansomwareCampaignUse === 'Known' ? 'Ransomware Campaign' : undefined,
      }))
    } catch { return [] }
  }

  private async fetchGitHubAdvisories(): Promise<CyberThreat[]> {
    try {
      const res = await fetch(
        'https://api.github.com/advisories?per_page=20&type=reviewed&severity=critical,high',
        { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000) },
      )
      if (!res.ok) return []
      const data = (await res.json()) as any[]
      const cutoff = Date.now() - FRESHNESS_WINDOW
      return (Array.isArray(data) ? data : [])
        .filter((adv: any) => new Date(adv.published_at || 0).getTime() > cutoff)
        .map((adv: any) => ({
        id: `ghsa-${adv.ghsa_id}`,
        type: 'cve' as const,
        title: `${adv.cve_id || adv.ghsa_id}: ${adv.summary?.substring(0, 120)}`,
        severity: adv.severity === 'critical' ? ('CRITICAL' as const) : ('HIGH' as const),
        source: 'GitHub Advisory',
        publishedAt: adv.published_at,
        description: adv.description?.substring(0, 500) || adv.summary || '',
        cveId: adv.cve_id,
        cvssScore: adv.cvss?.score,
        sourceUrl: adv.html_url,
      }))
    } catch { return [] }
  }
}

// Removed: KNOWN_APT_ACTIVITY — hardcoded fake APT entries that were presented as live intelligence.
// APT data should come from real threat intelligence feeds (MISP, OpenCTI, MITRE ATT&CK, etc.)
