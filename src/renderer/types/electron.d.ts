export interface ArgusAPI {
  platform: string
  getIncidents: (filters?: Record<string, unknown>) => Promise<import('../../shared/types').Incident[]>
  getIncidentCounts: () => Promise<{ total: number; today: number; last24h: number }>
  getFeeds: () => Promise<import('../../shared/types').FeedSource[]>
  detachPanels: () => Promise<any>
  onPanelsDetached: (callback: (detached: boolean) => void) => () => void
  navigateToIncident: (incident: any) => Promise<void>
  onRemoteNavigateIncident: (callback: (incident: any) => void) => () => void
  addFeed: (opts: { url: string; name?: string; category?: string }) => Promise<any>
  removeFeed: (feedId: string) => Promise<any>
  updateFeed: (feedId: string, updates: { name?: string; url?: string; category?: string }) => Promise<any>
  refreshFeeds: () => Promise<import('../../shared/types').FeedSource[]>
  onIncidentUpdate: (callback: (data: import('../../shared/types').Incident) => void) => () => void
  getSettings: () => Promise<Record<string, unknown>>
  updateSettings: (settings: Record<string, unknown>) => Promise<void>
  searchIncidents: (query: string) => Promise<import('../../shared/types').Incident[]>

  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  windowIsFullscreen: () => Promise<boolean>
  windowToggleFullscreen: () => Promise<void>
  onWindowStateChanged: (callback: (data: { maximized?: boolean; fullscreen?: boolean }) => void) => () => void

  showNotification: (opts: { title: string; body: string }) => Promise<void>
  openChildWindow: (opts: { route: string; width?: number; height?: number }) => Promise<void>

  getEarthquakes: () => Promise<import('../../shared/types').EarthquakeData[]>
  getDisasters: () => Promise<import('../../shared/types').NaturalDisaster[]>
  getFlights: () => Promise<import('../../shared/types').FlightData[]>
  getVessels: () => Promise<import('../../shared/types').VesselData[]>
  getSatellites: () => Promise<import('../../shared/types').SatelliteData[]>
  getVIPTweets: (accounts?: any[]) => Promise<import('../../shared/types').VIPTweet[]>
  getAnomalies: () => Promise<any[]>
  getPredictiveRisk: () => Promise<any[]>
  resolveYtLive: (channelId: string) => Promise<string | null>
  detachWindow: (type: string) => Promise<{ windowId: number }>
  getCyberThreats: () => Promise<import('../../shared/types').CyberThreat[]>
  getPandemicEvents: () => Promise<import('../../shared/types').PandemicEvent[]>
  getNuclearEvents: () => Promise<import('../../shared/types').NuclearEvent[]>
  getMilitaryActivities: () => Promise<import('../../shared/types').MilitaryActivity[]>
  getDailyBriefing: () => Promise<import('../../shared/types').DailyBriefing>
  getWeatherAlerts: () => Promise<import('../../shared/types').WeatherAlert[]>
  getInternetOutages: () => Promise<import('../../shared/types').InternetOutage[]>
  getSubmarineCables: () => Promise<import('../../shared/types').SubmarineCable[]>
  getMigrationRoutes: () => Promise<import('../../shared/types').MigrationRoute[]>
  getEnergyFacilities: () => Promise<import('../../shared/types').EnergyFacility[]>
  queryIncidents: (query: string) => Promise<import('../../shared/types').Incident[]>
  getCacheStats: () => Promise<{ sizeBytes: number; tileCount: number; dir: string }>
  clearTileCache: () => Promise<number>
  getSanctions: () => Promise<import('../../shared/types').SanctionEntity[]>
  checkSanctions: (text: string) => Promise<import('../../shared/types').SanctionEntity[]>
  getFinanceData: () => Promise<import('../../shared/types').FinanceFullData>
  getRFEvents: () => Promise<import('../../shared/types').RFEvent[]>
  getConflictZones: () => Promise<import('../../shared/types').ConflictZone[]>
  getTradeRoutes: () => Promise<import('../../shared/types').TradeRoute[]>
  getEntities: () => Promise<import('../../shared/types').ExtractedEntity[]>
  getSentiment: () => Promise<import('../../shared/types').SentimentData[]>
  onVIPTweetAlert: (callback: (data: unknown) => void) => () => void

  detachPanel: (type: string, title: string) => Promise<void>
  closePanel: (id: string) => Promise<void>
  getActivePanels: () => Promise<any[]>
  getFlightMetadata: (icao24: string) => Promise<any>
  getFlightRoute: (callsign: string) => Promise<any>
  getSpaceWeather: () => Promise<import('../../shared/types').SpaceWeatherEvent[]>
  getDroneActivities: () => Promise<import('../../shared/types').DroneActivity[]>
  getDarkWebAlerts: () => Promise<import('../../shared/types').DarkWebAlert[]>
  getTelegramMessages: () => Promise<import('../../shared/types').TelegramMessage[]>
  addTelegramChannel: (name: string, title: string) => Promise<void>
  removeTelegramChannel: (name: string) => Promise<void>
  getIoCs: () => Promise<any[]>
  extractIoCs: (text: string) => Promise<any[]>

  clearOldIncidents: (days: number) => Promise<void>
  companionStart: () => Promise<{ port: number; ip: string }>
  companionStop: () => Promise<void>
  companionInfo: () => Promise<{ ip: string; port: number; running: boolean; clients: number; token: string }>
  companionPushIncident: (incident: any) => Promise<void>

  onCascadeAlert: (callback: (data: unknown) => void) => () => void

  aiSummarize: (query: string) => Promise<{ summary: string; model: string; tokensUsed?: number }>
  aiAnalyzeIncident: (incident: Record<string, unknown>) => Promise<{ summary: string; model: string; tokensUsed?: number }>
  aiDailyBriefing: () => Promise<{ summary: string; model: string; tokensUsed?: number }>

  aiEntities: () => Promise<{ summary: string; model: string; tokensUsed?: number }>
  aiCheck: () => Promise<{ ollama: boolean; openai: boolean; custom: boolean }>
  aiConfigGet: () => Promise<Record<string, unknown>>
  aiConfigSet: (updates: Record<string, unknown>) => Promise<Record<string, unknown>>

  shodanSearch: (query: string) => Promise<Array<{ ip: string; port: number; org?: string; os?: string; product?: string; country?: string; city?: string; vulns?: string[]; lastUpdate?: string }>>
  abuseipdbCheck: (ip: string) => Promise<{ ipAddress: string; abuseConfidenceScore: number; countryCode?: string; isp?: string; domain?: string; totalReports: number; lastReportedAt?: string; isPublic?: boolean; isTor?: boolean } | null>
  virustotalScan: (resource: string, type?: 'url' | 'hash') => Promise<{ id: string; type: string; positives: number; total: number; scanDate?: string; permalink?: string } | null>

  getApiKeys: () => Promise<Array<{ id: string; label: string; category: string; description: string; docsUrl: string; configured: boolean; maskedValue: string; placeholder?: string; isPassword?: boolean }>>
  setApiKey: (name: string, value: string) => Promise<Array<{ id: string; label: string; category: string; description: string; docsUrl: string; configured: boolean; maskedValue: string }>>
  deleteApiKey: (name: string) => Promise<Array<{ id: string; label: string; category: string; description: string; docsUrl: string; configured: boolean; maskedValue: string }>>
  testApiKey: (name: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>

  onMainLog: (callback: (data: { level: string; category: string; message: string; detail?: string }) => void) => () => void
}

declare global {
  interface Window {
    argus: ArgusAPI
  }
}
