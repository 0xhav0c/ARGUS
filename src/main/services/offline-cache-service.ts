import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs'

const CACHE_DIR = join(app.getPath('userData'), 'tile-cache')
const MAX_CACHE_SIZE_MB = 500
const MAX_TILE_AGE_DAYS = 30

export class OfflineCacheService {
  private initialized = false

  init() {
    if (this.initialized) return
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
    this.initialized = true
    console.log(`[OfflineCache] Cache dir: ${CACHE_DIR}`)
  }

  cacheTile(url: string, data: Buffer): void {
    this.init()
    const key = this.urlToKey(url)
    const filePath = join(CACHE_DIR, key)
    try {
      writeFileSync(filePath, data)
    } catch (err) {
      console.error('[OfflineCache] Write failed:', err)
    }
  }

  getTile(url: string): Buffer | null {
    this.init()
    const key = this.urlToKey(url)
    const filePath = join(CACHE_DIR, key)
    try {
      if (existsSync(filePath)) return readFileSync(filePath)
    } catch { /* miss */ }
    return null
  }

  getCacheStats(): { sizeBytes: number; tileCount: number; dir: string } {
    this.init()
    let sizeBytes = 0
    let tileCount = 0
    try {
      const files = readdirSync(CACHE_DIR)
      for (const f of files) {
        const stat = statSync(join(CACHE_DIR, f))
        sizeBytes += stat.size
        tileCount++
      }
    } catch { /* ignore */ }
    return { sizeBytes, tileCount, dir: CACHE_DIR }
  }

  clearCache(): number {
    this.init()
    let count = 0
    try {
      const files = readdirSync(CACHE_DIR)
      for (const f of files) {
        try {
          const { unlinkSync } = require('fs')
          unlinkSync(join(CACHE_DIR, f))
          count++
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
    console.log(`[OfflineCache] Cleared ${count} tiles`)
    return count
  }

  cleanOldTiles(): number {
    this.init()
    const maxAge = MAX_TILE_AGE_DAYS * 86400000
    const now = Date.now()
    let count = 0
    try {
      const files = readdirSync(CACHE_DIR)
      let totalSize = 0
      const fileStats = files.map(f => {
        const path = join(CACHE_DIR, f)
        const stat = statSync(path)
        totalSize += stat.size
        return { path, size: stat.size, mtime: stat.mtimeMs }
      }).sort((a, b) => a.mtime - b.mtime)

      for (const f of fileStats) {
        const tooOld = (now - f.mtime) > maxAge
        const tooBig = totalSize > MAX_CACHE_SIZE_MB * 1024 * 1024
        if (tooOld || tooBig) {
          try {
            const { unlinkSync } = require('fs')
            unlinkSync(f.path)
            totalSize -= f.size
            count++
          } catch { /* skip */ }
        }
      }
    } catch { /* ignore */ }
    return count
  }

  private urlToKey(url: string): string {
    const { createHash } = require('crypto')
    return createHash('md5').update(url).digest('hex')
  }
}
