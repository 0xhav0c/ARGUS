import { BrowserWindow, ipcMain, Notification, shell, app } from 'electron'
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
  getMainWindow: () => BrowserWindow | null,
  getRendererPort: () => number
): void {
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) win.minimize()
  })
  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window-close', (event) => {
    const mainWindow = getMainWindow()
    let senderWin: BrowserWindow | null = null
    try { senderWin = BrowserWindow.fromWebContents(event.sender) } catch {}
    if (senderWin && senderWin !== mainWindow && !senderWin.isDestroyed()) {
      senderWin.close()
      return
    }
    try { windowManager.closeAll() } catch {}
    for (const w of BrowserWindow.getAllWindows()) {
      if (w !== mainWindow && !w.isDestroyed()) {
        try { w.close() } catch {}
      }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
    setTimeout(() => { try { app.quit() } catch {} }, 100)
  })
  ipcMain.handle('window-is-maximized', () => getMainWindow()?.isMaximized() ?? false)
  ipcMain.handle('window-is-fullscreen', () => getMainWindow()?.isFullScreen() ?? false)
  ipcMain.handle('window-toggle-fullscreen', () => {
    const mainWindow = getMainWindow()
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
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote-navigate-incident', incident)
      mainWindow.focus()
    }
  })

  let panelsWindow: BrowserWindow | null = null
  ipcMain.handle('detach-panels', () => {
    const mainWindow = getMainWindow()
    // Already detached — focus existing window instead of opening a duplicate.
    if (panelsWindow && !panelsWindow.isDestroyed()) {
      panelsWindow.focus()
      return { windowId: panelsWindow.id }
    }
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
      frame: process.platform === 'darwin',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      autoHideMenuBar: true,
      backgroundColor: '#0a0e17',
      show: false,
      ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 12, y: 14 } } : {}),
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
    })
    applyWindowOpenHandler(win)
    let shown = false
    const showOnce = () => { if (!shown && !win.isDestroyed()) { shown = true; win.show() } }
    win.on('ready-to-show', showOnce)
    win.webContents.on('did-finish-load', showOnce)
    const showTimer = setTimeout(showOnce, 5000)
    win.on('closed', () => clearTimeout(showTimer))
    win.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[Detach] Load failed: ${code} ${desc} ${url}`)
      showOnce()
    })
    const devUrl = process.env.ELECTRON_RENDERER_URL
    let targetUrl: string
    if (devUrl) {
      const sep = devUrl.includes('?') ? '&' : '?'
      targetUrl = `${devUrl}${sep}mode=panels-only`
    } else {
      targetUrl = `http://127.0.0.1:${getRendererPort()}/index.html?mode=panels-only`
    }
    console.log(`[Detach] Loading panels window: ${targetUrl}`)
    win.loadURL(targetUrl).catch(err => console.error('[Detach] loadURL error:', err))
    panelsWindow = win
    mainWindow?.webContents.send('panels-detached', true)
    win.on('closed', () => {
      panelsWindow = null
      const mw = getMainWindow()
      if (mw && !mw.isDestroyed()) {
        mw.webContents.send('panels-detached', false)
      }
    })
    return { windowId: win.id }
  })

  ipcMain.handle('open-child-window', (_event, opts: { route: string; width?: number; height?: number }) => {
    const child = new BrowserWindow({
      width: opts.width ?? 800,
      height: opts.height ?? 600,
      parent: getMainWindow() ?? undefined,
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
      show: false,
      backgroundColor: '#0a0e17',
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, nodeIntegration: false, contextIsolation: true },
    })
    applyWindowOpenHandler(win)
    let shown = false
    const showOnce = () => { if (!shown && !win.isDestroyed()) { shown = true; win.show() } }
    win.on('ready-to-show', showOnce)
    win.webContents.on('did-finish-load', showOnce)
    const showTimer = setTimeout(showOnce, 5000)
    win.on('closed', () => clearTimeout(showTimer))
    const devUrl = process.env.ELECTRON_RENDERER_URL
    const base = devUrl || `http://127.0.0.1:${getRendererPort()}/index.html`
    const sep = base.includes('?') ? '&' : '?'
    win.loadURL(`${base}${sep}mode=panels-only`).catch(err => console.error('[DetachWindow] loadURL error:', err))
    return { windowId: win.id }
  })
}
