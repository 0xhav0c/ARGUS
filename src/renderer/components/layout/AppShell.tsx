import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense, lazy, Component, type ReactNode, type ErrorInfo } from 'react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { IncidentDetail } from '@/components/panels/IncidentDetail'
import { useFilterStore } from '@/stores/filter-store'
import { useIncidentStore } from '@/stores/incident-store'
import { useDashboardLayoutStore } from '@/stores/dashboard-layout-store'
import { AlertPanel } from '@/components/panels/AlertPanel'
import { useGlobeOverlays } from '@/components/globe/GlobeOverlays'
import { useTrackingOverlays, type TrackingClickInfo } from '@/components/globe/TrackingOverlays'
import { useInfrastructureLayer } from '@/components/globe/InfrastructureLayer'
import { useAnnotationOverlay } from '@/components/globe/AnnotationOverlay'
import { useConflictTradeOverlay } from '@/components/globe/ConflictTradeOverlay'
import { useSigintOverlay } from '@/components/globe/SigintOverlay'
import { useDayNightLayer } from '@/components/globe/DayNightLayer'
import { useAdvancedOverlays, type AdvancedOverlayClickInfo } from '@/components/globe/AdvancedOverlays'
import { useTrackingStore } from '@/stores/tracking-store'
import { TrackingDetailPopup } from '@/components/panels/TrackingDetailPopup'
import { TrackingSearchPanel } from '@/components/panels/TrackingSearchPanel'
import { CountryProfilePanel } from '@/components/panels/CountryProfilePanel'
import { DashboardFeed } from '@/components/dashboard/DashboardFeed'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
// TimelinePanel replaced by InlineTimeline
// DashboardExport removed
import { SettingsModal } from '@/components/dashboard/DashboardSettings'
import { useIncidents } from '@/hooks/useIncidents'
import { useGlobeCamera } from '@/hooks/useGlobeCamera'
import { useViewStore } from '@/stores/view-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useNotificationStore } from '@/stores/notification-store'
import { findCountryByCoords } from '@/data/countries'
import { CommandPalette, KeyboardShortcutsGuide, AIPanel } from '@/components/panels/CommandPalette'
import type { Incident, CountryProfile, VIPTweet, GlobeVisualMode, FeatureFlags, DailyBriefing } from '../../../shared/types'
import { InfoTip } from '@/components/ui/InfoTip'
import { ExpandableList } from '@/components/ui/ExpandableList'
import { VoiceControl } from '@/components/panels/VoiceControl'
import { MarkdownText } from '@/components/ui/MarkdownText'
import { AnomalyRiskPanel } from '@/components/panels/AnomalyRiskPanel'
import { theme } from '@/theme'

const DashboardTimeAnalysis = lazy(() => import('@/components/dashboard/DashboardTimeAnalysis').then(m => ({ default: m.DashboardTimeAnalysis })))
const DashboardEntityTracker = lazy(() => import('@/components/dashboard/DashboardEntityTracker').then(m => ({ default: m.DashboardEntityTracker })))
const DashboardThreatScore = lazy(() => import('@/components/dashboard/DashboardThreatScore').then(m => ({ default: m.DashboardThreatScore })))
const MediaPage = lazy(() => import('@/components/pages/MediaPage').then(m => ({ default: m.MediaPage })))
const FinanceDeepPanel = lazy(() => import('@/components/panels/FinanceDeepPanel').then(m => ({ default: m.FinanceDeepPanel })))

const TimelineCompare = lazy(() => import('@/components/panels/TimelineCompare').then(m => ({ default: m.TimelineCompare })))
const SecurityIntelPage = lazy(() => import('@/components/pages/SecurityIntelPage').then(m => ({ default: m.SecurityIntelPage })))
const LogPage = lazy(() => import('@/components/pages/LogPage').then(m => ({ default: m.LogPage })))
const OperationsPage = lazy(() => import('@/components/pages/OperationsPage').then(m => ({ default: m.OperationsPage })))

const P = {
  bg: theme.bg,
  border: theme.border,
  card: theme.card,
  font: theme.font,
  accent: theme.accent,
  dim: theme.textDim,
  text: theme.text,
}

type TabId = 'intelligence' | 'analysis' | 'media' | 'feed' | 'finance' | 'security' | 'operations' | 'logs'

const TABS: { id: TabId; label: string; icon: string; color: string; featureKey: keyof FeatureFlags }[] = [
  { id: 'intelligence', label: 'INTELLIGENCE', icon: '◉', color: '#00d4ff', featureKey: 'tabIntelligence' },
  { id: 'analysis', label: 'ANALYSIS', icon: '◎', color: '#a78bfa', featureKey: 'tabAnalysis' },
  { id: 'feed', label: 'LIVE FEED', icon: '⚡', color: '#ff6b35', featureKey: 'tabLiveFeed' },
  { id: 'security', label: 'SECURITY', icon: '🛡', color: '#ff3b5c', featureKey: 'tabSecurity' },
  { id: 'finance', label: 'FINANCE', icon: '◈', color: '#f5c542', featureKey: 'tabFinance' },
  { id: 'operations', label: 'OPERATIONS', icon: '⚙', color: '#00e676', featureKey: 'tabOperations' },
  { id: 'media', label: 'MEDIA', icon: '▶', color: '#64c8ff', featureKey: 'tabMedia' },
  { id: 'logs', label: 'LOG', icon: '📋', color: '#6b7280', featureKey: 'tabLogs' },
] as const

class AppErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info)
  }
  handleRetry = () => { this.setState({ hasError: false, error: '' }) }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          width: '100%', height: '100vh', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: P.bg, color: '#ff3b5c', fontFamily: P.font,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠</div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>APPLICATION ERROR</div>
            <div style={{ fontSize: '11px', color: P.dim, maxWidth: '500px', marginBottom: '16px' }}>{this.state.error}</div>
            <button onClick={this.handleRetry} style={{
              padding: '8px 20px', background: '#1a2235', border: '1px solid #ff3b5c40',
              borderRadius: '6px', color: '#ff3b5c', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: P.font, transition: 'all 0.15s',
            }}>RETRY</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const CesiumGlobe = lazy(() => import('@/components/globe/CesiumGlobe').then(m => ({ default: m.CesiumGlobe })))

function GlobeLoadingFallback() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: P.bg, fontFamily: P.font,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '22px', fontWeight: 700, color: P.accent,
          textShadow: '0 0 20px rgba(0,212,255,0.3)', letterSpacing: '0.4em',
          marginBottom: '12px',
        }}>ARGUS</div>
        <div style={{ fontSize: '10px', color: P.dim, letterSpacing: '0.2em' }}>LOADING GLOBE ENGINE</div>
      </div>
    </div>
  )
}


