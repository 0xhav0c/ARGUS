export type IncidentDomain = 'CONFLICT' | 'CYBER' | 'INTEL' | 'FINANCE' | 'MILITARY' | 'ENVIRONMENT'

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export interface GeoCoordinates {
  latitude: number
  longitude: number
}

export interface Incident {
  id: string
  title: string
  description: string
  domain: IncidentDomain
  severity: IncidentSeverity
  latitude: number
  longitude: number
  timestamp: string
  source: string
  sourceUrl?: string
  tags: string[]
  relatedIds?: string[]
  metadata?: Record<string, unknown>
  country?: string
  region?: string
}

export interface FeedSource {
  id: string
  name: string
  url: string
  domain: IncidentDomain
  type: 'rss' | 'api' | 'scraper'
  feedType: 'dedicated' | 'general'
  enabled: boolean
  refreshInterval: number
  lastFetched?: string
  lastError?: string
}

export interface Layer {
  id: string
  name: string
  nameKey: string
  domain: IncidentDomain
  visible: boolean
  color: string
  icon: string
  sublayers: Sublayer[]
}

export interface Sublayer {
  id: string
  name: string
  nameKey: string
  visible: boolean
}

export interface FeatureFlags {
  // Main tabs
  tabIntelligence: boolean
  tabAnalysis: boolean
  tabSecurity: boolean
  tabFinance: boolean
  tabEntities: boolean
  tabCompare: boolean
  tabOperations: boolean
  tabMedia: boolean
  tabLiveFeed: boolean
  tabLogs: boolean
  // Analysis sub-tabs
  analysisBriefing: boolean
  analysisRiskIndex: boolean
  analysisThreats: boolean
  analysisClusters: boolean
  // Security sub-tabs
  secBriefing: boolean
  secCyber: boolean
  secAnomaly: boolean
  secPandemic: boolean
  secNuclear: boolean
  secMilitary: boolean
  secWeather: boolean
  secInternet: boolean
  secSanctions: boolean
  secDarkweb: boolean
  secSpace: boolean
  secDrones: boolean
  // Operations sub-tabs
  opsQuery: boolean
  opsBookmarks: boolean
  opsThreads: boolean
  opsProfiles: boolean
  opsAnnotations: boolean
  opsPlugins: boolean
  opsHotspots: boolean
  opsReports: boolean
  opsReliability: boolean
  opsAlertRules: boolean
  opsPredictions: boolean
  opsExport: boolean
  opsTimeMachine: boolean
  // Tracking layers
  trackFlights: boolean
  trackVessels: boolean
  trackSatellites: boolean
  trackEarthquakes: boolean
  trackDisasters: boolean
  // Standalone features
  featureAIPanel: boolean
  featureCommandPalette: boolean
  featureVoiceControl: boolean
  featureCompanion: boolean
  featureSplitView: boolean
  featureNotifications: boolean
  featureTTS: boolean
}

export interface AppSettings {
  language: 'tr' | 'en'
  theme: 'military' | 'dark' | 'midnight'
  autoRefresh: boolean
  refreshInterval: number
  globeQuality: 'low' | 'medium' | 'high'
  showAnimations: boolean
  notificationsEnabled: boolean
  uiScale: number
  soundEnabled: boolean
  ttsEnabled: boolean
  ttsRate: number
  ttsVolume: number
  maxNotifications: number
  autoRotateGlobe: boolean
  mapLabels: boolean
  dateFormat: '24h' | '12h'
  startupTab: 'feed' | 'intelligence' | 'security' | 'operations' | 'media'
  layoutMode: 'stacked' | 'globe-left' | 'globe-right'
  panelWidthPct: number
  features: FeatureFlags
}

export interface SavedView {
  id: string
  name: string
  camera: {
    longitude: number
    latitude: number
    altitude: number
    heading: number
    pitch: number
  }
  filters: {
    domains: IncidentDomain[]
    severity: IncidentSeverity | null
    searchQuery: string
    timeRange: string
  }
  createdAt: string
}

export interface WatchlistItem {
  id: string
  type: 'keyword' | 'region' | 'entity'
  value: string
  domain?: IncidentDomain
  enabled: boolean
  createdAt: string
  matchCount: number
}

export interface AlertRule {
  id: string
  name: string
  conditions: {
    domains?: IncidentDomain[]
    severities?: IncidentSeverity[]
    keywords?: string[]
    region?: string
  }
  enabled: boolean
  sound: boolean
  desktop: boolean
  createdAt: string
  lastTriggered?: string
  triggerCount: number
}

