import { CacheManager } from './cache-manager'

export interface ApiKeyDefinition {
  id: string
  label: string
  category: 'intelligence' | 'finance' | 'tracking' | 'ai'
  description: string
  docsUrl: string
  placeholder?: string
  isPassword?: boolean
}

export interface ApiKeyStatus {
  id: string
  label: string
  category: string
  description: string
  docsUrl: string
  configured: boolean
  maskedValue: string
  placeholder?: string
  isPassword?: boolean
}

export interface ApiTestResult {
  success: boolean
  message: string
  latencyMs?: number
}

const API_KEY_DEFINITIONS: ApiKeyDefinition[] = [
  { id: 'nasa', label: 'NASA API Key', category: 'intelligence', description: 'Solar flares, NEO asteroids, fireballs (replaces DEMO_KEY)', docsUrl: 'https://api.nasa.gov/', placeholder: 'DEMO_KEY' },
  { id: 'nvd', label: 'NVD / NIST API Key', category: 'intelligence', description: 'CVE vulnerability data with higher rate limits', docsUrl: 'https://nvd.nist.gov/developers/request-an-api-key' },
  { id: 'virustotal', label: 'VirusTotal API Key', category: 'intelligence', description: 'Malware hash & URL analysis', docsUrl: 'https://www.virustotal.com/gui/join-us' },
  { id: 'shodan', label: 'Shodan API Key', category: 'intelligence', description: 'IoT device & open port scanning', docsUrl: 'https://account.shodan.io/' },
  { id: 'abuseipdb', label: 'AbuseIPDB API Key', category: 'intelligence', description: 'IP address reputation & abuse reports', docsUrl: 'https://www.abuseipdb.com/account/plans' },
  { id: 'metalpriceapi', label: 'MetalpriceAPI Key', category: 'finance', description: 'Live gold, silver, platinum, palladium prices', docsUrl: 'https://metalpriceapi.com/', placeholder: 'demo' },
  { id: 'coingecko', label: 'CoinGecko Pro API Key', category: 'finance', description: 'Crypto market data without rate limits', docsUrl: 'https://www.coingecko.com/en/api/pricing' },
  { id: 'opensky_user', label: 'OpenSky Username', category: 'tracking', description: 'Flight tracking with higher rate limits', docsUrl: 'https://opensky-network.org/index.php/login' },
  { id: 'opensky_pass', label: 'OpenSky Password', category: 'tracking', description: 'Flight tracking authentication', docsUrl: 'https://opensky-network.org/index.php/login', isPassword: true },
  { id: 'custom_ai_url', label: 'Custom AI URL', category: 'ai', description: 'OpenAI-compatible endpoint (e.g. OpenRouter, LiteLLM, vLLM)', docsUrl: 'https://platform.openai.com/docs/api-reference', placeholder: 'https://your-api.com/v1' },
  { id: 'custom_ai_key', label: 'Custom AI Key', category: 'ai', description: 'API key for custom AI endpoint', docsUrl: 'https://platform.openai.com/docs/api-reference', isPassword: true },
  { id: 'openai', label: 'OpenAI API Key', category: 'ai', description: 'GPT-based threat analysis & summarization', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'ollama_url', label: 'Ollama URL', category: 'ai', description: 'Local LLM endpoint', docsUrl: 'https://ollama.com/', placeholder: 'http://localhost:11434' },
]

const DB_PREFIX = 'api_key_'

export class ApiKeyManager {
  private cache: CacheManager

  constructor() {
    this.cache = new CacheManager()
  }

  get(keyId: string): string | undefined {
    return this.cache.getSetting(`${DB_PREFIX}${keyId}`)
  }

  set(keyId: string, value: string): void {
    this.cache.setSetting(`${DB_PREFIX}${keyId}`, value)
  }

  delete(keyId: string): void {
    this.cache.setSetting(`${DB_PREFIX}${keyId}`, '')
  }

  private mask(value: string): string {
    if (!value || value.length === 0) return ''
    if (value.length <= 6) return '••••••'
    return '••••' + value.slice(-4)
  }

  getAll(): ApiKeyStatus[] {
    return API_KEY_DEFINITIONS.map(def => {
      const raw = this.get(def.id) || ''
      return {
        id: def.id,
        label: def.label,
        category: def.category,
        description: def.description,
        docsUrl: def.docsUrl,
        configured: raw.length > 0,
        maskedValue: this.mask(raw),
        placeholder: def.placeholder,
        isPassword: def.isPassword,
      }
    })
  }

