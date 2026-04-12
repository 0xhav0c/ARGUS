import { join } from 'path'
import { app } from 'electron'

let db: any = null
let useFallback = false

interface FallbackStore {
  incidents: Map<string, any>
  feeds: Map<string, any>
  settings: Map<string, string>
}

let fallbackStore: FallbackStore = {
  incidents: new Map(),
  feeds: new Map(),
  settings: new Map()
}

export function getDatabase(): any {
  if (useFallback) return null
  if (db) return db

  try {
    const Database = require('better-sqlite3')
    const dbPath = join(app.getPath('userData'), 'argus.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeSchema(db)
    console.log('[DB] SQLite initialized at', dbPath)
    return db
  } catch (err) {
    console.warn('[DB] SQLite unavailable, using in-memory fallback:', (err as Error).message)
    useFallback = true
    return null
  }
}

export function isFallbackMode(): boolean {
  return useFallback
}

export function getFallbackStore(): FallbackStore {
  return fallbackStore
}

function initializeSchema(database: any): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      domain TEXT NOT NULL,
      severity TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      country TEXT DEFAULT '',
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      tags TEXT DEFAULT '[]',
      related_ids TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_domain ON incidents(domain);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
    CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);

    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      type TEXT NOT NULL,
      feed_type TEXT DEFAULT 'dedicated',
      enabled INTEGER DEFAULT 1,
      refresh_interval INTEGER DEFAULT 300,
      last_fetched TEXT,
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  try {
    const cols = database.pragma('table_info(incidents)') as Array<{ name: string }>
    if (!cols.some((c: { name: string }) => c.name === 'country')) {
      database.exec(`ALTER TABLE incidents ADD COLUMN country TEXT DEFAULT ''`)
      console.log('[DB] Migrated: added country column to incidents')
    }
  } catch { /* column already exists */ }

  try {
    const feedCols = database.pragma('table_info(feeds)') as Array<{ name: string }>
    if (!feedCols.some((c: { name: string }) => c.name === 'feed_type')) {
      database.exec(`ALTER TABLE feeds ADD COLUMN feed_type TEXT DEFAULT 'dedicated'`)
      console.log('[DB] Migrated: added feed_type column to feeds')
    }
  } catch { /* column already exists */ }
}

export function closeDatabase(): void {
  if (db) {
    try { db.close() } catch {}
    db = null
  }
}
