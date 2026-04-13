import { ipcMain } from 'electron'
import { CacheManager } from '../services/cache-manager'
import { FeedAggregator } from '../services/feed-aggregator'
import { randomUUID } from 'crypto'

const cache = new CacheManager()
let aggregator: FeedAggregator | null = null

export function registerFeedHandlers(feedAggregator: FeedAggregator): void {
  aggregator = feedAggregator

  ipcMain.handle('get-feeds', () => {
    return cache.getFeeds()
  })

  ipcMain.handle('refresh-feeds', async () => {
    let error: string | undefined
    try {
      if (aggregator) {
        await aggregator.refreshAll()
      }
    } catch (err: any) {
      console.error('[IPC] refresh-feeds failed:', err)
      error = err?.message || 'Feed refresh failed'
    }
    return { feeds: cache.getFeeds(), error }
  })

  ipcMain.handle('add-feed', (_event, opts: { url: string; name?: string; category?: string }) => {
    if (!opts?.url || typeof opts.url !== 'string') return { error: 'URL is required' }
    const url = opts.url.trim()
    if (!/^https?:\/\//i.test(url)) return { error: 'Invalid URL scheme' }
    if (url.length > 2048) return { error: 'URL too long' }
    const feed = {
      id: `custom-${randomUUID()}`,
      name: (opts.name || url).substring(0, 200),
      url,
      category: opts.category || 'custom',
      domain: 'INTEL' as const,
      type: 'rss' as const,
      feedType: 'dedicated' as const,
      refreshInterval: 300,
      enabled: true,
      lastFetched: null,
      itemCount: 0,
      isCustom: true,
    }
    cache.upsertFeed(feed as any)
    return { ok: true, feed }
  })

  ipcMain.handle('remove-feed', (_event, feedId: string) => {
    if (!feedId || typeof feedId !== 'string') return { error: 'Feed ID is required' }
    cache.removeFeed(feedId)
    return { ok: true }
  })

  ipcMain.handle('update-feed', (_event, feedId: string, updates: { name?: string; url?: string; category?: string }) => {
    if (!feedId || typeof feedId !== 'string') return { error: 'Feed ID is required' }
    const feeds = cache.getFeeds()
    const existing = feeds.find(f => f.id === feedId)
    if (!existing) return { error: 'Feed not found' }
    const updated = { ...existing }
    if (updates.name) updated.name = updates.name.trim().substring(0, 200)
    if (updates.url) {
      const url = updates.url.trim()
      if (!/^https?:\/\//i.test(url)) return { error: 'Invalid URL scheme (http/https only)' }
      if (url.length > 2048) return { error: 'URL too long' }
      updated.url = url
    }
    cache.upsertFeed(updated)
    return { ok: true, feed: updated }
  })
}
