import { useMemo, useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Incident, IncidentDomain, IncidentSeverity } from '../../../shared/types'
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

const DOMAIN_CONFIG = [
  { id: 'CONFLICT' as const, label: 'CONFLICT', icon: '\u2694', color: '#ff6b35' },
  { id: 'CYBER' as const, label: 'CYBER', icon: '\u26A1', color: '#00ff87' },
  { id: 'INTEL' as const, label: 'INTEL', icon: '\u25C9', color: '#4a9eff' },
  { id: 'FINANCE' as const, label: 'FINANCE', icon: '\u25C6', color: '#f5c542' },
]

const DOMAIN_COLOR: Record<IncidentDomain, string> = {
  CONFLICT: '#ff6b35', CYBER: '#00ff87', INTEL: '#4a9eff', FINANCE: '#f5c542',
}

const SEV_CONFIG: { id: IncidentSeverity; color: string }[] = [
  { id: 'CRITICAL', color: '#ff3b5c' },
  { id: 'HIGH', color: '#ff6b35' },
  { id: 'MEDIUM', color: '#f5c542' },
  { id: 'LOW', color: '#00d4ff' },
  { id: 'INFO', color: '#4a5568' },
]

const ORDERED_SEV: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']


function HourlyActivityChart({ incidents }: { incidents: Incident[] }) {
  const buckets = useMemo(() => {
    const now = Date.now()
    const hourMs = 3600000
    const list: { start: number; byDomain: Record<string, number>; total: number }[] = []
    for (let i = 23; i >= 0; i--) {
      const start = now - (i + 1) * hourMs
      const end = now - i * hourMs
      const byDomain: Record<string, number> = { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0 }
      for (const inc of incidents) {
        const t = new Date(inc.timestamp).getTime()
        if (t >= start && t < end) byDomain[inc.domain]++
      }
      const total = Object.values(byDomain).reduce((s, v) => s + v, 0)
      list.push({ start, byDomain, total })
    }
    return list
  }, [incidents])

  const maxStack = Math.max(1, ...buckets.map(b => b.total))

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>ACTIVITY (24H)</span>
        <InfoTip text="Hourly incident distribution over the last 24 hours. Each bar is color-coded by domain." size={11} />
        <span style={{ marginLeft: 'auto', fontSize: '8px', color: P.dim }}>{maxStack}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: '120px' }}>
        {buckets.map((b, i) => {
          const pct = b.total / maxStack
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} title={`${new Date(b.start + 3600000).getHours()}:00 — ${b.total} events`}>
              {b.total === 0 ? (
                <div style={{ height: '1px', background: P.border }} />
              ) : (
                <div style={{ height: `${Math.max(2, pct * 100)}%`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '1px 1px 0 0', overflow: 'hidden' }}>
                  {DOMAIN_CONFIG.map(d => {
                    const c = b.byDomain[d.id] || 0
                    if (!c) return null
                    return <div key={d.id} style={{ height: `${(c / b.total) * 100}%`, minHeight: '1px', background: d.color }} />
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '7px', color: P.dim }}>{new Date(buckets[0]?.start || 0).getHours()}h</span>
        <span style={{ fontSize: '7px', color: P.dim }}>now</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
        {DOMAIN_CONFIG.map(d => (
          <span key={d.id} style={{ fontSize: '9px', color: d.color, fontFamily: P.font }}>{d.icon} {d.label}</span>
        ))}
      </div>
    </div>
  )
}

function TopCountriesChart({ incidents }: { incidents: Incident[] }) {
  const top = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of incidents) {
      const c = i.country || 'Unknown'
      m.set(c, (m.get(c) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [incidents])

  const max = Math.max(1, ...top.map(([, v]) => v))

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>TOP COUNTRIES</span>
        <InfoTip text="Countries with the most incidents across all cached data, ranked by total count." size={11} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {top.map(([country, count]) => (
          <div key={country} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '16px' }}>
            <span style={{ fontSize: '8px', color: P.text, fontFamily: P.font, fontWeight: 500, width: '72px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{country}</span>
            <div style={{ flex: 1, height: '10px', background: P.border, borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: `linear-gradient(90deg, ${P.accent}, #0088aa)`, borderRadius: '2px', minWidth: '2px' }} />
            </div>
            <span style={{ fontSize: '9px', color: P.accent, fontFamily: P.font, fontWeight: 700, minWidth: '28px', textAlign: 'right', flexShrink: 0 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeverityDonutChart({ incidents }: { incidents: Incident[] }) {
  const counts = useMemo(() => {
    const c: Partial<Record<IncidentSeverity, number>> = {}
    for (const s of ORDERED_SEV) c[s] = 0
    for (const i of incidents) c[i.severity] = (c[i.severity] || 0) + 1
    return c as Record<IncidentSeverity, number>
  }, [incidents])

  const total = ORDERED_SEV.reduce((s, k) => s + (counts[k] || 0), 0) || 1
  const conicStops = useMemo(() => {
    let pct = 0
    const stops: string[] = []
    for (const sev of ORDERED_SEV) {
      const n = counts[sev] || 0
      const segPct = (n / total) * 100
      const color = SEV_CONFIG.find(s => s.id === sev)!.color
      stops.push(`${color} ${pct}% ${pct + segPct}%`)
      pct += segPct
    }
    return stops.join(', ')
  }, [counts, total])

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>SEVERITY</span>
        <InfoTip text="Severity distribution across all incidents. The center number shows the total count." size={11} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '130px' }}>
        <div style={{
          width: '110px', height: '110px', borderRadius: '50%',
          background: `conic-gradient(from -90deg, ${conicStops})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%', background: P.bg,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: P.text, lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: '6px', fontWeight: 600, color: P.dim, letterSpacing: '0.1em' }}>TOTAL</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', justifyContent: 'center', marginTop: '4px' }}>
        {SEV_CONFIG.map(s => (
          <span key={s.id} style={{ fontSize: '9px', color: P.dim, fontFamily: P.font, whiteSpace: 'nowrap' }}>
            <span style={{ color: s.color, marginRight: '3px' }}>●</span>{s.id} {counts[s.id] || 0}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DashboardStats({ incidents }: { incidents: Incident[] }) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dbCounts, setDbCounts] = useState<{ total: number; today: number; last24h: number } | null>(null)

  useEffect(() => {
    window.argus?.getIncidentCounts?.().then(setDbCounts).catch(() => {})
    const iv = setInterval(() => {
      window.argus?.getIncidentCounts?.().then(setDbCounts).catch(() => {})
    }, 60000)
    return () => clearInterval(iv)
  }, [])

  const lastRefreshed = useMemo(() => new Date().toLocaleTimeString(), [incidents])

  const stats = useMemo(() => {
    const now = Date.now()
    const last24h = incidents.filter(i => now - new Date(i.timestamp).getTime() < 86400000)

    const byDomain: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    for (const i of last24h) {
      byDomain[i.domain] = (byDomain[i.domain] || 0) + 1
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
    }

    const countries = new Set(last24h.map(i => i.country).filter(Boolean))

    return {
      last24h: last24h.length,
      dbTotal: dbCounts?.total ?? incidents.length,
      cacheTotal: incidents.length,
      byDomain,
      bySeverity,
      countries: countries.size,
    }
  }, [incidents, dbCounts])

  return (
    <section ref={containerRef} style={{
      padding: '16px 20px', borderTop: `1px solid ${P.border}`,
      background: P.bg, boxSizing: 'border-box', width: '100%', minWidth: 0, overflowX: 'hidden' as const,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ width: '3px', height: '14px', background: P.accent, borderRadius: '2px' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: P.text }}>{t('stats.situationOverview')}</span>
        <InfoTip text="Overview of incidents collected in the last 24 hours from RSS feeds, APIs and other intelligence sources. Database total shows all cached incidents." />
        <span style={{ fontSize: '9px', color: P.dim }}>last 24h &middot; {stats.dbTotal} in db</span>
        <span style={{ fontSize: '9px', color: P.dim }}>Updated {lastRefreshed}</span>
      </div>

      {/* Stat cards - use flex with wrap instead of grid for better adaptability */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: '1 1 90px', minWidth: '80px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', minWidth: 0 }}>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('stats.last24h')}</div>
            <InfoTip text="Number of incidents detected in the last 24 hours across all domains and sources." size={11} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: P.accent, lineHeight: 1.1 }}>{stats.last24h}</div>
          <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.cacheTotal} {t('stats.cached')}</div>
        </div>

        <div style={{ flex: '1 1 90px', minWidth: '80px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', minWidth: 0 }}>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('stats.countries')}</div>
            <InfoTip text="Unique countries mentioned in incidents from the last 24 hours." size={11} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#00ff87', lineHeight: 1.1 }}>{stats.countries}</div>
          <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>{t('stats.in24h')}</div>
        </div>

        {DOMAIN_CONFIG.map(d => (
          <div key={d.id} style={{ flex: '1 1 80px', minWidth: '70px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '10px', flexShrink: 0 }}>{d.icon}</span>
              <span style={{ fontSize: '9px', color: d.color, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: d.color, lineHeight: 1.1 }}>{stats.byDomain[d.id] || 0}</div>
          </div>
        ))}
      </div>

      {/* Severity bar */}
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>{t('stats.severity24h')}</div>
          <InfoTip text="Incident severity breakdown for the last 24h. CRITICAL = immediate threat, HIGH = significant risk, MEDIUM = notable, LOW = monitoring, INFO = awareness only." size={11} />
        </div>
        <div style={{ display: 'flex', gap: '8px 14px', flexWrap: 'wrap' }}>
          {SEV_CONFIG.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: '9px', color: P.dim, whiteSpace: 'nowrap' }}>{s.id}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: s.color }}>{stats.bySeverity[s.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts - responsive flex wrap */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}><HourlyActivityChart incidents={incidents} /></div>
        <div style={{ flex: '1 1 160px', minWidth: 0 }}><TopCountriesChart incidents={incidents} /></div>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}><SeverityDonutChart incidents={incidents} /></div>
      </div>
    </section>
  )
}
