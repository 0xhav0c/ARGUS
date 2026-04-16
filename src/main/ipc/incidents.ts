import { ipcMain, BrowserWindow } from 'electron'
import { getCacheManager } from '../services/cache-manager'
import type { CompanionServer } from '../services/companion-server'

const cache = getCacheManager()
let companionRef: CompanionServer | null = null

export function setCompanionServer(server: CompanionServer): void {
  companionRef = server
}

export function registerIncidentHandlers(): void {
  ipcMain.handle('get-incidents', (_event, filters?: Record<string, unknown>) => {
    return cache.getIncidents(filters)
  })

  ipcMain.handle('get-incident-counts', () => {
    return cache.getIncidentCounts()
  })

  ipcMain.handle('get-settings', () => {
    // Filter out API keys — they must never reach the renderer
    const all = cache.getSettings()
    return Object.fromEntries(
      Object.entries(all).filter(([k]) => !k.startsWith('api_key_'))
    )
  })

  const ALLOWED_SETTINGS = new Set([
    'language', 'theme', 'refreshInterval', 'notificationsEnabled', 'soundEnabled',
    'ttsEnabled', 'ttsVoice', 'ttsRate', 'companionEnabled', 'companionPort',
    'mapStyle', 'defaultZoom', 'autoRotate', 'showLabels', 'heatmapEnabled',
  ])

  ipcMain.handle('update-settings', (_event, settings: Record<string, unknown>) => {
    if (!settings || typeof settings !== 'object') return
    for (const [key, value] of Object.entries(settings)) {
      if (!ALLOWED_SETTINGS.has(key)) continue
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
      const strVal = typeof value === 'string' ? value : JSON.stringify(value)
      if (strVal.length > 10000) continue
      cache.setSetting(key, strVal)
    }
  })
}

export function broadcastIncidentUpdate(incident: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('incident-update', incident)
    }
  }
  if (companionRef) {
    try { companionRef.pushIncident(incident as any) } catch {}
  }
}