export interface RiskScore {
  country: string
  countryCode: string
  overall: number
  conflict: number
  cyber: number
  intel: number
  finance: number
  incidentCount: number
  trend: 'rising' | 'falling' | 'stable'
}

export interface AnomalyEvent {
  id: string
  domain: IncidentDomain
  region: string
  normalRate: number
  currentRate: number
  deviation: number
  detectedAt: string
  description: string
}

export interface FinanceData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  updatedAt: string
}

export interface FlightData {
  icao24: string
  callsign: string
  latitude: number
  longitude: number
  altitude: number
  heading: number
  velocity: number
  verticalRate: number
  onGround: boolean
  originCountry: string
  // Enhanced fields
  registration?: string
  aircraftType?: string
  airline?: string
  originAirport?: string
  originCode?: string
  destAirport?: string
  destCode?: string
  squawk?: string
  track?: number
  baroAltitude?: number
  gpsAltitude?: number
  groundSpeed?: number
  category?: string
  // Route waypoints [lat, lng, alt][]
  routePoints?: [number, number, number][]
  departureTime?: string
  arrivalTime?: string
}

export interface VesselData {
  mmsi: string
  name: string
  latitude: number
  longitude: number
  heading: number
  speed: number
  type: string
  destination: string
  flag: string
  imo?: string
  callsign?: string
  length?: number
  width?: number
  draft?: number
  status?: string
  eta?: string
  originPort?: string
  originPortCode?: string
  destPortCode?: string
  course?: number
  routePoints?: [number, number][]
  lastUpdate?: string
  grossTonnage?: number
  deadweight?: number
  yearBuilt?: number
  owner?: string
  vesselClass?: string
}

export interface EarthquakeData {
  id: string
  magnitude: number
  latitude: number
  longitude: number
  depth: number
  place: string
  time: string
  tsunami: boolean
  url: string
}

export interface NaturalDisaster {
  id: string
  title: string
  type: 'wildfire' | 'volcano' | 'storm' | 'flood' | 'earthquake' | 'other'
  latitude: number
  longitude: number
  date: string
  source: string
  sourceUrl?: string
}

export interface SatelliteData {
  noradId: number
  name: string
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  category: 'starlink' | 'iss' | 'military' | 'weather' | 'communication' | 'navigation' | 'science' | 'other'
  intlDesignator?: string
  launchDate?: string
  imageUrl?: string
  orbitType?: string
  period?: number
  inclination?: number
  apogee?: number
  perigee?: number
  rcsSize?: string
  country?: string
  objectType?: string
}

export interface TVChannel {
  id: string
  name: string
  country: string
  countryCode: string
  language: string
  category: 'news' | 'government' | 'military' | 'finance' | 'general'
  youtubeId: string
  thumbnailUrl?: string
  isLive: boolean
}

export interface VIPTweet {
  id: string
  author: string
  authorHandle: string
  authorTitle: string
  authorCountry: string
  content: string
  timestamp: string
  url: string
  avatarUrl?: string
  isVerified: boolean
}

export type TrackingLayer = 'flights' | 'vessels' | 'earthquakes' | 'disasters' | 'satellites'

// ── Sanctions & Watchlist ──
export interface SanctionEntity {
  id: string
  name: string
  aliases: string[]
  type: 'individual' | 'entity' | 'vessel' | 'aircraft'
  source: 'OFAC' | 'EU' | 'UN' | 'UK'
  program: string
  country?: string
  addedDate?: string
  remarks?: string
}

// ── Finance Deep Data ──
export interface CryptoData {
  symbol: string
  name: string
  price: number
  change24h: number
  marketCap: number
  volume24h: number
  rank?: number
  image?: string
  sparkline7d?: number[]
  ath?: number
  athChangePercent?: number
  dominance?: number
}

export interface CommodityData {
  symbol: string
  name: string
  price: number
  change: number
  unit: string
  category?: 'metal' | 'energy' | 'agriculture'
  high24h?: number
  low24h?: number
}

export interface ForexData {
  pair: string
  rate: number
  change: number
  prevClose?: number
  high24h?: number
  low24h?: number
}

export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
  region?: string
  status?: 'open' | 'closed' | 'pre-market' | 'after-hours'
}

export interface FearGreedData {
  value: number
  label: string
  previousValue?: number
  previousLabel?: string
  timestamp: string
}

export interface BondYield {
  country: string
  tenor: string
  yield: number
  change: number
}

export interface MarketSentiment {
  vix: number
  vixChange: number
  dxy: number
  dxyChange: number
  fearGreed: FearGreedData
  bondYields: BondYield[]
  globalMarketCap: number
  btcDominance: number
}

