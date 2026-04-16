import type { Incident } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'
import { isSafeUrl } from '../utils/url-safety'

export interface AISummaryRequest {
  query: string
  incidents: Incident[]
  maxTokens?: number
}

export interface AISummaryResponse {
  summary: string
  model: string
  tokensUsed?: number
}

interface AIConfig {
  provider: 'ollama' | 'openai' | 'custom'
  ollamaUrl: string
  ollamaModel: string
  openaiKey: string
  openaiModel: string
  customUrl: string
  customModel: string
  customKey: string
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'custom',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  customUrl: '',
  customModel: '',
  customKey: '',
}

let config: AIConfig = { ...DEFAULT_CONFIG }

const SYSTEM_PROMPTS = {
  analyst: `You are Argus, a military-grade OSINT analysis AI. Be concise, use bullet points, prioritize by severity.`,
  briefing: `You are Argus, generating a daily intelligence briefing. Be structured, concise, prioritize by severity.`,
}

function buildPrompt(query: string, incidents: Incident[]): string {
  const relevantIncidents = incidents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .map(i => `[${i.domain}/${i.severity}] ${i.country || '?'}: ${i.title}`)
    .join('\n')

  return `CURRENT INTELLIGENCE DATA:
${relevantIncidents}

USER QUERY: ${query}

Provide a focused intelligence briefing. Use bullet points. Highlight:
- Key threats and severity
- Regional patterns and correlations
- Recommended watch areas
- Potential escalation risks

Respond in the same language as the user query.`
}

async function queryOllama(prompt: string, systemPrompt?: string): Promise<AISummaryResponse> {
  if (!isSafeUrl(`${config.ollamaUrl}/api/generate`, { allowLocalhost: true })) throw new Error('Ollama URL blocked by SSRF protection')
  const res = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      system: systemPrompt || undefined,
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 1024 },
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data: any = await res.json()
  return {
    summary: data.response || 'No response generated.',
    model: `ollama/${config.ollamaModel}`,
    tokensUsed: data.eval_count,
  }
}

async function queryOpenAI(prompt: string, systemPrompt?: string): Promise<AISummaryResponse> {
  if (!config.openaiKey) throw new Error('OpenAI API key not configured')
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })
  const modelName = (config.openaiModel || '').toLowerCase()
  const isReasoning = /gpt-5|o1|o3|o4/.test(modelName)
  const bodyObj: Record<string, unknown> = { model: config.openaiModel, messages }
  if (isReasoning) {
    bodyObj.max_completion_tokens = 16384
  } else {
    bodyObj.temperature = 0.3
    bodyObj.max_tokens = 4096
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiKey}`,
    },
    body: JSON.stringify(bodyObj),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data: any = await res.json()
  return {
    summary: data.choices?.[0]?.message?.content || 'No response generated.',
    model: `openai/${config.openaiModel}`,
    tokensUsed: data.usage?.total_tokens,
  }
}

async function queryCustom(prompt: string, systemPrompt?: string): Promise<AISummaryResponse> {
  if (!config.customUrl) throw new Error('Custom AI URL not configured')
  const baseUrl = config.customUrl.replace(/\/+$/, '')
  const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`
  if (!isSafeUrl(url, { allowLocalhost: false })) throw new Error('Custom AI URL blocked by SSRF protection')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.customKey) headers['Authorization'] = `Bearer ${config.customKey}`
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  // Detect if model is a reasoning model (o-series, gpt-5.x) that needs more tokens
  const modelName = (config.customModel || '').toLowerCase()
  const isReasoningModel = /gpt-5|o1|o3|o4/.test(modelName)
  const body: Record<string, unknown> = { messages, temperature: isReasoningModel ? 1 : 0.3 }
  // Reasoning models: use max_completion_tokens (they need room for thinking + output)
  // Standard models: use max_tokens
  if (isReasoningModel) {
    body.max_completion_tokens = 16384
  } else {
    body.max_tokens = 4096
  }
  if (config.customModel) body.model = config.customModel

  console.log(`[AI] Custom request -> ${url} (model: ${config.customModel || 'auto'}, reasoning: ${isReasoningModel})`)
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) {
    let errBody = ''
    try { errBody = await res.text() } catch {}
    console.error(`[AI] Custom error ${res.status}: ${errBody.slice(0, 300)}`)
    throw new Error(`Custom AI error ${res.status}: ${errBody.slice(0, 200) || 'No details'}`)
  }
  const data: any = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  const finishReason = data.choices?.[0]?.finish_reason || 'unknown'
  console.log(`[AI] finish_reason: ${finishReason}, content length: ${content.length}`)
  if (!content && finishReason === 'length') {
    console.warn(`[AI] WARNING: content empty but finish_reason=length — model ran out of tokens for output!`)
  }
  const raw = content || data.response || data.text || 'No response generated.'
  return {
    summary: raw,
    model: data.model || `custom/${config.customModel || 'default'}`,
    tokensUsed: data.usage?.total_tokens,
  }
}

