import { useState, useCallback, useMemo, useEffect } from 'react'
import { InfoTip } from '@/components/ui/InfoTip'
import { useBookmarkStore } from '@/stores/bookmark-store'
import { useAlertProfileStore } from '@/stores/alert-profile-store'
import { useThreadStore } from '@/stores/thread-store'
import { useAnnotationStore, type MapAnnotation } from '@/stores/annotation-store'
import { useSettingsStore } from '@/stores/settings-store'
import type { Incident, FeatureFlags } from '../../../shared/types'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

type SubTab = 'query' | 'bookmarks' | 'threads' | 'profiles' | 'annotations' | 'timemachine' | 'hotspots' | 'reliability' | 'alertrules' | 'predictions'

interface Props { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }

export function OperationsPage({ incidents, onLocateIncident }: Props) {
  const features = useSettingsStore(s => s.features)
  const [tab, setTab] = useState<SubTab>('query')

  const allTabs: { id: SubTab; label: string; icon: string; featureKey: keyof FeatureFlags }[] = [
    { id: 'query', label: 'ASK ARGUS', icon: '⌕', featureKey: 'opsQuery' },
    { id: 'bookmarks', label: 'BOOKMARKS', icon: '★', featureKey: 'opsBookmarks' },
    { id: 'threads', label: 'THREADS', icon: '⛓', featureKey: 'opsThreads' },
    { id: 'profiles', label: 'ALERT PROFILES', icon: '🔔', featureKey: 'opsProfiles' },
    { id: 'annotations', label: 'MAP ANNOTATIONS', icon: '📌', featureKey: 'opsAnnotations' },
    { id: 'hotspots', label: 'HOTSPOTS', icon: '🔥', featureKey: 'opsHotspots' },
    { id: 'reliability', label: 'SOURCE SCORE', icon: '✓', featureKey: 'opsReliability' },
    { id: 'alertrules', label: 'SMART ALERTS', icon: '⚡', featureKey: 'opsAlertRules' },
    { id: 'predictions', label: 'PREDICTIONS', icon: '📈', featureKey: 'opsPredictions' },
    { id: 'timemachine', label: 'TIME MACHINE', icon: '⏳', featureKey: 'opsTimeMachine' },
  ]
  const tabs = useMemo(() => allTabs.filter(t => features?.[t.featureKey] ?? true), [features])
  const effectiveTab = tabs.find(t => t.id === tab) ? tab : tabs[0]?.id as SubTab

  return (
    <div style={{ fontFamily: P.font, padding: '16px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '5px 10px', background: effectiveTab === t.id ? `${P.accent}15` : 'transparent',
            border: `1px solid ${effectiveTab === t.id ? P.accent + '40' : P.border}`,
            borderRadius: '4px', color: effectiveTab === t.id ? P.accent : P.dim,
            fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.06em',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      {effectiveTab === 'query' && <QuerySection incidents={incidents} onLocateIncident={onLocateIncident} />}
      {effectiveTab === 'bookmarks' && <BookmarkSection incidents={incidents} onLocateIncident={onLocateIncident} />}
      {effectiveTab === 'threads' && <ThreadSection incidents={incidents} onLocateIncident={onLocateIncident} />}
      {effectiveTab === 'profiles' && <ProfileSection />}
      {effectiveTab === 'annotations' && <AnnotationSection />}
      {effectiveTab === 'hotspots' && <HotspotsSection incidents={incidents} />}
      {effectiveTab === 'reliability' && <ReliabilitySection incidents={incidents} />}
      {effectiveTab === 'alertrules' && <AlertRulesSection />}
      {effectiveTab === 'predictions' && <PredictionsSection incidents={incidents} />}
      {effectiveTab === 'timemachine' && <TimeMachineSection incidents={incidents} onLocateIncident={onLocateIncident} />}
    </div>
  )
}

function QuerySection({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const terms = q.split(/\s+/).filter(t => t.length > 1)
    if (terms.length === 0) return []

    return incidents.filter(inc => {
      const text = `${inc.title} ${inc.description || ''} ${inc.country || ''} ${inc.domain} ${inc.severity} ${inc.source}`.toLowerCase()
      return terms.every(term => text.includes(term))
    }).slice(0, 50)
  }, [query, incidents])

  const sevColor = (s: string) => ({ CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff' }[s] || P.dim)

  return (
    <div>
      <div style={{ fontSize: '10px', color: P.accent, fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>⌕ ASK ARGUS — Search Incidents <InfoTip text="Full-text search across all incidents. Filter by domain, severity, and time range. Click any result to locate it on the globe." size={11} /></div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Type to search... e.g. Ukraine conflict, cyber NATO, earthquake Turkey..."
          style={{ flex: 1, padding: '10px 14px', background: P.card, border: `1px solid ${query ? P.accent + '40' : P.border}`, borderRadius: '6px', color: P.text, fontSize: '12px', fontFamily: P.font, outline: 'none', transition: 'border 0.2s' }} />
      </div>
      {query.trim().length > 1 && (
        <div style={{ fontSize: '9px', color: P.dim, marginBottom: '8px' }}>{results.length} result{results.length !== 1 ? 's' : ''} found</div>
      )}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {results.map(r => {
          const clickable = !!onLocateIncident && r.latitude != null && r.longitude != null
          return (
            <div key={r.id}
              onClick={clickable ? () => onLocateIncident(r) : undefined}
              style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '4px', cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s' }}
              onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
              onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = P.card } : undefined}
            >
              <span style={{ fontSize: '8px', padding: '2px 6px', background: sevColor(r.severity) + '20', color: sevColor(r.severity), borderRadius: '3px', fontWeight: 700, flexShrink: 0 }}>{r.severity}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: P.text, fontWeight: 600, lineHeight: 1.3 }}>{r.title}{clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '9px' }}>◎</span>}</div>
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '3px' }}>{r.domain} · {r.country || 'Global'} · {r.source} · {new Date(r.timestamp).toLocaleDateString()}</div>
              </div>
            </div>
          )
        })}
        {results.length === 0 && query.trim().length > 1 && <div style={{ color: P.dim, fontSize: '11px', padding: '30px', textAlign: 'center' }}>No results. Try different keywords.</div>}
        {!query.trim() && (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.3 }}>⌕</div>
            <div style={{ fontSize: '11px', color: P.dim }}>Type keywords to search across all incidents</div>
            <div style={{ fontSize: '9px', color: P.dim, marginTop: '6px' }}>Searches title, description, country, domain, severity, and source</div>
          </div>
        )}
      </div>
    </div>
  )
}

