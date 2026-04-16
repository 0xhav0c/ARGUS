import { ipcMain } from 'electron'
import type { CacheManager } from '../services/cache-manager'
import type { SanctionsService } from '../services/sanctions-service'
import type { FinanceDataService } from '../services/finance-data-service'
import type { SigintService } from '../services/sigint-service'
import type { ConflictZonesService } from '../services/conflict-zones-service'
import type { EntityExtractionService } from '../services/entity-extraction-service'
import type { CyberThreatService } from '../services/cyber-threat-service'
import type { PandemicService } from '../services/pandemic-service'
import type { NuclearService } from '../services/nuclear-service'
import type { MilitaryService } from '../services/military-service'
import type { BriefingService } from '../services/briefing-service'
import type { WeatherService } from '../services/weather-service'
import type { InternetInfraService } from '../services/internet-infra-service'
import type { GeopoliticalDataService } from '../services/geopolitical-data-service'
import type { AnomalyEngine } from '../services/anomaly-engine'
import type { SpaceWeatherService } from '../services/space-weather-service'
import type { DroneService } from '../services/drone-service'
import type { DarkWebService } from '../services/darkweb-service'
import type { TelegramService } from '../services/telegram-service'
import type { IoCService } from '../services/ioc-service'
import type { OfflineCacheService } from '../services/offline-cache-service'

type LogFn = (level: string, category: string, message: string, detail?: string) => void

interface DataServices {
  sanctionsService: SanctionsService
  financeDataService: FinanceDataService
  sigintService: SigintService
  conflictZonesService: ConflictZonesService
  entityExtractionService: EntityExtractionService
  cyberThreatService: CyberThreatService
  pandemicService: PandemicService
  nuclearService: NuclearService
  militaryService: MilitaryService
  briefingService: BriefingService
  weatherService: WeatherService
  internetInfraService: InternetInfraService
  geopoliticalDataService: GeopoliticalDataService
  anomalyEngine: AnomalyEngine
  spaceWeatherService: SpaceWeatherService
  droneService: DroneService
  darkWebService: DarkWebService
  telegramService: TelegramService
  iocService: IoCService
  offlineCacheService: OfflineCacheService
}