export class AIService {
  constructor() {
    this.loadFromKeyManager()
  }

  private loadFromKeyManager() {
    const mgr = getApiKeyManager()
    const openaiKey = mgr.get('openai')
    const ollamaUrl = mgr.get('ollama_url')
    const customUrl = mgr.get('custom_ai_url')
    const customModel = mgr.get('custom_ai_model')
    const customKey = mgr.get('custom_ai_key')
    const provider = mgr.get('ai_provider')
    const ollamaModel = mgr.get('ollama_model')
    const openaiModel = mgr.get('openai_model')
    if (openaiKey) config.openaiKey = openaiKey
    if (ollamaUrl) config.ollamaUrl = ollamaUrl
    if (ollamaModel) config.ollamaModel = ollamaModel
    if (openaiModel) config.openaiModel = openaiModel
    if (customUrl) config.customUrl = customUrl
    if (customModel) config.customModel = customModel
    if (customKey) config.customKey = customKey
    if (provider === 'ollama' || provider === 'openai' || provider === 'custom') config.provider = provider
    console.log(`[AI] Loaded config: provider=${config.provider}, customUrl=${config.customUrl || 'none'}`)
  }

  updateConfig(updates: Partial<AIConfig>) {
    const allowed = ['provider', 'ollamaUrl', 'ollamaModel', 'openaiModel', 'customUrl', 'customModel', 'customKey'] as const
    const safe: Record<string, unknown> = {}
    for (const k of allowed) { if (k in updates) safe[k] = updates[k] }
    config = { ...config, ...safe }
    const mgr = getApiKeyManager()
    if (updates.openaiKey !== undefined) mgr.set('openai', updates.openaiKey)
    if (updates.ollamaUrl !== undefined) mgr.set('ollama_url', updates.ollamaUrl)
    if (updates.customUrl !== undefined) mgr.set('custom_ai_url', updates.customUrl)
    if (updates.customModel !== undefined) mgr.set('custom_ai_model', updates.customModel)
    if (updates.customKey !== undefined) mgr.set('custom_ai_key', updates.customKey)
    if (updates.provider !== undefined) mgr.set('ai_provider', updates.provider)
    if (updates.ollamaModel !== undefined) mgr.set('ollama_model', updates.ollamaModel)
    if (updates.openaiModel !== undefined) mgr.set('openai_model', updates.openaiModel)
  }

  getConfig(): AIConfig {
    return {
      ...config,
      openaiKey: config.openaiKey ? '***' : '',
      customKey: config.customKey ? '***' : '',
    }
  }

