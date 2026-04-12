import type { CyberThreat } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'

let cache: CyberThreat[] = []
let lastFetch = 0
const TTL = 300000

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
    const [cves, ransom] = await Promise.all([this.fetchCVEs(), this.fetchRansomwareTracker()])
    cache = [...cves, ...ransom, ...KNOWN_APT_ACTIVITY].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
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
      const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=30', { headers: nvdHeaders, signal: AbortSignal.timeout(10000) })
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
      return (Array.isArray(data) ? data : []).slice(0, 20).map((p: any) => ({
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
}

const KNOWN_APT_ACTIVITY: CyberThreat[] = [
  { id: 'apt-1', type: 'apt', title: 'APT28 (Fancy Bear) - Active phishing campaigns targeting NATO allies', severity: 'CRITICAL', source: 'OSINT', publishedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Russian GRU-linked APT28 conducting credential harvesting against defense sector.', attackerGroup: 'APT28', targetCountry: 'EU/NATO', targetSector: 'Defense' },
  { id: 'apt-2', type: 'apt', title: 'Lazarus Group - Cryptocurrency exchange targeting', severity: 'HIGH', source: 'OSINT', publishedAt: new Date(Date.now() - 172800000).toISOString(), description: 'DPRK-linked Lazarus group targeting DeFi platforms and crypto exchanges.', attackerGroup: 'Lazarus', targetSector: 'Finance' },
  { id: 'apt-3', type: 'apt', title: 'Volt Typhoon - Critical infrastructure pre-positioning', severity: 'CRITICAL', source: 'CISA', publishedAt: new Date(Date.now() - 259200000).toISOString(), description: 'PRC state-sponsored actor maintaining access to US critical infrastructure networks.', attackerGroup: 'Volt Typhoon', targetCountry: 'US', targetSector: 'Infrastructure' },
  { id: 'apt-4', type: 'apt', title: 'Sandworm - Energy sector ICS/SCADA targeting', severity: 'CRITICAL', source: 'OSINT', publishedAt: new Date(Date.now() - 345600000).toISOString(), description: 'Russian GRU Unit 74455 targeting energy infrastructure in Ukraine and Europe.', attackerGroup: 'Sandworm', targetCountry: 'Ukraine/EU', targetSector: 'Energy' },
]
