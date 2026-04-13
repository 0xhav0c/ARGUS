import { app, BrowserWindow, shell, ipcMain, Notification, session } from 'electron'
import { join } from 'path'
import { createServer, type Server } from 'http'
import { createReadStream, statSync } from 'fs'
import { registerIncidentHandlers, setCompanionServer } from './ipc/incidents'
import { registerFeedHandlers } from './ipc/feeds'
import { FeedAggregator, classifyDomain, classifySeverity, isOffTopic } from './services/feed-aggregator'
import { CacheManager } from './services/cache-manager'
import { ConflictFeedProvider } from './services/conflict-feeds'
import { CyberFeedProvider } from './services/cyber-feeds'
import { IntelFeedProvider } from './services/intel-feeds'
import { FinanceFeedProvider } from './services/finance-feeds'
import { TrackingService } from './services/tracking-service'
import { SatelliteService } from './services/satellite-service'
import { VIPTweetService } from './services/vip-tweet-service'
import { CompanionServer } from './services/companion-server'
import { SanctionsService } from './services/sanctions-service'
import { FinanceDataService } from './services/finance-data-service'
import { SigintService } from './services/sigint-service'
import { ConflictZonesService } from './services/conflict-zones-service'
import { EntityExtractionService } from './services/entity-extraction-service'
import { CyberThreatService } from './services/cyber-threat-service'
import { PandemicService } from './services/pandemic-service'
import { NuclearService } from './services/nuclear-service'
import { MilitaryService } from './services/military-service'
import { BriefingService } from './services/briefing-service'
import { WeatherService } from './services/weather-service'
import { InternetInfraService } from './services/internet-infra-service'
import { GeopoliticalDataService } from './services/geopolitical-data-service'
import { AnomalyEngine } from './services/anomaly-engine'
import { AIService } from './services/ai-service'
import { getApiKeyManager } from './services/api-key-manager'
import { OfflineCacheService } from './services/offline-cache-service'
import { SpaceWeatherService } from './services/space-weather-service'
import { DroneService } from './services/drone-service'
import { DarkWebService } from './services/darkweb-service'
import { TelegramService } from './services/telegram-service'
import { IoCService } from './services/ioc-service'
import { closeDatabase } from './database/schema'
import { windowManager } from './services/window-manager'

function sendMainLog(level: string, category: string, message: string, detail?: string) {
  try {
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('main-log', { level, category, message, detail })
      }
    }
  } catch { /* ignore if no windows */ }
}

// Local HTTP server to serve renderer files in packaged builds.
// YouTube blocks iframe embeds from file:// and custom app:// origins (Error 153).
// Serving from http://localhost gives a valid web origin that YouTube accepts.
let rendererServer: Server | null = null
let rendererPort = 0

function startRendererServer(rendererDir: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.wasm': 'application/wasm',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
    }

    const server = createServer((req, res) => {
      let urlPath = decodeURIComponent(new URL(req.url || '/', `http://localhost`).pathname)
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html'

      const { resolve: pathResolve } = require('path')
      const filePath = join(rendererDir, urlPath)
      const resolved = pathResolve(filePath)
      const resolvedBase = pathResolve(rendererDir)
      // Prevent path traversal attacks
      if (!resolved.startsWith(resolvedBase)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      try {
        const stat = statSync(filePath)
        if (!stat.isFile()) {
          // SPA fallback — serve index.html for unknown routes
          const indexPath = join(rendererDir, 'index.html')
          const indexStat = statSync(indexPath)
          res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': indexStat.size })
          createReadStream(indexPath).pipe(res)
          return
        }

        const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size })
        createReadStream(filePath).pipe(res)
      } catch {
        // SPA fallback for any missing file
        try {
          const indexPath = join(rendererDir, 'index.html')
          const indexStat = statSync(indexPath)
          res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': indexStat.size })
          createReadStream(indexPath).pipe(res)
        } catch {
          res.writeHead(404)
          res.end('Not Found')
        }
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      rendererServer = server
      rendererPort = port
      console.log(`[Renderer Server] Listening on http://127.0.0.1:${port}`)
      resolve(port)
    })

    server.on('error', reject)
  })
}

