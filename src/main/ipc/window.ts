import { BrowserWindow, ipcMain, Notification, shell } from 'electron'
import { join } from 'path'
import { windowManager } from '../services/window-manager'

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

export { applyWindowOpenHandler }

export function registerWindowHandlers(
  mainWindow: BrowserWindow | null,
  getRendererPort: () => number
): void {
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

  ipcMain.handle('navigate-to-incident', (_event, incident: unknown) => {
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
      child.loadURL(`http://127.0.0.1:${getRendererPort()}/index.html#${opts.route}`)
    }
  })

  ipcMain.handle('get-app-version', () => {
    const { app } = require('electron') as typeof import('electron')
    return app.getVersion()
  })
  ipcMain.handle('get-app-uptime', () => Math.floor(process.uptime()))

  ipcMain.handle('detach-window', (_event, type: string) => {
    const { screen: electronScreen } = require('electron') as typeof import('electron')
    const displays = electronScreen.getAllDisplays()
    const targetDisplay = displays.length > 1 ? displays[1] : displays[0]
    const { x, y, width, height } = targetDisplay.workArea
    const win = new BrowserWindow({
      x: x + 50, y: y + 50, width: Math.min(1200, width - 100), height: Math.min(800, height - 100),
      frame: true, title: `Argus — ${type}`,
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, nodeIntegration: false, contextIsolation: true },
    })
    win.loadURL(mainWindow?.webContents?.getURL() || `http://127.0.0.1:${getRendererPort()}/index.html`)
    return { windowId: win.id }
  })
}