export interface FinanceWatchlistItem {
  symbol: string
  name: string
  type: 'crypto' | 'commodity' | 'forex' | 'index'
  price: number
  change: number
  changePercent: number
  addedAt: string
}

export interface FinanceFullData {
  crypto: CryptoData[]
  commodities: CommodityData[]
  forex: ForexData[]
  indices: MarketIndex[]
  sentiment: MarketSentiment
  lastUpdated: string
}

// ── SIGINT / RF ──
export interface RFEvent {
  id: string
  type: 'jamming' | 'interference' | 'anomaly' | 'propagation'
  latitude: number
  longitude: number
  frequency?: string
  band?: string
  description: string
  detectedAt: string
  source: string
}

// ── Entity & Knowledge Graph ──
export interface ExtractedEntity {
  id: string
  name: string
  type: 'person' | 'organization' | 'location' | 'weapon' | 'event'
  mentions: number
  incidentIds: string[]
  firstSeen: string
  lastSeen: string
  relatedEntities: { id: string; name: string; relation: string }[]
  sanctioned?: boolean
}

// ── Sentiment ──
export interface SentimentData {
  topic: string
  region: string
  positive: number
  negative: number
  neutral: number
  score: number
  trend: 'improving' | 'worsening' | 'stable'
  sampleSize: number
  timestamp: string
}

// ── Conflict Zones ──
export interface ConflictZone {
  id: string
  name: string
  type: 'active_combat' | 'ceasefire' | 'occupation' | 'insurgency' | 'tension'
  polygon: [number, number][]
  color: string
  parties: string[]
  startDate: string
  casualties?: number
  description: string
}

// ── Supply Chain / Trade Routes ──
export interface TradeRoute {
  id: string
  name: string
  type: 'maritime' | 'pipeline' | 'rail' | 'air_corridor'
  waypoints: [number, number][]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  commodity: string
  dailyVolume?: string
  chokepoint?: boolean
  description: string
}

// ── Visual Modes ──
export type GlobeVisualMode = 'default' | 'nightvision' | 'thermal' | 'tactical'

// ── Cyber Threat Intelligence ──
export interface CyberThreat {
  id: string
  type: 'cve' | 'ransomware' | 'apt' | 'ddos' | 'breach' | 'malware'
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  source: string
  publishedAt: string
  description: string
  affectedSystems?: string
  cveId?: string
  cvssScore?: number
  attackerGroup?: string
  targetCountry?: string
  targetSector?: string
  sourceUrl?: string
}

// ── Pandemic / Bio Threat ──
export interface PandemicEvent {
  id: string
  disease: string
  country: string
  latitude: number
  longitude: number
  cases: number
  deaths: number
  alertLevel: 'EMERGENCY' | 'HIGH' | 'MODERATE' | 'LOW'
  source: string
  reportedAt: string
  description: string
}

// ── Nuclear / WMD ──
export interface NuclearEvent {
  id: string
  type: 'test' | 'facility' | 'missile' | 'radiation' | 'treaty'
  title: string
  latitude: number
  longitude: number
  country: string
  detectedAt: string
  description: string
  source: string
  yield?: string
}

// ── Military Activity ──
export interface MilitaryActivity {
  id: string
  type: 'exercise' | 'deployment' | 'patrol' | 'buildup' | 'airspace_closure'
  title: string
  latitude: number
  longitude: number
  country: string
  forces: string[]
  detectedAt: string
  description: string
  source: string
}

// ── AI Briefing ──
export interface DailyBriefing {
  id: string
  date: string
  generatedAt: string
  summary: string
  topEvents: { id: string; title: string; domain: IncidentDomain; severity: IncidentSeverity; country?: string; latitude?: number; longitude?: number }[]
  regionAlerts: { region: string; riskLevel: string; summary: string }[]
  stats: { total: number; critical: number; newToday: number; trending: string[] }
}

// ── Alert Profiles ──
export interface AlertProfile {
  id: string
  name: string
  icon: string
  active: boolean
  rules: {
    domains: IncidentDomain[]
    minSeverity: IncidentSeverity
    regions?: string[]
    keywords?: string[]
    soundEnabled: boolean
    quietHoursStart?: string
    quietHoursEnd?: string
  }
}

// ── Incident Thread ──
export interface IncidentThread {
  id: string
  title: string
  incidentIds: string[]
  createdAt: string
  updatedAt: string
  summary?: string
}

// ── Bookmarks / Pins ──
export interface BookmarkPin {
  id: string
  incidentId: string
  group: string
  note?: string
  pinnedAt: string
}