let mainWindow: BrowserWindow | null = null
let feedAggregator: FeedAggregator | null = null
const trackingService = new TrackingService()
const satelliteService = new SatelliteService()
const vipTweetService = new VIPTweetService()
const companionServer = new CompanionServer()
const sanctionsService = new SanctionsService()
const financeDataService = new FinanceDataService()
const sigintService = new SigintService()
const conflictZonesService = new ConflictZonesService()
const entityExtractionService = new EntityExtractionService()
const cyberThreatService = new CyberThreatService()
const pandemicService = new PandemicService()
const nuclearService = new NuclearService()
const militaryService = new MilitaryService()
const briefingService = new BriefingService()
const weatherService = new WeatherService()
const internetInfraService = new InternetInfraService()
const geopoliticalDataService = new GeopoliticalDataService()
const anomalyEngine = new AnomalyEngine()
let cascadeInterval: ReturnType<typeof setInterval> | null = null
let tweetInterval: ReturnType<typeof setInterval> | null = null
const aiService = new AIService()
const offlineCacheService = new OfflineCacheService()
const spaceWeatherService = new SpaceWeatherService()
const droneService = new DroneService()
const darkWebService = new DarkWebService()
const telegramService = new TelegramService()
const iocService = new IoCService()


function applyWindowOpenHandler(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(details.url)
      }
    } catch { /* reject malformed URLs */ }
    return { action: 'deny' }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0a0e17',
    title: 'ARGUS',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 12, y: 14 } } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.maximize()
  })

  applyWindowOpenHandler(mainWindow)

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-changed', { maximized: true })
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-changed', { maximized: false })
  })

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window-state-changed', { fullscreen: true })
  })

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window-state-changed', { fullscreen: false })
  })

  mainWindow.on('close', () => {
    // Close all detached panels and child windows before main window closes
    windowManager.closeAll()
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (win !== mainWindow && !win.isDestroyed()) {
        win.close()
      }
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${rendererPort}/index.html`)
  }

  windowManager.setMainWindow(mainWindow)
}

function registerWindowHandlers(): void {
  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window-close', () => {
    windowManager.closeAll()
    mainWindow?.close()
  })
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)
  ipcMain.handle('window-is-fullscreen', () => mainWindow?.isFullScreen() ?? false)
  ipcMain.handle('window-toggle-fullscreen', () => {
    mainWindow?.setFullScreen(!mainWindow.isFullScreen())
  })

  ipcMain.handle('show-notification', (_event, opts: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title: opts.title, body: opts.body }).show()
    }
  })

  ipcMain.handle('detach-panel', (_event, type: string, title: string) =>
    windowManager.detachPanel(type, title))
  ipcMain.handle('close-panel', (_event, id: string) => {
    windowManager.closePanel(id)
  })
  ipcMain.handle('get-active-panels', () => windowManager.getActivePanels())

  ipcMain.handle('navigate-to-incident', (_event, incident: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote-navigate-incident', incident)
      mainWindow.focus()
    }
  })

  ipcMain.handle('detach-panels', () => {
    const { screen: electronScreen } = require('electron') as typeof import('electron')
    const displays = electronScreen.getAllDisplays()
    const mainBounds = mainWindow?.getBounds()
    let x = (mainBounds?.x ?? 100) + 50
    let y = (mainBounds?.y ?? 100) + 50
    if (displays.length > 1 && mainBounds) {
      const currentDisplay = electronScreen.getDisplayNearestPoint({ x: mainBounds.x, y: mainBounds.y })
      const otherDisplay = displays.find((d: Electron.Display) => d.id !== currentDisplay.id)
      if (otherDisplay) { x = otherDisplay.bounds.x + 50; y = otherDisplay.bounds.y + 50 }
    }
    const win = new BrowserWindow({
      width: 1000, height: 800, x, y,
      title: 'Argus — Panels',
      frame: false, titleBarStyle: 'hidden', autoHideMenuBar: true, backgroundColor: '#0a0e17',
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
    })
    applyWindowOpenHandler(win)
    const mainUrl = mainWindow?.webContents?.getURL() || ''
    const base = mainUrl.split('?')[0].split('#')[0]
    win.loadURL(`${base}?mode=panels-only`)
    mainWindow?.webContents.send('panels-detached', true)
    win.on('closed', () => { mainWindow?.webContents.send('panels-detached', false) })
    return { windowId: win.id }
  })

  ipcMain.handle('open-child-window', (_event, opts: { route: string; width?: number; height?: number }) => {
    const child = new BrowserWindow({
      width: opts.width ?? 800,
      height: opts.height ?? 600,
      parent: mainWindow ?? undefined,
      frame: false,
      backgroundColor: '#0a0e17',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    applyWindowOpenHandler(child)

    if (process.env.ELECTRON_RENDERER_URL) {
      child.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${opts.route}`)
    } else {
      child.loadURL(`http://127.0.0.1:${rendererPort}/index.html#${opts.route}`)
    }
  })

  ipcMain.handle('search-incidents', (_event, query: string) => {
    if (typeof query !== 'string' || query.length > 500) return []
    const cache = new CacheManager()
    return cache.searchIncidents(query)
  })

  ipcMain.handle('get-earthquakes', async () => {
    const t0 = Date.now()
    try { const r = await trackingService.getEarthquakes(); sendMainLog('info', 'tracking', `Earthquakes fetched: ${Array.isArray(r) ? r.length : 0} events (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-earthquakes failed', err?.message); return [] }
  })
  ipcMain.handle('get-disasters', async () => {
    const t0 = Date.now()
    try { const r = await trackingService.getNaturalDisasters(); sendMainLog('info', 'tracking', `Natural disasters fetched: ${Array.isArray(r) ? r.length : 0} events (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-disasters failed', err?.message); return [] }
  })
  ipcMain.handle('get-flights', async (_event, bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
    const t0 = Date.now()
    try { const r = await trackingService.getFlights(bounds); sendMainLog('debug', 'tracking', `Flights fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-flights failed', err?.message); return [] }
  })
  ipcMain.handle('get-vessels', async () => {
    const t0 = Date.now()
    try { const r = await trackingService.getVessels(); sendMainLog('info', 'tracking', `Vessels fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-vessels failed', err?.message); return [] }
  })
  ipcMain.handle('get-flight-metadata', async (_event, icao24: string) => {
    try { return await trackingService.getFlightMetadata(icao24) }
    catch (err: any) { sendMainLog('error', 'tracking', `get-flight-metadata failed for ${icao24}`, err?.message); return null }
  })
  ipcMain.handle('get-flight-route', async (_event, callsign: string) => {
    try { return await trackingService.getFlightRoute(callsign) }
    catch (err: any) { sendMainLog('error', 'tracking', `get-flight-route failed for ${callsign}`, err?.message); return null }
  })

  ipcMain.handle('get-satellites', async () => {
    const t0 = Date.now()
    try { const r = await satelliteService.getSatellites(); sendMainLog('info', 'tracking', `Satellites fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-satellites failed', err?.message); return [] }
  })
  ipcMain.handle('get-vip-tweets', async (_event, accounts?: any[]) => {
    const t0 = Date.now()
    try { const r = await vipTweetService.getVIPTweets(accounts); sendMainLog('info', 'twitter', `VIP tweets fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'twitter', 'get-vip-tweets failed', err?.message); return [] }
  })

  // Data service handlers
  ipcMain.handle('get-sanctions', async () => {
    const t0 = Date.now()
    try { const r = await sanctionsService.getSanctionsList(); sendMainLog('info', 'api', `Sanctions fetched: ${Array.isArray(r) ? r.length : 0} entities (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-sanctions failed', err?.message); return [] }
  })
  ipcMain.handle('check-sanctions', async (_event, text: string) => {
    if (typeof text !== 'string' || text.length > 5000) return []
    try { const r = await sanctionsService.checkText(text); sendMainLog('debug', 'api', `Sanctions check completed for "${text.slice(0, 40)}..."`); return r }
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
      const cache = new CacheManager()
      return entityExtractionService.extractFromIncidents(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-entities:', err); sendMainLog('error', 'ipc', 'get-entities failed', String(err)); return [] }
  })
  ipcMain.handle('get-sentiment', () => {
    try {
      const cache = new CacheManager()
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
      const cache = new CacheManager()
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
  ipcMain.handle('query-incidents', (_event, query: string) => {
    if (typeof query !== 'string' || query.length > 500) return []
    const cache = new CacheManager()
    const all = cache.getIncidents()
    const lower = query.toLowerCase()
    return all.filter(i => (i.title ?? '').toLowerCase().includes(lower) || (i.description ?? '').toLowerCase().includes(lower) || (i.country ?? '').toLowerCase().includes(lower)).slice(0, 50)
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
    sendMainLog('info', 'api', `Removing Telegram channel: ${name}`)
    return telegramService.removeCustomChannel(name)
  })
  ipcMain.handle('get-iocs', async () => {
    const t0 = Date.now()
    try { const r = await iocService.getIndicators(); sendMainLog('info', 'api', `IoCs fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'api', 'get-iocs failed', err?.message); return [] }
  })
  ipcMain.handle('extract-iocs', async (_event, text: string) => {
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

  ipcMain.handle('clear-old-incidents', (_event, days: number) => {
    if (typeof days !== 'number' || days < 1) {
      console.warn('[IPC] clear-old-incidents called with invalid days:', days)
      return { deleted: 0, remaining: [] }
    }
    const cache = new CacheManager()
    const deleted = cache.cleanOldIncidents(days)
    const remaining = cache.getIncidents()
    return { deleted, remaining }
  })

  ipcMain.handle('get-anomalies', () => {
    try {
      const cache = new CacheManager()
      return anomalyEngine.detectAnomalies(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-anomalies:', err); sendMainLog('error', 'ipc', 'get-anomalies failed', String(err)); return [] }
  })
  ipcMain.handle('get-predictive-risk', () => {
    try {
      const cache = new CacheManager()
      return anomalyEngine.predictRisk(cache.getIncidents())
    } catch (err) { console.error('[IPC] get-predictive-risk:', err); sendMainLog('error', 'ipc', 'get-predictive-risk failed', String(err)); return [] }
  })

  ipcMain.handle('detach-window', (_event, type: string) => {
    const { screen: electronScreen } = require('electron') as typeof import('electron')
    const displays = electronScreen.getAllDisplays()
    const targetDisplay = displays.length > 1 ? displays[1] : displays[0]
    const { x, y, width, height } = targetDisplay.workArea
    const win = new BrowserWindow({
      x: x + 50, y: y + 50, width: Math.min(1200, width - 100), height: Math.min(800, height - 100),
      frame: true, title: `Argus — ${type}`,
      webPreferences: { preload: join(__dirname, '../preload/index.js'), nodeIntegration: false, contextIsolation: true },
    })
    win.loadURL(mainWindow?.webContents?.getURL() || `http://127.0.0.1:${rendererPort}/index.html`)
    return { windowId: win.id }
  })

  // ─── YouTube Channel → Live Video ID resolver ───
  const liveCache = new Map<string, { videoId: string | null; ts: number }>()

  function fetchPage(pageUrl: string, maxRedirects = 5): Promise<string> {
    const { net } = require('electron') as typeof import('electron')
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects'))
      const req = net.request({ url: pageUrl, method: 'GET', redirect: 'follow' })
      let body = ''
      req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
      req.setHeader('Accept-Language', 'en-US,en;q=0.9')
      req.on('response', (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
          const loc = Array.isArray(res.headers['location']) ? res.headers['location'][0] : res.headers['location']
          fetchPage(loc, maxRedirects - 1).then(resolve).catch(reject)
          return
        }
        res.on('data', (chunk) => { body += chunk.toString() })
        res.on('end', () => resolve(body))
      })
      req.on('error', reject)
      req.end()
    })
  }

  // Resolve YouTube channel ID → live video ID (for embed)
  // Periodically clean stale liveCache entries
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of liveCache) {
      if (now - val.ts > 10 * 60 * 1000) liveCache.delete(key)
    }
  }, 5 * 60 * 1000)

  ipcMain.handle('resolve-yt-live', async (_event, channelId: string) => {
    if (typeof channelId !== 'string' || !/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) return null
    const cached = liveCache.get(channelId)
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.videoId // cache 5min
    try {
      const html = await fetchPage(`https://www.youtube.com/channel/${channelId}/live`)
      // Check if actually live
      const isLive = html.includes('"isLiveNow":true') || html.includes('"isLive":true')
      let videoId: string | null = null
      if (isLive) {
        const m = html.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/) || html.match(/watch\?v=([a-zA-Z0-9_-]{11})/)
        videoId = m?.[1] || null
      }
      console.log(`[YT Live] ${channelId} → ${videoId ? `video ${videoId}` : 'no live stream'}`)
      liveCache.set(channelId, { videoId, ts: Date.now() })
      return videoId
    } catch (err) {
      console.error(`[YT Live] Failed to resolve ${channelId}:`, err)
      liveCache.set(channelId, { videoId: null, ts: Date.now() })
      return null
    }
  })

  ipcMain.handle('ai-summarize', async (_event, query: string) => {
    if (typeof query !== 'string' || query.length < 2) return { summary: 'Invalid query', model: 'none' }
    sendMainLog('info', 'ai', `AI summarize request: "${query.slice(0, 80)}..."`)
    const t0 = Date.now()
    const cache = new CacheManager()
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
        : `Custom AI endpoint (${cfg.customUrl}) is not responding.`
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
  ipcMain.handle('ai-config-set', (_event, updates: any) => {
    if (!updates || typeof updates !== 'object') return aiService.getConfig()
    aiService.updateConfig(updates)
    sendMainLog('info', 'ai', `AI config updated: provider=${updates.provider || 'unchanged'}`)
    return aiService.getConfig()
  })

  ipcMain.handle('ai-analyze-incident', async (_event, incident: any) => {
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
      const cache = new CacheManager()
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
      const cache = new CacheManager()
      const incidents = cache.getIncidents()
      const result = await aiService.analyzeEntities(incidents)
      sendMainLog('debug', 'ai', `[AI-DEBUG] entities raw (${result.summary.length} chars)`, JSON.stringify(result.summary).slice(0, 2000))
      return result
    } catch (err: any) {
      console.error('[IPC] ai-entities failed:', err?.message)
      return { summary: `AI Error: ${err.message}`, model: 'error' }
    }
  })

  const apiKeyMgr = getApiKeyManager()
  ipcMain.handle('get-api-keys', () => apiKeyMgr.getAll())
  ipcMain.handle('set-api-key', (_event, name: string, value: string) => {
    if (typeof name !== 'string' || typeof value !== 'string') return apiKeyMgr.getAll()
    if (value.length > 500) return apiKeyMgr.getAll()
    apiKeyMgr.set(name, value) // set() validates against VALID_KEY_IDS internally
    sendMainLog('info', 'system', `API key set: ${name}`)
    if (name === 'opensky_user' || name === 'opensky_pass') trackingService.resetOpenSkyAuth()
    return apiKeyMgr.getAll()
  })
  ipcMain.handle('delete-api-key', (_event, name: string) => {
    if (typeof name !== 'string') return apiKeyMgr.getAll()
    apiKeyMgr.delete(name) // delete() validates against VALID_KEY_IDS internally
    sendMainLog('info', 'system', `API key deleted: ${name}`)
    if (name === 'opensky_user' || name === 'opensky_pass') trackingService.resetOpenSkyAuth()
    return apiKeyMgr.getAll()
  })
  ipcMain.handle('test-api-key', async (_event, name: string) => {
    sendMainLog('info', 'system', `Testing API key: ${name}`)
    try {
      const r = await apiKeyMgr.test(name)
      sendMainLog('info', 'system', `API key test ${name}: ${r.success ? 'OK' : 'FAIL'} — ${r.message || ''}`)
      return r
    } catch (err: any) {
      sendMainLog('error', 'system', `API key test ${name} failed`, err?.message)
      return { success: false, message: err.message || 'Test failed' }
    }
  })

  ipcMain.handle('companion-start', async () => {
    sendMainLog('info', 'network', 'Starting companion server...')
    try {
      const info = await companionServer.start()
      sendMainLog('info', 'network', `Companion server started on port ${info?.port || 'unknown'}`)
      return { success: true, ...info }
    } catch (err: any) {
      sendMainLog('error', 'network', 'Companion server start failed', err?.message)
      return { success: false, error: err.message }
    }
  })
  ipcMain.handle('companion-stop', () => { companionServer.stop(); sendMainLog('info', 'network', 'Companion server stopped'); return { success: true } })
  ipcMain.handle('companion-info', () => companionServer.getConnectionInfo())
  ipcMain.handle('companion-push-incident', (_event, incident: any) => {
    if (!incident || typeof incident !== 'object' || typeof incident.id !== 'string') return { pushed: 0 }
    companionServer.pushIncident(incident)
    const count = companionServer.getClientCount()
    sendMainLog('debug', 'network', `Incident pushed to ${count} companion client(s)`)
    return { pushed: count }
  })
}

async function initializeServices(): Promise<void> {
  const startTime = Date.now()
  const cache = new CacheManager()

  sendMainLog('info', 'system', 'Initializing services...')

  feedAggregator = new FeedAggregator()
  feedAggregator.registerProvider('CONFLICT', new ConflictFeedProvider())
  feedAggregator.registerProvider('CYBER', new CyberFeedProvider())
  feedAggregator.registerProvider('INTEL', new IntelFeedProvider())
  feedAggregator.registerProvider('FINANCE', new FinanceFeedProvider())
  sendMainLog('info', 'feed', 'Feed providers registered: CONFLICT, CYBER, INTEL, FINANCE')

  registerIncidentHandlers()
  registerFeedHandlers(feedAggregator)
  registerWindowHandlers()
  setCompanionServer(companionServer)
  sendMainLog('info', 'system', 'IPC handlers registered')

  vipTweetService.setNewTweetCallback((tweet) => {
    sendMainLog('info', 'twitter', `New VIP tweet from @${tweet?.author || 'unknown'}`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vip-tweet-alert', tweet)
    }
  })

  entityExtractionService.setSanctionsService(sanctionsService)
  sanctionsService.getSanctionsList().catch(() => {})

  await feedAggregator.initialize()
  sendMainLog('info', 'feed', 'Feed aggregator initialized')

  cache.reclassifyAllIncidents(classifyDomain, classifySeverity, isOffTopic)
  sendMainLog('info', 'database', 'Incident reclassification completed')

  const cachedCount = cache.getIncidentCount()
  console.log(`[Startup] ${cachedCount} incidents loaded from cache`)
  sendMainLog('info', 'system', `${cachedCount} incidents loaded from cache`)

  if (cachedCount > 0) {
    setTimeout(() => {
      console.log('[Startup] Background refresh of stale feeds...')
      sendMainLog('info', 'feed', 'Background refresh of stale feeds started')
      feedAggregator?.refreshAll()
    }, 10000)
  } else {
    setTimeout(() => {
      console.log('[Startup] No cache found, fetching all feeds...')
      sendMainLog('info', 'feed', 'No cache found, fetching all feeds')
      feedAggregator?.refreshAll()
    }, 3000)
  }

  feedAggregator.startAutoRefresh(300000)
  sendMainLog('info', 'feed', 'Auto-refresh started (interval: 5min)')

  anomalyEngine.setCascadeCallback((alert) => {
    sendMainLog('warn', 'system', `Cascade alert triggered: ${alert?.type || 'unknown'} — ${alert?.message || ''}`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cascade-alert', alert)
    }
  })

  cascadeInterval = setInterval(() => {
    const cache = new CacheManager()
    anomalyEngine.detectCascades(cache.getIncidents())
  }, 300000)

  // Proactive tweet fetch on startup + auto-refresh
  setTimeout(() => {
    sendMainLog('info', 'twitter', 'Initial VIP tweet fetch starting...')
    vipTweetService.getVIPTweets()
      .then(r => sendMainLog('info', 'twitter', `Initial VIP tweets: ${Array.isArray(r) ? r.length : 0}`))
      .catch(err => sendMainLog('error', 'twitter', 'Initial VIP tweet fetch failed', err?.message))
  }, 15000)
  tweetInterval = setInterval(() => {
    vipTweetService.getVIPTweets().catch(() => {})
  }, 120000)

  const deleted = cache.cleanOldIncidents(30)
  if (deleted > 0) {
    console.log(`[Startup] Cleaned ${deleted} incidents older than 30 days`)
    sendMainLog('info', 'database', `Cleaned ${deleted} incidents older than 30 days`)
  }

  sendMainLog('info', 'system', `All services initialized (${Date.now() - startTime}ms)`)
}

app.whenReady().then(async () => {
  // Start local HTTP server for renderer files in packaged builds.
  // YouTube blocks iframe embeds from file:// and custom scheme origins (Error 153).
  // Serving from http://127.0.0.1:PORT provides a valid origin that YouTube accepts.
  if (!process.env.ELECTRON_RENDERER_URL) {
    const rendererDir = join(__dirname, '../renderer')
    await startRendererServer(rendererDir)
  }

  // Block ad/tracking domains from YouTube embeds
  const adBlockPatterns = [
    '*://googleads.g.doubleclick.net/*',
    '*://static.doubleclick.net/*',
    '*://ad.doubleclick.net/*',
    '*://www.googleadservices.com/*',
    '*://pagead2.googlesyndication.com/*',
    '*://tpc.googlesyndication.com/*',
    '*://www.google-analytics.com/*',
    '*://play.google.com/log*',
  ]
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: adBlockPatterns },
    (_details, callback) => callback({ cancel: true })
  )

  // CSP: allow YouTube/Twitch iframe embeds + localhost renderer origin
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://127.0.0.1:*;" +
          " script-src 'self' http://127.0.0.1:* 'unsafe-inline' 'unsafe-eval' blob:;" +
          " style-src 'self' http://127.0.0.1:* 'unsafe-inline' https://fonts.googleapis.com;" +
          " font-src 'self' http://127.0.0.1:* https://fonts.gstatic.com;" +
          " img-src 'self' http://127.0.0.1:* data: blob: https: http:;" +
          " connect-src 'self' http://127.0.0.1:* https: http: ws: wss:;" +
          " worker-src 'self' http://127.0.0.1:* blob:;" +
          " child-src 'self' http://127.0.0.1:* blob:;" +
          " frame-src 'self' http://127.0.0.1:* blob: https://www.youtube.com https://youtube.com https://*.youtube.com https://player.twitch.tv;" +
          " media-src 'self' http://127.0.0.1:* blob: https: http:;" +
          " object-src 'none';" +
          " base-uri 'self' http://127.0.0.1:*;" +
          " form-action 'self' http://127.0.0.1:*;"
        ],
      },
    })
  })

  await initializeServices()
  createWindow()
  sendMainLog('info', 'system', `Argus v${app.getVersion()} started (Electron ${process.versions.electron}, Chrome ${process.versions.chrome})`)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch(err => { console.error('Fatal startup error:', err); sendMainLog('error', 'system', 'Fatal startup error', String(err)); app.quit() })

function cleanupBeforeQuit() {
  try { if (cascadeInterval) clearInterval(cascadeInterval) } catch {}
  try { if (tweetInterval) clearInterval(tweetInterval) } catch {}
  try { feedAggregator?.stopAutoRefresh() } catch {}
  try { companionServer.stop() } catch {}
  try {
    if (rendererServer) {
      rendererServer.close()
      rendererServer = null
    }
  } catch {}
  try { closeDatabase() } catch {}
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupBeforeQuit()
    app.quit()
  }
})

app.on('before-quit', () => {
  cleanupBeforeQuit()
})