export function registerDataServiceHandlers(
  services: DataServices,
  cache: CacheManager,
  sendMainLog: LogFn
): void {
  const {
    sanctionsService, financeDataService, sigintService, conflictZonesService,
    entityExtractionService, cyberThreatService, pandemicService, nuclearService,
    militaryService, briefingService, weatherService, internetInfraService,
    geopoliticalDataService, anomalyEngine, spaceWeatherService, droneService,
    darkWebService, telegramService, iocService, offlineCacheService
  } = services

  ipcMain.handle('search-incidents', (_event, query: string) => {
    if (typeof query !== 'string' || query.length > 500) return []
    return cache.searchIncidents(query)
  })

  ipcMain.handle('query-incidents', (_event, query: string) => {
    if (typeof query !== 'string' || query.length > 500) return []
    const all = cache.getIncidents()
    const lower = query.toLowerCase()
    return all.filter(i => (i.title ?? '').toLowerCase().includes(lower) || (i.description ?? '').toLowerCase().includes(lower) || (i.country ?? '').toLowerCase().includes(lower)).slice(0, 50)
  })

  ipcMain.handle('clear-old-incidents', (_event, days: number) => {
    if (typeof days !== 'number' || days < 1) {
      console.warn('[IPC] clear-old-incidents called with invalid days:', days)
      return { deleted: 0, remaining: [] }
    }
    const deleted = cache.cleanOldIncidents(days)
    const remaining = cache.getIncidents()
    return { deleted, remaining }
  })

  ipcMain.handle('get-sanctions', async () => {
    const t0 = Date.now()
    try { const r = await sanctionsService.getSanctionsList(); sendMainLog('info', 'api', `Sanctions fetched: ${Array.isArray(r) ? r.length : 0} entities (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-sanctions failed', err?.message); return [] }
  })
  ipcMain.handle('check-sanctions', async (_event, text: string) => {
    if (typeof text !== 'string' || text.length > 5000) return []
    try { const r = await sanctionsService.checkText(text); sendMainLog('debug', 'api', `Sanctions check completed (${text.length} chars)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'check-sanctions failed', err?.message); return [] }
  })
  ipcMain.handle('get-finance-data', async () => {
    const t0 = Date.now()
    try { const r = await financeDataService.getAll(); sendMainLog('info', 'finance', `Finance data fetched (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'finance', 'get-finance-data failed', err?.message); return null }
  })
  ipcMain.handle('get-rf-events', async () => {
    const t0 = Date.now()
    try { const r = await sigintService.getRFEvents(); sendMainLog('info', 'api', `RF/SIGINT events fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-rf-events failed', err?.message); return [] }
  })
  ipcMain.handle('get-conflict-zones', async () => {
    const t0 = Date.now()
    try { const r = await conflictZonesService.getConflictZones(); sendMainLog('info', 'api', `Conflict zones fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-conflict-zones failed', err?.message); return [] }
  })
  ipcMain.handle('get-trade-routes', async () => {
    try { const r = await conflictZonesService.getTradeRoutes(); sendMainLog('debug', 'api', `Trade routes fetched: ${Array.isArray(r) ? r.length : 0}`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-trade-routes failed', err?.message); return [] }
  })
  ipcMain.handle('get-entities', () => {
    try {
      return entityExtractionService.extractFromIncidents(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-entities:', err); sendMainLog('error', 'ipc', 'get-entities failed', String(err)); return [] }
  })
  ipcMain.handle('get-sentiment', () => {
    try {
      return entityExtractionService.analyzeSentiment(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-sentiment:', err); sendMainLog('error', 'ipc', 'get-sentiment failed', String(err)); return [] }
  })

  ipcMain.handle('get-cyber-threats', async () => {
    const t0 = Date.now()
    try { const r = await cyberThreatService.getThreats(); sendMainLog('info', 'api', `Cyber threats fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-cyber-threats failed', err?.message); return [] }
  })
  ipcMain.handle('shodan-search', async (_event, query: string) => {
    if (typeof query !== 'string' || query.length < 1 || query.length > 500) return []
    sendMainLog('info', 'api', `Shodan search: "${query.slice(0, 60)}"`)
    try { const r = await cyberThreatService.searchShodan(query); sendMainLog('info', 'api', `Shodan results: ${Array.isArray(r) ? r.length : 0}`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'shodan-search failed', err?.message); return [] }
  })
  ipcMain.handle('abuseipdb-check', async (_event, ip: string) => {
    if (typeof ip !== 'string' || !/^[\d.a-fA-F:]+$/.test(ip) || ip.length > 45) return null
    sendMainLog('info', 'api', `AbuseIPDB check: ${ip}`)
    try { const r = await cyberThreatService.checkAbuseIPDB(ip); sendMainLog('info', 'api', `AbuseIPDB result for ${ip}: score=${r?.abuseConfidenceScore ?? 'N/A'}`); return r }
    catch (err: any) { sendMainLog('error', 'api', `abuseipdb-check failed for ${ip}`, err?.message); return null }
  })
  ipcMain.handle('virustotal-scan', async (_event, resource: string, type: 'url' | 'hash') => {
    if (typeof resource !== 'string' || resource.length > 2048) return null
    if (type !== 'url' && type !== 'hash') return null
    sendMainLog('info', 'api', `VirusTotal scan: ${type} = ${resource.slice(0, 60)}`)
    try { const r = await cyberThreatService.scanVirusTotal(resource, type); sendMainLog('info', 'api', 'VirusTotal scan completed'); return r }
    catch (err: any) { sendMainLog('error', 'api', 'virustotal-scan failed', err?.message); return null }
  })
  ipcMain.handle('get-pandemic-events', async () => {
    const t0 = Date.now()
    try { const r = await pandemicService.getEvents(); sendMainLog('info', 'api', `Pandemic events fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-pandemic-events failed', err?.message); return [] }
  })
  ipcMain.handle('get-nuclear-events', async () => {
    const t0 = Date.now()
    try { const r = await nuclearService.getEvents(); sendMainLog('info', 'api', `Nuclear events fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-nuclear-events failed', err?.message); return [] }
  })
  ipcMain.handle('get-military-activities', async () => {
    const t0 = Date.now()
    try { const r = await militaryService.getActivities(); sendMainLog('info', 'api', `Military activities fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-military-activities failed', err?.message); return [] }
  })
  ipcMain.handle('get-daily-briefing', () => {
    try {
      return briefingService.generateBriefing(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-daily-briefing:', err); sendMainLog('error', 'ipc', 'get-daily-briefing failed', String(err)); return null }
  })
  ipcMain.handle('get-weather-alerts', async () => {
    const t0 = Date.now()
    try { const r = await weatherService.getAlerts(); sendMainLog('info', 'api', `Weather alerts fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-weather-alerts failed', err?.message); return [] }
  })
  ipcMain.handle('get-internet-outages', async () => {
    const t0 = Date.now()
    try { const r = await internetInfraService.getOutages(); sendMainLog('info', 'network', `Internet outages fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'network', 'get-internet-outages failed', err?.message); return [] }
  })
  ipcMain.handle('get-submarine-cables', async () => {
    try { const r = await internetInfraService.getCables(); sendMainLog('debug', 'network', `Submarine cables fetched: ${Array.isArray(r) ? r.length : 0}`); return r }
    catch (err: any) { sendMainLog('error', 'network', 'get-submarine-cables failed', err?.message); return [] }
  })
  ipcMain.handle('get-migration-routes', async () => {
    try { const r = await geopoliticalDataService.getMigrationRoutes(); sendMainLog('debug', 'api', `Migration routes fetched: ${Array.isArray(r) ? r.length : 0}`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-migration-routes failed', err?.message); return [] }
  })
  ipcMain.handle('get-energy-facilities', async () => {
    try { const r = await geopoliticalDataService.getEnergyFacilities(); sendMainLog('debug', 'api', `Energy facilities fetched: ${Array.isArray(r) ? r.length : 0}`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-energy-facilities failed', err?.message); return [] }
  })
  ipcMain.handle('get-anomalies', () => {
    try {
      return anomalyEngine.detectAnomalies(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-anomalies:', err); sendMainLog('error', 'ipc', 'get-anomalies failed', String(err)); return [] }
  })
  ipcMain.handle('get-predictive-risk', () => {
    try {
      return anomalyEngine.predictRisk(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-predictive-risk:', err); sendMainLog('error', 'ipc', 'get-predictive-risk failed', String(err)); return [] }
  })

  ipcMain.handle('get-space-weather', async () => {
    const t0 = Date.now()
    try { const r = await spaceWeatherService.getEvents(); sendMainLog('info', 'api', `Space weather events: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-space-weather failed', err?.message); return [] }
  })
  ipcMain.handle('get-drone-activities', async () => {
    const t0 = Date.now()
    try { const r = await droneService.getActivities(); sendMainLog('info', 'api', `Drone activities: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-drone-activities failed', err?.message); return [] }
  })
  ipcMain.handle('get-darkweb-alerts', async () => {
    const t0 = Date.now()
    try { const r = await darkWebService.getAlerts(); sendMainLog('info', 'api', `Dark web alerts: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-darkweb-alerts failed', err?.message); return [] }
  })
  ipcMain.handle('get-telegram-messages', async () => {
    const t0 = Date.now()
    try { const r = await telegramService.getMessages(); sendMainLog('info', 'api', `Telegram messages: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-telegram-messages failed', err?.message); return [] }
  })
  ipcMain.handle('add-telegram-channel', async (_event, name: string, title: string) => {
    if (typeof name !== 'string' || typeof title !== 'string') return { error: 'Invalid input' }
    if (!/^[a-zA-Z0-9_]{3,64}$/.test(name)) return { error: 'Invalid channel name format' }
    if (title.length > 200) return { error: 'Title too long' }
    sendMainLog('info', 'api', `Adding Telegram channel: ${name} (${title})`)
    return telegramService.addCustomChannel(name, title)
  })
  ipcMain.handle('remove-telegram-channel', async (_event, name: string) => {
    if (typeof name !== 'string' || !/^[a-zA-Z0-9_]{3,64}$/.test(name)) return { error: 'Invalid channel name format' }
    sendMainLog('info', 'api', `Removing Telegram channel: ${name}`)
    return telegramService.removeCustomChannel(name)
  })
  ipcMain.handle('get-iocs', async () => {
    const t0 = Date.now()
    try { const r = await iocService.getIndicators(); sendMainLog('info', 'api', `IoCs fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-iocs failed', err?.message); return [] }
  })
  ipcMain.handle('extract-iocs', async (_event, text: string) => {
    if (typeof text !== 'string' || text.length > 100000) return []
    try { const r = await iocService.extractFromText(text); sendMainLog('debug', 'api', `IoC extraction: ${Array.isArray(r) ? r.length : 0} indicators found`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'extract-iocs failed', err?.message); return [] }
  })
  ipcMain.handle('get-cache-stats', () => {
    try { const r = offlineCacheService.getCacheStats(); sendMainLog('debug', 'system', 'Cache stats retrieved'); return r }
    catch (err: any) { sendMainLog('error', 'system', 'get-cache-stats failed', err?.message); return null }
  })
  ipcMain.handle('clear-tile-cache', () => {
    sendMainLog('info', 'system', 'Tile cache cleared')
    return offlineCacheService.clearCache()
  })
}
