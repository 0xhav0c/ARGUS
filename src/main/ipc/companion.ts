import { ipcMain } from 'electron'
import type { CompanionServer } from '../services/companion-server'

type LogFn = (level: string, category: string, message: string, detail?: string) => void

export function registerCompanionHandlers(
  companionServer: CompanionServer,
  sendMainLog: LogFn
): void {
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
  ipcMain.handle('companion-push-incident', (_event, incident: Record<string, unknown>) => {
    if (!incident || typeof incident !== 'object' || typeof incident.id !== 'string') return { pushed: 0 }
    companionServer.pushIncident(incident as any)
    const count = companionServer.getClientCount()
    sendMainLog('debug', 'network', `Incident pushed to ${count} companion client(s)`)
    return { pushed: count }
  })
}