  async checkAvailability(): Promise<{ ollama: boolean; openai: boolean; custom: boolean }> {
    const checks = await Promise.allSettled([
      // Ollama
      (async () => {
        const res = await fetch(`${config.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
        return res.ok
      })(),
      // Custom — try GET on base URL first, then models endpoint
      (async () => {
        if (!config.customUrl) return false
        const baseUrl = config.customUrl.replace(/\/+$/, '')
        const headers: Record<string, string> = {}
        if (config.customKey) headers['Authorization'] = `Bearer ${config.customKey}`
        // Try base URL (some APIs return status JSON at root)
        try {
          const res = await fetch(baseUrl, { headers, signal: AbortSignal.timeout(5000) })
          if (res.ok) return true
        } catch {}
        // Try /models endpoint
        try {
          const res = await fetch(`${baseUrl}/models`, { headers, signal: AbortSignal.timeout(5000) })
          if (res.ok || res.status === 401) return res.ok // 401 = endpoint exists but auth needed
        } catch {}
        return false
      })(),
    ])
    return {
      ollama: checks[0].status === 'fulfilled' && checks[0].value === true,
      openai: !!config.openaiKey,
      custom: checks[1].status === 'fulfilled' && checks[1].value === true,
    }
  }

  private async callAI(prompt: string, systemPrompt?: string): Promise<AISummaryResponse> {
    const tryProvider = async (name: string, fn: () => Promise<AISummaryResponse>): Promise<AISummaryResponse> => {
      const start = Date.now()
      try {
        console.log(`[AI] Calling ${name}...`)
        const res = await fn()
        console.log(`[AI] ${name} responded in ${Date.now() - start}ms (${res.tokensUsed || '?'} tokens)`)
        return res
      } catch (err: any) {
        console.error(`[AI] ${name} failed after ${Date.now() - start}ms:`, err?.message || err)
        throw err
      }
    }

    if (config.provider === 'custom' && config.customUrl) {
      return tryProvider('custom', () => queryCustom(prompt, systemPrompt))
    }
    if (config.provider === 'openai' && config.openaiKey) {
      return tryProvider('openai', () => queryOpenAI(prompt, systemPrompt))
    }
    if (config.provider === 'ollama') {
      return tryProvider('ollama', () => queryOllama(prompt, systemPrompt))
    }

    // Fallback chain: custom -> openai -> ollama
    const errors: string[] = []
    if (config.customUrl) {
      try { return await tryProvider('custom', () => queryCustom(prompt, systemPrompt)) }
      catch (e: any) { errors.push(`custom: ${e.message}`) }
    }
    if (config.openaiKey) {
      try { return await tryProvider('openai', () => queryOpenAI(prompt, systemPrompt)) }
      catch (e: any) { errors.push(`openai: ${e.message}`) }
    }
    try { return await tryProvider('ollama', () => queryOllama(prompt, systemPrompt)) }
    catch (e: any) { errors.push(`ollama: ${e.message}`) }

    throw new Error(`All AI providers failed: ${errors.join(' | ')}`)
  }

  async summarize(request: AISummaryRequest): Promise<AISummaryResponse> {
    console.log(`[AI] Summarize — provider: ${config.provider}, query: "${request.query.slice(0, 60)}"`)
    const prompt = buildPrompt(request.query, request.incidents)
    return this.callAI(prompt, SYSTEM_PROMPTS.analyst)
  }

  async analyzeIncident(incident: { title: string; description?: string; domain: string; severity: string; country?: string; source?: string; timestamp: string }): Promise<AISummaryResponse> {
    console.log(`[AI] AnalyzeIncident — "${incident.title.slice(0, 60)}"`)
    const prompt = `Analyze: [${incident.domain}/${incident.severity}] ${incident.country || '?'} — ${incident.title}
${incident.description ? `Details: ${incident.description.slice(0, 300)}` : ''}
Source: ${incident.source || '?'} | Time: ${incident.timestamp}

Provide: 1) Threat Assessment 2) Context 3) Impact 4) Related Risks 5) Recommendations
Be concise. Respond in the same language as the title.`
    return this.callAI(prompt, SYSTEM_PROMPTS.analyst)
  }

  async generateDailyBriefing(incidents: Incident[]): Promise<AISummaryResponse> {
    const now = Date.now()
    const last24h = incidents
      .filter(i => now - new Date(i.timestamp).getTime() < 24 * 3600000)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (last24h.length === 0) {
      return { summary: 'No incidents reported in the last 24 hours.', model: 'none' }
    }

    // Aggregate stats from ALL 24h data, but only send top incidents as text
    const byDomain: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const byCountry: Record<string, number> = {}
    for (const i of last24h) {
      byDomain[i.domain] = (byDomain[i.domain] || 0) + 1
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
      if (i.country) byCountry[i.country] = (byCountry[i.country] || 0) + 1
    }

    // Only send 25 most important (CRITICAL/HIGH first, then recent)
    const topIncidents = last24h
      .sort((a, b) => {
        const sevOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
        const diff = (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4)
        return diff !== 0 ? diff : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
      .slice(0, 25)
      .map(i => `[${i.domain}/${i.severity}] ${i.country || '?'}: ${i.title}`)
      .join('\n')

    console.log(`[AI] DailyBriefing — ${last24h.length} total, sending 25 top incidents`)

    const prompt = `Daily intelligence briefing (last 24h).

STATS: ${last24h.length} incidents | ${Object.entries(byDomain).map(([k, v]) => `${k}:${v}`).join(' ')} | Sev: ${Object.entries(bySeverity).map(([k, v]) => `${k}:${v}`).join(' ')}
Top countries: ${Object.entries(byCountry).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(', ')}

KEY INCIDENTS:
${topIncidents}

Provide: 1) Executive Summary 2) Critical Alerts 3) Regional Overview 4) Domain Trends 5) Watch List
Be concise. Respond in the same language as incident titles.`
    return this.callAI(prompt, SYSTEM_PROMPTS.briefing)
  }

  async analyzeEntities(incidents: Incident[]): Promise<AISummaryResponse> {
    const recent = incidents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)

    console.log(`[AI] EntityAnalysis — sending ${recent.length} incidents`)
    const titles = recent.map(i => `[${i.domain}] ${i.country || '?'}: ${i.title}`).join('\n')

    const prompt = `Extract key entities from these reports:

${titles}

Categorize: PERSONS, ORGANIZATIONS, LOCATIONS, WEAPONS/SYSTEMS, OPERATIONS.
For each: Name, Category, Relevance. Be concise.`
    return this.callAI(prompt, SYSTEM_PROMPTS.analyst)
  }
}