// ── Weather ──
export interface WeatherAlert {
  id: string
  type: 'storm' | 'hurricane' | 'tornado' | 'flood' | 'heatwave' | 'coldwave' | 'fog'
  title: string
  latitude: number
  longitude: number
  severity: 'EXTREME' | 'SEVERE' | 'MODERATE' | 'MINOR'
  description: string
  source: string
  validFrom: string
  validTo: string
}

// ── Internet Infrastructure ──
export interface InternetOutage {
  id: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  severity: 'major' | 'moderate' | 'minor'
  asn?: string
  provider?: string
  startedAt: string
  description: string
  source: string
}

export interface SubmarineCable {
  id: string
  name: string
  waypoints: [number, number][]
  length: string
  owners: string
  rfs: string
  color: string
}

// ── Migration / Refugee ──
export interface MigrationRoute {
  id: string
  name: string
  waypoints: [number, number][]
  estimatedFlow: string
  origin: string
  destination: string
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
}

// ── Energy Infrastructure ──
export interface EnergyFacility {
  id: string
  name: string
  type: 'nuclear' | 'thermal' | 'hydro' | 'solar' | 'wind' | 'refinery' | 'lng_terminal'
  latitude: number
  longitude: number
  country: string
  capacity?: string
  status: 'operational' | 'maintenance' | 'offline' | 'decommissioned'
}

// ── Custom Data Source Plugin ──
export interface CustomDataSource {
  id: string
  name: string
  type: 'rss' | 'json_api' | 'csv'
  url: string
  refreshInterval: number
  enabled: boolean
  mapping?: Record<string, string>
  addedAt: string
}

export interface CountryProfile {
  code: string
  name: string
  capital: string
  population: number
  area: number
  continent: string
  latitude: number
  longitude: number
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'STABLE'
  flags: string[]
}

// ── Space Weather ──
export interface SpaceWeatherEvent {
  id: string
  type: 'solar_flare' | 'cme' | 'geomagnetic_storm' | 'radiation_storm' | 'radio_blackout' | 'asteroid' | 'comet' | 'neo' | 'fireball'
  title: string
  severity: 'EXTREME' | 'SEVERE' | 'MODERATE' | 'MINOR'
  startTime: string
  description: string
  source: string
  kpIndex?: number
  affectedSystems?: string[]
  closestApproachDate?: string
  estimatedDiameter?: string
  velocity?: string
  missDistance?: string
  isHazardous?: boolean
}

// ── Drone / UAV ──
export interface DroneActivity {
  id: string
  type: 'military' | 'civilian' | 'unknown'
  latitude: number
  longitude: number
  altitude: number
  country: string
  description: string
  detectedAt: string
  source: string
}

// ── Dark Web Intelligence ──
export interface DarkWebAlert {
  id: string
  type: 'data_leak' | 'ransomware' | 'marketplace' | 'threat_actor' | 'exploit'
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  source: string
  discoveredAt: string
  description: string
  affectedOrg?: string
  dataType?: string
  threatActor?: string
}

// ── IoC (Indicator of Compromise) ──
export interface IoC {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'cve'
  value: string
  threatType: string
  confidence: number
  source: string
  firstSeen: string
  lastSeen: string
  tags: string[]
  relatedIncidentIds?: string[]
}

// ── Telegram Message ──
export interface TelegramMessage {
  id: string
  channel: string
  channelTitle: string
  content: string
  timestamp: string
  mediaUrl?: string
  views?: number
  forwards?: number
  category?: 'conflict' | 'cyber' | 'osint' | 'geopolitics' | 'custom'
  priority?: 'high' | 'medium' | 'low'
}

// ── MITRE ATT&CK ──
export interface MitreAttackTechnique {
  id: string
  name: string
  tactic: string
  description: string
  hitCount: number
  lastSeen?: string
}

// ── Incident Note ──
export interface IncidentNote {
  id: string
  incidentId: string
  content: string
  author: string
  createdAt: string
  updatedAt?: string
}

// ── Geospatial Hotspot ──
export interface GeoHotspot {
  region: string
  latitude: number
  longitude: number
  currentCount: number
  previousCount: number
  changePercent: number
  topDomains: { domain: IncidentDomain; count: number }[]
  period: string
}

// ── Collaboration ──
export interface CollabUser {
  id: string
  name: string
  color: string
  lastSeen: string
  status: 'online' | 'away' | 'offline'
}

export interface CollabMessage {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: string
}

// ── Predictive Risk ──
export interface ConflictPrediction {
  region: string
  country: string
  latitude: number
  longitude: number
  riskScore: number
  trend: 'escalating' | 'de-escalating' | 'stable'
  factors: string[]
  timeframe: string
  confidence: number
}
