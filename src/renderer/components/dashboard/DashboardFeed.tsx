import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Incident, IncidentDomain } from '../../../shared/types'
import { useFilterStore } from '@/stores/filter-store'
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

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff', INFO: '#4a5568',
}

const DOMAIN_ICONS: Record<string, string> = {
  CONFLICT: '\u2694', CYBER: '\u26A1', INTEL: '\u25C9', FINANCE: '\u25C6',
}

function timeAgo(ts: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const d = Date.now() - new Date(ts).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return t('time.now')
  if (m < 60) return t('time.mAgo', { m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('time.hAgo', { h })
  return t('time.dAgo', { d: Math.floor(h / 24) })
}

interface Props {
  incidents: Incident[]
  onLocateIncident: (incident: Incident) => void
}

export function DashboardFeed({ incidents, onLocateIncident }: Props) {
  const { t } = useTranslation()
  const [popupOpen, setPopupOpen] = useState(false)
  const showCount = 10

  const searchQuery = useFilterStore(s => s.searchQuery)
  const setSearchQuery = useFilterStore(s => s.setSearchQuery)
  const severityFilter = useFilterStore(s => s.severityFilter)
  const dateRange = useFilterStore(s => s.dateRange)
  const setDateRange = useFilterStore(s => s.setDateRange)
  const sourceFilter = useFilterStore(s => s.sourceFilter)
  const setSourceFilter = useFilterStore(s => s.setSourceFilter)
  const countryFilter = useFilterStore(s => s.countryFilter)
  const setCountryFilter = useFilterStore(s => s.setCountryFilter)
  const domainFilter = useFilterStore(s => s.domainFilter)
  const setDomainFilter = useFilterStore(s => s.setDomainFilter)

  const clearFilters = useFilterStore(s => s.clearFilters)

  const countries = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) {
      if (i.country) s.add(i.country)
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [incidents])

  const sources = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) {
      if (i.source) s.add(i.source)
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [incidents])

  const activePreset = useMemo((): '1H' | '6H' | '24H' | '7D' | 'ALL' | null => {
    if (!dateRange.start) return 'ALL'
    const start = new Date(dateRange.start).getTime()
    const now = Date.now()
    const delta = now - start
    const h = 3600000
    const d = 86400000
    if (Math.abs(delta - h) < 120000) return '1H'
    if (Math.abs(delta - 6 * h) < 300000) return '6H'
    if (Math.abs(delta - 24 * h) < 600000) return '24H'
    if (Math.abs(delta - 7 * d) < 3600000) return '7D'
    return null
  }, [dateRange.start])

  const filterCount = useMemo(() => {
    let n = 0
    if (searchQuery.trim()) n++
    if (severityFilter) n++
    if (dateRange.start || dateRange.end) n++
    if (sourceFilter) n++
    if (countryFilter) n++
    if (domainFilter) n++
    return n
  }, [searchQuery, severityFilter, dateRange.start, dateRange.end, sourceFilter, countryFilter, domainFilter])

  const filteredAll = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return incidents.filter(i => {
      if (domainFilter && i.domain !== domainFilter) return false
      if (sourceFilter && i.source !== sourceFilter) return false
      if (countryFilter && (i.country || '') !== countryFilter) return false
      if (severityFilter && i.severity !== severityFilter) return false
      const t = new Date(i.timestamp).getTime()
      if (dateRange.start && t < new Date(dateRange.start).getTime()) return false
      if (dateRange.end && t > new Date(dateRange.end).getTime()) return false
      if (q) {
        const hay = `${i.title} ${i.description} ${i.source} ${i.country || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [incidents, domainFilter, sourceFilter, countryFilter, severityFilter, dateRange.start, dateRange.end, searchQuery])

  const filtered = useMemo(() => filteredAll.slice(0, showCount), [filteredAll, showCount])

  const domains: (IncidentDomain | 'ALL')[] = ['ALL', 'CONFLICT', 'CYBER', 'INTEL', 'FINANCE']

  const presetBtn = (label: '1H' | '6H' | '24H' | '7D' | 'ALL') => {
    const now = Date.now()
    const h = 3600000
    const d = 86400000
    let start: string | null = null
    if (label === '1H') start = new Date(now - h).toISOString()
    else if (label === '6H') start = new Date(now - 6 * h).toISOString()
    else if (label === '24H') start = new Date(now - 24 * h).toISOString()
    else if (label === '7D') start = new Date(now - 7 * d).toISOString()
    return (
      <button
        key={label}
        type="button"
        onClick={() => setDateRange(start, null)}
        style={{
          padding: '4px 8px', fontSize: '9px', fontWeight: 600,
          background: activePreset === label ? `${P.accent}15` : 'transparent',
          border: `1px solid ${activePreset === label ? P.accent + '40' : P.border}`,
          borderRadius: '3px', cursor: 'pointer',
          color: activePreset === label ? P.accent : P.dim,
          fontFamily: P.font, letterSpacing: '0.08em',
        }}
      >
        {label}
      </button>
    )
  }

  const selectStyle: CSSProperties = {
    padding: '6px 8px', fontSize: '9px', fontFamily: P.font,
    background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px',
    color: P.text, minWidth: '80px', maxWidth: '140px', cursor: 'pointer',
  }

  return (
    <section style={{
      padding: '20px 24px', borderTop: `1px solid ${P.border}`,
      background: P.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ width: '3px', height: '16px', background: '#ff6b35', borderRadius: '2px' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: P.text, letterSpacing: '0.15em' }}>{t('feed.incidentFeed')}</span>
        <InfoTip text="Incident feed filtered by active sidebar layers and map filters. Toggle layers in the sidebar to include/exclude domains. For unfiltered data, see Intelligence tab." />
        <span style={{ fontSize: '9px', color: '#ff6b35', fontFamily: P.font, letterSpacing: '0.05em', opacity: 0.8 }}>{t('feed.filtered')}</span>
        <span style={{ fontSize: '9px', color: P.dim }}>{filteredAll.length} / {incidents.length} events</span>
        {filterCount > 0 && (
          <span style={{
            fontSize: '9px', fontWeight: 700, color: P.bg, background: P.accent,
            padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.06em',
          }}>
            {filterCount} FILTER{filterCount === 1 ? '' : 'S'}
          </span>
        )}
        <button
          type="button"
          onClick={() => clearFilters()}
          disabled={filterCount === 0}
          style={{
            marginLeft: 'auto', padding: '4px 10px', fontSize: '9px', fontWeight: 600,
            fontFamily: P.font, letterSpacing: '0.08em',
            background: filterCount ? `${P.accent}12` : 'transparent',
            border: `1px solid ${filterCount ? P.accent + '35' : P.border}`,
            borderRadius: '3px', cursor: filterCount ? 'pointer' : 'default',
            color: filterCount ? P.accent : P.dim,
          }}
        >
          {t('app.clear')}
        </button>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px',
        alignItems: 'center',
      }}>
        <input
          type="search"
          placeholder={t('feed.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 180px', minWidth: '140px', padding: '8px 12px',
            fontSize: '11px', fontFamily: P.font, color: P.text,
            background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginRight: '4px' }}>{t('feed.range')}</span>
          {presetBtn('1H')}
          {presetBtn('6H')}
          {presetBtn('24H')}
          {presetBtn('7D')}
          {presetBtn('ALL')}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: P.dim }}>
          <span style={{ letterSpacing: '0.08em' }}>{t('feed.country')}</span>
          <select
            value={countryFilter ?? ''}
            onChange={e => setCountryFilter(e.target.value || null)}
            style={selectStyle}
          >
            <option value="">All</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: P.dim }}>
          <span style={{ letterSpacing: '0.08em' }}>{t('feed.source')}</span>
          <select
            value={sourceFilter ?? ''}
            onChange={e => setSourceFilter(e.target.value || null)}
            style={{ ...selectStyle, minWidth: '80px', maxWidth: '160px' }}
          >
            <option value="">All</option>
            {sources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {domains.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDomainFilter(d === 'ALL' ? null : d)}
              style={{
                padding: '3px 8px', fontSize: '9px', fontWeight: 600,
                background: (domainFilter === d || (d === 'ALL' && !domainFilter)) ? `${P.accent}15` : 'transparent',
                border: `1px solid ${(domainFilter === d || (d === 'ALL' && !domainFilter)) ? P.accent + '40' : P.border}`,
                borderRadius: '3px', cursor: 'pointer',
                color: (domainFilter === d || (d === 'ALL' && !domainFilter)) ? P.accent : P.dim,
                fontFamily: P.font, letterSpacing: '0.08em',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: P.card, border: `1px solid ${P.border}`,
        borderRadius: '8px', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '24px 44px 1fr minmax(40px, 100px) minmax(36px, 70px) 42px',
          gap: '6px', padding: '8px 12px',
          borderBottom: `1px solid ${P.border}`,
          fontSize: '9px', color: P.dim, letterSpacing: '0.12em', fontWeight: 600,
          minWidth: 0,
        }}>
          <span />
          <span>{t('feed.sev')}</span>
          <span>{t('feed.incident')}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('feed.source')}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('feed.location')}</span>
          <span style={{ textAlign: 'right' }}>{t('feed.time')}</span>
        </div>

        {filtered.map(inc => {
          const sevColor = SEVERITY_COLORS[inc.severity] || P.dim
          return (
            <div key={inc.id}
              onClick={() => onLocateIncident(inc)}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 44px 1fr minmax(40px, 100px) minmax(36px, 70px) 42px',
                gap: '6px', padding: '10px 12px',
                borderBottom: `1px solid ${P.border}15`,
                cursor: 'pointer', transition: 'background 0.15s',
                alignItems: 'center', minWidth: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d122080' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '14px', color: sevColor, textAlign: 'center' }}>
                {DOMAIN_ICONS[inc.domain] || '\u25CF'}
              </span>

              <span style={{
                padding: '2px 6px', fontSize: '9px', fontWeight: 700,
                borderRadius: '3px', textAlign: 'center',
                background: sevColor + '20', color: sevColor,
              }}>{inc.severity}</span>

              <span style={{
                fontSize: '11px', color: P.text, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: '1.3',
              }}>{inc.title}</span>

              <span style={{
                fontSize: '9px', color: P.dim,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{inc.source}</span>

              <span style={{
                fontSize: '9px', color: P.accent,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{inc.country || '\u2014'}</span>

              <span style={{ fontSize: '9px', color: P.dim, textAlign: 'right' }}>
                {timeAgo(inc.timestamp, t)}
              </span>
            </div>
          )
        })}

        {filteredAll.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '11px', color: P.dim, fontFamily: P.font }}>
            {t('feed.noIncidents')}
          </div>
        )}

        {filteredAll.length > showCount && (
          <button type="button" onClick={() => setPopupOpen(true)} style={{
            width: '100%', padding: '10px', fontSize: '10px',
            color: P.accent, background: `${P.accent}06`,
            border: 'none', borderTop: `1px solid ${P.border}`,
            cursor: 'pointer', fontFamily: P.font, fontWeight: 700, letterSpacing: '0.06em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}12` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}06` }}
          >
            {t('feed.viewAllIncidents', { count: filteredAll.length })}
          </button>
        )}
      </div>

      {popupOpen && (
        <FeedPopup incidents={filteredAll} onLocateIncident={onLocateIncident} onClose={() => setPopupOpen(false)} />
      )}
    </section>
  )
}

function FeedPopup({ incidents, onLocateIncident, onClose }: { incidents: Incident[]; onLocateIncident: (i: Incident) => void; onClose: () => void }) {
  const sevOptions = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) s.add(i.severity)
    return [...s]
  }, [incidents])
  const domOptions = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) s.add(i.domain)
    return [...s]
  }, [incidents])
  const srcOptions = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) if (i.source) s.add(i.source)
    return [...s].sort()
  }, [incidents])
  const countryOptions = useMemo(() => {
    const s = new Set<string>()
    for (const i of incidents) if (i.country) s.add(i.country)
    return [...s].sort()
  }, [incidents])

  return (
    <ExpandableListPopup
      items={incidents}
      title="Incident Feed"
      icon="📡"
      color="#ff6b35"
      onClose={onClose}
      searchable
      searchFn={(inc, q) => `${inc.title} ${inc.description || ''} ${inc.source} ${inc.country || ''}`.toLowerCase().includes(q)}
      filters={[
        { id: 'severity', label: 'Severity', options: sevOptions },
        { id: 'domain', label: 'Domain', options: domOptions },
        ...(srcOptions.length > 1 ? [{ id: 'source', label: 'Source', options: srcOptions }] : []),
        ...(countryOptions.length > 1 ? [{ id: 'country', label: 'Country', options: countryOptions }] : []),
      ]}
      filterFn={(inc, f) => {
        if (f.severity && inc.severity !== f.severity) return false
        if (f.domain && inc.domain !== f.domain) return false
        if (f.source && inc.source !== f.source) return false
        if (f.country && (inc.country || '') !== f.country) return false
        return true
      }}
      renderItem={(inc) => {
        const sevColor = SEVERITY_COLORS[inc.severity] || P.dim
        const clickable = inc.latitude != null && inc.longitude != null
        return (
          <div key={inc.id}
            onClick={() => onLocateIncident(inc)}
            style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              padding: '8px 10px', background: P.bg, border: `1px solid ${P.border}`,
              borderRadius: '5px', marginBottom: '4px',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = P.bg }}
          >
            <span style={{
              fontSize: '8px', padding: '2px 5px', borderRadius: '3px', fontWeight: 700, flexShrink: 0,
              background: sevColor + '20', color: sevColor, marginTop: '1px',
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
  )
}