function GlobeControls({ sidebarCollapsed, setSidebarCollapsed, handleApplyView, resetView, unlockRotation }: any) {
  return (
    <>
      <div style={{ position: 'absolute', top: '8px', left: '8px', bottom: '36px', zIndex: 25, pointerEvents: 'auto' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onApplyView={handleApplyView} />
      </div>
      <button onClick={() => { resetView(); unlockRotation() }} title="Reset to default view"
        style={{
          position: 'absolute', bottom: '12px', right: '12px', zIndex: 25,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', background: 'rgba(10,14,23,0.92)',
          border: `1px solid ${P.border}`, borderRadius: '8px',
          cursor: 'pointer', color: P.dim, fontFamily: P.font,
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
          backdropFilter: 'blur(10px)', transition: 'all 0.2s',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d4ff40'; e.currentTarget.style.color = P.accent; e.currentTarget.style.background = 'rgba(0,212,255,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim; e.currentTarget.style.background = 'rgba(10,14,23,0.92)' }}
      >
        <span style={{ fontSize: '14px' }}>&#x2316;</span>
        <span>CENTER</span>
      </button>
    </>
  )
}

function FloatingPopups({
  incidents, selectedIncident, selectIncident, setIncidentScreenPos,
  handleLocateIncident, handleAlertNavigate,
  alertsOpen, setAlertsOpen,
  selectedCountry, setSelectedCountry, trackingPopup, setTrackingPopup,
  incidentScreenPos, flyToRegion, unlockRotation,
}: any) {
  return (
    <>
      <AlertPanel isOpen={alertsOpen} onToggle={() => setAlertsOpen(false)} onSelectIncident={handleLocateIncident} onNavigate={handleAlertNavigate} />
      {selectedIncident && <IncidentDetail incident={selectedIncident} onClose={() => { selectIncident(null); setIncidentScreenPos(null); unlockRotation() }} onFlyTo={handleLocateIncident} screenPosition={incidentScreenPos} />}
      {selectedCountry && <CountryProfilePanel country={selectedCountry} incidents={incidents} onClose={() => setSelectedCountry(null)} onFlyTo={() => flyToRegion(selectedCountry.latitude, selectedCountry.longitude, 2000000)} onLocateIncident={handleLocateIncident} />}
      {trackingPopup && <TrackingDetailPopup info={trackingPopup} onClose={() => setTrackingPopup(null)} />}
    </>
  )
}

/* ─── Inline Timeline (non-absolute, scrolls with content) ─── */

const InlineTimeline = React.memo(function InlineTimeline({ incidents }: { incidents: Incident[] }) {
  const setDateRange = useFilterStore(s => s.setDateRange)
  const [activePreset, setActivePreset] = useState('24h')
  const [playing, setPlaying] = useState(false)
  const [playPos, setPlayPos] = useState(100)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const PRESETS = [
    { id: '1h', label: '1H', hours: 1 },
    { id: '6h', label: '6H', hours: 6 },
    { id: '24h', label: '24H', hours: 24 },
    { id: '7d', label: '7D', hours: 168 },
    { id: '30d', label: '30D', hours: 720 },
    { id: 'all', label: 'ALL', hours: 0 },
  ]

  const handlePreset = useCallback((id: string) => {
    setActivePreset(id)
    const p = PRESETS.find(x => x.id === id)
    if (!p || p.hours === 0) setDateRange(null, null)
    else setDateRange(new Date(Date.now() - p.hours * 3600000).toISOString(), null)
    setPlayPos(100)
  }, [setDateRange])

  const togglePlay = useCallback(() => {
    if (playing) { setPlaying(false); if (playRef.current) clearInterval(playRef.current) }
    else { setPlaying(true); setPlayPos(0) }
  }, [playing])

  useEffect(() => {
    if (!playing) return
    playRef.current = setInterval(() => {
      setPlayPos(p => { if (p >= 100) { setPlaying(false); return 100 }; return p + 0.5 })
    }, 50)
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [playing])

  useEffect(() => {
    if (!playing) return
    const p = PRESETS.find(x => x.id === activePreset)
    if (!p || p.hours === 0) return
    const totalMs = p.hours * 3600000
    const startTime = Date.now() - totalMs
    const currentTime = startTime + (totalMs * playPos / 100)
    setDateRange(new Date(startTime).toISOString(), new Date(currentTime).toISOString())
  }, [playPos, playing, activePreset, setDateRange])

  const histogram = useMemo(() => {
    const bins = 60
    const p = PRESETS.find(x => x.id === activePreset)
    const hours = p?.hours || 24
    const now = Date.now()
    const start = now - hours * 3600000
    const binSize = (hours * 3600000) / bins
    const counts = new Array(bins).fill(0)
    for (const inc of incidents) {
      const t = new Date(inc.timestamp).getTime()
      if (t >= start && t <= now) counts[Math.min(Math.floor((t - start) / binSize), bins - 1)]++
    }
    const max = Math.max(...counts, 1)
    return counts.map(c => c / max)
  }, [incidents, activePreset])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const r = trackRef.current?.getBoundingClientRect()
    if (r) setPlayPos(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)))
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const r = trackRef.current?.getBoundingClientRect()
    if (r) setPlayPos(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
  }

  const p = PRESETS.find(x => x.id === activePreset)
  const hours = p?.hours || 24
  const rangeStart = new Date(Date.now() - hours * 3600000)
  const rangeEnd = new Date()

  return (
    <div style={{
      padding: '14px 16px', borderBottom: `1px solid ${P.border}`,
      background: P.bg, fontFamily: P.font, boxSizing: 'border-box' as const, minWidth: 0,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ width: '3px', height: '14px', background: P.accent, borderRadius: '2px', flexShrink: 0 }} />
        <span style={{ fontSize: '9px', fontWeight: 700, color: P.text, letterSpacing: '0.14em', flexShrink: 0 }}>TIMELINE</span>
        <InfoTip text="Interactive timeline showing incident density over time. Use preset buttons (1H–ALL) to change the window. Click and drag the track to scrub through time. Press play to animate." />

        <button onClick={togglePlay} style={{
          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
          background: playing ? P.accent + '20' : '#0d1220',
          border: `1px solid ${playing ? P.accent : P.border}`,
          color: playing ? P.accent : P.dim, cursor: 'pointer', fontSize: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: P.font,
        }}>{playing ? '❚❚' : '▶'}</button>

        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {PRESETS.map(pr => (
            <button key={pr.id} onClick={() => handlePreset(pr.id)} style={{
              padding: '2px 6px', fontSize: '9px', fontFamily: P.font,
              background: activePreset === pr.id ? P.accent + '20' : 'transparent',
              border: `1px solid ${activePreset === pr.id ? P.accent + '60' : P.border}`,
              borderRadius: '3px', cursor: 'pointer',
              color: activePreset === pr.id ? P.accent : P.dim, letterSpacing: '0.05em',
            }}>{pr.label}</button>
          ))}
        </div>

        <span style={{ fontSize: '9px', color: P.dim, marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ color: P.accent }}>{incidents.length}</span> events
        </span>
      </div>

      {/* Histogram track */}
      <div ref={trackRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        style={{
          position: 'relative', height: '36px', background: P.bg,
          border: `1px solid ${P.border}`, borderRadius: '4px',
          cursor: 'grab', touchAction: 'none',
          display: 'flex', alignItems: 'flex-end', gap: '1px', padding: '4px',
        }}
      >
        {histogram.map((val, i) => (
          <div key={i} style={{
            flex: 1, minWidth: '1px',
            height: `${Math.max(2, val * 26)}px`,
            background: i <= (histogram.length * playPos / 100) ? P.accent + '60' : P.accent + '15',
            borderRadius: '1px 1px 0 0',
          }} />
        ))}
        <div style={{
          position: 'absolute', left: `${playPos}%`, top: 0, bottom: 0, width: '2px',
          marginLeft: '-1px', background: P.accent, boxShadow: `0 0 6px ${P.accent}`,
          pointerEvents: 'none',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '9px', color: P.dim }}>{rangeStart.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        <span style={{ fontSize: '9px', color: P.dim }}>{rangeEnd.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
})

/* ─── Intelligence Page ─── */

function IncidentClusters({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null)

  const clusters = useMemo(() => {
    const groups = new Map<string, Incident[]>()
    for (const inc of incidents) {
      const words = inc.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4)
      let matched = false
      for (const [key, members] of groups) {
        const keyWords = key.split('|')
        const overlap = words.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw))).length
        if (overlap >= 2 || (inc.country && members[0]?.country === inc.country && inc.domain === members[0]?.domain && overlap >= 1)) {
          members.push(inc)
          matched = true
          break
        }
      }
      if (!matched && words.length >= 2) {
        groups.set(words.slice(0, 4).join('|'), [inc])
      }
    }
    return Array.from(groups.values())
      .filter(g => g.length >= 2)
      .sort((a, b) => b.length - a.length)
      .map((members, i) => {
        const allMembers = members.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        const sevWeights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 }
        const maxSev = allMembers.reduce((max, m) => (sevWeights[m.severity] || 0) > (sevWeights[max] || 0) ? m.severity : max, allMembers[0].severity)
        const domainMap = new Map<string, number>()
        for (const m of allMembers) domainMap.set(m.domain, (domainMap.get(m.domain) || 0) + 1)
        return {
          id: i, title: allMembers[0].title, count: allMembers.length,
          domain: allMembers[0].domain, country: allMembers[0].country,
          members: allMembers, severity: maxSev,
          domains: Array.from(domainMap.entries()).sort((a, b) => b[1] - a[1]),
        }
      })
  }, [incidents])

  const sevColor = (s: string) => ({ CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff', INFO: '#4a5568' }[s] || '#4a5568')
  const borderColor = (s: string) => s === 'CRITICAL' ? '#ff3b5c' : s === 'HIGH' ? '#ff6b35' : '#00d4ff'

  const renderCluster = useCallback((c: typeof clusters[number]) => {
    const isExpanded = expandedCluster === c.id
    return (
      <div key={c.id} style={{ marginBottom: '6px' }}>
        <div
          onClick={() => setExpandedCluster(isExpanded ? null : c.id)}
          style={{
            padding: '10px', background: isExpanded ? 'rgba(6,182,212,0.04)' : '#0d1220',
            border: `1px solid ${isExpanded ? '#06b6d430' : '#141c2e'}`,
            borderLeft: `3px solid ${borderColor(c.severity)}`,
            borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'rgba(6,182,212,0.03)' }}
          onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = '#0d1220' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '8px', color: '#06b6d4', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#c8d6e5' }}>{c.title.length > 60 ? c.title.substring(0, 60) + '...' : c.title}</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#00d4ff' }}>{c.count}</span>
          </div>
          <div style={{ fontSize: '9px', color: '#4a5568' }}>{c.domain} • {c.country || 'Global'} • Max severity: {c.severity}</div>
        </div>

        {isExpanded && (
          <div style={{
            border: '1px solid #06b6d420', borderTop: 'none',
            borderRadius: '0 0 6px 6px', background: '#0d1220', padding: '10px 12px',
          }}>
            {/* Domain breakdown */}
            {c.domains.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {c.domains.map(([d, cnt]) => (
                  <span key={d} style={{
                    fontSize: '9px', padding: '3px 8px', borderRadius: '4px',
                    background: '#00d4ff10', border: '1px solid #00d4ff20', color: '#c8d6e5',
                  }}>{d} <span style={{ color: '#00d4ff', fontWeight: 700 }}>({cnt})</span></span>
                ))}
              </div>
            )}

            <div style={{ fontSize: '9px', color: '#4a5568', marginBottom: '6px', letterSpacing: '0.08em', fontWeight: 700 }}>
              CLUSTER MEMBERS ({c.members.length})
            </div>
            <ExpandableList
              items={c.members}
              title={`Cluster: ${c.title.substring(0, 40)}`}
              icon="◎"
              color="#06b6d4"
              emptyMessage="No members"
              searchable
              searchFn={(m, q) => `${m.title} ${m.description || ''} ${m.source} ${m.country || ''}`.toLowerCase().includes(q)}
              filters={[
                { id: 'severity', label: 'Severity', options: [...new Set(c.members.map(i => i.severity))] },
                { id: 'domain', label: 'Domain', options: [...new Set(c.members.map(i => i.domain))] },
              ]}
              filterFn={(m, f) => {
                if (f.severity && m.severity !== f.severity) return false
                if (f.domain && m.domain !== f.domain) return false
                return true
              }}
              renderItem={(m) => {
                const clickable = !!onLocateIncident && m.latitude != null && m.longitude != null
                return (
                  <div key={m.id}
                    onClick={clickable ? () => onLocateIncident(m) : undefined}
                    style={{
                      display: 'flex', gap: '8px', alignItems: 'flex-start',
                      padding: '6px 8px', background: '#0a0e17', border: '1px solid #141c2e',
                      borderRadius: '4px', marginBottom: '3px',
                      cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s',
                    }}
                    onMouseEnter={clickable ? e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
                    onMouseLeave={clickable ? e => { (e.currentTarget as HTMLDivElement).style.background = '#0a0e17' } : undefined}
                  >
                    <span style={{
                      fontSize: '8px', padding: '2px 5px', borderRadius: '3px', fontWeight: 700, flexShrink: 0,
                      background: sevColor(m.severity) + '20', color: sevColor(m.severity), marginTop: '1px',
                    }}>{m.severity}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', color: '#c8d6e5', fontWeight: 600, lineHeight: 1.3 }}>
                        {m.title}
                        {clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '9px' }}>◎</span>}
                      </div>
                      <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '2px' }}>
                        {m.domain} · {m.source} · {m.country || 'Global'} · {new Date(m.timestamp).toLocaleString()}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '3px', lineHeight: 1.4, opacity: 0.8 }}>
                          {m.description.length > 150 ? m.description.slice(0, 150) + '…' : m.description}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          </div>
        )}
      </div>
    )
  }, [expandedCluster, onLocateIncident])

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
        AUTO INCIDENT CLUSTERING — {clusters.length} clusters detected
        <InfoTip text="Groups similar incidents together using keyword matching and domain/region proximity. Click a cluster to see all related incidents sorted by time. This is a heuristic grouping based on title keywords — not AI-powered." size={11} color="#06b6d4" />
      </div>
      <ExpandableList
        items={clusters}
        title="Clusters"
        icon="◎"
        color="#06b6d4"
        emptyMessage="No clusters detected yet. Need more incident data."
        renderItem={(c) => renderCluster(c)}
      />
    </div>
  )
}

type IntelTab = 'overview' | 'timeline' | 'entities' | 'anomaly' | 'briefing'

