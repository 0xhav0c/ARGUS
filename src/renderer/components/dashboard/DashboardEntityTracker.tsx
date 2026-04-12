import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Incident } from '../../../shared/types'
import { useEntityStore, type TrackedEntity } from '../../stores/entity-store'
import { InfoTip } from '../ui/InfoTip'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const TYPE_LABEL: Record<TrackedEntity['type'], string> = {
  person: 'PERSON',
  organization: 'ORG',
  topic: 'TOPIC',
  location: 'LOC',
}

function incidentMatchesEntity(inc: Incident, entity: TrackedEntity): boolean {
  const hay = `${inc.title} ${inc.description}`.toLowerCase()
  const terms = [entity.name, ...entity.keywords]
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean)
  return terms.some((term) => hay.includes(term))
}

function countEntityMatches(entity: TrackedEntity, incidents: Incident[]): number {
  let n = 0
  for (const inc of incidents) {
    if (incidentMatchesEntity(inc, entity)) n++
  }
  return n
}

function lastSeenForEntity(entity: TrackedEntity, incidents: Incident[]): string {
  let best = 0
  for (const inc of incidents) {
    if (!incidentMatchesEntity(inc, entity)) continue
    const t = new Date(inc.timestamp).getTime()
    if (t > best) best = t
  }
  return best ? new Date(best).toISOString() : ''
}

function hourlyBuckets24h(entity: TrackedEntity, incidents: Incident[]): number[] {
  const now = Date.now()
  const hourMs = 3600000
  const buckets: number[] = []
  for (let i = 23; i >= 0; i--) {
    const start = now - (i + 1) * hourMs
    const end = now - i * hourMs
    let c = 0
    for (const inc of incidents) {
      if (!incidentMatchesEntity(inc, entity)) continue
      const t = new Date(inc.timestamp).getTime()
      if (t >= start && t < end) c++
    }
    buckets.push(c)
  }
  return buckets
}

function formatLastSeen(iso: string): string {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function matchBadgeStyle(count: number): CSSProperties {
  if (count <= 0) {
    return { background: `${P.dim}33`, color: P.dim, border: `1px solid ${P.border}` }
  }
  if (count <= 2) {
    return { background: '#f5c54222', color: '#f5c542', border: '1px solid #f5c54255' }
  }
  if (count <= 5) {
    return { background: `${P.accent}22`, color: P.accent, border: `1px solid ${P.accent}55` }
  }
  return { background: '#ff6b3522', color: '#ff6b35', border: '1px solid #ff6b3555' }
}

function EntitySparkline({ buckets, color }: { buckets: number[]; color: string }) {
  const max = Math.max(1, ...buckets)
  const w = 72
  const h = 22
  const n = buckets.length
  const gap = 1
  const barW = Math.max(1, (w - gap * (n - 1)) / n)
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      {buckets.map((v, i) => {
        const bh = Math.max(1, (v / max) * (h - 2))
        const x = i * (barW + gap)
        const y = h - bh
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={bh}
            rx={1}
            fill={v > 0 ? color : P.border}
            opacity={v > 0 ? 0.85 : 0.35}
          />
        )
      })}
    </svg>
  )
}

interface Props {
  incidents: Incident[]
}

