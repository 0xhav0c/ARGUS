import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Incident } from '../../../shared/types'
import { useEntityStore, type TrackedEntity } from '../../stores/entity-store'
import { InfoTip } from '../ui/InfoTip'
import { ExpandableListPopup } from '../ui/ExpandableList'

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

interface Props {
  incidents: Incident[]
  onLocateIncident?: (i: Incident) => void
}

export function DashboardEntityTracker({ incidents, onLocateIncident }: Props) {
  const entities = useEntityStore((s) => s.entities)
  const addEntity = useEntityStore((s) => s.addEntity)
  const removeEntity = useEntityStore((s) => s.removeEntity)
  const toggleEntity = useEntityStore((s) => s.toggleEntity)

  const [name, setName] = useState('')
  const [type, setType] = useState<TrackedEntity['type']>('person')
  const [keywordsStr, setKeywordsStr] = useState('')
  const [color, setColor] = useState('#00d4ff')

  useEffect(() => {
    if (incidents.length === 0 || entities.length === 0) return

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
  }, [incidents, entities])

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
        {entities.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4a5568', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>
            No entities tracked yet. Add one above to start monitoring.
          </div>
        )}
        {entities.map((entity) => (
          <EntityCard key={entity.id} entity={entity} incidents={incidents} onLocateIncident={onLocateIncident} onToggle={toggleEntity} onRemove={removeEntity} />
        ))}
      </div>
    </section>
  )
}

const SEVERITY_COLORS: Record<string, string> = { CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff', INFO: '#4a5568' }

function EntityCard({ entity, incidents, onLocateIncident, onToggle, onRemove }: {
  entity: TrackedEntity
  incidents: Incident[]
  onLocateIncident?: (i: Incident) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [showIncidents, setShowIncidents] = useState(false)
  const liveCount = entity.matchCount ?? 0
  const liveLast = entity.lastSeen || ''

  const matchedIncidents = useMemo(() =>
    incidents.filter(inc => incidentMatchesEntity(inc, entity))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [incidents, entity]
  )

  const sevFilterOpts = useMemo(() => {
    const s = new Set<string>()
    for (const inc of matchedIncidents) s.add(inc.severity)
    return [...s]
  }, [matchedIncidents])

  const domFilterOpts = useMemo(() => {
    const s = new Set<string>()
    for (const inc of matchedIncidents) s.add(inc.domain)
    return [...s]
  }, [matchedIncidents])

  return (
    <>
      <div
        style={{
          background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px',
          padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px',
          opacity: entity.enabled ? 1 : 0.55,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: P.text, fontFamily: P.font, marginBottom: '4px', wordBreak: 'break-word' }}>
              {entity.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', padding: '3px 6px', borderRadius: '4px', background: `${entity.color}22`, color: entity.color, border: `1px solid ${entity.color}44`, fontFamily: P.font }}>
                {TYPE_LABEL[entity.type]}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: P.font, padding: '3px 8px', borderRadius: '4px', ...matchBadgeStyle(liveCount) }}>
                {liveCount} MATCH{liveCount === 1 ? '' : 'ES'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <button type="button" onClick={() => onToggle(entity.id)} style={{
              background: entity.enabled ? `${P.accent}18` : P.bg, border: `1px solid ${entity.enabled ? P.accent : P.border}`,
              color: entity.enabled ? P.accent : P.dim, cursor: 'pointer', fontFamily: P.font,
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', padding: '5px 10px', borderRadius: '4px',
            }}>{entity.enabled ? 'ON' : 'OFF'}</button>
            <button type="button" onClick={() => onRemove(entity.id)} style={{
              background: 'transparent', border: `1px solid #ff3b5c55`, color: '#ff3b5c', cursor: 'pointer',
              fontFamily: P.font, fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', padding: '5px 10px', borderRadius: '4px',
            }}>DELETE</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>
            Last seen: <span style={{ color: P.text }}>{formatLastSeen(liveLast)}</span>
          </div>
          <div style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>
            Total: <span style={{ color: entity.color }}>{liveCount}</span>
          </div>
        </div>

        {liveCount > 0 && (
          <button
            type="button"
            onClick={() => setShowIncidents(true)}
            style={{
              width: '100%', padding: '8px', fontSize: '9px', fontWeight: 700, fontFamily: P.font,
              letterSpacing: '0.06em', cursor: 'pointer',
              background: `${entity.color}08`, border: `1px solid ${entity.color}30`,
              borderRadius: '5px', color: entity.color, transition: 'all 0.15s',
            }}
          >
            VIEW {liveCount} INCIDENT{liveCount === 1 ? '' : 'S'} →
          </button>
        )}
        {liveCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px', borderTop: `1px solid ${P.border}` }}>
            <span style={{ fontSize: '9px', color: P.dim, fontFamily: P.font, letterSpacing: '0.06em' }}>NO MATCHES</span>
          </div>
        )}
      </div>

      {showIncidents && (
        <ExpandableListPopup
          items={matchedIncidents}
          title={`${entity.name} Incidents`}
          icon="◎"
          color={entity.color}
          onClose={() => setShowIncidents(false)}
          searchable
          searchFn={(inc, q) => `${inc.title} ${inc.description || ''} ${inc.source} ${inc.country || ''}`.toLowerCase().includes(q)}
          filters={[
            { id: 'severity', label: 'Severity', options: sevFilterOpts },
            ...(domFilterOpts.length > 1 ? [{ id: 'domain', label: 'Domain', options: domFilterOpts }] : []),
          ]}
          filterFn={(inc, f) => {
            if (f.severity && inc.severity !== f.severity) return false
            if (f.domain && inc.domain !== f.domain) return false
            return true
          }}
          renderItem={(inc) => {
            const clickable = !!onLocateIncident && inc.latitude != null && inc.longitude != null
            return (
              <div key={inc.id}
                onClick={clickable ? () => onLocateIncident(inc) : undefined}
                style={{
                  display: 'flex', gap: '8px', alignItems: 'flex-start',
                  padding: '8px 10px', background: P.bg, border: `1px solid ${P.border}`,
                  borderRadius: '5px', marginBottom: '4px',
                  cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s',
                }}
                onMouseEnter={clickable ? e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
                onMouseLeave={clickable ? e => { (e.currentTarget as HTMLDivElement).style.background = P.bg } : undefined}
              >
                <span style={{
                  fontSize: '8px', padding: '2px 5px', borderRadius: '3px', fontWeight: 700, flexShrink: 0,
                  background: (SEVERITY_COLORS[inc.severity] || P.dim) + '20', color: SEVERITY_COLORS[inc.severity] || P.dim, marginTop: '1px',
                }}>{inc.severity}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: P.text, fontWeight: 600, lineHeight: 1.3 }}>
                    {inc.title}
                    {clickable && <span style={{ color: P.accent, marginLeft: 6, fontSize: '9px' }}>◎</span>}
                  </div>
                  <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>
                    {inc.domain} · {inc.source} · {inc.country || 'Global'} · {new Date(inc.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )
          }}
        />
      )}
    </>
  )
}