const INTEL_TABS: { id: IntelTab; label: string; icon: string; color: string }[] = [
  { id: 'overview', label: 'OVERVIEW', icon: '◉', color: '#00d4ff' },
  { id: 'timeline', label: 'TIME ANALYSIS', icon: '📊', color: '#a78bfa' },
  { id: 'entities', label: 'ENTITY TRACKER', icon: '⬡', color: '#06b6d4' },
  { id: 'anomaly', label: 'ANOMALY & RISK', icon: '⚠', color: '#ff6b35' },
  { id: 'briefing', label: 'DAILY BRIEFING', icon: '📋', color: '#00e676' },
]

const IntelligencePage = React.memo(function IntelligencePage({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const [activeIntelTab, setActiveIntelTab] = useState<IntelTab>('overview')

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, overflowX: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px 24px 6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {INTEL_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveIntelTab(t.id)} style={{
            padding: '6px 14px', background: activeIntelTab === t.id ? `${t.color}15` : 'transparent',
            border: `1px solid ${activeIntelTab === t.id ? t.color + '50' : P.border}`,
            borderRadius: '4px', color: activeIntelTab === t.id ? t.color : P.dim,
            fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.06em',
            transition: 'all 0.15s',
          }}>{t.icon} {t.label}</button>
        ))}
        <span style={{ fontSize: '8px', color: P.dim, marginLeft: 'auto', fontFamily: P.font, letterSpacing: '0.05em', opacity: 0.7 }}>ALL EVENTS (UNFILTERED)</span>
      </div>

      {/* Tab content */}
      {activeIntelTab === 'overview' && (
        <div>
          <InlineTimeline incidents={incidents} />
          <DashboardStats incidents={incidents} />
        </div>
      )}

      {activeIntelTab === 'timeline' && (
        <div style={{ padding: '8px 0' }}>
          <Suspense fallback={<div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.dim, fontSize: '11px', fontFamily: P.font }}>Loading...</div>}>
            <DashboardTimeAnalysis incidents={incidents} />
          </Suspense>
        </div>
      )}

      {activeIntelTab === 'entities' && (
        <div style={{ padding: '8px 0' }}>
          <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.dim, fontSize: '11px', fontFamily: P.font }}>Loading...</div>}>
            <DashboardEntityTracker incidents={incidents} onLocateIncident={onLocateIncident} />
          </Suspense>
        </div>
      )}

      {activeIntelTab === 'anomaly' && (
        <div style={{ padding: '12px 24px' }}>
          <AnomalyRiskPanel onLocateIncident={onLocateIncident} />
        </div>
      )}

      {activeIntelTab === 'briefing' && (
        <BriefingSummary incidents={incidents} onLocateIncident={onLocateIncident} />
      )}
    </div>
  )
})

/* ─── Briefing Summary (inline) ─── */

