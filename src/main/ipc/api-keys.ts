import { ipcMain } from 'electron'
import { getApiKeyManager } from '../services/api-key-manager'
import type { TrackingService } from '../services/tracking-service'

type LogFn = (level: string, category: string, message: string, detail?: string) => void

export function registerApiKeyHandlers(
  trackingService: TrackingService,
  sendMainLog: LogFn
): void {
  const apiKeyMgr = getApiKeyManager()

  ipcMain.handle('get-api-keys', () => apiKeyMgr.getAll())
  ipcMain.handle('set-api-key', (_event, name: string, value: string) => {
    if (typeof name !== 'string' || typeof value !== 'string') return apiKeyMgr.getAll()
    if (value.length > 500) return apiKeyMgr.getAll()
    apiKeyMgr.set(name, value)
    sendMainLog('info', 'system', `API key set: ${name}`)
    return apiKeyMgr.getAll()
  })
  ipcMain.handle('delete-api-key', (_event, name: string) => {
    if (typeof name !== 'string') return apiKeyMgr.getAll()
    apiKeyMgr.delete(name)
    sendMainLog('info', 'system', `API key deleted: ${name}`)
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
}