function BookmarkSection({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const pins = useBookmarkStore(s => s.pins)
  const groups = useBookmarkStore(s => s.groups)
  const removePin = useBookmarkStore(s => s.removePin)
  const addGroup = useBookmarkStore(s => s.addGroup)
  const [newGroup, setNewGroup] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const filtered = selectedGroup === 'all' ? pins : pins.filter(p => p.group === selectedGroup)
  const pinnedIncidents = filtered.map(p => ({ pin: p, incident: incidents.find(i => i.id === p.incidentId) })).filter(x => x.incident)

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setSelectedGroup('all')} style={{ padding: '4px 8px', background: selectedGroup === 'all' ? `${P.accent}15` : 'transparent', border: `1px solid ${selectedGroup === 'all' ? P.accent + '40' : P.border}`, borderRadius: '3px', color: selectedGroup === 'all' ? P.accent : P.dim, fontSize: '9px', cursor: 'pointer', fontFamily: P.font }}>ALL ({pins.length})</button>
        {groups.map(g => (
          <button key={g} onClick={() => setSelectedGroup(g)} style={{ padding: '4px 8px', background: selectedGroup === g ? `${P.accent}15` : 'transparent', border: `1px solid ${selectedGroup === g ? P.accent + '40' : P.border}`, borderRadius: '3px', color: selectedGroup === g ? P.accent : P.dim, fontSize: '9px', cursor: 'pointer', fontFamily: P.font }}>{g} ({pins.filter(p => p.group === g).length})</button>
        ))}
        <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="New group" onKeyDown={e => { if (e.key === 'Enter' && newGroup.trim()) { addGroup(newGroup.trim()); setNewGroup('') } }}
          style={{ padding: '4px 8px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '3px', color: P.text, fontSize: '9px', width: '100px', fontFamily: P.font, outline: 'none' }} />
      </div>
      {pinnedIncidents.map(({ pin, incident }) => {
        const inc = incident!
        const clickable = !!onLocateIncident && inc.latitude != null && inc.longitude != null
        return (
          <div key={pin.id}
            onClick={clickable ? () => onLocateIncident(inc) : undefined}
            style={{ padding: '8px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s' }}
            onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
            onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = P.card } : undefined}
          >
            <div>
              <div style={{ fontSize: '11px', color: P.text }}>{inc.title}{clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '9px' }}>◎</span>}</div>
              <div style={{ fontSize: '8px', color: P.dim }}>{pin.group} • {new Date(pin.pinnedAt).toLocaleDateString()}{pin.note ? ` • ${pin.note}` : ''}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); removePin(pin.id) }} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '12px' }}>✕</button>
          </div>
        )
      })}
      {pinnedIncidents.length === 0 && <div style={{ color: P.dim, fontSize: '11px', padding: '20px', textAlign: 'center' }}>No bookmarks yet. Pin incidents from the feed.</div>}
    </div>
  )
}

