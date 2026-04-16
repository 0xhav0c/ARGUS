import { ipcMain } from 'electron'
import type { CacheManager } from '../services/cache-manager'
import type { AIService } from '../services/ai-service'

type LogFn = (level: string, category: string, message: string, detail?: string) => void

export function registerAIHandlers(
  aiService: AIService,
  cache: CacheManager,
  sendMainLog: LogFn
): void {
  ipcMain.handle('ai-summarize', async (_event, query: string) => {
    if (typeof query !== 'string' || query.length < 2 || query.length > 5000) return { summary: 'Invalid query', model: 'none' }
    sendMainLog('info', 'ai', `AI summarize request (${query.length} chars)`)
    const t0 = Date.now()
    const incidents = cache.getIncidents()
    try {
      const result = await aiService.summarize({ query, incidents })
      sendMainLog('info', 'ai', `AI summarize completed (${result.summary.length} chars, ${Date.now() - t0}ms, model: ${result.model})`)
      return result
    } catch (err: any) {
      sendMainLog('error', 'ai', `AI summarize failed (${Date.now() - t0}ms)`, err?.message)
      const cfg = aiService.getConfig()
      const providerHint = cfg.provider === 'ollama'
        ? `Ollama (${cfg.ollamaUrl}) is not responding. Make sure it is running.`
        : cfg.provider === 'openai'
        ? 'OpenAI API returned an error. Check your API key.'
        : `Custom AI endpoint is not responding.`
      return { summary: `AI Error: ${err.message}\n\n${providerHint}`, model: 'error' }
    }
  })
  ipcMain.handle('ai-check', async () => {
    try {
      const result = await aiService.checkAvailability()
      sendMainLog('info', 'ai', `AI availability check completed`)
      return result
    } catch (err: any) {
      sendMainLog('error', 'ai', 'AI availability check failed', err?.message)
      return { ollama: false, openai: false, custom: false }
    }
  })
  ipcMain.handle('ai-config-get', () => aiService.getConfig())
  const ALLOWED_AI_CONFIG_KEYS = new Set([
    'provider', 'ollamaUrl', 'ollamaModel', 'openaiKey', 'openaiModel',
    'customUrl', 'customModel', 'customKey',
  ])

  ipcMain.handle('ai-config-set', (_event, updates: Record<string, unknown>) => {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return aiService.getConfig()
    const sanitized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(updates)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
      if (!ALLOWED_AI_CONFIG_KEYS.has(k)) continue
      if (typeof v !== 'string' && typeof v !== 'undefined') continue
      sanitized[k] = v
    }
    if (Object.keys(sanitized).length === 0) return aiService.getConfig()
    aiService.updateConfig(sanitized)
    sendMainLog('info', 'ai', `AI config updated: provider=${(sanitized as any).provider || 'unchanged'}`)
    return aiService.getConfig()
  })

  ipcMain.handle('ai-analyze-incident', async (_event, incident: Record<string, unknown>) => {
    if (!incident || typeof incident !== 'object' || typeof incident.title !== 'string') {
      return { summary: 'Invalid incident data', model: 'error' }
    }
    try {
      const result = await aiService.analyzeIncident(incident)
      sendMainLog('debug', 'ai', `[AI-DEBUG] analyzeIncident raw (${result.summary.length} chars)`, JSON.stringify(result.summary).slice(0, 2000))
      return result
    } catch (err: any) {
      console.error('[IPC] ai-analyze-incident failed:', err?.message)
      return { summary: `AI Error: ${err.message}`, model: 'error' }
    }
  })

  ipcMain.handle('ai-daily-briefing', async () => {
    try {
      const incidents = cache.getIncidents()
      const result = await aiService.generateDailyBriefing(incidents)
      sendMainLog('debug', 'ai', `[AI-DEBUG] dailyBriefing raw (${result.summary.length} chars)`, JSON.stringify(result.summary).slice(0, 2000))
      return result
    } catch (err: any) {
      console.error('[IPC] ai-daily-briefing failed:', err?.message)
      return { summary: `AI Error: ${err.message}`, model: 'error' }
    }
  })

  ipcMain.handle('ai-entities', async () => {
    try {
      const incidents = cache.getIncidents()
      const result = await aiService.analyzeEntities(incidents)
      sendMainLog('debug', 'ai', `[AI-DEBUG] entities raw (${result.summary.length} chars)`, JSON.stringify(result.summary).slice(0, 2000))
      return result
    } catch (err: any) {
      console.error('[IPC] ai-entities failed:', err?.message)
      return { summary: `AI Error: ${err.message}`, model: 'error' }
    }
  })
}
