import { BrowserWindow, screen, shell } from 'electron'
import path from 'path'

interface DetachedPanel {
  id: string
  window: BrowserWindow
  type: string
}

class WindowManager {
  private panels: Map<string, DetachedPanel> = new Map()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win
  }

  detachPanel(type: string, title: string): string {
    const id = `panel-${type}-${Date.now()}`

    const displays = screen.getAllDisplays()
    const mainBounds = this.mainWindow?.getBounds()

    // Try to open on a different monitor if available
    let x = (mainBounds?.x ?? 100) + 50
    let y = (mainBounds?.y ?? 100) + 50

    if (displays.length > 1 && mainBounds) {
      const currentDisplay = screen.getDisplayNearestPoint({ x: mainBounds.x, y: mainBounds.y })
      const otherDisplay = displays.find((d) => d.id !== currentDisplay.id)
      if (otherDisplay) {
        x = otherDisplay.bounds.x + 50
        y = otherDisplay.bounds.y + 50
      }
    }

    const win = new BrowserWindow({
      width: 800,
      height: 600,
      x,
      y,
      title: `Argus - ${title}`,
      frame: true,
      autoHideMenuBar: true,
      backgroundColor: '#0a0e17',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    win.webContents.setWindowOpenHandler((details) => {
      try {
        const parsed = new URL(details.url)
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          shell.openExternal(details.url)
        }
      } catch {}
      return { action: 'deny' }
    })

    const mainUrl = this.mainWindow?.webContents.getURL()
    if (mainUrl) {
      const base = mainUrl.split('#')[0].split('?')[0]
      win.loadURL(`${base}?panel=${encodeURIComponent(type)}`)
    }

    win.on('closed', () => {
      this.panels.delete(id)
    })

    this.panels.set(id, { id, window: win, type })
    return id
  }

  closePanel(id: string) {
    const panel = this.panels.get(id)
    if (panel && !panel.window.isDestroyed()) {
      panel.window.close()
    }
    this.panels.delete(id)
  }

  getActivePanels(): Array<{ id: string; type: string }> {
    return Array.from(this.panels.values()).map((p) => ({ id: p.id, type: p.type }))
  }

  closeAll() {
    for (const panel of this.panels.values()) {
      if (!panel.window.isDestroyed()) panel.window.close()
    }
    this.panels.clear()
  }
}

export const windowManager = new WindowManager()