function ThreadSection({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const threads = useThreadStore(s => s.threads)
  const createThread = useThreadStore(s => s.createThread)
  const deleteThread = useThreadStore(s => s.deleteThread)
  const [newTitle, setNewTitle] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New thread title..."
          style={{ flex: 1, padding: '6px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '11px', fontFamily: P.font, outline: 'none' }} />
        <button onClick={() => { if (newTitle.trim()) { createThread(newTitle.trim(), []); setNewTitle('') } }} style={{ padding: '6px 12px', background: `${P.accent}15`, border: `1px solid ${P.accent}40`, borderRadius: '4px', color: P.accent, fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font }}>CREATE</button>
      </div>
      {threads.map(t => (
        <div key={t.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '6px', overflow: 'hidden' }}>
          <div onClick={() => setExpanded(expanded === t.id ? null : t.id)} style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: P.text, fontWeight: 600 }}>⛓ {t.title}</div>
              <div style={{ fontSize: '8px', color: P.dim }}>{t.incidentIds.length} events • {new Date(t.updatedAt).toLocaleDateString()}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); deleteThread(t.id) }} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '10px' }}>✕</button>
          </div>
          {expanded === t.id && (
            <div style={{ padding: '0 12px 10px', borderTop: `1px solid ${P.border}` }}>
              {t.incidentIds.map(id => { const inc = incidents.find(i => i.id === id); if (!inc) return null; const clickable = !!onLocateIncident && inc.latitude != null && inc.longitude != null; return <div key={id} onClick={clickable ? () => onLocateIncident(inc) : undefined} style={{ padding: '4px 0', fontSize: '10px', color: P.text, cursor: clickable ? 'pointer' : 'default', borderRadius: '2px', transition: 'background 0.15s' }} onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined} onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' } : undefined}>{inc.title}{clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '9px' }}>◎</span>}</div> })}
              {t.incidentIds.length === 0 && <div style={{ padding: '8px 0', fontSize: '9px', color: P.dim }}>No events linked yet</div>}
            </div>
          )}
        </div>
      ))}
      {threads.length === 0 && <div style={{ color: P.dim, fontSize: '11px', padding: '20px', textAlign: 'center' }}>Create threads to group related incidents</div>}
    </div>
  )
}

