import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useIncidentStore } from '@/stores/incident-store'
import { useEntityStore } from '@/stores/entity-store'
import { useTrackingStore } from '@/stores/tracking-store'
import type { Incident, FlightData, VesselData, SatelliteData } from '../../../shared/types'

const P = {
  bg: 'rgba(10,14,23,0.98)',
  card: '#0d1220',
  border: '#141c2e',
  dim: '#4a5568',
  text: '#c8d6e5',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

export type SearchHitKind = 'incident' | 'entity' | 'flight' | 'vessel' | 'satellite'

export interface SearchHit {
  id: string
  kind: SearchHitKind
  title: string
  subtitle: string
  meta?: string
  score: number
  raw: any
}

const KIND_META: Record<SearchHitKind, { label: string; color: string; icon: string }> = {
  incident: { label: 'INCIDENT', color: '#ff6b35', icon: '⚡' },
  entity: { label: 'ENTITY', color: '#a855f7', icon: '◉' },
  flight: { label: 'FLIGHT', color: '#00b4ff', icon: '✈' },
  vessel: { label: 'VESSEL', color: '#64c8ff', icon: '⚓' },
  satellite: { label: 'SAT', color: '#a78bfa', icon: '🛰' },
}

const ALL_KINDS: SearchHitKind[] = ['incident', 'entity', 'flight', 'vessel', 'satellite']
const RECENT_KEY = 'argus-search-recent'
const MAX_RECENT = 8

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : []
  } catch { return [] }
}