const BriefingSummary = React.memo(function BriefingSummary({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const features = useSettingsStore(s => s.features)
  const [backendBriefing, setBackendBriefing] = React.useState<DailyBriefing | null>(null)

  // Load backend briefing (for region alerts, trending, top events)
  React.useEffect(() => {
    window.argus?.getDailyBriefing?.().then(b => { if (b) setBackendBriefing(b) }).catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const now = Date.now()
    const h1 = incidents.filter(i => now - new Date(i.timestamp).getTime() < 3600000).length
    const h24 = incidents.filter(i => now - new Date(i.timestamp).getTime() < 86400000).length
    const critical = incidents.filter(i => i.severity === 'CRITICAL').length
    const high = incidents.filter(i => i.severity === 'HIGH').length
    const domainCounts: Record<string, number> = { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0 }
    for (const i of incidents) domainCounts[i.domain]++
    const topCountries = new Map<string, number>()
    for (const i of incidents) {
      if (i.country) topCountries.set(i.country, (topCountries.get(i.country) || 0) + 1)
    }
    const sortedCountries = [...topCountries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    return { h1, h24, critical, high, domainCounts, sortedCountries, total: incidents.length }
  }, [incidents])

  const recentCritical = useMemo(() =>
    incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8),
    [incidents]
  )

  const DC: Record<string, string> = { CONFLICT: '#ff6b35', CYBER: '#00ff87', INTEL: '#4a9eff', FINANCE: '#f5c542' }
  const sevColor = (s: string) => ({ CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff', EXTREME: '#ff3b5c', SEVERE: '#ff6b35', MODERATE: '#f5c542', MINOR: '#64c8ff', EMERGENCY: '#ff3b5c' }[s] || P.dim)

  // Voice control briefing text
  const voiceSummary = backendBriefing?.summary || `There are ${stats.total} total incidents. ${stats.critical} are critical, ${stats.high} are high severity. ${stats.h24} occurred in the last 24 hours.`

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header + Voice Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: P.text, letterSpacing: '0.08em' }}>DAILY BRIEFING</span>
        <InfoTip text="Unified intelligence briefing — stats, threat assessment, AI analysis, region alerts, and voice readout." />
        <div style={{ flex: 1 }} />
        {(features?.featureVoiceControl ?? true) && (
          <VoiceControl onCommand={cmd => console.log('[Voice]', cmd)} briefingText={voiceSummary} />
        )}
      </div>

      {/* Backend summary text (if available) */}
      {backendBriefing?.summary && (
        <div style={{ padding: '10px 14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '14px', fontSize: '11px', color: P.text, lineHeight: 1.6 }}>
          {backendBriefing.summary}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        {[
          { l: 'TOTAL', v: stats.total, c: P.text },
          { l: 'LAST 24H', v: stats.h24, c: P.accent },
          { l: 'CRITICAL', v: stats.critical, c: '#ff3b5c' },
          { l: 'HIGH', v: stats.high, c: '#ff6b35' },
          ...(backendBriefing ? [{ l: 'NEW TODAY', v: backendBriefing.stats.newToday, c: '#f5c542' }] : []),
        ].map(m => (
          <div key={m.l} style={{ padding: '12px 14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: m.c, lineHeight: 1.2 }}>{m.v}</div>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.08em', marginTop: '4px', fontWeight: 600 }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* Trending topics */}
      {backendBriefing?.stats?.trending && backendBriefing.stats.trending.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.1em' }}>TRENDING</span>
          {backendBriefing.stats.trending.map(t => (
            <span key={t} style={{ fontSize: '9px', color: '#a78bfa', padding: '2px 8px', background: '#a78bfa12', border: '1px solid #a78bfa25', borderRadius: '10px' }}>{t}</span>
          ))}
        </div>
      )}

      {/* Domain breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {Object.entries(stats.domainCounts).map(([d, c]) => (
          <div key={d} style={{ padding: '10px 12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', borderLeft: `3px solid ${DC[d]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: DC[d], letterSpacing: '0.04em' }}>{d}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: P.text }}>{c}</span>
          </div>
        ))}
      </div>

      {/* Top Countries */}
      <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700 }}>TOP COUNTRIES</div>
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '4px 0', marginBottom: '14px' }}>
        {stats.sortedCountries.map(([country, count], i) => (
          <div key={country} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', background: i % 2 === 0 ? 'transparent' : `${P.border}40`, borderRadius: '2px' }}>
            <span style={{ fontSize: '9px', color: P.dim, width: '18px', textAlign: 'right', fontWeight: 600 }}>#{i + 1}</span>
            <span style={{ flex: 1, fontSize: '11px', color: P.text }}>{country}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: P.accent }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Region Alerts (from backend briefing) */}
      {backendBriefing?.regionAlerts && backendBriefing.regionAlerts.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700 }}>REGION ALERTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
            {backendBriefing.regionAlerts.map((r, i) => (
              <div key={i} style={{ padding: '10px 12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', borderLeft: `3px solid ${sevColor(r.riskLevel)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: P.text }}>{r.region}</span>
                  <span style={{ fontSize: '9px', color: sevColor(r.riskLevel), fontWeight: 700, padding: '1px 5px', background: sevColor(r.riskLevel) + '15', borderRadius: '3px' }}>{r.riskLevel}</span>
                </div>
                <div style={{ fontSize: '9px', color: P.dim, lineHeight: 1.4 }}>{r.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical & High incidents */}
      <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700 }}>CRITICAL & HIGH</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
        {recentCritical.map(inc => {
          const hasCoords = inc.latitude != null && inc.longitude != null && onLocateIncident
          return (
            <div key={inc.id} onClick={hasCoords ? () => onLocateIncident(inc) : undefined}
              style={{ padding: '8px 12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', borderLeft: `3px solid ${DC[inc.domain]}`, cursor: hasCoords ? 'pointer' : 'default', transition: 'background 0.15s' }}
              onMouseEnter={hasCoords ? e => { e.currentTarget.style.background = '#111827' } : undefined}
              onMouseLeave={hasCoords ? e => { e.currentTarget.style.background = P.card } : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ flex: 1, fontSize: '11px', color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</div>
                {hasCoords && <span style={{ fontSize: '10px', color: P.dim, flexShrink: 0 }}>📍</span>}
              </div>
              <div style={{ fontSize: '9px', color: P.dim, marginTop: '3px' }}>
                <span style={{ color: sevColor(inc.severity), fontWeight: 600 }}>{inc.severity}</span>
                {' · '}{inc.country || 'Unknown'}
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Daily Briefing */}
      <AIBriefingCard />
    </div>
  )
})

/* ─── AI Daily Briefing Card ─── */
function AIBriefingCard() {
  const [briefing, setBriefing] = React.useState<string | null>(null)
  const [model, setModel] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [expanded, setExpanded] = React.useState(true)

  const handleGenerate = async () => {
    setLoading(true)
    setBriefing(null)
    try {
      const res = await window.argus.aiDailyBriefing()
      setBriefing(res.summary)
      setModel(res.model)
    } catch (err: any) {
      setBriefing(`Error: ${err?.message || 'AI unavailable'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '14px 16px', background: P.card, border: `1px solid #a855f720`, borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: briefing ? '10px' : '0' }}>
        <span style={{ fontSize: '12px' }}>🤖</span>
        <span style={{ fontSize: '9px', color: '#a855f7', fontWeight: 700, letterSpacing: '0.1em' }}>AI INTELLIGENCE BRIEFING</span>
        <InfoTip text="Generate a comprehensive AI-powered intelligence briefing based on all incidents from the last 24 hours. The AI analyzes patterns, threats, and provides actionable recommendations." />
        <div style={{ flex: 1 }} />
        {briefing && (
          <button onClick={() => setExpanded(e => !e)} style={{
            padding: '2px 6px', fontSize: '9px', background: 'transparent',
            border: `1px solid ${P.border}`, borderRadius: '3px',
            color: P.dim, cursor: 'pointer', fontFamily: P.font,
          }}>{expanded ? '\u25BC' : '\u25B6'}</button>
        )}
        <button onClick={handleGenerate} disabled={loading} style={{
          padding: '5px 14px', fontSize: '9px', fontWeight: 700,
          background: loading ? 'transparent' : '#a855f718',
          border: `1px solid ${loading ? P.border : '#a855f740'}`,
          borderRadius: '4px', color: loading ? P.dim : '#a855f7',
          cursor: loading ? 'wait' : 'pointer', fontFamily: P.font, letterSpacing: '0.06em',
        }}>{loading ? 'GENERATING...' : briefing ? 'REFRESH' : 'GENERATE BRIEFING'}</button>
      </div>
      {loading && (
        <div style={{ fontSize: '9px', color: '#a855f7', padding: '8px 0' }}>
          Analyzing all incidents and generating intelligence briefing...
        </div>
      )}
      {briefing && expanded && (
        <div>
          <MarkdownText text={briefing} style={{ fontSize: '11px', color: P.text, background: P.bg, padding: '12px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }} />
          {model && model !== 'error' && model !== 'none' && (
            <div style={{ fontSize: '9px', color: P.dim, marginTop: '3px', textAlign: 'right' }}>model: {model}</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Spike Bar (compact horizontal) ─── */

const SpikeBar = React.memo(function SpikeBar({ incidents }: { incidents: Incident[] }) {
  const spikes = useMemo(() => {
    const now = Date.now()
    const last6h = incidents.filter(i => new Date(i.timestamp).getTime() > now - 6 * 3600000)
    const last24h = incidents.filter(i => new Date(i.timestamp).getTime() > now - 24 * 3600000)
    const DC: Record<string, string> = { CONFLICT: '#ff6b35', CYBER: '#00ff87', INTEL: '#4a9eff', FINANCE: '#f5c542' }
    const result: { domain: string; recent: number; baseline: number; deviation: number; color: string }[] = []
    for (const domain of Object.keys(DC)) {
      const recent = last6h.filter(i => i.domain === domain).length
      const baseline = Math.max(last24h.filter(i => i.domain === domain).length / 4, 1)
      const dev = recent / baseline
      if (dev >= 2) result.push({ domain, recent, baseline: Math.round(baseline), deviation: Number(dev.toFixed(1)), color: DC[domain] })
    }
    return result.sort((a, b) => b.deviation - a.deviation)
  }, [incidents])

  if (spikes.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 20px', background: '#1a0f0a', borderBottom: `1px solid #ff6b3520`, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '9px', fontWeight: 700, color: '#ff3b5c', letterSpacing: '0.06em', flexShrink: 0 }}>⚠ UNUSUAL ACTIVITY</span>
      <InfoTip text="Spike detection compares the last 6 hours against the 24-hour average per 6h window. Domains with 2x or higher activity than normal are flagged. Hover over each domain for details." size={11} color="#ff3b5c" />
      {spikes.map(s => (
        <span key={s.domain} style={{ fontSize: '9px', fontFamily: P.font, color: s.color, fontWeight: 600 }}
          title={`${s.domain}: ${s.recent} events in last 6h vs ~${s.baseline} avg per 6h window`}
        >
          {s.domain} <span style={{ color: s.deviation >= 3 ? '#ff3b5c' : '#ffb000', fontWeight: 700 }}>{s.recent} events</span>
          <span style={{ color: P.dim, fontWeight: 400 }}> ({s.deviation}x normal)</span>
        </span>
      ))}
    </div>
  )
})

/* ─── Analysis Page ─── */

const ANALYSIS_TABS: { id: 'briefing' | 'threats' | 'clusters' | 'compare'; label: string; color: string; featureKey: keyof FeatureFlags }[] = [
  { id: 'briefing', label: 'BRIEFING', color: '#00d4ff', featureKey: 'analysisBriefing' },
  { id: 'threats', label: 'THREATS', color: '#ff6b35', featureKey: 'analysisThreats' },
  { id: 'clusters', label: 'AUTO CLUSTERS', color: '#06b6d4', featureKey: 'analysisClusters' },
  { id: 'compare', label: 'COMPARE', color: '#ff6b35', featureKey: 'tabCompare' },
]

type AnalysisTabId = 'briefing' | 'threats' | 'clusters' | 'compare'

const AnalysisPage = React.memo(function AnalysisPage({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident: (i: Incident) => void }) {
  const features = useSettingsStore(s => s.features)
  const visibleAnalysisTabs = useMemo(() => ANALYSIS_TABS.filter(t => features?.[t.featureKey] ?? true), [features])
  const [tab, setTab] = useState<AnalysisTabId>('briefing')
  const effectiveTab = visibleAnalysisTabs.find(t => t.id === tab) ? tab : visibleAnalysisTabs[0]?.id

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${P.border}`, padding: '0 20px', background: `${P.bg}` }}>
        {visibleAnalysisTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px',
            background: effectiveTab === t.id ? `${t.color}08` : 'transparent',
            border: 'none', borderBottom: `2px solid ${effectiveTab === t.id ? t.color : 'transparent'}`,
            color: effectiveTab === t.id ? t.color : P.dim,
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            cursor: 'pointer', fontFamily: P.font, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Spike banner - always visible */}
      <SpikeBar incidents={incidents} />

      {/* Content */}
      <div style={{ padding: '0' }}>
        {effectiveTab === 'briefing' && (
          <BriefingSummary incidents={incidents} onLocateIncident={onLocateIncident} />
        )}
        {effectiveTab === 'threats' && <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#4a5568', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>Loading module...</div>}><DashboardThreatScore incidents={incidents} onLocateIncident={onLocateIncident} /></Suspense>}
        {effectiveTab === 'clusters' && <IncidentClusters incidents={incidents} onLocateIncident={onLocateIncident} />}
        {effectiveTab === 'compare' && <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#4a5568', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>Loading module...</div>}><TimelineCompare incidents={incidents} /></Suspense>}
      </div>
    </div>
  )
})

/* ─── Toast Container (doesn't delete notifications, just hides them) ─── */

const TOAST_DURATION = 30000

const ToastContainer = React.memo(function ToastContainer({ notifications, allIncidents, selectIncident, flyToIncident, scrollRef, setActiveTab, markRead }: any) {
  const [now, setNow] = useState(Date.now())
  const dismissedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const unread = useMemo(() =>
    notifications.filter((n: any) => !n.read && !dismissedRef.current.has(n.id)),
    [notifications, now]
  )
  const visible = useMemo(() =>
    unread.filter((n: any) => (now - n.timestamp) < TOAST_DURATION),
    [unread, now]
  )

  useEffect(() => {
    let changed = false
    for (const n of unread) {
      if ((now - n.timestamp) >= TOAST_DURATION && !dismissedRef.current.has(n.id)) {
        dismissedRef.current.add(n.id)
        changed = true
      }
    }
    if (dismissedRef.current.size > 500) {
      const arr = Array.from(dismissedRef.current)
      dismissedRef.current = new Set(arr.slice(arr.length - 200))
      changed = true
    }
    if (changed) setNow(Date.now())
  }, [unread, now])

  if (visible.length === 0) return null

  const sevColors: Record<string, string> = { CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff', INFO: '#4a5568' }

  const age = (ts: number) => {
    const s = Math.floor((now - ts) / 1000)
    if (s < 5) return 'just now'
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
  }

  return (
    <div style={{ position: 'fixed', top: '50px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
      {visible.slice(0, 5).map((n: any) => {
        const elapsed = now - n.timestamp
        const fadeOut = elapsed > (TOAST_DURATION - 3000)
        const opacity = fadeOut ? Math.max(0.3, 1 - (elapsed - (TOAST_DURATION - 3000)) / 3000) : 1

        let accent = P.accent, icon = '\u25C6'
        if (n.type === 'incident') { accent = sevColors[n.severity || ''] || P.accent; icon = n.domain === 'CONFLICT' ? '\u2694' : n.domain === 'CYBER' ? '\u26A1' : n.domain === 'INTEL' ? '\u25C9' : '\u25C6' }
        else if (n.type === 'tweet') { accent = '#4a9eff'; icon = '\uD835\uDD4F' }
        else if (n.type === 'earthquake') { accent = '#ff8800'; icon = '\u25CE' }
        else if (n.type === 'disaster') { accent = '#ff60a0'; icon = '\u26A0' }
        const handleClick = () => {
          markRead(n.id)
          dismissedRef.current.add(n.id)
          if (n.type === 'incident') {
            const inc = n.incidentId ? allIncidents.find((i: Incident) => i.id === n.incidentId) : undefined
            if (inc) {
              selectIncident(inc)
              if (inc.latitude != null && inc.longitude != null) {
                flyToIncident(inc)
                scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }
            } else if (n.latitude != null && n.longitude != null) {
              flyToIncident({ latitude: n.latitude, longitude: n.longitude, title: n.title } as Incident)
              scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            }
          } else if (n.type === 'tweet') {
            if (n.tweetUrl) window.open(n.tweetUrl, '_blank', 'noopener,noreferrer')
            else { setActiveTab('media') }
          } else if (n.latitude != null && n.longitude != null) {
            flyToIncident({ latitude: n.latitude, longitude: n.longitude, title: n.title } as Incident)
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }
        const handleDismiss = (e: React.MouseEvent) => {
          e.stopPropagation()
          markRead(n.id)
          dismissedRef.current.add(n.id)
        }
        return (
          <div key={n.id} onClick={handleClick} style={{
            background: 'rgba(10,14,23,0.96)', border: `1px solid ${accent}40`,
            borderLeft: `3px solid ${accent}`, borderRadius: '8px',
            padding: '14px 18px', minWidth: '340px', maxWidth: '420px',
            fontFamily: P.font, backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)', cursor: 'pointer',
            opacity, transition: 'opacity 0.5s ease',
            animation: elapsed < 500 ? 'none' : undefined,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, color: accent }}>{icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '9px', color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{n.subtitle}</span>
                  <span style={{ fontSize: '9px', color: P.dim }}>{age(n.timestamp)}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{n.title}</div>
              </div>
              <button type="button" onClick={handleDismiss}
                style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '14px', padding: '0 0 0 8px', flexShrink: 0 }}>{'\u2715'}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
})

/* ─── Main App ─── */

const isPanelsOnlyWindow = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'panels-only'

function AppShellContent() {
  const [viewer, setViewer] = useState<any>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [sceneMode, setSceneMode] = useState<'3d' | '2d' | 'columbus'>('3d')
  const [selectedCountry, setSelectedCountry] = useState<CountryProfile | null>(null)
  const [trackingPopup, setTrackingPopup] = useState<TrackingClickInfo | null>(null)
  const [incidentScreenPos, setIncidentScreenPos] = useState<{ x: number; y: number } | null>(null)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined)

  const openSettings = useCallback((tab?: string) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }, [])
  const [trackingSearchOpen, setTrackingSearchOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('intelligence')
  const [mapHeight, setMapHeight] = useState(50)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsGuideOpen, setShortcutsGuideOpen] = useState(false)
  const [aiPanelOpen, setAIPanelOpen] = useState(false)
  const [visualMode, setVisualMode] = useState<GlobeVisualMode>('default')
  const [splitView, setSplitView] = useState(false)
  const [splitSceneMode, setSplitSceneMode] = useState<'3d' | '2d' | 'columbus'>('2d')
  const [panelsDetached, setPanelsDetached] = useState(false)
  const resizing = useRef(false)
  const resizeStartY = useRef(0)
  const resizeStartX = useRef(0)
  const resizeStartHeight = useRef(50)
  const resizeStartWidth = useRef(50)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isPanelsOnlyWindow) return
    const dispose = window.argus?.onPanelsDetached?.((detached: boolean) => {
      setPanelsDetached(detached)
    })
    return () => { dispose?.() }
  }, [])

  const { incidents, allIncidents, selectedIncident, selectIncident } = useIncidents()
  const { flyToIncident, flyToRegion, resetView, unlockRotation } = useGlobeCamera(viewer)

  const flyRef = useRef(flyToIncident)
  flyRef.current = flyToIncident
  const selectRef = useRef(selectIncident)
  selectRef.current = selectIncident

  const computePosRef = useRef<(incident: any) => Promise<void>>(() => Promise.resolve())

  useEffect(() => {
    if (isPanelsOnlyWindow) return
    const dispose = window.argus?.onRemoteNavigateIncident?.((incident: any) => {
      const hasCoords = incident.latitude != null && incident.longitude != null &&
        !(Math.abs(incident.latitude) < 0.5 && Math.abs(incident.longitude) < 0.5)
      if (hasCoords && viewer) {
        const canvas = viewer.canvas
        if (canvas) setIncidentScreenPos({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 })
      }
      selectRef.current(incident)
      if (hasCoords) flyRef.current(incident, () => computePosRef.current(incident))
    })
    return () => { dispose?.() }
  }, [viewer])
  const views = useViewStore(s => s.views)
  const notifications = useNotificationStore(s => s.notifications)
  const markNotifRead = useNotificationStore(s => s.markRead)

  const handleGlobeReady = useCallback((v: any) => { setViewer(v) }, [])

  const resetViewRef = useRef(resetView)
  resetViewRef.current = resetView
  const unlockRotationRef = useRef(unlockRotation)
  unlockRotationRef.current = unlockRotation

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if (e.key === 'k' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && ff('featureCommandPalette')) { e.preventDefault(); setCommandPaletteOpen(o => !o) }
      else if (e.key === 'i' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && ff('featureAIPanel')) { e.preventDefault(); setAIPanelOpen(o => !o) }
      else if (e.key === 'Escape') { setCommandPaletteOpen(false); setAIPanelOpen(false) }
      else if (isEditing) return
      else if (e.key === '1' && e.altKey) { e.preventDefault(); setActiveTab('intelligence') }
      else if (e.key === '2' && e.altKey) { e.preventDefault(); setActiveTab('analysis') }
      else if (e.key === '3' && e.altKey) { e.preventDefault(); setActiveTab('feed') }
      else if (e.key === '4' && e.altKey) { e.preventDefault(); setActiveTab('security') }
      else if (e.key === '5' && e.altKey) { e.preventDefault(); setActiveTab('finance') }
      else if (e.key === '6' && e.altKey) { e.preventDefault(); setActiveTab('operations') }
      else if (e.key === '9' && e.altKey) { e.preventDefault(); setActiveTab('media') }
      else if (e.key === 'Home') { e.preventDefault(); resetViewRef.current(); unlockRotationRef.current() }
      else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setMapFullscreen(f => !f) }
      else if (e.key === '?') { e.preventDefault(); setShortcutsGuideOpen(o => !o) }
      else if (e.key === 'n' || e.key === 'N') {
        const incs = useIncidentStore.getState().incidents
        const sel = useIncidentStore.getState().selectedIncident
        if (incs.length > 0) {
          const idx = sel ? incs.findIndex(i => i.id === sel.id) : -1
          const next = incs[(idx + 1) % incs.length]
          if (next) { selectRef.current(next); flyRef.current(next) }
        }
      }
      else if (e.key === 'p' || e.key === 'P') {
        const incs = useIncidentStore.getState().incidents
        const sel = useIncidentStore.getState().selectedIncident
        if (incs.length > 0) {
          const idx = sel ? incs.findIndex(i => i.id === sel.id) : 1
          const prev = incs[(idx - 1 + incs.length) % incs.length]
          if (prev) { selectRef.current(prev); flyRef.current(prev) }
        }
      }
      else if (e.key === 'r' || e.key === 'R') { window.argus.refreshFeeds().catch(() => {}) }
      else if (e.key === ' ') { e.preventDefault(); useFilterStore.getState().togglePlayback() }
      else if (e.key === '[') { const s = useFilterStore.getState().playbackSpeed; const speeds: number[] = [0.5, 1, 2, 4, 8]; const idx = Math.max(0, speeds.indexOf(s) - 1); useFilterStore.getState().setPlaybackSpeed(speeds[idx] as any) }
      else if (e.key === ']') { const s = useFilterStore.getState().playbackSpeed; const speeds: number[] = [0.5, 1, 2, 4, 8]; const idx = Math.min(speeds.length - 1, speeds.indexOf(s) + 1); useFilterStore.getState().setPlaybackSpeed(speeds[idx] as any) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const commands = useMemo(() => [
    { id: 'tab-intel', label: 'Go to Intelligence', shortcut: 'Alt+1', category: 'Navigation', icon: '◉', action: () => setActiveTab('intelligence') },
    { id: 'tab-analysis', label: 'Go to Analysis', shortcut: 'Alt+2', category: 'Navigation', icon: '◎', action: () => setActiveTab('analysis') },
    { id: 'tab-feed', label: 'Go to Live Feed', shortcut: 'Alt+3', category: 'Navigation', icon: '⚡', action: () => setActiveTab('feed') },
    { id: 'tab-security', label: 'Go to Security', shortcut: 'Alt+4', category: 'Navigation', icon: '🛡', action: () => setActiveTab('security') },
    { id: 'tab-finance', label: 'Go to Finance', shortcut: 'Alt+5', category: 'Navigation', icon: '◈', action: () => setActiveTab('finance') },
    { id: 'tab-operations', label: 'Go to Operations', shortcut: 'Alt+6', category: 'Navigation', icon: '⚙', action: () => setActiveTab('operations') },
    { id: 'tab-media', label: 'Go to Media', shortcut: 'Alt+9', category: 'Navigation', icon: '▶', action: () => setActiveTab('media') },
    { id: 'fullscreen', label: 'Toggle Fullscreen Map', shortcut: 'Ctrl+F', category: 'View', icon: '⛶', action: () => setMapFullscreen(f => !f) },
    { id: 'mode-default', label: 'Default View', category: 'Visual Mode', icon: '🌍', action: () => setVisualMode('default') },
    { id: 'mode-nv', label: 'Night Vision Mode', category: 'Visual Mode', icon: '🟢', action: () => setVisualMode('nightvision') },
    { id: 'mode-thermal', label: 'Thermal Mode', category: 'Visual Mode', icon: '🔴', action: () => setVisualMode('thermal') },
    { id: 'mode-tactical', label: 'Tactical Mode', category: 'Visual Mode', icon: '🔵', action: () => setVisualMode('tactical') },
    { id: 'toggle-alerts', label: 'Toggle Alerts Panel', category: 'Panels', icon: '🔔', action: () => setAlertsOpen(a => !a) },
    { id: 'toggle-settings', label: 'Open Settings', category: 'Panels', icon: '⚙', action: () => setSettingsOpen(true) },
    { id: 'toggle-tracking', label: 'Search Tracking Entities', category: 'Panels', icon: '📡', action: () => setTrackingSearchOpen(t => !t) },
    { id: 'scene-3d', label: '3D Globe', category: 'Scene', icon: '🌐', action: () => setSceneMode('3d') },
    { id: 'scene-2d', label: '2D Map', category: 'Scene', icon: '🗺', action: () => setSceneMode('2d') },
    { id: 'split-view', label: 'Toggle Split View', category: 'View', icon: '⊞', action: () => { setSplitView(s => !s); setMapFullscreen(true) } },
    { id: 'reset-view', label: 'Center Globe (Reset View)', shortcut: 'Home', category: 'View', icon: '\u2316', action: () => { resetViewRef.current(); unlockRotationRef.current() } },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: '?', category: 'Help', icon: '⌨', action: () => setShortcutsGuideOpen(true) },
    { id: 'ai-analyst', label: 'AI Threat Analyst', shortcut: 'Ctrl+I', category: 'AI', icon: '🤖', action: () => setAIPanelOpen(true) },
    { id: 'next-incident', label: 'Next Incident', shortcut: 'N', category: 'Navigation', icon: '→', action: () => { const incs = useIncidentStore.getState().incidents; const sel = useIncidentStore.getState().selectedIncident; if (incs.length) { const idx = sel ? incs.findIndex(i => i.id === sel.id) : -1; const next = incs[(idx + 1) % incs.length]; if (next) { selectRef.current(next); flyRef.current(next) } } } },
    { id: 'prev-incident', label: 'Previous Incident', shortcut: 'P', category: 'Navigation', icon: '←', action: () => { const incs = useIncidentStore.getState().incidents; const sel = useIncidentStore.getState().selectedIncident; if (incs.length) { const idx = sel ? incs.findIndex(i => i.id === sel.id) : 1; const prev = incs[(idx - 1 + incs.length) % incs.length]; if (prev) { selectRef.current(prev); flyRef.current(prev) } } } },
    { id: 'refresh-feeds', label: 'Refresh Feeds', shortcut: 'R', category: 'Actions', icon: '↻', action: () => window.argus.refreshFeeds().catch(() => {}) },
  ], [])

  const layoutMode = useSettingsStore(s => s.layoutMode)
  const panelWidthPct = useSettingsStore(s => s.panelWidthPct)
  const updateSetting = useSettingsStore(s => s.updateSetting)
  const features = useSettingsStore(s => s.features)
  const uiScale = useSettingsStore(s => s.uiScale)
  const ff = useCallback((key: keyof FeatureFlags) => features?.[key] ?? true, [features])
  const isHorizontal = layoutMode === 'globe-left' || layoutMode === 'globe-right'

  const visibleTabs = useMemo(() => TABS.filter(t => ff(t.featureKey)), [ff])

  const onResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    resizing.current = true
    resizeStartY.current = e.clientY
    resizeStartX.current = e.clientX
    resizeStartHeight.current = mapHeight
    resizeStartWidth.current = panelWidthPct
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [mapHeight, panelWidthPct])

  const onResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizing.current) return
    if (isHorizontal) {
      const deltaX = e.clientX - resizeStartX.current
      const vw = Math.max(1, window.innerWidth)
      const deltaPct = (deltaX / vw) * 100
      const dir = layoutMode === 'globe-left' ? 1 : -1
      const minPanelPx = 420
      const minPanelPct = (minPanelPx / vw) * 100
      const newPct = Math.min(75, Math.max(Math.max(30, minPanelPct), resizeStartWidth.current - deltaPct * dir))
      updateSetting('panelWidthPct', Math.round(newPct))
    } else {
      const deltaY = e.clientY - resizeStartY.current
      const vh = Math.max(1, window.innerHeight - 42)
      const deltaPct = (deltaY / vh) * 100
      setMapHeight(Math.min(85, Math.max(20, resizeStartHeight.current + deltaPct)))
    }
  }, [isHorizontal, layoutMode, updateSetting])

  const onResizeEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    resizing.current = false
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
  }, [])

  const handleSelectIncident = useCallback((incident: Incident, screenPos?: { x: number; y: number }) => {
    selectIncident(incident)
    setIncidentScreenPos(screenPos || null)
  }, [selectIncident])

  const computeIncidentScreenPos = useCallback(async (incident: Incident) => {
    try {
      const Cesium = await import('cesium')
      if (!viewer || viewer.isDestroyed()) return
      const cart = Cesium.Cartesian3.fromDegrees(incident.longitude!, incident.latitude!)
      const pos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, cart)
      if (pos) setIncidentScreenPos({ x: pos.x, y: pos.y })
    } catch { /* ignore */ }
  }, [viewer])
  computePosRef.current = computeIncidentScreenPos

  const handleLocateIncident = useCallback((incident: Incident) => {
    if (isPanelsOnlyWindow) {
      selectIncident(incident)
      window.argus?.navigateToIncident?.(incident)
      return
    }
    const hasCoords = incident.latitude != null && incident.longitude != null &&
      !(Math.abs(incident.latitude) < 0.5 && Math.abs(incident.longitude) < 0.5)
    if (hasCoords && viewer) {
      const canvas = viewer.canvas
      if (canvas) {
        setIncidentScreenPos({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 })
      }
      selectIncident(incident)
      flyToIncident(incident, () => computeIncidentScreenPos(incident))
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      selectIncident(incident)
    }
  }, [selectIncident, flyToIncident, viewer, computeIncidentScreenPos])

  useEffect(() => {
    const iv = setInterval(() => {
      const { notifications: list, dismissNotification: d } = useNotificationStore.getState()
      const now = Date.now()
      for (const n of list) {
        if (now - n.timestamp > 86400000) d(n.id)
      }
    }, 60000)
    return () => clearInterval(iv)
  }, [])

  // VIP tweet dedup
  const tweetSeenRef = React.useRef(new Set<string>())
  useEffect(() => {
    if (!window.argus) return
    const cleanHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\b(?:class|dir|style|id)="[^"]*"/gi, '').replace(/^\s*>\s*/, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    const handler = (raw: unknown) => {
      const tweet = raw as VIPTweet
      const key = tweet.url || tweet.id || `${tweet.authorHandle}-${tweet.timestamp}`
      if (tweetSeenRef.current.has(key)) return
      tweetSeenRef.current.add(key)
      if (tweetSeenRef.current.size > 500) {
        const arr = [...tweetSeenRef.current]; tweetSeenRef.current = new Set(arr.slice(-300))
      }
      const text = cleanHtml(tweet.content || '')
      useNotificationStore.getState().addNotification({
        type: 'tweet',
        title: (text && text.slice(0, 120)) || tweet.author || 'VIP tweet',
        subtitle: `@${tweet.authorHandle} • VIP`,
        tweetUrl: tweet.url,
        tweetHandle: tweet.authorHandle,
      })
    }
    const dispose = window.argus.onVIPTweetAlert(handler)
    return () => dispose()
  }, [])

  // Cascade alert dedup
  const cascadeSeenRef = React.useRef(new Set<string>())
  useEffect(() => {
    if (!window.argus?.onCascadeAlert) return
    const handler = (raw: unknown) => {
      const alert = raw as { title: string; description: string; severity: string; region?: string; relatedIncidents?: Array<{ id: string; latitude?: number; longitude?: number }> }
      const key = alert.title.toLowerCase().trim()
      if (cascadeSeenRef.current.has(key)) return
      cascadeSeenRef.current.add(key)
      if (cascadeSeenRef.current.size > 200) {
        const arr = [...cascadeSeenRef.current]; cascadeSeenRef.current = new Set(arr.slice(-100))
      }
      const firstWithCoords = alert.relatedIncidents?.find(r => r.latitude != null && r.longitude != null)
      useNotificationStore.getState().addNotification({
        type: 'incident',
        title: alert.title,
        subtitle: alert.description.slice(0, 120),
        severity: alert.severity,
        domain: 'INTEL',
        incidentId: firstWithCoords?.id,
        latitude: firstWithCoords?.latitude,
        longitude: firstWithCoords?.longitude,
      })
    }
    const dispose = window.argus.onCascadeAlert(handler)
    return () => dispose()
  }, [])

  useEffect(() => {
    const unsub = useFilterStore.subscribe((state, prev) => {
      if (state.playbackActive && !prev.playbackActive) {
        const allIncs = useIncidentStore.getState().incidents
        if (allIncs.length === 0) return
        const oldest = Math.min(...allIncs.map(i => new Date(i.timestamp).getTime()))
        useFilterStore.getState().setPlaybackCursor(oldest)
      }
    })
    return unsub
  }, [])

  const playbackActive = useFilterStore(s => s.playbackActive)
  const playbackSpeed = useFilterStore(s => s.playbackSpeed)
  useEffect(() => {
    if (!playbackActive) return
    const stepMs = 3600000
    const intervalMs = 1000 / playbackSpeed
    const iv = setInterval(() => {
      const s = useFilterStore.getState()
      if (!s.playbackActive || s.playbackCursor == null) { clearInterval(iv); return }
      const newCursor = s.playbackCursor + stepMs
      if (newCursor > Date.now()) {
        s.stopPlayback()
        return
      }
      s.setPlaybackCursor(newCursor)
      s.setDateRange(null, new Date(newCursor).toISOString())
    }, intervalMs)
    return () => clearInterval(iv)
  }, [playbackActive, playbackSpeed])

  const eqSeenRef = useRef<Set<string>>(new Set())
  const eqPrimedRef = useRef(false)
  useEffect(() => {
    if (!window.argus) return
    const pruneSet = (s: Set<string>, max: number) => {
      if (s.size <= max) return
      const it = s.values()
      let toRemove = s.size - max
      while (toRemove-- > 0) { const v = it.next().value; if (v !== undefined) s.delete(v) }
    }
    const poll = async () => {
      try {
        const list = await window.argus.getEarthquakes()
        const add = useNotificationStore.getState().addNotification
        for (const eq of list) {
          if (eq.magnitude < 4) continue
          if (!eqPrimedRef.current) { eqSeenRef.current.add(eq.id); continue }
          if (eqSeenRef.current.has(eq.id)) continue
          eqSeenRef.current.add(eq.id)
          add({ type: 'earthquake', title: `M${eq.magnitude.toFixed(1)} — ${eq.place}`, subtitle: new Date(eq.time).toLocaleString(), latitude: eq.latitude, longitude: eq.longitude, magnitude: eq.magnitude })
        }
        eqPrimedRef.current = true
        pruneSet(eqSeenRef.current, 500)
      } catch { /* ignore */ }
    }
    void poll()
    const t = setInterval(poll, 60000)
    return () => clearInterval(t)
  }, [])

  const disasterSeenRef = useRef<Set<string>>(new Set())
  const disasterPrimedRef = useRef(false)
  useEffect(() => {
    if (!window.argus) return
    const pruneSet = (s: Set<string>, max: number) => {
      if (s.size <= max) return
      const it = s.values()
      let toRemove = s.size - max
      while (toRemove-- > 0) { const v = it.next().value; if (v !== undefined) s.delete(v) }
    }
    const poll = async () => {
      try {
        const list = await window.argus.getDisasters()
        const add = useNotificationStore.getState().addNotification
        for (const d of list) {
          if (!disasterPrimedRef.current) { disasterSeenRef.current.add(d.id); continue }
          if (disasterSeenRef.current.has(d.id)) continue
          disasterSeenRef.current.add(d.id)
          add({ type: 'disaster', title: d.title, subtitle: `${d.type} • ${d.source}`, latitude: d.latitude, longitude: d.longitude, disasterType: d.type })
        }
        disasterPrimedRef.current = true
        pruneSet(disasterSeenRef.current, 500)
      } catch { /* ignore */ }
    }
    void poll()
    const t = setInterval(poll, 120000)
    return () => clearInterval(t)
  }, [])

  const handleApplyView = useCallback((viewId: string) => {
    const view = views.find((v: any) => v.id === viewId)
    if (!view) return
    if (viewer) flyToRegion(view.camera.latitude, view.camera.longitude, view.camera.altitude)
    const fs = useFilterStore.getState()
    if (view.filters) {
      fs.setDomainFilter(view.filters.domains?.length === 1 ? view.filters.domains[0] : null)
      fs.setSeverityFilter(view.filters.severity ?? null)
      fs.setSearchQuery(view.filters.searchQuery || '')
      if (view.filters.timeRange) fs.setDateRange(view.filters.timeRange, null)
    }
    useViewStore.getState().setActive(view.id)
  }, [views, viewer, flyToRegion])

  const enabledLayers = useTrackingStore(s => s.enabledLayers)
  useGlobeOverlays({ viewer, incidents, timelineCutoff: null, onSelectIncident: handleSelectIncident })
  useTrackingOverlays({ viewer, onTrackingClick: useCallback((info: TrackingClickInfo) => setTrackingPopup(info), []) })
  useInfrastructureLayer({ viewer, enabled: !!(enabledLayers as any).infrastructure, incidents })
  useAnnotationOverlay({ viewer })
  useConflictTradeOverlay({ viewer, showConflictZones: !!(enabledLayers as any).conflictZones, showTradeRoutes: !!(enabledLayers as any).tradeRoutes })
  useSigintOverlay({ viewer, enabled: !!(enabledLayers as any).sigint })
  useDayNightLayer({ viewer, enabled: !!(enabledLayers as any).daynight })

  const advancedLayers = useMemo(() => ({
    weather: !!(enabledLayers as any).weather,
    pandemic: !!(enabledLayers as any).pandemic,
    nuclear: !!(enabledLayers as any).nuclear,
    military: !!(enabledLayers as any).military,
    energy: !!(enabledLayers as any).energy,
    migration: !!(enabledLayers as any).migration,
    internet: !!(enabledLayers as any).internet,
  }), [enabledLayers])
  const loadCesiumFn = useCallback(() => import('cesium'), [])
  const handleAdvancedOverlayClick = useCallback((info: AdvancedOverlayClickInfo) => {
    setTrackingPopup({
      type: info.type as any,
      title: info.title,
      details: info.details,
      latitude: info.latitude,
      longitude: info.longitude,
    })
  }, [])
  useAdvancedOverlays(viewer, loadCesiumFn, advancedLayers, handleAdvancedOverlayClick)

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let handler: any = null
    let cancelled = false
    const setup = async () => {
      const Cesium = await import('cesium')
      if (cancelled || viewer.isDestroyed()) return
      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handler.setInputAction((movement: any) => {
        const ray = viewer.camera.getPickRay(movement.position)
        if (!ray) return
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        if (!cartesian) return
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        const lat = Cesium.Math.toDegrees(carto.latitude)
        const lng = Cesium.Math.toDegrees(carto.longitude)
        const country = findCountryByCoords(lat, lng)
        if (country) setSelectedCountry(country)
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    }
    setup()
    return () => { cancelled = true; if (handler && !handler.isDestroyed()) handler.destroy() }
  }, [viewer])

  const handleAlertNavigate = useCallback((n: any) => {
    if (n.type === 'tweet' && n.tweetUrl) {
      window.open(n.tweetUrl, '_blank', 'noopener,noreferrer')
    } else if (n.type === 'incident') {
      const inc = n.incidentId ? allIncidents.find((i: Incident) => i.id === n.incidentId) : undefined
      if (inc) {
        selectIncident(inc)
        if (inc.latitude != null && inc.longitude != null) { flyToIncident(inc); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }
      } else if (n.latitude != null && n.longitude != null) {
        flyToIncident({ latitude: n.latitude, longitude: n.longitude, title: n.title } as Incident)
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (n.latitude != null && n.longitude != null) {
      flyToIncident({ latitude: n.latitude, longitude: n.longitude, title: n.title } as Incident)
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [allIncidents, selectIncident, flyToIncident])

  const overlayProps = useMemo(() => ({
    incidents, selectedIncident, selectIncident, setIncidentScreenPos,
    handleLocateIncident,
    alertsOpen, setAlertsOpen,
    selectedCountry, setSelectedCountry,
    trackingPopup, setTrackingPopup,
    incidentScreenPos, flyToRegion, resetView,
    sidebarCollapsed, setSidebarCollapsed,
    handleApplyView, handleAlertNavigate, unlockRotation,
  }), [incidents, selectedIncident, selectIncident, setIncidentScreenPos,
    handleLocateIncident, alertsOpen,
    selectedCountry, trackingPopup, incidentScreenPos, flyToRegion, resetView,
    sidebarCollapsed, handleApplyView, handleAlertNavigate, unlockRotation])

  const globeFilter = visualMode === 'nightvision' ? 'hue-rotate(80deg) saturate(3) brightness(1.2)'
    : visualMode === 'thermal' ? 'hue-rotate(-40deg) saturate(2) contrast(1.3)'
    : visualMode === 'tactical' ? 'saturate(0.4) brightness(0.9) contrast(1.2)' : 'none'

  const layoutIcons: Record<string, string> = { 'stacked': '▬', 'globe-left': '◧', 'globe-right': '◨' }
  const nextLayout = layoutMode === 'stacked' ? 'globe-left' : layoutMode === 'globe-left' ? 'globe-right' : 'stacked'

  const globeSection = (
    <div style={isHorizontal ? {
      flex: `${100 - panelWidthPct} 1 0%`, minWidth: '180px', height: '100%',
      overflow: 'hidden', position: 'relative',
    } : { position: 'relative' as const }}>
    <section style={{
      position: 'relative', background: P.bg,
      willChange: 'transform', contain: 'layout style', overflow: 'hidden',
      isolation: 'isolate',
      zoom: 1 / uiScale,
      ...(isHorizontal
        ? { width: `${100 * uiScale}%`, height: `${100 * uiScale}%` }
        : { height: `${mapHeight * uiScale}vh`, minHeight: '200px' }),
      filter: globeFilter,
    }}>
      <AppErrorBoundary fallback={<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.bg, color: '#ff3b5c', fontFamily: P.font }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 700 }}>Globe Error</div></div></div>}>
        <Suspense fallback={<GlobeLoadingFallback />}><CesiumGlobe onReady={handleGlobeReady} sceneMode={sceneMode} /></Suspense>
      </AppErrorBoundary>
      <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 25, display: 'flex', gap: '4px' }}>
        <button onClick={() => setMapFullscreen(true)} title="Fullscreen Map" style={{
          padding: '5px 14px', background: 'rgba(10,14,23,0.85)', border: `1px solid ${P.border}`,
          borderRadius: '6px', cursor: 'pointer', color: P.dim, fontSize: '9px', fontFamily: P.font,
          fontWeight: 600, letterSpacing: '0.1em', backdropFilter: 'blur(8px)', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d4ff40'; e.currentTarget.style.color = P.accent }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim }}
        >FULLSCREEN</button>
        {(['default', 'nightvision', 'thermal', 'tactical'] as GlobeVisualMode[]).map(m => {
          const icons: Record<GlobeVisualMode, string> = { default: '🌍', nightvision: '🟢', thermal: '🔴', tactical: '🔵' }
          return (
            <button key={m} onClick={() => setVisualMode(m)} title={m.toUpperCase()} style={{
              padding: '4px 8px', background: visualMode === m ? 'rgba(0,212,255,0.15)' : 'rgba(10,14,23,0.85)',
              border: `1px solid ${visualMode === m ? '#00d4ff40' : P.border}`,
              borderRadius: '6px', cursor: 'pointer', fontSize: '11px', backdropFilter: 'blur(8px)',
            }}>{icons[m]}</button>
          )
        })}
        <button onClick={() => updateSetting('layoutMode', nextLayout)} title={`Layout: ${nextLayout}`} style={{
          padding: '4px 10px', background: 'rgba(10,14,23,0.85)', border: `1px solid ${P.border}`,
          borderRadius: '6px', cursor: 'pointer', color: P.accent, fontSize: '12px', fontWeight: 700,
          backdropFilter: 'blur(8px)', transition: 'all 0.2s', fontFamily: P.font,
        }}>{layoutIcons[layoutMode]}</button>
      </div>
      <GlobeControls sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} handleApplyView={handleApplyView} resetView={resetView} unlockRotation={unlockRotation} />
    </section>
    </div>
  )

  const resizeHandle = (
    <div
      onPointerDown={onResizeStart}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeEnd}
      onPointerCancel={onResizeEnd}
      style={{
        ...(isHorizontal
          ? { width: '6px', cursor: 'col-resize', flexShrink: 0 }
          : { height: '6px', cursor: 'row-resize' }),
        touchAction: 'none', background: P.border, position: 'relative', zIndex: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={isHorizontal
        ? { width: '3px', height: '40px', borderRadius: '2px', background: P.dim }
        : { width: '40px', height: '3px', borderRadius: '2px', background: P.dim }
      } />
    </div>
  )

  const handleDetachPanels = useCallback(() => {
    window.argus?.detachPanels?.()
  }, [])

  const tabBar = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0',
      padding: '0 12px',
      borderBottom: `1px solid ${P.border}`,
      ...(isHorizontal ? {} : { borderTop: `1px solid ${P.border}` }),
      overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' as const,
      background: P.bg, position: 'sticky', top: 0, zIndex: 10,
    }}>
      {visibleTabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          padding: '7px 10px', whiteSpace: 'nowrap', flexShrink: 0,
          background: activeTab === tab.id ? `${tab.color}08` : 'transparent',
          border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? tab.color : 'transparent'}`,
          color: activeTab === tab.id ? tab.color : P.dim,
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
          cursor: 'pointer', fontFamily: P.font, transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
        onMouseEnter={e => { if (activeTab !== tab.id) { e.currentTarget.style.color = tab.color; e.currentTarget.style.background = `${tab.color}05` } }}
        onMouseLeave={e => { if (activeTab !== tab.id) { e.currentTarget.style.color = P.dim; e.currentTarget.style.background = 'transparent' } }}
        >
          <span style={{ fontSize: '10px' }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {ff('featureAIPanel') && <button onClick={() => setAIPanelOpen(true)} title="AI Threat Analyst (Ctrl+I)" style={{
        padding: '5px 10px', background: aiPanelOpen ? '#a855f715' : 'transparent', border: `1px solid ${aiPanelOpen ? '#a855f740' : P.border}`,
        borderRadius: '4px', cursor: 'pointer', color: aiPanelOpen ? '#a855f7' : P.dim, fontSize: '10px',
        fontFamily: P.font, fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '4px',
      }}
      onMouseEnter={e => { if (!aiPanelOpen) { e.currentTarget.style.borderColor = '#a855f740'; e.currentTarget.style.color = '#a855f7' } }}
      onMouseLeave={e => { if (!aiPanelOpen) { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim } }}
      >
        <span style={{ fontSize: '12px' }}>🤖</span>
        <span style={{ fontSize: '9px', letterSpacing: '0.08em' }}>AI</span>
      </button>}
      {!isPanelsOnlyWindow && !panelsDetached && (
        <button onClick={handleDetachPanels} title="Detach panels to separate window" style={{
          padding: '5px 10px', background: 'transparent', border: `1px solid ${P.border}`,
          borderRadius: '4px', cursor: 'pointer', color: P.dim, fontSize: '10px',
          fontFamily: P.font, fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent + '40'; e.currentTarget.style.color = P.accent }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim }}
        >
          <span style={{ fontSize: '12px' }}>⧉</span>
          <span style={{ fontSize: '9px', letterSpacing: '0.08em' }}>DETACH</span>
        </button>
      )}
    </div>
  )

  const loadingFallback = <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>Loading module...</div>

  const tabContent = (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, minWidth: 0 }}>
      {activeTab === 'intelligence' && ff('tabIntelligence') && <AppErrorBoundary><IntelligencePage incidents={allIncidents} onLocateIncident={handleLocateIncident} /></AppErrorBoundary>}
      {activeTab === 'analysis' && ff('tabAnalysis') && <AppErrorBoundary><AnalysisPage incidents={allIncidents} onLocateIncident={handleLocateIncident} /></AppErrorBoundary>}
      {activeTab === 'finance' && ff('tabFinance') && <AppErrorBoundary><Suspense fallback={loadingFallback}><FinanceDeepPanel onLocateIncident={handleLocateIncident} /></Suspense></AppErrorBoundary>}
      {activeTab === 'security' && ff('tabSecurity') && <AppErrorBoundary><Suspense fallback={loadingFallback}><SecurityIntelPage onLocateIncident={handleLocateIncident} /></Suspense></AppErrorBoundary>}
      {activeTab === 'operations' && ff('tabOperations') && <AppErrorBoundary><Suspense fallback={loadingFallback}><OperationsPage incidents={allIncidents} onLocateIncident={handleLocateIncident} /></Suspense></AppErrorBoundary>}
      {activeTab === 'media' && ff('tabMedia') && <AppErrorBoundary><Suspense fallback={loadingFallback}><MediaPage onOpenSettings={() => openSettings('tv')} /></Suspense></AppErrorBoundary>}
      {activeTab === 'feed' && ff('tabLiveFeed') && <AppErrorBoundary><DashboardFeed incidents={incidents} onLocateIncident={handleLocateIncident} /></AppErrorBoundary>}
      {activeTab === 'logs' && ff('tabLogs') && <AppErrorBoundary><Suspense fallback={loadingFallback}><LogPage /></Suspense></AppErrorBoundary>}
    </div>
  )

  const panelSection = (
    <div style={{
      display: 'flex', flexDirection: 'column',
      ...(isHorizontal
        ? { flex: `${panelWidthPct} 1 0%`, height: '100%', minWidth: '380px' }
        : {}),
      overflow: 'hidden',
      minHeight: 0,
    }}>
      {tabBar}
      {tabContent}
    </div>
  )

  // Panels-only window: show only tab bar + tab content, no globe
  if (isPanelsOnlyWindow) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: `${100 / uiScale}vw`, height: `${100 / uiScale}vh`, background: P.bg, color: P.text, fontFamily: P.font, overflow: 'hidden', position: 'fixed', top: 0, left: 0, zoom: uiScale, transformOrigin: '0 0' }}>
        <TopBar
          onToggleAlerts={() => setAlertsOpen(p => !p)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTrackingSearch={() => setTrackingSearchOpen(p => !p)}
          trackingSearchOpen={trackingSearchOpen}
          onLocate={(lat, lng, title) => { flyToIncident({ latitude: lat, longitude: lng, title } as Incident); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
          onSelectIncident={(inc) => { selectIncident(inc) }}
          onTrackingClick={(info) => setTrackingPopup(info)}
          setActiveTab={setActiveTab}
        />
        {tabBar}
        {tabContent}
        <ToastContainer notifications={notifications} allIncidents={allIncidents} selectIncident={selectIncident} flyToIncident={flyToIncident} scrollRef={scrollRef} setActiveTab={setActiveTab} markRead={markNotifRead} />
        {ff('featureCommandPalette') && <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />}
        <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); setSettingsTab(undefined) }} incidents={allIncidents} initialTab={settingsTab as any} />
      </div>
    )
  }

  // Globe-only mode when panels are detached to separate window
  if (panelsDetached) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: `${100 / uiScale}vw`, height: `${100 / uiScale}vh`, background: P.bg, color: P.text, fontFamily: P.font, overflow: 'hidden', position: 'fixed', top: 0, left: 0, zoom: uiScale, transformOrigin: '0 0' }}>
        <TopBar
          onToggleAlerts={() => setAlertsOpen(a => !a)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTrackingSearch={() => setTrackingSearchOpen(p => !p)}
          trackingSearchOpen={trackingSearchOpen}
          onLocate={(lat, lng, title) => { flyToIncident({ latitude: lat, longitude: lng, title } as Incident) }}
          onSelectIncident={(inc) => { selectIncident(inc) }}
          onTrackingClick={(info) => setTrackingPopup(info)}
          setActiveTab={setActiveTab}
        />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <section style={{
            position: 'absolute', inset: 0, background: P.bg,
            zoom: 1 / uiScale,
            width: `${100 * uiScale}%`, height: `${100 * uiScale}%`,
            filter: globeFilter,
          }}>
            <AppErrorBoundary><Suspense fallback={<GlobeLoadingFallback />}><CesiumGlobe onReady={handleGlobeReady} sceneMode={sceneMode} /></Suspense></AppErrorBoundary>
            <GlobeControls sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} handleApplyView={handleApplyView} resetView={resetView} unlockRotation={unlockRotation} />
          </section>
        </div>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
          <div style={{ pointerEvents: 'auto' }}><FloatingPopups {...overlayProps} /></div>
        </div>
        <ToastContainer notifications={notifications} allIncidents={allIncidents} selectIncident={selectIncident} flyToIncident={flyToIncident} scrollRef={scrollRef} setActiveTab={setActiveTab} markRead={markNotifRead} />
        <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); setSettingsTab(undefined) }} incidents={allIncidents} initialTab={settingsTab as any} />
        <StatusBar incidents={incidents} sceneMode={sceneMode} onSceneModeChange={setSceneMode} />
      </div>
    )
  }

  if (mapFullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: P.bg, fontFamily: P.font, color: P.text, zIndex: 100,
        display: 'flex',
      }}>
        <div style={{
          flex: 1, position: 'relative',
          filter: globeFilter,
        }}>
          <AppErrorBoundary>
            <Suspense fallback={<GlobeLoadingFallback />}><CesiumGlobe onReady={handleGlobeReady} sceneMode={sceneMode} /></Suspense>
          </AppErrorBoundary>
          <GlobeControls sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} handleApplyView={handleApplyView} resetView={resetView} unlockRotation={unlockRotation} />
        </div>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
          <div style={{ pointerEvents: 'auto' }}><FloatingPopups {...overlayProps} /></div>
        </div>
        {splitView && (
          <>
            <div style={{ width: '3px', background: P.border, cursor: 'col-resize' }} />
            <div style={{ flex: 1, position: 'relative', filter: globeFilter }}>
              <AppErrorBoundary>
                <Suspense fallback={<GlobeLoadingFallback />}><CesiumGlobe onReady={() => {}} sceneMode={splitSceneMode} /></Suspense>
              </AppErrorBoundary>
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 25, display: 'flex', gap: '4px' }}>
                {(['3d', '2d'] as const).map(m => (
                  <button key={m} onClick={() => setSplitSceneMode(m)} style={{
                    padding: '4px 10px', background: splitSceneMode === m ? `${P.accent}15` : 'rgba(10,14,23,0.85)',
                    border: `1px solid ${splitSceneMode === m ? P.accent + '40' : P.border}`,
                    borderRadius: '4px', color: splitSceneMode === m ? P.accent : P.dim,
                    fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font,
                  }}>{m.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </>
        )}
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 25, display: 'flex', gap: '6px' }}>
          <button onClick={() => { setMapFullscreen(false); setSplitView(false) }} style={{
            padding: '8px 20px', background: 'rgba(10,14,23,0.9)', border: `1px solid ${P.border}`,
            borderRadius: '6px', color: P.accent, cursor: 'pointer', fontFamily: P.font,
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', backdropFilter: 'blur(8px)',
          }}>{'< BACK'}</button>
          {ff('featureSplitView') && <button onClick={() => setSplitView(s => !s)} style={{
            padding: '8px 14px', background: splitView ? `${P.accent}15` : 'rgba(10,14,23,0.9)',
            border: `1px solid ${splitView ? P.accent + '40' : P.border}`,
            borderRadius: '6px', color: splitView ? P.accent : P.dim, cursor: 'pointer', fontFamily: P.font,
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', backdropFilter: 'blur(8px)',
          }}>SPLIT</button>}
        </div>
        {ff('featureCommandPalette') && <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: `${100 / uiScale}vw`, height: `${100 / uiScale}vh`, background: P.bg, color: P.text, fontFamily: P.font, overflow: 'hidden', position: 'fixed', top: 0, left: 0, zoom: uiScale, transformOrigin: '0 0' }}>
      <TopBar
        onToggleAlerts={() => setAlertsOpen(a => !a)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTrackingSearch={() => setTrackingSearchOpen(p => !p)}
        trackingSearchOpen={trackingSearchOpen}
        onLocate={(lat, lng, title) => { flyToIncident({ latitude: lat, longitude: lng, title } as Incident); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onSelectIncident={(inc) => { selectIncident(inc) }}
        onTrackingClick={(info) => setTrackingPopup(info)}
        setActiveTab={setActiveTab}
      />

      {isHorizontal ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minWidth: 0 }}>
          {layoutMode === 'globe-left' ? (
            <>{globeSection}{resizeHandle}{panelSection}</>
          ) : (
            <>{panelSection}{resizeHandle}{globeSection}</>
          )}
        </div>
      ) : (
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollBehavior: 'smooth' }}>
          {globeSection}
          {resizeHandle}
          {panelSection}
          <div style={{ height: '40px' }} />
        </div>
      )}

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
        <div style={{ pointerEvents: 'auto' }}><FloatingPopups {...overlayProps} /></div>
      </div>

      <ToastContainer
        notifications={notifications}
        allIncidents={allIncidents}
        selectIncident={selectIncident}
        flyToIncident={flyToIncident}
        scrollRef={scrollRef}
        setActiveTab={setActiveTab}
        markRead={markNotifRead}
      />

      <TrackingSearchPanel
        isOpen={trackingSearchOpen}
        onClose={() => setTrackingSearchOpen(false)}
        onLocate={(lat, lng, title) => {
          flyToIncident({ latitude: lat, longitude: lng, title } as Incident)
          scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          setTrackingSearchOpen(false)
        }}
        onTrackingClick={(info) => {
          setTrackingPopup(info)
          setTrackingSearchOpen(false)
        }}
      />
      {ff('featureCommandPalette') && <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />}
      <KeyboardShortcutsGuide isOpen={shortcutsGuideOpen} onClose={() => setShortcutsGuideOpen(false)} />
      {ff('featureAIPanel') && <AIPanel isOpen={aiPanelOpen} onClose={() => setAIPanelOpen(false)} />}
      <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); setSettingsTab(undefined) }} incidents={allIncidents} initialTab={settingsTab as any} />
      <StatusBar incidents={incidents} sceneMode={sceneMode} onSceneModeChange={setSceneMode} />
    </div>
  )
}

export function AppShell() {
  return (
    <AppErrorBoundary>
      <AppShellContent />
    </AppErrorBoundary>
  )
}