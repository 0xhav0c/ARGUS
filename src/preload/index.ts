import { contextBridge, ipcRenderer } from 'electron'

type Disposer = () => void

function subscribe(channel: string, callback: (...args: any[]) => void): Disposer {
  const handler = (_: Electron.IpcRendererEvent, ...args: any[]) => callback(...args)
  ipcRenderer.on(channel, handler)
  return () => { ipcRenderer.removeListener(channel, handler) }
}

const api = {
  platform: process.platform,

  getIncidents: (filters?: Record<string, unknown>) =>
    ipcRenderer.invoke('get-incidents', filters),
  getIncidentCounts: () => ipcRenderer.invoke('get-incident-counts') as Promise<{ total: number; today: number; last24h: number }>,

  getFeeds: () => ipcRenderer.invoke('get-feeds'),
  refreshFeeds: () => ipcRenderer.invoke('refresh-feeds'),
  addFeed: (opts: { url: string; name?: string; category?: string }) => ipcRenderer.invoke('add-feed', opts),
  removeFeed: (feedId: string) => ipcRenderer.invoke('remove-feed', feedId),
  updateFeed: (feedId: string, updates: { name?: string; url?: string; category?: string }) => ipcRenderer.invoke('update-feed', feedId, updates),

  onIncidentUpdate: (callback: (data: unknown) => void): Disposer =>
    subscribe('incident-update', callback),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('update-settings', settings),

  searchIncidents: (query: string) =>
    ipcRenderer.invoke('search-incidents', query),

  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  windowIsFullscreen: () => ipcRenderer.invoke('window-is-fullscreen'),
  windowToggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),

  onWindowStateChanged: (callback: (data: { maximized?: boolean; fullscreen?: boolean }) => void): Disposer =>
    subscribe('window-state-changed', callback),

  showNotification: (opts: { title: string; body: string }) =>
    ipcRenderer.invoke('show-notification', opts),

  openChildWindow: (opts: { route: string; width?: number; height?: number }) =>
    ipcRenderer.invoke('open-child-window', opts),

  detachPanel: (type: string, title: string) =>
    ipcRenderer.invoke('detach-panel', type, title),
  closePanel: (id: string) => ipcRenderer.invoke('close-panel', id),
  getActivePanels: () => ipcRenderer.invoke('get-active-panels'),
  detachPanels: () => ipcRenderer.invoke('detach-panels'),
  onPanelsDetached: (callback: (detached: boolean) => void): Disposer =>
    subscribe('panels-detached', callback),
  navigateToIncident: (incident: any) => ipcRenderer.invoke('navigate-to-incident', incident),
  onRemoteNavigateIncident: (callback: (incident: any) => void): Disposer =>
    subscribe('remote-navigate-incident', callback),

  getEarthquakes: () => ipcRenderer.invoke('get-earthquakes'),
  getDisasters: () => ipcRenderer.invoke('get-disasters'),
  getFlights: (bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) =>
    ipcRenderer.invoke('get-flights', bounds),
  getVessels: () => ipcRenderer.invoke('get-vessels'),
  getFlightMetadata: (icao24: string) => ipcRenderer.invoke('get-flight-metadata', icao24),
  getFlightRoute: (callsign: string) => ipcRenderer.invoke('get-flight-route', callsign),

  getSatellites: () => ipcRenderer.invoke('get-satellites'),
  getVIPTweets: (accounts?: any[]) => ipcRenderer.invoke('get-vip-tweets', accounts),

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
  queryIncidents: (query: string) => ipcRenderer.invoke('query-incidents', query),

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
  companionPushIncident: (incident: any) => ipcRenderer.invoke('companion-push-incident', incident),

  onVIPTweetAlert: (callback: (data: unknown) => void): Disposer =>
    subscribe('vip-tweet-alert', callback),

  onCascadeAlert: (callback: (data: unknown) => void): Disposer =>
    subscribe('cascade-alert', callback),

  aiSummarize: (query: string) => ipcRenderer.invoke('ai-summarize', query),
  aiAnalyzeIncident: (incident: Record<string, unknown>) => ipcRenderer.invoke('ai-analyze-incident', incident),
  aiDailyBriefing: () => ipcRenderer.invoke('ai-daily-briefing'),

  aiEntities: () => ipcRenderer.invoke('ai-entities'),
  aiCheck: () => ipcRenderer.invoke('ai-check'),
  aiConfigGet: () => ipcRenderer.invoke('ai-config-get'),
  aiConfigSet: (updates: Record<string, unknown>) => ipcRenderer.invoke('ai-config-set', updates),

  shodanSearch: (query: string) => ipcRenderer.invoke('shodan-search', query),
  abuseipdbCheck: (ip: string) => ipcRenderer.invoke('abuseipdb-check', ip),
  virustotalScan: (resource: string, type?: 'url' | 'hash') => ipcRenderer.invoke('virustotal-scan', resource, type || 'hash'),

  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
  setApiKey: (name: string, value: string) => ipcRenderer.invoke('set-api-key', name, value),
  deleteApiKey: (name: string) => ipcRenderer.invoke('delete-api-key', name),
  testApiKey: (name: string) => ipcRenderer.invoke('test-api-key', name),

  onMainLog: (callback: (data: { level: string; category: string; message: string; detail?: string }) => void): Disposer =>
    subscribe('main-log', callback),
}

contextBridge.exposeInMainWorld('argus', api)

export type ArgusAPI = typeof api