function ProfileSection() {
  const profiles = useAlertProfileStore(s => s.profiles)
  const activeId = useAlertProfileStore(s => s.activeProfileId)
  const setActive = useAlertProfileStore(s => s.setActive)


  return (
    <div>
      <div style={{ fontSize: '10px', color: P.accent, fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>🔔 ALERT PROFILES <InfoTip text="Pre-configured alert profiles for different domains. Activate a profile to receive notifications when matching incidents are detected." size={11} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
        {profiles.map(p => (
          <div key={p.id} onClick={() => setActive(p.id)} style={{ padding: '14px', background: p.id === activeId ? `${P.accent}08` : P.card, border: `1px solid ${p.id === activeId ? P.accent + '40' : P.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px' }}>{p.icon} <span style={{ fontSize: '12px', fontWeight: 700, color: P.text }}>{p.name}</span></span>
              {p.id === activeId && <span style={{ fontSize: '8px', padding: '2px 6px', background: `${P.accent}20`, color: P.accent, borderRadius: '3px', fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <div style={{ fontSize: '9px', color: P.dim }}>
              Domains: {p.rules.domains.join(', ')}<br/>
              Min Severity: {p.rules.minSeverity}<br/>
              Sound: {p.rules.soundEnabled ? 'ON' : 'OFF'}
              {p.rules.quietHoursStart && <><br/>Quiet: {p.rules.quietHoursStart} - {p.rules.quietHoursEnd}</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



function TimeMachineSection({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const dayIncidents = useMemo(() => {
    const start = new Date(selectedDate).getTime()
    const end = start + 86400000
    return incidents.filter(i => { const t = new Date(i.timestamp).getTime(); return t >= start && t < end })
  }, [incidents, selectedDate])

  const domainCounts: Record<string, number> = {}
  for (const i of dayIncidents) domainCounts[i.domain] = (domainCounts[i.domain] || 0) + 1

  return (
    <div>
      <div style={{ fontSize: '10px', color: P.accent, fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>⏳ TIME MACHINE <InfoTip text="Browse historical incident data by selecting a specific date. Shows incident breakdown by domain for the selected day. Useful for retrospective analysis." size={11} /></div>
      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '8px 12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '12px', fontFamily: P.font, marginBottom: '12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '12px' }}>
        <div style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: P.accent }}>{dayIncidents.length}</div>
          <div style={{ fontSize: '8px', color: P.dim }}>TOTAL</div>
        </div>
        {Object.entries(domainCounts).map(([d, c]) => (
          <div key={d} style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: P.text }}>{c}</div>
            <div style={{ fontSize: '8px', color: P.dim }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {dayIncidents.slice(0, 30).map(i => {
          const clickable = !!onLocateIncident && i.latitude != null && i.longitude != null
          return (
            <div key={i.id}
              onClick={clickable ? () => onLocateIncident(i) : undefined}
              style={{ padding: '6px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', marginBottom: '3px', cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s' }}
              onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
              onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = P.card } : undefined}
            >
              <div style={{ fontSize: '10px', color: P.text }}>{i.title}{clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '9px' }}>◎</span>}</div>
              <div style={{ fontSize: '8px', color: P.dim }}>{i.domain} • {i.severity} • {new Date(i.timestamp).toLocaleTimeString()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnnotationSection() {
  const annotations = useAnnotationStore(s => s.annotations)
  const activeToolType = useAnnotationStore(s => s.activeToolType)
  const setActiveTool = useAnnotationStore(s => s.setActiveTool)
  const addAnnotation = useAnnotationStore(s => s.addAnnotation)
  const removeAnnotation = useAnnotationStore(s => s.removeAnnotation)
  const clearAll = useAnnotationStore(s => s.clearAll)

  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [manualTitle, setManualTitle] = useState('')

  const tools: { id: 'marker' | 'note' | 'circle' | 'line'; icon: string; label: string; desc: string; color: string }[] = [
    { id: 'marker', icon: '\uD83D\uDCCD', label: 'MARKER', desc: 'Click map to place a pin', color: '#00d4ff' },
    { id: 'note', icon: '\uD83D\uDCDD', label: 'NOTE', desc: 'Click map to add a note', color: '#f5c542' },
    { id: 'circle', icon: '\u25CB', label: 'AREA', desc: 'Click map to mark an area', color: '#ff6b35' },
    { id: 'line', icon: '\u2571', label: 'LINE', desc: 'Click map to draw a line', color: '#00ff87' },
  ]

  const handleAddManual = useCallback(() => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) return
    addAnnotation({
      type: 'marker', latitude: lat, longitude: lng,
      title: manualTitle.trim() || `Pin (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      description: '', color: '#00d4ff', author: 'You',
    })
    setManualLat(''); setManualLng(''); setManualTitle('')
  }, [manualLat, manualLng, manualTitle, addAnnotation])

  const typeIcons: Record<string, string> = { marker: '\uD83D\uDCCD', note: '\uD83D\uDCDD', circle: '\u25CB', line: '\u2571' }

  return (
    <div>
      <div style={{ fontSize: '10px', color: '#ff6b35', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.1em' }}>
        \uD83D\uDCCC MAP ANNOTATIONS — Mark Locations on Globe
      </div>

      {/* Tool Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tools.map(t => (
          <button key={t.id} onClick={() => setActiveTool(activeToolType === t.id ? null : t.id)}
            style={{
              padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              background: activeToolType === t.id ? `${t.color}15` : P.card,
              border: `1px solid ${activeToolType === t.id ? t.color + '60' : P.border}`,
              borderRadius: '8px', cursor: 'pointer', minWidth: '80px',
              color: activeToolType === t.id ? t.color : P.dim,
              transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: '20px' }}>{t.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.06em' }}>{t.label}</span>
            <span style={{ fontSize: '7px', color: P.dim }}>{t.desc}</span>
          </button>
        ))}
      </div>

      {activeToolType && (
        <div style={{
          padding: '10px 14px', marginBottom: '14px', borderRadius: '6px',
          background: '#f5c54210', border: '1px solid #f5c54230',
          fontSize: '11px', color: '#f5c542', fontWeight: 600,
        }}>
          Active tool: {activeToolType.toUpperCase()} — Click anywhere on the globe to place
        </div>
      )}

      {/* Manual Add */}
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 700 }}>ADD BY COORDINATES</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '8px', color: P.dim, marginBottom: '2px' }}>TITLE</div>
            <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Label..."
              style={{ width: '120px', padding: '6px 8px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '10px', fontFamily: P.font, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '8px', color: P.dim, marginBottom: '2px' }}>LAT</div>
            <input value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="41.01"
              style={{ width: '70px', padding: '6px 8px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '10px', fontFamily: P.font, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '8px', color: P.dim, marginBottom: '2px' }}>LNG</div>
            <input value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder="28.97"
              style={{ width: '70px', padding: '6px 8px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '10px', fontFamily: P.font, outline: 'none' }} />
          </div>
          <button onClick={handleAddManual} style={{
            padding: '6px 14px', background: `${P.accent}15`, border: `1px solid ${P.accent}40`,
            borderRadius: '4px', color: P.accent, fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font,
          }}>ADD PIN</button>
        </div>
      </div>

      {/* Annotations List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.12em', fontWeight: 700 }}>
          ANNOTATIONS ({annotations.length})
        </div>
        {annotations.length > 0 && (
          <button onClick={clearAll} style={{
            padding: '4px 10px', fontSize: '8px', fontWeight: 700, fontFamily: P.font,
            background: '#ff3b5c10', border: '1px solid #ff3b5c30', borderRadius: '4px',
            color: '#ff3b5c', cursor: 'pointer',
          }}>CLEAR ALL</button>
        )}
      </div>

      {annotations.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>
          No annotations yet. Select a tool above and click on the globe, or add by coordinates.
        </div>
      )}

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {annotations.map(ann => (
          <div key={ann.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', background: P.card, border: `1px solid ${P.border}`,
            borderRadius: '6px', marginBottom: '4px',
          }}>
            <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{typeIcons[ann.type] || '\uD83D\uDCCD'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: P.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ann.title}
              </div>
              <div style={{ fontSize: '8px', color: P.dim, marginTop: '1px' }}>
                {ann.type.toUpperCase()} • {ann.latitude.toFixed(3)}, {ann.longitude.toFixed(3)}
                {ann.description && ` • ${ann.description}`}
              </div>
            </div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ann.color, flexShrink: 0 }} />
            <button onClick={() => removeAnnotation(ann.id)} style={{
              background: 'transparent', border: 'none', color: '#ff3b5c', cursor: 'pointer',
              fontSize: '14px', fontWeight: 700, padding: '0 4px', flexShrink: 0,
            }}>\u2715</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function HotspotsSection({ incidents }: { incidents: Incident[] }) {
  const hotspots = useMemo(() => {
    const regionMap = new Map<string, { count: number; prevCount: number; domains: Map<string, number>; lat: number; lng: number }>()
    const now = Date.now()
    const weekMs = 7 * 86400000
    for (const inc of incidents) {
      const region = inc.country || 'Unknown'
      const age = now - new Date(inc.timestamp).getTime()
      const prev = regionMap.get(region) || { count: 0, prevCount: 0, domains: new Map(), lat: inc.latitude, lng: inc.longitude }
      if (age < weekMs) prev.count++; else if (age < weekMs * 2) prev.prevCount++
      prev.domains.set(inc.domain, (prev.domains.get(inc.domain) || 0) + 1)
      regionMap.set(region, prev)
    }
    return Array.from(regionMap.entries()).map(([region, data]) => ({
      region, ...data,
      changePercent: data.prevCount > 0 ? Math.round(((data.count - data.prevCount) / data.prevCount) * 100) : data.count > 0 ? 100 : 0,
      topDomains: Array.from(data.domains.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d, c]) => ({ domain: d, count: c })),
    })).sort((a, b) => b.count - a.count).slice(0, 20)
  }, [incidents])

  return (
    <div>
      <div style={{ fontSize: '10px', color: '#ff6b35', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>GEOSPATIAL HOTSPOTS — Last 7 Days <InfoTip text="Geographic clusters of incidents detected in the last 7 days. Identifies areas with abnormally high event density. Click to locate the hotspot on the globe." size={11} color="#ff6b35" /></div>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {hotspots.map(h => (
          <div key={h.region} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '4px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: P.text }}>{h.region}</div>
              <div style={{ fontSize: '8px', color: P.dim }}>{h.count} incidents • {h.topDomains.map(d => `${d.domain}(${d.count})`).join(', ')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: P.accent }}>{h.count}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: h.changePercent > 50 ? '#ff3b5c' : h.changePercent > 0 ? '#ff6b35' : '#00e676' }}>
                {h.changePercent > 0 ? `+${h.changePercent}%` : h.changePercent === 0 ? 'NEW' : `${h.changePercent}%`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



function ReliabilitySection({ incidents }: { incidents: Incident[] }) {
  const sourceStats = useMemo(() => {
    const map = new Map<string, { count: number; domains: Set<string>; severities: string[] }>()
    for (const inc of incidents) {
      const s = inc.source || 'Unknown'
      const prev = map.get(s) || { count: 0, domains: new Set<string>(), severities: [] }
      prev.count++; prev.domains.add(inc.domain); prev.severities.push(inc.severity)
      map.set(s, prev)
    }
    return Array.from(map.entries()).map(([source, data]) => {
      const diversityScore = data.domains.size
      const criticalRatio = data.severities.filter(s => s === 'CRITICAL' || s === 'HIGH').length / data.count
      const volumeScore = Math.min(data.count / 10, 5)
      const score = Math.min(5, Math.round((diversityScore + volumeScore + (criticalRatio > 0.3 ? 2 : 1)) * 0.8))
      return { source, count: data.count, domains: Array.from(data.domains), score, grade: ['F', 'E', 'D', 'C', 'B', 'A'][score] || 'F' }
    }).sort((a, b) => b.score - a.score || b.count - a.count)
  }, [incidents])
  const gradeColor = (g: string) => ({ A: '#00e676', B: '#00d4ff', C: '#f5c542', D: '#ff6b35', E: '#ff3b5c', F: '#ff3b5c' }[g] || P.dim)

  return (
    <div>
      <div style={{ fontSize: '10px', color: '#00e676', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>SOURCE RELIABILITY SCORING — NATO Scale <InfoTip text="Evaluates intelligence source reliability using the NATO Admiralty System (A-F for reliability, 1-6 for information credibility). Higher scores = more trustworthy sources." size={11} color="#00e676" /></div>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {sourceStats.map(s => (
          <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${gradeColor(s.grade)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: gradeColor(s.grade), flexShrink: 0 }}>{s.grade}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: P.text }}>{s.source}</div>
              <div style={{ fontSize: '8px', color: P.dim }}>{s.count} reports • {s.domains.join(', ')}</div>
            </div>
            <div style={{ fontSize: '10px', color: P.dim, fontWeight: 600 }}>{s.score}/5</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertRulesSection() {
  const [rules, setRules] = useState<{ id: string; name: string; condition: string; active: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem('argus-smart-alert-rules') || '[]') } catch { return [] }
  })
  const [newName, setNewName] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const saveRules = (updated: typeof rules) => { setRules(updated); localStorage.setItem('argus-smart-alert-rules', JSON.stringify(updated)) }
  const addRule = () => {
    if (!newName.trim() || !newCondition.trim()) return
    saveRules([...rules, { id: `rule-${Date.now()}`, name: newName, condition: newCondition, active: true }])
    setNewName(''); setNewCondition('')
  }
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#f5c542', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>SMART ALERTING RULES ENGINE <InfoTip text="Create custom alert rules based on domains, severities, keywords, and regions. When a new incident matches your rule conditions, you'll receive a notification." size={11} color="#f5c542" /></div>
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
        <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700 }}>CREATE RULE</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Rule name..." style={{ flex: '1 1 120px', padding: '6px 8px', fontSize: '10px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontFamily: P.font, outline: 'none' }} />
          <input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="e.g. country:Turkey AND severity:CRITICAL AND count>5" style={{ flex: '2 1 200px', padding: '6px 8px', fontSize: '10px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontFamily: P.font, outline: 'none' }} />
          <button onClick={addRule} style={{ padding: '6px 14px', background: `${P.accent}15`, border: `1px solid ${P.accent}40`, borderRadius: '4px', color: P.accent, fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font }}>ADD</button>
        </div>
        <div style={{ fontSize: '8px', color: P.dim, marginTop: '6px' }}>Syntax: country:XX, domain:CYBER, severity:CRITICAL, keyword:ransomware, count&gt;N</div>
      </div>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {rules.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '4px' }}>
            <button onClick={() => saveRules(rules.map(x => x.id === r.id ? { ...x, active: !x.active } : x))} style={{ width: '14px', height: '14px', borderRadius: '3px', border: 'none', background: r.active ? '#00e67625' : '#0d1220', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: r.active ? '#00e676' : P.dim }}>{r.active ? '\u2713' : ''}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: r.active ? P.text : P.dim }}>{r.name}</div>
              <div style={{ fontSize: '8px', color: P.dim, fontFamily: P.font }}>{r.condition}</div>
            </div>
            <button onClick={() => saveRules(rules.filter(x => x.id !== r.id))} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '12px' }}>{'\u2715'}</button>
          </div>
        ))}
        {rules.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>No rules defined. Create one above.</div>}
      </div>
    </div>
  )
}

function PredictionsSection({ incidents }: { incidents: Incident[] }) {
  const predictions = useMemo(() => {
    const countryMap = new Map<string, { count: number; critical: number; trend: number[]; lat: number; lng: number }>()
    const now = Date.now()
    for (const inc of incidents) {
      const c = inc.country || 'Unknown'
      const prev = countryMap.get(c) || { count: 0, critical: 0, trend: [0, 0, 0], lat: inc.latitude, lng: inc.longitude }
      prev.count++
      if (inc.severity === 'CRITICAL' || inc.severity === 'HIGH') prev.critical++
      const age = now - new Date(inc.timestamp).getTime()
      if (age < 86400000) prev.trend[0]++; else if (age < 86400000 * 3) prev.trend[1]++; else prev.trend[2]++
      countryMap.set(c, prev)
    }
    return Array.from(countryMap.entries()).map(([country, data]) => {
      const recentAccel = data.trend[0] > data.trend[1] * 1.5 ? 'escalating' : data.trend[0] < data.trend[1] * 0.5 ? 'de-escalating' : 'stable'
      const riskScore = Math.min(100, Math.round((data.critical / Math.max(data.count, 1)) * 60 + (data.trend[0] * 15) + (data.count > 10 ? 10 : 0)))
      const factors: string[] = []
      if (data.critical > 3) factors.push('High critical incident rate')
      if (data.trend[0] > data.trend[1] * 2) factors.push('Rapidly accelerating')
      if (data.count > 20) factors.push('High volume')
      return { country, riskScore, trend: recentAccel, factors, count: data.count, critical: data.critical, confidence: Math.min(95, 40 + data.count * 2) }
    }).sort((a, b) => b.riskScore - a.riskScore).slice(0, 15)
  }, [incidents])
  const trendColor = (t: string) => t === 'escalating' ? '#ff3b5c' : t === 'de-escalating' ? '#00e676' : '#f5c542'
  const trendIcon = (t: string) => t === 'escalating' ? '\u2191' : t === 'de-escalating' ? '\u2193' : '\u2192'

  return (
    <div>
      <div style={{ fontSize: '10px', color: '#ff6b35', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>PREDICTIVE CONFLICT ESCALATION MODEL <InfoTip text="Statistical model that estimates conflict escalation probability based on incident frequency, severity trends, domain mix, and historical patterns. Risk levels: Low (<30%), Medium (30-60%), High (60-85%), Critical (>85%)." size={11} color="#ff6b35" /></div>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {predictions.map(p => (
          <div key={p.country} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: P.card, border: `1px solid ${P.border}`, borderLeft: `3px solid ${p.riskScore > 70 ? '#ff3b5c' : p.riskScore > 40 ? '#ff6b35' : '#00d4ff'}`, borderRadius: '6px', marginBottom: '4px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: P.text }}>{p.country}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: trendColor(p.trend) }}>{trendIcon(p.trend)} {p.trend.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '8px', color: P.dim, marginTop: '2px' }}>{p.count} incidents • {p.critical} critical • Confidence: {p.confidence}%</div>
              {p.factors.length > 0 && <div style={{ fontSize: '8px', color: '#ff6b35', marginTop: '3px' }}>{p.factors.join(' \u2022 ')}</div>}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: p.riskScore > 70 ? '#ff3b5c' : p.riskScore > 40 ? '#ff6b35' : '#00d4ff' }}>{p.riskScore}</div>
              <div style={{ fontSize: '7px', color: P.dim, letterSpacing: '0.1em' }}>RISK</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}