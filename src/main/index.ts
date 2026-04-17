import { app, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { createServer, type Server } from 'http'
import { createReadStream, statSync } from 'fs'
import { registerIncidentHandlers, setCompanionServer } from './ipc/incidents'
import { registerFeedHandlers } from './ipc/feeds'
import { registerWindowHandlers, applyWindowOpenHandler } from './ipc/window'
import { registerTrackingHandlers } from './ipc/tracking'
import { registerDataServiceHandlers } from './ipc/data-services'
import { registerAIHandlers } from './ipc/ai'
import { registerApiKeyHandlers } from './ipc/api-keys'
import { registerCompanionHandlers } from './ipc/companion'
import { registerYouTubeHandlers } from './ipc/youtube'
import { FeedAggregator, classifyDomain, classifySeverity, isOffTopic } from './services/feed-aggregator'
import { getCacheManager } from './services/cache-manager'
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
import { OfflineCacheService } from './services/offline-cache-service'
import { SpaceWeatherService } from './services/space-weather-service'
import { DroneService } from './services/drone-service'
import { DarkWebService } from './services/darkweb-service'
import { TelegramService } from './services/telegram-service'
import { IoCService } from './services/ioc-service'
import { closeDatabase } from './database/schema'
import { windowManager } from './services/window-manager'

// ─── Logging ───────────────────────────────────────────────────
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

// ─── Renderer static server (packaged builds) ─────────────────
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
      '.xml': 'application/xml',
    }

    const server = createServer((req, res) => {
      const requestOrigin = req.headers.origin || ''
      const isLocalOrigin = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(requestOrigin)
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': isLocalOrigin ? requestOrigin : 'http://127.0.0.1',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders)
        res.end()
        return
      }

      let urlPath = decodeURIComponent(new URL(req.url || '/', `http://localhost`).pathname)
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html'

      const { resolve: pathResolve } = require('path')
      const filePath = join(rendererDir, urlPath)
      const resolved = pathResolve(filePath)
      const resolvedBase = pathResolve(rendererDir)
      if (!resolved.startsWith(resolvedBase)) {
        res.writeHead(403, corsHeaders)
        res.end('Forbidden')
        return
      }

      // Cesium assets are unpacked from asar to avoid binary read issues
      // on Apple Silicon (createReadStream inside asar is unreliable for images/wasm)
      let actualFilePath = filePath
      if (urlPath.startsWith('/cesium/')) {
        actualFilePath = filePath.replace('app.asar', 'app.asar.unpacked')
      }

      try {
        const stat = statSync(actualFilePath)
        if (!stat.isFile()) {
          const indexPath = join(rendererDir, 'index.html')
          const indexStat = statSync(indexPath)
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html', 'Content-Length': String(indexStat.size) })
          createReadStream(indexPath).pipe(res)
          return
        }

        const ext = actualFilePath.substring(actualFilePath.lastIndexOf('.')).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        res.writeHead(200, { ...corsHeaders, 'Content-Type': contentType, 'Content-Length': String(stat.size) })
        createReadStream(actualFilePath).pipe(res)
      } catch {
        try {
          const indexPath = join(rendererDir, 'index.html')
          const indexStat = statSync(indexPath)
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html', 'Content-Length': String(indexStat.size) })
          createReadStream(indexPath).pipe(res)
        } catch {
          res.writeHead(404, corsHeaders)
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

// ─── Service instances ─────────────────────────────────────────
let mainWindow: BrowserWindow | null = null
let feedAggregator: FeedAggregator | null = null
const cache = getCacheManager()
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

// ─── Window creation ───────────────────────────────────────────
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
    try { windowManager.closeAll() } catch {}
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (win !== mainWindow && !win.isDestroyed()) {
        try { win.close() } catch {}
      }
    }
    // On macOS the app stays alive after window close by default; the user closing the
    // primary window via traffic lights or our custom button is a quit intent.
    if (process.platform === 'darwin') {
      setTimeout(() => { try { app.quit() } catch {} }, 50)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${rendererPort}/index.html`)
  }

  windowManager.setMainWindow(mainWindow)
}

// ─── Service initialization ────────────────────────────────────
async function initializeServices(): Promise<void> {
  const startTime = Date.now()

  sendMainLog('info', 'system', 'Initializing services...')

  feedAggregator = new FeedAggregator()
  feedAggregator.registerProvider('CONFLICT', new ConflictFeedProvider())
  feedAggregator.registerProvider('CYBER', new CyberFeedProvider())
  feedAggregator.registerProvider('INTEL', new IntelFeedProvider())
  feedAggregator.registerProvider('FINANCE', new FinanceFeedProvider())
  sendMainLog('info', 'feed', 'Feed providers registered: CONFLICT, CYBER, INTEL, FINANCE')

  // Register all IPC handler groups
  registerIncidentHandlers()
  registerFeedHandlers(feedAggregator)
  registerWindowHandlers(() => mainWindow, () => rendererPort)
  registerTrackingHandlers(trackingService, satelliteService, vipTweetService, sendMainLog)
  registerDataServiceHandlers({
    sanctionsService, financeDataService, sigintService, conflictZonesService,
    entityExtractionService, cyberThreatService, pandemicService, nuclearService,
    militaryService, briefingService, weatherService, internetInfraService,
    geopoliticalDataService, anomalyEngine, spaceWeatherService, droneService,
    darkWebService, telegramService, iocService, offlineCacheService
  }, cache, sendMainLog)
  registerAIHandlers(aiService, cache, sendMainLog)
  registerApiKeyHandlers(trackingService, sendMainLog)
  registerCompanionHandlers(companionServer, sendMainLog)
  registerYouTubeHandlers()
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
    sendMainLog('warn', 'system', `Cascade alert triggered: ${alert?.type || 'unknown'} — ${alert?.description || ''}`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cascade-alert', alert)
    }
  })

  cascadeInterval = setInterval(() => {
    anomalyEngine.detectCascades(cache.getIncidents())
  }, 300000)

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

// ─── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(async () => {
  if (!process.env.ELECTRON_RENDERER_URL) {
    const rendererDir = join(__dirname, '../renderer')
    await startRendererServer(rendererDir)
  }

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

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.cesium.com/*', 'https://*.arcgisonline.com/*', 'https://*.arcgis.com/*', 'https://*.virtualearth.net/*', 'https://*.bing.com/*'] },
    (details, callback) => {
      delete details.requestHeaders['Origin']
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders }

    const url = details.url || ''
    if (
      url.includes('.cesium.com') ||
      url.includes('.arcgisonline.com') ||
      url.includes('.arcgis.com') ||
      url.includes('.virtualearth.net') ||
      url.includes('.bing.com')
    ) {
      // Strip any existing CORS headers (case-insensitive) before injecting our own —
      // the upstream server already sets `Access-Control-Allow-Origin: *`, so naively
      // adding ours produces a duplicate `*, *` value that browsers reject.
      for (const k of Object.keys(responseHeaders)) {
        const lower = k.toLowerCase()
        if (lower === 'access-control-allow-origin' || lower === 'access-control-allow-methods' || lower === 'access-control-allow-headers') {
          delete responseHeaders[k]
        }
      }
      responseHeaders['Access-Control-Allow-Origin'] = ['*']
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS']
      // Allow any custom request header (e.g. Cesium sends `x-cesium-client-version`).
      responseHeaders['Access-Control-Allow-Headers'] = ['*']
      responseHeaders['Access-Control-Expose-Headers'] = ['*']
    }

    // CSP: tightened where reasonable. Media (HLS/live TV) and OSINT data fetching
    // need broad outbound access — `connect-src` and `media-src` therefore allow
    // any HTTPS host (TV CDNs, RSS endpoints, public APIs we discover at runtime).
    // This is intentional: the threat model assumes the local renderer is trusted
    // (no user-controlled HTML rendering) and the value of restricting outbound
    // hosts here is limited because the main process can fetch arbitrary URLs anyway.
    responseHeaders['Content-Security-Policy'] = [
      "default-src 'self' http://127.0.0.1:*;" +
      " script-src 'self' http://127.0.0.1:* 'unsafe-inline' 'unsafe-eval' blob:;" +
      " style-src 'self' http://127.0.0.1:* 'unsafe-inline' https://fonts.googleapis.com;" +
      " font-src 'self' http://127.0.0.1:* https://fonts.gstatic.com data:;" +
      " img-src 'self' http://127.0.0.1:* data: blob: https: http:;" +
      " connect-src 'self' http://127.0.0.1:* https: wss: ws://localhost:* wss://localhost:* http://localhost:11434;" +
      " worker-src 'self' http://127.0.0.1:* blob:;" +
      " child-src 'self' http://127.0.0.1:* blob:;" +
      " frame-src 'self' http://127.0.0.1:* blob: https://www.youtube.com https://youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv https://embed.twitch.tv;" +
      " media-src 'self' http://127.0.0.1:* blob: data: https: http:;" +
      " object-src 'none';" +
      " base-uri 'self' http://127.0.0.1:*;" +
      " form-action 'self' http://127.0.0.1:*;"
    ]

    callback({ responseHeaders })
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
