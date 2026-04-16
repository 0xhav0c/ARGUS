import { getDatabase, isFallbackMode, getFallbackStore } from '../database/schema'
import type { Incident, FeedSource } from '../../shared/types'
import { resolveLocation } from './geo-resolver'

let _instance: CacheManager | null = null

export function getCacheManager(): CacheManager {
  if (!_instance) _instance = new CacheManager()
  return _instance
}

export class CacheManager {
  upsertIncident(incident: Incident): void {
    if (isFallbackMode()) {
      getFallbackStore().incidents.set(incident.id, incident)
      return
    }

    const db = getDatabase()
    if (!db) return

    const stmt = db.prepare(`
      INSERT INTO incidents (id, title, description, domain, severity, latitude, longitude, country, timestamp, source, source_url, tags, related_ids, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        severity = excluded.severity,
        country = excluded.country,
        tags = excluded.tags,
        metadata = excluded.metadata,
        updated_at = datetime('now')
    `)

    stmt.run(
      incident.id, incident.title, incident.description,
      incident.domain, incident.severity,
      incident.latitude, incident.longitude,
      incident.country ?? '',
      incident.timestamp, incident.source,
      incident.sourceUrl ?? null,
      JSON.stringify(incident.tags),
      JSON.stringify(incident.relatedIds ?? []),
      JSON.stringify(incident.metadata ?? {})
    )
  }

  getIncidents(filters?: Record<string, unknown>): Incident[] {
    if (isFallbackMode()) {
      let incidents = Array.from(getFallbackStore().incidents.values()) as Incident[]
      if (filters?.domain) incidents = incidents.filter(i => i.domain === filters.domain)
      if (filters?.severity) incidents = incidents.filter(i => i.severity === filters.severity)
      return incidents.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 2000)
    }

    const db = getDatabase()
    if (!db) return []