export function DashboardEntityTracker({ incidents }: Props) {
  const entities = useEntityStore((s) => s.entities)
  const addEntity = useEntityStore((s) => s.addEntity)
  const removeEntity = useEntityStore((s) => s.removeEntity)
  const toggleEntity = useEntityStore((s) => s.toggleEntity)
  const updateMatchCount = useEntityStore((s) => s.updateMatchCount)

  const [name, setName] = useState('')
  const [type, setType] = useState<TrackedEntity['type']>('person')
  const [keywordsStr, setKeywordsStr] = useState('')
  const [color, setColor] = useState('#00d4ff')

  const incLenRef = useRef(0)
  const entityLenRef = useRef(0)

  useEffect(() => {
    if (incidents.length === incLenRef.current && entities.length === entityLenRef.current) return
    incLenRef.current = incidents.length
    entityLenRef.current = entities.length

    const timer = setTimeout(() => {
      const currentEntities = useEntityStore.getState().entities
      for (const e of currentEntities) {
        const n = countEntityMatches(e, incidents)
        const ls = lastSeenForEntity(e, incidents)
        if (e.matchCount !== n || (e.lastSeen || '') !== ls) {
          useEntityStore.getState().updateMatchCount(e.id, n, ls)
        }
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [incidents.length, entities.length])

  const onAdd = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    const keywords = keywordsStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    addEntity({
      name: trimmed,
      type,
      keywords,
      enabled: true,
      color,
    })
    setName('')
    setKeywordsStr('')
    setColor('#00d4ff')
    setType('person')
  }, [addEntity, color, keywordsStr, name, type])

  return (
    <section
      style={{
        padding: '16px 20px',
        borderTop: `1px solid ${P.border}`,
        background: P.bg,
        width: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '3px',
            height: '16px',
            background: P.accent,
            borderRadius: '2px',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: P.text,
            letterSpacing: '0.15em',
          }}
        >
          ENTITY TRACKER
        </span>
        <InfoTip text="Track specific people, organizations, topics, or locations across all incoming incidents. Add entities with keywords to automatically monitor their mention frequency in real-time." />
        <span
          style={{
            fontSize: '9px',
            color: P.dim,
            fontFamily: P.font,
            padding: '2px 8px',
            borderRadius: '4px',
            border: `1px solid ${P.border}`,
            background: P.card,
          }}
        >
          {entities.length} ENTITIES
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'flex-end',
          marginBottom: '18px',
          padding: '14px',
          background: P.card,
          border: `1px solid ${P.border}`,
          borderRadius: '8px',
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={{
            flex: '1 1 140px',
            minWidth: '120px',
            background: P.bg,
            border: `1px solid ${P.border}`,
            color: P.text,
            fontFamily: P.font,
            fontSize: '11px',
            padding: '8px 10px',
            borderRadius: '6px',
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TrackedEntity['type'])}
          style={{
            background: P.bg,
            border: `1px solid ${P.border}`,
            color: P.text,
            fontFamily: P.font,
            fontSize: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <option value="person">Person</option>
          <option value="organization">Organization</option>
          <option value="topic">Topic</option>
          <option value="location">Location</option>
        </select>
        <input
          value={keywordsStr}
          onChange={(e) => setKeywordsStr(e.target.value)}
          placeholder="Keywords (comma-separated)"
          style={{
            flex: '2 1 200px',
            minWidth: '160px',
            background: P.bg,
            border: `1px solid ${P.border}`,
            color: P.text,
            fontFamily: P.font,
            fontSize: '11px',
            padding: '8px 10px',
            borderRadius: '6px',
          }}
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '9px',
            color: P.dim,
            fontFamily: P.font,
          }}
        >
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: '36px',
              height: '28px',
              padding: 0,
              border: `1px solid ${P.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              background: P.bg,
            }}
          />
        </label>
        <button
          type="button"
          onClick={onAdd}
          style={{
            background: P.accent,
            border: 'none',
            color: P.bg,
            cursor: 'pointer',
            fontFamily: P.font,
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '10px 16px',
            borderRadius: '6px',
          }}
        >
          ADD ENTITY
        </button>
        <InfoTip text="Name is the primary identifier. Keywords (comma-separated) are alternative terms to search for. Color helps distinguish entities visually. Toggle ON/OFF to enable or pause tracking." size={11} />
      </div>

      <div
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: P.dim,
          marginBottom: '10px',
          fontFamily: P.font,
        }}
      >
        TRACKED ENTITIES · 24H ACTIVITY <InfoTip text="Each card shows an entity's match count from the last 24 hours. Matches are found by scanning incident titles and descriptions for the entity name and its keywords." size={11} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {entities.map((entity) => {
          const liveCount = entity.matchCount ?? 0
          const liveLast = entity.lastSeen || ''
          const total24h = liveCount
          return (
            <div
              key={entity.id}
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                opacity: entity.enabled ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: P.text,
                      fontFamily: P.font,
                      marginBottom: '4px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {entity.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '7px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: `${entity.color}22`,
                        color: entity.color,
                        border: `1px solid ${entity.color}44`,
                        fontFamily: P.font,
                      }}
                    >
                      {TYPE_LABEL[entity.type]}
                    </span>
                    <span
                      style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        fontFamily: P.font,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        ...matchBadgeStyle(liveCount),
                      }}
                    >
                      {liveCount} MATCH{liveCount === 1 ? '' : 'ES'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => toggleEntity(entity.id)}
                    style={{
                      background: entity.enabled ? `${P.accent}18` : P.bg,
                      border: `1px solid ${entity.enabled ? P.accent : P.border}`,
                      color: entity.enabled ? P.accent : P.dim,
                      cursor: 'pointer',
                      fontFamily: P.font,
                      fontSize: '7px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      padding: '5px 10px',
                      borderRadius: '4px',
                    }}
                  >
                    {entity.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntity(entity.id)}
                    style={{
                      background: 'transparent',
                      border: `1px solid #ff3b5c55`,
                      color: '#ff3b5c',
                      cursor: 'pointer',
                      fontFamily: P.font,
                      fontSize: '7px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      padding: '5px 10px',
                      borderRadius: '4px',
                    }}
                  >
                    DELETE
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>
                  Last seen:{' '}
                  <span style={{ color: P.text }}>{formatLastSeen(liveLast)}</span>
                </div>
                <div style={{ fontSize: '8px', color: P.dim, fontFamily: P.font }}>
                  24h: <span style={{ color: entity.color }}>{total24h}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  paddingTop: '4px',
                  borderTop: `1px solid ${P.border}`,
                }}
              >
                <span style={{ fontSize: '7px', color: P.dim, fontFamily: P.font, letterSpacing: '0.06em' }}>
                  24H TIMELINE
                </span>
                <div style={{ fontSize: '9px', fontWeight: 700, color: entity.color, fontFamily: P.font }}>{liveCount}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
