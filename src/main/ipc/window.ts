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
  ipcMain.handle('window-minimize', () => getMainWindow()?.minimize())
  ipcMain.handle('window-maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window-close', (event) => {
    const mainWindow = getMainWindow()
    // Find which window made the request — close it specifically.
    // If it is the main window, also tear down auxiliary windows so the app fully quits.
    const senderWin = BrowserWindow.fromWebContents(event.sender)
    if (senderWin && senderWin !== mainWindow && !senderWin.isDestroyed()) {
      senderWin.close()
      return
    }
    // Main window close — close detached panels, then quit the app
    try { windowManager.closeAll() } catch {}
    for (const w of BrowserWindow.getAllWindows()) {
      if (w !== mainWindow && !w.isDestroyed()) {
        try { w.close() } catch {}
      }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
    // On macOS, closing the main window does not quit by default. The user clicking
    // the explicit close button in our custom titlebar is a quit intent — honor it.
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
      // Frameless on Win/Linux (we render our own TopBar with controls).
      // On macOS, use hiddenInset so native traffic lights remain available.
      frame: process.platform === 'darwin',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      autoHideMenuBar: true,
      backgroundColor: '#0a0e17',
      ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 12, y: 14 } } : {}),
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
    })
    applyWindowOpenHandler(win)
    // Build the URL deterministically from the renderer source instead of relying on
    // mainWindow.webContents.getURL(), which can return '' if called before the page
    // commits a navigation. Falling back to that produced ERR_INVALID_URL.
    const devUrl = process.env.ELECTRON_RENDERER_URL
    const targetUrl = devUrl
      ? `${devUrl}?mode=panels-only`
      : `http://127.0.0.1:${getRendererPort()}/index.html?mode=panels-only`
    win.loadURL(targetUrl)
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
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, nodeIntegration: false, contextIsolation: true },
    })
    const devUrl = process.env.ELECTRON_RENDERER_URL
    win.loadURL(devUrl || `http://127.0.0.1:${getRendererPort()}/index.html`)
    return { windowId: win.id }
  })
}
