import { ipcMain } from 'electron'

const liveCache = new Map<string, { videoId: string | null; ts: number }>()

function fetchPage(pageUrl: string, maxRedirects = 5): Promise<string> {
  const { net } = require('electron') as typeof import('electron')
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'))
    const req = net.request({ url: pageUrl, method: 'GET', redirect: 'follow' })
    let body = ''
    req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    req.setHeader('Accept-Language', 'en-US,en;q=0.9')
    req.on('response', (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
        const loc = Array.isArray(res.headers['location']) ? res.headers['location'][0] : res.headers['location']
        fetchPage(loc, maxRedirects - 1).then(resolve).catch(reject)
        return
      }
      res.on('data', (chunk) => { body += chunk.toString() })
      res.on('end', () => resolve(body))
    })
    req.on('error', reject)
    req.end()
  })
}

export function registerYouTubeHandlers(): void {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of liveCache) {
      if (now - val.ts > 10 * 60 * 1000) liveCache.delete(key)
    }
  }, 5 * 60 * 1000)

  ipcMain.handle('resolve-yt-live', async (_event, channelId: string) => {
    if (typeof channelId !== 'string' || !/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) return null
    const cached = liveCache.get(channelId)
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.videoId
    try {
      const html = await fetchPage(`https://www.youtube.com/channel/${channelId}/live`)
      const isLive = html.includes('"isLiveNow":true') || html.includes('"isLive":true')
      let videoId: string | null = null
      if (isLive) {
        const m = html.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/) || html.match(/watch\?v=([a-zA-Z0-9_-]{11})/)
        videoId = m?.[1] || null
      }
      console.log(`[YT Live] ${channelId} → ${videoId ? `video ${videoId}` : 'no live stream'}`)
      liveCache.set(channelId, { videoId, ts: Date.now() })
      return videoId
    } catch (err) {
      console.error(`[YT Live] Failed to resolve ${channelId}:`, err)
      liveCache.set(channelId, { videoId: null, ts: Date.now() })
      return null
    }
  })
}
