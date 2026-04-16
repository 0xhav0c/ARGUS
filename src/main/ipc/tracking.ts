import { ipcMain } from 'electron'
import type { TrackingService } from '../services/tracking-service'
import type { SatelliteService } from '../services/satellite-service'
import type { VIPTweetService } from '../services/vip-tweet-service'

type LogFn = (level: string, category: string, message: string, detail?: string) => void

export function registerTrackingHandlers(
  trackingService: TrackingService,
  satelliteService: SatelliteService,
  vipTweetService: VIPTweetService,
  sendMainLog: LogFn
): void {
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
    let safeBounds = bounds
    if (bounds) {
      const { minLat, maxLat, minLng, maxLng } = bounds
      if ([minLat, maxLat, minLng, maxLng].some(v => typeof v !== 'number' || !isFinite(v))) {
        safeBounds = undefined
      } else {
        safeBounds = {
          minLat: Math.max(-90, Math.min(90, minLat)),
          maxLat: Math.max(-90, Math.min(90, maxLat)),
          minLng: Math.max(-180, Math.min(180, minLng)),
          maxLng: Math.max(-180, Math.min(180, maxLng)),
        }
      }
    }
    try { const r = await trackingService.getFlights(safeBounds); sendMainLog('debug', 'tracking', `Flights fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-flights failed', err?.message); return [] }
  })
  ipcMain.handle('get-vessels', async () => {
    const t0 = Date.now()
    try { const r = await trackingService.getVessels(); sendMainLog('info', 'tracking', `Vessels fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-vessels failed', err?.message); return [] }
  })
  ipcMain.handle('get-flight-metadata', async (_event, icao24: string) => {
    if (typeof icao24 !== 'string' || !/^[a-fA-F0-9]{6}$/.test(icao24)) return null
    try { return await trackingService.getFlightMetadata(icao24) }
    catch (err: any) { sendMainLog('error', 'tracking', `get-flight-metadata failed for ${icao24}`, err?.message); return null }
  })
  ipcMain.handle('get-flight-route', async (_event, callsign: string) => {
    if (typeof callsign !== 'string' || !/^[A-Z0-9]{2,8}$/i.test(callsign.trim())) return null
    try { return await trackingService.getFlightRoute(callsign.trim()) }
    catch (err: any) { sendMainLog('error', 'tracking', `get-flight-route failed for ${callsign}`, err?.message); return null }
  })

  ipcMain.handle('get-satellites', async () => {
    const t0 = Date.now()
    try { const r = await satelliteService.getSatellites(); sendMainLog('info', 'tracking', `Satellites fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'tracking', 'get-satellites failed', err?.message); return [] }
  })
  ipcMain.handle('get-vip-tweets', async (_event, accounts?: unknown[]) => {
    const t0 = Date.now()
    let validAccounts: Array<{ handle: string; name: string; title: string; country: string }> | undefined
    if (Array.isArray(accounts)) {
      validAccounts = accounts
        .filter((a: any) =>
          a && typeof a === 'object' &&
          typeof a.handle === 'string' && /^[a-zA-Z0-9_]{1,15}$/.test(a.handle) &&
          typeof a.name === 'string' && a.name.length <= 100
        )
        .slice(0, 50) as any
    }
    try { const r = await vipTweetService.getVIPTweets(validAccounts); sendMainLog('info', 'twitter', `VIP tweets fetched: ${Array.isArray(r) ? r.length : 0} (${Date.now() - t0}ms)`); return r }
    catch (err: any) { sendMainLog('error', 'twitter', 'get-vip-tweets failed', err?.message); return [] }
  })
}