function saveRecent(query: string) {
  if (!query.trim()) return
  try {
    const cur = loadRecent().filter(q => q.toLowerCase() !== query.toLowerCase())
    const next = [query, ...cur].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

/** Simple subsequence + token-frequency scoring. Higher is better. */
function scoreMatch(query: string, text: string): number {
  if (!text) return 0
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase()
  if (!q) return 0
  if (t === q) return 1000
  if (t.startsWith(q)) return 500
  const idx = t.indexOf(q)
  if (idx >= 0) return 300 - Math.min(idx, 200)
  // token-based
  const qTokens = q.split(/\s+/).filter(Boolean)
  let s = 0
  for (const tok of qTokens) {
    if (t.includes(tok)) s += 60
  }
  if (s > 0) return s
  // subsequence (loose fuzzy)
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  if (qi === q.length) return 30
  return 0
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const q = query.toLowerCase()
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: `${P.accent}30`, color: P.accent, padding: 0, borderRadius: '2px' }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

interface GlobalSearchDropdownProps {
  isOpen: boolean
  query: string
  setQuery: (q: string) => void
  onClose: () => void
  /** Anchor rect (from getBoundingClientRect) — dropdown positions itself below this */
  anchorRect: DOMRect | null
  onLocate: (lat: number, lng: number, title: string) => void
  onSelectIncident: (incident: Incident) => void
  onTrackingClick: (info: any) => void
  /** Switch the active tab (for entity/feed-only hits) */
  setActiveTab?: (tab: any) => void
}

export function GlobalSearchDropdown({
  isOpen, query, setQuery, onClose, anchorRect,
  onLocate, onSelectIncident, onTrackingClick, setActiveTab,
}: GlobalSearchDropdownProps) {
  const incidents = useIncidentStore(s => s.incidents)
  const entities = useEntityStore(s => s.entities)
  const flights = useTrackingStore(s => s.flights)
  const vessels = useTrackingStore(s => s.vessels)
  const satellites = useTrackingStore(s => s.satellites)

  const [activeKinds, setActiveKinds] = useState<Set<SearchHitKind>>(new Set(ALL_KINDS))
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSelectedIdx(0) }, [query, activeKinds])

  // Build all candidate hits when open or query changes.
  const hits = useMemo<SearchHit[]>(() => {
    if (!isOpen) return []
    const q = query.trim()
    if (!q) return []
    const out: SearchHit[] = []

    if (activeKinds.has('incident')) {
      for (const i of incidents) {
        const titleScore = scoreMatch(q, i.title || '')
        const descScore = scoreMatch(q, i.description || '') * 0.5
        const countryScore = scoreMatch(q, i.country || '') * 0.7
        const tagScore = (i.tags || []).reduce((a, t) => a + scoreMatch(q, t) * 0.4, 0)
        const score = titleScore + descScore + countryScore + tagScore
        if (score > 0) {
          out.push({
            id: `i-${i.id}`,
            kind: 'incident',
            title: i.title,
            subtitle: [i.country || 'Global', i.severity, new Date(i.timestamp).toLocaleString()].filter(Boolean).join(' · '),
            meta: i.source,
            score: score + (i.severity === 'CRITICAL' ? 30 : i.severity === 'HIGH' ? 15 : 0),
            raw: i,
          })
        }
      }
    }

    if (activeKinds.has('entity')) {
      for (const e of entities) {
        const nameScore = scoreMatch(q, e.name)
        const kwScore = e.keywords.reduce((a, k) => a + scoreMatch(q, k) * 0.6, 0)
        const score = nameScore + kwScore
        if (score > 0) {
          out.push({
            id: `e-${e.id}`,
            kind: 'entity',
            title: e.name,
            subtitle: `${e.type.toUpperCase()} · ${e.matchCount} mention${e.matchCount === 1 ? '' : 's'}`,
            meta: e.keywords.slice(0, 3).join(', '),
            score,
            raw: e,
          })
        }
      }
    }

    if (activeKinds.has('flight')) {
      for (const f of flights) {
        const cs = scoreMatch(q, f.callsign || '')
        const icao = scoreMatch(q, f.icao24 || '')
        const country = scoreMatch(q, f.originCountry || '') * 0.5
        const score = cs * 1.2 + icao + country
        if (score > 0) {
          out.push({
            id: `f-${f.icao24}`,
            kind: 'flight',
            title: f.callsign || f.icao24,
            subtitle: `${f.originCountry || '—'} · ${Math.round((f.velocity || 0) * 3.6)} km/h · ${Math.round(f.altitude || 0)}m`,
            meta: f.icao24,
            score,
            raw: f,
          })
        }
      }
    }

    if (activeKinds.has('vessel')) {
      for (const v of vessels) {
        const name = scoreMatch(q, v.name || '')
        const mmsi = scoreMatch(q, String(v.mmsi || ''))
        const flag = scoreMatch(q, v.flag || '') * 0.5
        const score = name * 1.2 + mmsi + flag
        if (score > 0) {
          out.push({
            id: `v-${v.mmsi}`,
            kind: 'vessel',
            title: v.name || `MMSI ${v.mmsi}`,
            subtitle: `${v.flag || '—'} · ${v.type || 'Unknown'} · ${v.speed || 0} kts`,
            meta: String(v.mmsi),
            score,
            raw: v,
          })
        }
      }
    }

    if (activeKinds.has('satellite')) {
      for (const s of satellites) {
        const name = scoreMatch(q, s.name || '')
        const norad = scoreMatch(q, String(s.noradId || ''))
        const cat = scoreMatch(q, s.category || '') * 0.4
        const score = name * 1.2 + norad + cat
        if (score > 0) {
          out.push({
            id: `s-${s.noradId}`,
            kind: 'satellite',
            title: s.name,
            subtitle: `${s.category} · ${Math.round(s.altitude)} km · ${s.orbitType || 'LEO'}`,
            meta: String(s.noradId),
            score,
            raw: s,
          })
        }
      }
    }

    out.sort((a, b) => b.score - a.score)
    return out.slice(0, 80)
  }, [isOpen, query, activeKinds, incidents, entities, flights, vessels, satellites])

  // Group counts for filter chips (uses unfiltered set so counts always reflect the query)
  const allHits = useMemo<SearchHit[]>(() => {
    if (!isOpen || !query.trim()) return []
    const tmp: SearchHit[] = []
    const q = query.trim()
    for (const i of incidents) {
      const s = scoreMatch(q, i.title) + scoreMatch(q, i.description || '') * 0.5 + scoreMatch(q, i.country || '') * 0.7
      if (s > 0) tmp.push({ id: `i-${i.id}`, kind: 'incident', title: i.title, subtitle: '', score: s, raw: i })
    }
    for (const e of entities) {
      const s = scoreMatch(q, e.name) + e.keywords.reduce((a, k) => a + scoreMatch(q, k) * 0.6, 0)
      if (s > 0) tmp.push({ id: `e-${e.id}`, kind: 'entity', title: e.name, subtitle: '', score: s, raw: e })
    }
    for (const f of flights) {
      const s = scoreMatch(q, f.callsign || '') + scoreMatch(q, f.icao24)
      if (s > 0) tmp.push({ id: `f-${f.icao24}`, kind: 'flight', title: '', subtitle: '', score: s, raw: f })
    }
    for (const v of vessels) {
      const s = scoreMatch(q, v.name || '') + scoreMatch(q, String(v.mmsi || ''))
      if (s > 0) tmp.push({ id: `v-${v.mmsi}`, kind: 'vessel', title: '', subtitle: '', score: s, raw: v })
    }
    for (const s of satellites) {
      const sc = scoreMatch(q, s.name || '') + scoreMatch(q, String(s.noradId || ''))
      if (sc > 0) tmp.push({ id: `s-${s.noradId}`, kind: 'satellite', title: '', subtitle: '', score: sc, raw: s })
    }
    return tmp
  }, [isOpen, query, incidents, entities, flights, vessels, satellites])

  const counts = useMemo(() => {
    const c: Record<SearchHitKind, number> = { incident: 0, entity: 0, flight: 0, vessel: 0, satellite: 0 }
    for (const h of allHits) c[h.kind]++
    return c
  }, [allHits])

  const handleSelect = useCallback((hit: SearchHit) => {
    saveRecent(query)
    setRecent(loadRecent())
    if (hit.kind === 'incident') {
      const inc = hit.raw as Incident
      onSelectIncident(inc)
      if (inc.latitude != null && inc.longitude != null) {
        onLocate(inc.latitude, inc.longitude, inc.title)
      }
      setActiveTab?.('intelligence')
    } else if (hit.kind === 'entity') {
      setActiveTab?.('intelligence')
    } else if (hit.kind === 'flight') {
      const f = hit.raw as FlightData
      onLocate(f.latitude, f.longitude, f.callsign || f.icao24)
      onTrackingClick({
        type: 'flight',
        title: f.callsign || f.icao24,
        details: { Callsign: f.callsign || 'N/A', ICAO24: f.icao24, 'Origin Country': f.originCountry, Altitude: `${Math.round(f.altitude || 0)}m`, Speed: `${Math.round((f.velocity || 0) * 3.6)} km/h` },
        latitude: f.latitude, longitude: f.longitude, rawData: f,
      })
    } else if (hit.kind === 'vessel') {
      const v = hit.raw as VesselData
      onLocate(v.latitude, v.longitude, v.name || `MMSI ${v.mmsi}`)
      onTrackingClick({
        type: 'vessel',
        title: v.name || `MMSI ${v.mmsi}`,
        details: { Name: v.name, MMSI: v.mmsi, Type: v.type, Flag: v.flag, Speed: `${v.speed} kts` },
        latitude: v.latitude, longitude: v.longitude, rawData: v,
      })
    } else if (hit.kind === 'satellite') {
      const s = hit.raw as SatelliteData
      onLocate(s.latitude, s.longitude, s.name)
      onTrackingClick({
        type: 'satellite',
        title: s.name,
        details: { 'NORAD ID': s.noradId, Category: s.category, 'Altitude (km)': Math.round(s.altitude) },
        latitude: s.latitude, longitude: s.longitude,
      })
    }
    onClose()
  }, [query, onSelectIncident, onLocate, onTrackingClick, setActiveTab, onClose])

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, hits.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const h = hits[selectedIdx]
        if (h) handleSelect(h)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen, hits, selectedIdx, handleSelect, onClose])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  if (!isOpen || !anchorRect) return null

  const top = anchorRect.bottom + 6
  const left = Math.max(8, anchorRect.left)
  const width = Math.max(420, Math.min(640, anchorRect.width + 200))

  const toggleKind = (k: SearchHitKind) =>
    setActiveKinds(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      if (next.size === 0) return new Set(ALL_KINDS)
      return next
    })

  return (
    <>
      {/* Backdrop — click to close, no blur */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 240, background: 'transparent' }} />
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'fixed', top, left, width, zIndex: 241,
          background: P.bg, border: `1px solid ${P.border}`, borderRadius: '10px',
          fontFamily: P.font, color: P.text,
          boxShadow: '0 22px 60px rgba(0,0,0,0.75)',
          maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Filter chips */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '8px 10px', borderBottom: `1px solid ${P.border}`,
          flexWrap: 'wrap',
        }}>
          {ALL_KINDS.map(k => {
            const active = activeKinds.has(k)
            const meta = KIND_META[k]
            const c = counts[k] ?? 0
            return (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                style={{
                  padding: '3px 8px', fontSize: '9px', fontWeight: 700,
                  background: active ? `${meta.color}15` : 'transparent',
                  border: `1px solid ${active ? meta.color + '40' : P.border}`,
                  borderRadius: '3px', cursor: 'pointer', fontFamily: P.font,
                  color: active ? meta.color : P.dim, letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <span style={{ fontSize: '10px' }}>{meta.icon}</span>
                {meta.label}
                <span style={{
                  padding: '0 4px', borderRadius: '2px',
                  background: active ? meta.color + '25' : P.card,
                  fontSize: '9px',
                }}>{c}</span>
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '9px', color: P.dim }}>↑↓ navigate · ⏎ open · ESC close</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {!query.trim() ? (
            <div style={{ padding: '14px' }}>
              <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em', marginBottom: '8px' }}>RECENT SEARCHES</div>
              {recent.length === 0 ? (
                <div style={{ fontSize: '10px', color: P.dim, padding: '12px 0', textAlign: 'center' }}>
                  Start typing to search across incidents, entities, flights, vessels and satellites.
                </div>
              ) : recent.map(r => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '6px 10px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: P.text, fontFamily: P.font, fontSize: '11px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.card }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ color: P.dim }}>↻</span>
                  {r}
                </button>
              ))}
            </div>
          ) : hits.length === 0 ? (
            <div style={{ padding: '24px', fontSize: '10px', color: P.dim, textAlign: 'center' }}>
              No matches for <span style={{ color: P.accent }}>{query}</span>
            </div>
          ) : (
            hits.map((h, idx) => {
              const meta = KIND_META[h.kind]
              const active = idx === selectedIdx
              return (
                <div
                  key={h.id}
                  data-idx={idx}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => handleSelect(h)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '8px 12px', cursor: 'pointer',
                    background: active ? `${meta.color}10` : 'transparent',
                    borderLeft: `2px solid ${active ? meta.color : 'transparent'}`,
                  }}
                >
                  <span style={{
                    flexShrink: 0, fontSize: '12px', color: meta.color,
                    width: '20px', textAlign: 'center', marginTop: '1px',
                  }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, color: meta.color,
                        letterSpacing: '0.08em', padding: '0 4px',
                        background: `${meta.color}12`, borderRadius: '2px',
                      }}>{meta.label}</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, color: P.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{highlight(h.title, query)}</span>
                    </div>
                    <div style={{
                      fontSize: '9px', color: P.dim, marginTop: '2px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{highlight(h.subtitle, query)}</div>
                  </div>
                  {h.meta && (
                    <span style={{
                      flexShrink: 0, fontSize: '9px', color: P.dim,
                      padding: '1px 5px', background: P.card, borderRadius: '2px',
                      maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{h.meta}</span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderTop: `1px solid ${P.border}`,
          fontSize: '9px', color: P.dim, background: P.card,
        }}>
          <span>{query.trim() ? `${hits.length} result${hits.length === 1 ? '' : 's'}` : 'Quick search'}</span>
          <span>{incidents.length} incidents · {entities.length} entities · {flights.length + vessels.length + satellites.length} tracked</span>
        </div>
      </div>
    </>
  )
}
