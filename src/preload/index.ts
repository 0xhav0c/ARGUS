import { contextBridge, ipcRenderer } from 'electron'
import type { Incident, FeedSource, VIPTweet } from '../shared/types'

type Disposer = () => void

function subscribe<T = unknown>(channel: string, callback: (data: T) => void): Disposer {
  const handler = (_: Electron.IpcRendererEvent, ...args: unknown[]) => callback(args[0] as T)
  ipcRenderer.on(channel, handler)
  return () => { ipcRenderer.removeListener(channel, handler) }
}

const api = {
  platform: process.platform,

  getIncidents: (filters?: Record<string, unknown>) =>
    ipcRenderer.invoke('get-incidents', filters) as Promise<Incident[]>,
  getIncidentCounts: () => ipcRenderer.invoke('get-incident-counts') as Promise<{ total: number; today: number; last24h: number }>,

  getFeeds: () => ipcRenderer.invoke('get-feeds') as Promise<FeedSource[]>,
  refreshFeeds: () => ipcRenderer.invoke('refresh-feeds') as Promise<{ feeds: FeedSource[]; error?: string }>,
  addFeed: (opts: { url: string; name?: string; category?: string }) => ipcRenderer.invoke('add-feed', opts),
  removeFeed: (feedId: string) => ipcRenderer.invoke('remove-feed', feedId),
  updateFeed: (feedId: string, updates: { name?: string; url?: string; category?: string }) => ipcRenderer.invoke('update-feed', feedId, updates),

  onIncidentUpdate: (callback: (data: Incident) => void): Disposer =>
    subscribe<Incident>('incident-update', callback),

  getSettings: () => ipcRenderer.invoke('get-settings') as Promise<Record<string, unknown>>,
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('update-settings', settings),

  searchIncidents: (query: string) =>
    ipcRenderer.invoke('search-incidents', query) as Promise<Incident[]>,

  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,
  windowIsFullscreen: () => ipcRenderer.invoke('window-is-fullscreen') as Promise<boolean>,
  windowToggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),

  onWindowStateChanged: (callback: (data: { maximized?: boolean; fullscreen?: boolean }) => void): Disposer =>
    subscribe<{ maximized?: boolean; fullscreen?: boolean }>('window-state-changed', callback),

  showNotification: (opts: { title: string; body: string }) =>
    ipcRenderer.invoke('show-notification', opts),

  openChildWindow: (opts: { route: string; width?: number; height?: number }) =>
    ipcRenderer.invoke('open-child-window', opts),

  detachPanel: (type: string, title: string) =>
    ipcRenderer.invoke('detach-panel', type, title),
  closePanel: (id: string) => ipcRenderer.invoke('close-panel', id),
  getActivePanels: () => ipcRenderer.invoke('get-active-panels') as Promise<Array<{ id: string; type: string; title: string }>>,
  detachPanels: () => ipcRenderer.invoke('detach-panels'),
  onPanelsDetached: (callback: (detached: boolean) => void): Disposer =>
    subscribe<boolean>('panels-detached', callback),
  navigateToIncident: (incident: Incident) => ipcRenderer.invoke('navigate-to-incident', incident),
  onRemoteNavigateIncident: (callback: (incident: Incident) => void): Disposer =>
    subscribe<Incident>('remote-navigate-incident', callback),

  getEarthquakes: () => ipcRenderer.invoke('get-earthquakes'),
  getDisasters: () => ipcRenderer.invoke('get-disasters'),
  getFlights: (bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) =>
    ipcRenderer.invoke('get-flights', bounds),
  getVessels: () => ipcRenderer.invoke('get-vessels'),
  getFlightMetadata: (icao24: string) => ipcRenderer.invoke('get-flight-metadata', icao24),
  getFlightRoute: (callsign: string) => ipcRenderer.invoke('get-flight-route', callsign),

  getSatellites: () => ipcRenderer.invoke('get-satellites'),
  getVIPTweets: (accounts?: Array<{ handle: string; name: string }>) =>
    ipcRenderer.invoke('get-vip-tweets', accounts) as Promise<VIPTweet[]>,

  getSanctions: () => ipcRenderer.invoke('get-sanctions'),
  checkSanctions: (text: string) => ipcRenderer.invoke('check-sanctions', text),
  getFinanceData: () => ipcRenderer.invoke('get-finance-data'),
  getRFEvents: () => ipcRenderer.invoke('get-rf-events'),
  getConflictZones: () => ipcRenderer.invoke('get-conflict-zones'),
  getTradeRoutes: () => ipcRenderer.invoke('get-trade-routes'),
  getEntities: () => ipcRenderer.invoke('get-entities'),
  getSentiment: () => ipcRenderer.invoke('get-sentiment'),

  getCyberThreats: () => ipcRenderer.invoke('get-cyber-threats'),
  getPandemicEvents: () => ipcRenderer.invoke('get-pandemic-events'),
  getNuclearEvents: () => ipcRenderer.invoke('get-nuclear-events'),
  getMilitaryActivities: () => ipcRenderer.invoke('get-military-activities'),
  getDailyBriefing: () => ipcRenderer.invoke('get-daily-briefing'),
  getWeatherAlerts: () => ipcRenderer.invoke('get-weather-alerts'),
  getInternetOutages: () => ipcRenderer.invoke('get-internet-outages'),
  getSubmarineCables: () => ipcRenderer.invoke('get-submarine-cables'),
  getMigrationRoutes: () => ipcRenderer.invoke('get-migration-routes'),
  getEnergyFacilities: () => ipcRenderer.invoke('get-energy-facilities'),
  queryIncidents: (query: string) => ipcRenderer.invoke('query-incidents', query) as Promise<Incident[]>,

  getAnomalies: () => ipcRenderer.invoke('get-anomalies'),
  getPredictiveRisk: () => ipcRenderer.invoke('get-predictive-risk'),

  getSpaceWeather: () => ipcRenderer.invoke('get-space-weather'),
  getDroneActivities: () => ipcRenderer.invoke('get-drone-activities'),
  getDarkWebAlerts: () => ipcRenderer.invoke('get-darkweb-alerts'),
  getTelegramMessages: () => ipcRenderer.invoke('get-telegram-messages'),
  addTelegramChannel: (name: string, title: string) => ipcRenderer.invoke('add-telegram-channel', name, title),
  removeTelegramChannel: (name: string) => ipcRenderer.invoke('remove-telegram-channel', name),
  getIoCs: () => ipcRenderer.invoke('get-iocs'),
  extractIoCs: (text: string) => ipcRenderer.invoke('extract-iocs', text),

  resolveYtLive: (channelId: string) => ipcRenderer.invoke('resolve-yt-live', channelId) as Promise<string | null>,

  detachWindow: (type: string) => ipcRenderer.invoke('detach-window', type),
  getCacheStats: () => ipcRenderer.invoke('get-cache-stats'),
  clearTileCache: () => ipcRenderer.invoke('clear-tile-cache'),

  clearOldIncidents: (days: number) => ipcRenderer.invoke('clear-old-incidents', days),
  companionStart: () => ipcRenderer.invoke('companion-start'),
  companionStop: () => ipcRenderer.invoke('companion-stop'),
  companionInfo: () => ipcRenderer.invoke('companion-info'),
  companionPushIncident: (incident: Record<string, unknown>) => ipcRenderer.invoke('companion-push-incident', incident),

  onVIPTweetAlert: (callback: (data: VIPTweet) => void): Disposer =>
    subscribe<VIPTweet>('vip-tweet-alert', callback),

  onCascadeAlert: (callback: (data: unknown) => void): Disposer =>
    subscribe('cascade-alert', callback),

  aiSummarize: (query: string) => ipcRenderer.invoke('ai-summarize', query) as Promise<{ summary: string; model: string; tokensUsed?: number }>,
  aiAnalyzeIncident: (incident: Record<string, unknown>) => ipcRenderer.invoke('ai-analyze-incident', incident) as Promise<{ summary: string; model: string; tokensUsed?: number }>,
  aiDailyBriefing: () => ipcRenderer.invoke('ai-daily-briefing') as Promise<{ summary: string; model: string; tokensUsed?: number }>,

  aiEntities: () => ipcRenderer.invoke('ai-entities') as Promise<{ summary: string; model: string; tokensUsed?: number }>,
  aiTranslate: (texts: string[], targetLang: string) => ipcRenderer.invoke('ai-translate', texts, targetLang) as Promise<string[]>,
  aiCheck: () => ipcRenderer.invoke('ai-check') as Promise<{ ollama: boolean; openai: boolean; custom: boolean }>,
  aiConfigGet: () => ipcRenderer.invoke('ai-config-get') as Promise<Record<string, unknown>>,
  aiConfigSet: (updates: Record<string, unknown>) => ipcRenderer.invoke('ai-config-set', updates) as Promise<Record<string, unknown>>,

  shodanSearch: (query: string) => ipcRenderer.invoke('shodan-search', query),
  abuseipdbCheck: (ip: string) => ipcRenderer.invoke('abuseipdb-check', ip),
  virustotalScan: (resource: string, type?: 'url' | 'hash') => ipcRenderer.invoke('virustotal-scan', resource, type || 'hash'),

  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
  setApiKey: (name: string, value: string) => ipcRenderer.invoke('set-api-key', name, value),
  deleteApiKey: (name: string) => ipcRenderer.invoke('delete-api-key', name),
  testApiKey: (name: string) => ipcRenderer.invoke('test-api-key', name) as Promise<{ success: boolean; message: string; latencyMs?: number }>,

  onMainLog: (callback: (data: { level: string; category: string; message: string; detail?: string }) => void): Disposer =>
    subscribe<{ level: string; category: string; message: string; detail?: string }>('main-log', callback),

  getAppVersion: () => ipcRenderer.invoke('get-app-version') as Promise<string>,
  getAppUptime: () => ipcRenderer.invoke('get-app-uptime') as Promise<number>,
}

contextBridge.exposeInMainWorld('argus', api)

export type ArgusAPI = typeof api