    let query = 'SELECT * FROM incidents'
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters?.domain) { conditions.push('domain = ?'); params.push(filters.domain) }
    if (filters?.severity) { conditions.push('severity = ?'); params.push(filters.severity) }
    if (filters?.since) { conditions.push('timestamp >= ?'); params.push(filters.since) }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
    query += ' ORDER BY timestamp DESC LIMIT 2000'

    const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>
    const incidents = rows.map(this.rowToIncident)

    const needsBackfill = incidents.filter(i => !i.country)
    if (needsBackfill.length > 0) {
      const updateStmt = db.prepare('UPDATE incidents SET country = ? WHERE id = ?')
      const updateMany = db.transaction((items: Incident[]) => {
        for (const i of items) {
          const loc = resolveLocation(i.title + ' ' + (i.description || ''))
          if (loc) {
            i.country = loc.country
            updateStmt.run(loc.country, i.id)
          }
        }
      })
      updateMany(needsBackfill)
      console.log(`[DB] Backfilled country for ${needsBackfill.filter(i => i.country).length}/${needsBackfill.length} incidents`)
    }

    return incidents
  }

  getIncidentCounts(): { total: number; today: number; last24h: number } {
    if (isFallbackMode()) {
      const all = Array.from(getFallbackStore().incidents.values())
      const now = Date.now()
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayMs = todayStart.getTime()
      return {
        total: all.length,
        today: all.filter((i: any) => new Date(i.timestamp).getTime() >= todayMs).length,
        last24h: all.filter((i: any) => now - new Date(i.timestamp).getTime() < 86400000).length,
      }
    }
    const db = getDatabase()
    if (!db) return { total: 0, today: 0, last24h: 0 }
    const total = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any)?.c ?? 0
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const today = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE timestamp >= ?').get(todayStart.toISOString()) as any)?.c ?? 0
    const last24h = (db.prepare('SELECT COUNT(*) as c FROM incidents WHERE timestamp >= ?').get(new Date(Date.now() - 86400000).toISOString()) as any)?.c ?? 0
    return { total, today, last24h }
  }

  reclassifyAllIncidents(
    classifyDomainFn: (...args: any[]) => string,
    classifySeverityFn: (...args: any[]) => string,
    isOffTopicFn: (text: string) => boolean,
  ): number {
    if (isFallbackMode()) return 0
    const db = getDatabase()
    if (!db) return 0

    const rows = db.prepare('SELECT id, title, description, domain, severity FROM incidents').all() as Array<Record<string, unknown>>
    const updateStmt = db.prepare('UPDATE incidents SET domain = ?, severity = ? WHERE id = ?')
    const deleteStmt = db.prepare('DELETE FROM incidents WHERE id = ?')
    let changed = 0
    let removed = 0

    const tx = db.transaction(() => {
      for (const row of rows) {
        const text = (row.title as string) + ' ' + ((row.description as string) || '')
        if (isOffTopicFn(text)) {
          deleteStmt.run(row.id)
          removed++
          continue
        }
        const newDomain = classifyDomainFn(text, row.domain as string, 'general')
        const newSeverity = classifySeverityFn(text, newDomain)
        if (newDomain !== row.domain || newSeverity !== row.severity) {
          updateStmt.run(newDomain, newSeverity, row.id)
          changed++
        }
      }
    })
    tx()
    if (changed > 0 || removed > 0) {
      console.log(`[DB] Reclassified ${changed} incidents, removed ${removed} off-topic`)
    }
    return changed + removed
  }

  private rowToIncident(row: Record<string, unknown>): Incident {
    let tags: string[] = []
    let relatedIds: string[] = []
    let metadata: Record<string, unknown> = {}
    try { tags = JSON.parse((row.tags as string) || '[]') } catch { tags = [] }
    try { relatedIds = JSON.parse((row.related_ids as string) || '[]') } catch { relatedIds = [] }
    try { metadata = JSON.parse((row.metadata as string) || '{}') } catch { metadata = {} }

    return {
      id: row.id as string,
      title: (row.title as string) || '',
      description: (row.description as string) ?? '',
      domain: row.domain as Incident['domain'],
      severity: row.severity as Incident['severity'],
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      country: (row.country as string) || '',
      timestamp: row.timestamp as string,
      source: (row.source as string) || '',
      sourceUrl: row.source_url as string | undefined,
      tags,
      relatedIds,
      metadata
    }
  }

  upsertFeed(feed: FeedSource): void {
    if (isFallbackMode()) {
      getFallbackStore().feeds.set(feed.id, feed)
      return
    }

    const db = getDatabase()
    if (!db) return

    db.prepare(`
      INSERT INTO feeds (id, name, url, domain, type, feed_type, enabled, refresh_interval)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, feed_type = excluded.feed_type,
        enabled = excluded.enabled, refresh_interval = excluded.refresh_interval
    `).run(feed.id, feed.name, feed.url, feed.domain, feed.type,
      feed.feedType ?? 'dedicated', feed.enabled ? 1 : 0, feed.refreshInterval)
  }

  disableStaleFeedIds(activeIds: Set<string>): void {
    if (isFallbackMode()) {
      const store = getFallbackStore()
      for (const [id] of store.feeds) {
        if (!activeIds.has(id)) store.feeds.delete(id)
      }
      return
    }
    const db = getDatabase()
    if (!db) return
    const rows = db.prepare('SELECT id FROM feeds').all() as Array<{ id: string }>
    const toDisable = rows.filter(r => !activeIds.has(r.id)).map(r => r.id)
    if (toDisable.length === 0) return
    const del = db.prepare('DELETE FROM feeds WHERE id = ?')
    const tx = db.transaction(() => { for (const id of toDisable) del.run(id) })
    tx()
    console.log(`[Feed] Removed ${toDisable.length} stale feeds from database`)
  }

  removeFeed(feedId: string): void {
    if (isFallbackMode()) {
      getFallbackStore().feeds.delete(feedId)
      return
    }
    const db = getDatabase()
    if (!db) return
    db.prepare('DELETE FROM feeds WHERE id = ?').run(feedId)
  }

  getFeeds(): FeedSource[] {
    if (isFallbackMode()) {
      return Array.from(getFallbackStore().feeds.values())
    }

    const db = getDatabase()
    if (!db) return []

    const rows = db.prepare('SELECT * FROM feeds ORDER BY domain, name').all() as Array<Record<string, unknown>>
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      url: row.url as string,
      domain: row.domain as FeedSource['domain'],
      type: row.type as FeedSource['type'],
      feedType: (row.feed_type as FeedSource['feedType']) ?? 'dedicated',
      enabled: (row.enabled as number) === 1,
      refreshInterval: row.refresh_interval as number,
      lastFetched: row.last_fetched as string | undefined
    }))
  }

  updateFeedStatus(feedId: string, lastFetched: string, error?: string): void {
    if (isFallbackMode()) {
      const feed = getFallbackStore().feeds.get(feedId)
      if (feed) { feed.lastFetched = lastFetched; feed.lastError = error }
      return
    }

    const db = getDatabase()
    if (!db) return
    db.prepare('UPDATE feeds SET last_fetched = ?, last_error = ? WHERE id = ?')
      .run(lastFetched, error ?? null, feedId)
  }

  getFeedMeta(feedId: string, key: string): string | undefined {
    return this.getSetting(`feed_meta:${feedId}:${key}`)
  }

  setFeedMeta(feedId: string, key: string, value: string): void {
    this.setSetting(`feed_meta:${feedId}:${key}`, value)
  }

  getIncidentCount(): number {
    if (isFallbackMode()) {
      return getFallbackStore().incidents.size
    }
    const db = getDatabase()
    if (!db) return 0
    const row = db.prepare('SELECT COUNT(*) as count FROM incidents').get() as { count: number }
    return row?.count ?? 0
  }

  clearAllIncidents(): void {
    if (isFallbackMode()) {
      getFallbackStore().incidents.clear()
      return
    }
    const db = getDatabase()
    if (!db) return
    db.prepare('DELETE FROM incidents').run()
  }

  cleanOldIncidents(maxAgeDays: number = 30): number {
    if (isFallbackMode()) {
      const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString()
      let deleted = 0
      for (const [id, inc] of getFallbackStore().incidents) {
        if (inc.timestamp < cutoff) {
          getFallbackStore().incidents.delete(id)
          deleted++
        }
      }
      return deleted
    }

    const db = getDatabase()
    if (!db) return 0
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString()
    const result = db.prepare('DELETE FROM incidents WHERE timestamp < ?').run(cutoff)
    return result.changes
  }

  getSetting(key: string): string | undefined {
    if (isFallbackMode()) return getFallbackStore().settings.get(key)
    const db = getDatabase()
    if (!db) return undefined
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value
  }

  setSetting(key: string, value: string): void {
    if (isFallbackMode()) { getFallbackStore().settings.set(key, value); return }
    const db = getDatabase()
    if (!db) return
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
      .run(key, value)
  }

  deleteSetting(key: string): void {
    if (isFallbackMode()) { getFallbackStore().settings.delete(key); return }
    const db = getDatabase()
    if (!db) return
    db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  }

  searchIncidents(query: string): Incident[] {
    if (!query || query.trim().length === 0) return this.getIncidents()

    if (isFallbackMode()) {
      const q = query.toLowerCase()
      return Array.from(getFallbackStore().incidents.values())
        .filter((i: any) =>
          i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.source?.toLowerCase().includes(q) ||
          (i.tags && JSON.stringify(i.tags).toLowerCase().includes(q))
        )
        .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 200)
    }

    const db = getDatabase()
    if (!db) return []

    const q = `%${query}%`
    const rows = db.prepare(`
      SELECT * FROM incidents
      WHERE title LIKE ? OR description LIKE ? OR source LIKE ? OR tags LIKE ?
      ORDER BY timestamp DESC LIMIT 200
    `).all(q, q, q, q) as Array<Record<string, unknown>>
    return rows.map(this.rowToIncident)
  }

  getSettings(): Record<string, unknown> {
    if (isFallbackMode()) {
      const settings: Record<string, unknown> = {}
      for (const [k, v] of getFallbackStore().settings) {
        try { settings[k] = JSON.parse(v) } catch { settings[k] = v }
      }
      return settings
    }

    const db = getDatabase()
    if (!db) return {}
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    const settings: Record<string, unknown> = {}
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
    }
    return settings
  }
}