  async test(keyId: string): Promise<ApiTestResult> {
    const value = this.get(keyId)
    const start = Date.now()

    try {
      switch (keyId) {
        case 'nasa': {
          const key = value || 'DEMO_KEY'
          const today = new Date().toISOString().split('T')[0]
          const res = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${key}`, { signal: AbortSignal.timeout(8000) })
          return res.ok
            ? { success: true, message: `Connected (${res.status})`, latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'nvd': {
          const headers: Record<string, string> = { Accept: 'application/json' }
          if (value) headers['apiKey'] = value
          const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1', { headers, signal: AbortSignal.timeout(10000) })
          return res.ok
            ? { success: true, message: `Connected (${res.status})`, latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'virustotal': {
          if (!value) return { success: false, message: 'No API key configured' }
          const res = await fetch('https://www.virustotal.com/api/v3/urls', { method: 'GET', headers: { 'x-apikey': value }, signal: AbortSignal.timeout(8000) })
          return res.status === 200 || res.status === 400
            ? { success: true, message: 'API key valid', latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status} — check key`, latencyMs: Date.now() - start }
        }

        case 'shodan': {
          if (!value) return { success: false, message: 'No API key configured' }
          const res = await fetch(`https://api.shodan.io/api-info?key=${value}`, { signal: AbortSignal.timeout(8000) })
          if (res.ok) {
            const data: any = await res.json()
            return { success: true, message: `Plan: ${data.plan || 'unknown'} — Credits: ${data.query_credits ?? '?'}`, latencyMs: Date.now() - start }
          }
          return { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'abuseipdb': {
          if (!value) return { success: false, message: 'No API key configured' }
          const res = await fetch('https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8&maxAgeInDays=90', { headers: { Key: value, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
          return res.ok
            ? { success: true, message: 'API key valid', latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'metalpriceapi': {
          const key = value || 'demo'
          const res = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${key}&base=USD&currencies=XAU`, { signal: AbortSignal.timeout(8000) })
          return res.ok
            ? { success: true, message: `Connected (${res.status})`, latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'coingecko': {
          const headers: Record<string, string> = { Accept: 'application/json' }
          if (value) headers['x-cg-pro-api-key'] = value
          const url = value ? 'https://pro-api.coingecko.com/api/v3/ping' : 'https://api.coingecko.com/api/v3/ping'
          const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
          return res.ok
            ? { success: true, message: value ? 'Pro API connected' : 'Free API connected', latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'opensky_user': {
          const user = value || ''
          const pass = this.get('opensky_pass') || ''
          if (!user) return { success: false, message: 'No username configured' }
          const headers: Record<string, string> = { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') }
          const res = await fetch('https://opensky-network.org/api/states/all?lamin=47&lomin=5&lamax=55&lomax=15', { headers, signal: AbortSignal.timeout(10000) })
          return res.ok
            ? { success: true, message: 'Authenticated', latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'opensky_pass':
          return this.test('opensky_user')

        case 'custom_ai_url': {
          const url = (value || '').replace(/\/+$/, '')
          if (!url) return { success: false, message: 'No URL configured' }
          const key = this.get('custom_ai_key') || ''
          const headers: Record<string, string> = {}
          if (key) headers['Authorization'] = `Bearer ${key}`
          // Try base URL first
          const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
          if (res.ok) {
            const body = await res.text()
            return { success: true, message: `Connected — ${body.slice(0, 50)}`, latencyMs: Date.now() - start }
          }
          return { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        case 'custom_ai_key': {
          const url = (this.get('custom_ai_url') || '').replace(/\/+$/, '')
          if (!url) return { success: false, message: 'Set Custom AI URL first' }
          if (!value) return { success: false, message: 'No API key configured' }
          const headers2: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${value}` }
          const ep = url.endsWith('/chat/completions') ? url : `${url}/chat/completions`
          const res2 = await fetch(ep, {
            method: 'POST', headers: headers2,
            body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
            signal: AbortSignal.timeout(10000),
          })
          return (res2.ok || res2.status === 400)
            ? { success: true, message: `Authenticated (${res2.status})`, latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res2.status} — check key`, latencyMs: Date.now() - start }
        }

        case 'openai': {
          if (!value) return { success: false, message: 'No API key configured' }
          const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${value}` }, signal: AbortSignal.timeout(8000) })
          return res.ok
            ? { success: true, message: 'API key valid', latencyMs: Date.now() - start }
            : { success: false, message: `HTTP ${res.status} — invalid key`, latencyMs: Date.now() - start }
        }

        case 'ollama_url': {
          const url = value || 'http://localhost:11434'
          const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) })
          if (res.ok) {
            const data: any = await res.json()
            const models = (data.models || []).length
            return { success: true, message: `Connected — ${models} model(s) available`, latencyMs: Date.now() - start }
          }
          return { success: false, message: `HTTP ${res.status}`, latencyMs: Date.now() - start }
        }

        default:
          return { success: false, message: `Unknown API: ${keyId}` }
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed', latencyMs: Date.now() - start }
    }
  }
}

let instance: ApiKeyManager | null = null
export function getApiKeyManager(): ApiKeyManager {
  if (!instance) instance = new ApiKeyManager()
  return instance
}
