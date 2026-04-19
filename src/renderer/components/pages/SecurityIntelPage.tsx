import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { Incident, IncidentSeverity, IncidentDomain, CyberThreat, PandemicEvent, NuclearEvent, MilitaryActivity, WeatherAlert, InternetOutage, SpaceWeatherEvent, DroneActivity, FeatureFlags } from '../../../shared/types'
import { InfoTip } from '@/components/ui/InfoTip'
import { useSettingsStore } from '@/stores/settings-store'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }
const SEV_COLORS: Record<string, string> = { CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff', EXTREME: '#ff3b5c', SEVERE: '#ff6b35', MODERATE: '#f5c542', MINOR: '#64c8ff', EMERGENCY: '#ff3b5c' }
const sevColor = (s: string) => SEV_COLORS[s] || P.dim
const MILITARY_TYPE_COLOR: Record<string, string> = { exercise: '#00d4ff', deployment: '#ff6b35', patrol: '#a78bfa', buildup: '#ff3b5c', airspace_closure: '#f5c542' }

function Card({ title, subtitle, color, children, onClick }: { title: string; subtitle?: string; color: string; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderLeft: `3px solid ${color}`, borderRadius: '6px', marginBottom: '6px',
      ...(onClick ? { cursor: 'pointer', transition: 'all 0.15s' } : {}),
    }}
    onMouseEnter={onClick ? e => { e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.background = '#111827' } : undefined}
    onMouseLeave={onClick ? e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.background = P.card } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: P.text, marginBottom: '4px', lineHeight: '1.4' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '10px', color: P.dim, marginBottom: '4px' }}>{subtitle}</div>}
        </div>
        {onClick && <span style={{ fontSize: '10px', color: P.dim, flexShrink: 0 }} title="Locate on globe">📍</span>}
      </div>
      {children}
    </div>
  )
}

type SubTab = 'cyber' | 'pandemic' | 'nuclear' | 'military' | 'internet' | 'space' | 'drones'

const SUB_TABS: { id: SubTab; label: string; icon: string; color: string; tip: string; featureKey: keyof FeatureFlags }[] = [
  { id: 'cyber', label: 'CYBER THREATS', icon: '🛡', color: '#ff3b5c', tip: 'Active cyber threats including malware campaigns, data breaches, and vulnerability exploits. Click events with coordinates to locate on the globe.', featureKey: 'secCyber' },
  { id: 'pandemic', label: 'PANDEMIC', icon: '🦠', color: '#ff8800', tip: 'Disease outbreak monitoring — tracks epidemics, pandemics, and public health emergencies worldwide.', featureKey: 'secPandemic' },
  { id: 'nuclear', label: 'NUCLEAR/WMD', icon: '☢', color: '#f5c542', tip: 'Nuclear proliferation, WMD threats, missile tests, and radiation incidents. Includes both state and non-state actor activities.', featureKey: 'secNuclear' },
  { id: 'military', label: 'MILITARY', icon: '🎖', color: '#a78bfa', tip: 'Military operations, force deployments, arms buildups, and defense-related incidents across all regions.', featureKey: 'secMilitary' },
  { id: 'internet', label: 'INTERNET', icon: '🌐', color: '#00e676', tip: 'Internet connectivity disruptions, major outages, and infrastructure issues. Often correlates with conflict or censorship events.', featureKey: 'secInternet' },
  { id: 'space', label: 'SPACE & NEO', icon: '☄', color: '#fbbf24', tip: 'Space weather events (solar flares, CMEs, geomagnetic storms), Near-Earth Objects (NEOs), asteroids, and fireball sightings from NASA data.', featureKey: 'secSpace' },
  { id: 'drones', label: 'DRONES/UAV', icon: '🛩', color: '#06b6d4', tip: 'Drone and UAV activity reports — unauthorized flights, military drone operations, and aerial surveillance detections.', featureKey: 'secDrones' },
]

function toIncident(opts: { id: string; title: string; description: string; severity: string; domain: string; source: string; latitude: number; longitude: number; country?: string; timestamp?: string }): Incident {
  return {
    id: opts.id,
    title: opts.title,
    description: opts.description,
    severity: (opts.severity || 'MEDIUM') as IncidentSeverity,
    domain: opts.domain as IncidentDomain,
    source: opts.source,
    latitude: opts.latitude,
    longitude: opts.longitude,
    country: opts.country || '',
    timestamp: opts.timestamp || new Date().toISOString(),
    tags: [],
  }
}

interface SecurityIntelPageProps {
  onLocateIncident?: (incident: Incident) => void
}

export function SecurityIntelPage({ onLocateIncident }: SecurityIntelPageProps) {
  const features = useSettingsStore(s => s.features)
  const visibleSubTabs = useMemo(() => SUB_TABS.filter(t => features?.[t.featureKey] ?? true), [features])
  const [tab, setTab] = useState<SubTab>('cyber')
  const effectiveTab = visibleSubTabs.find(t => t.id === tab) ? tab : visibleSubTabs[0]?.id as SubTab
  const [cyber, setCyber] = useState<CyberThreat[]>([])
  const [pandemic, setPandemic] = useState<PandemicEvent[]>([])
  const [nuclear, setNuclear] = useState<NuclearEvent[]>([])
  const [military, setMilitary] = useState<MilitaryActivity[]>([])
  const [weather, setWeather] = useState<WeatherAlert[]>([])
  const [internet, setInternet] = useState<InternetOutage[]>([])
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherEvent[]>([])
  const [drones, setDrones] = useState<DroneActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLastFetched] = useState<string>('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, p, n, m, w, i, spaceData, dronesData] = await Promise.all([
        window.argus.getCyberThreats().catch(() => []),
        window.argus.getPandemicEvents().catch(() => []),
        window.argus.getNuclearEvents().catch(() => []),
        window.argus.getMilitaryActivities().catch(() => []),
        window.argus.getWeatherAlerts().catch(() => []),
        window.argus.getInternetOutages().catch(() => []),
        window.argus.getSpaceWeather().catch(() => []),
        window.argus.getDroneActivities().catch(() => []),
      ])
      setCyber(Array.isArray(c) ? c : []); setPandemic(Array.isArray(p) ? p : []); setNuclear(Array.isArray(n) ? n : []); setMilitary(Array.isArray(m) ? m : []); setWeather(Array.isArray(w) ? w : []); setInternet(Array.isArray(i) ? i : [])
      setSpaceWeather(Array.isArray(spaceData) ? spaceData : []); setDrones(Array.isArray(dronesData) ? dronesData : [])
    } finally { setLoading(false); setLastFetched(new Date().toLocaleTimeString()) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: P.dim, fontFamily: P.font }}>Loading security intelligence...</div>

  return (
    <div style={{ fontFamily: P.font, padding: '16px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        {visibleSubTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '5px 10px', background: effectiveTab === t.id ? `${t.color}15` : 'transparent',
            border: `1px solid ${effectiveTab === t.id ? t.color + '40' : P.border}`,
            borderRadius: '4px', color: effectiveTab === t.id ? t.color : P.dim,
            fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}><span style={{ fontSize: '11px' }}>{t.icon}</span>{t.label}{effectiveTab === t.id && <InfoTip text={t.tip} size={10} color={t.color} />}</button>
        ))}
        {lastFetched && <span style={{ fontSize: '9px', color: P.dim }}>Data fetched at {lastFetched}</span>}
        <button onClick={loadAll} disabled={loading} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '9px', fontFamily: P.font, fontWeight: 600, background: `${P.accent}10`, border: `1px solid ${P.accent}30`, borderRadius: '4px', color: P.accent, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1 }}>↻ REFRESH</button>
      </div>

      {effectiveTab === 'cyber' && <CyberThreatView threats={cyber || []} />}

      {effectiveTab === 'pandemic' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
          {(pandemic || []).map(p => (
            <Card key={p.id} title={`${p.disease || 'Unknown'} — ${p.country || 'Unknown'}`} color={sevColor(p.alertLevel)}
              onClick={onLocateIncident && p.latitude != null && p.longitude != null ? () => onLocateIncident(toIncident({
                id: p.id, title: `${p.disease} — ${p.country}`, description: p.description || '',
                severity: p.alertLevel === 'EMERGENCY' ? 'CRITICAL' : (p.alertLevel || 'MEDIUM'), domain: 'INTEL',
                source: p.source || 'WHO', latitude: p.latitude, longitude: p.longitude, country: p.country, timestamp: p.reportedAt,
              })) : undefined}>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '10px' }}>
                <span style={{ color: '#ff6b35' }}>Cases: {(p.cases ?? 0).toLocaleString()}</span>
                <span style={{ color: '#ff3b5c' }}>Deaths: {(p.deaths ?? 0).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>{p.description}</div>
            </Card>
          ))}
          {(!pandemic || pandemic.length === 0) && <Empty />}
        </div>
      )}

      {effectiveTab === 'nuclear' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
          {(nuclear || []).map(n => (
            <Card key={n.id} title={n.title} subtitle={`${n.type.toUpperCase()} • ${n.country} • ${n.source}`} color={n.type === 'missile' ? '#ff3b5c' : n.type === 'test' ? '#ff3b5c' : '#f5c542'}
              onClick={onLocateIncident && n.latitude != null && n.longitude != null ? () => onLocateIncident(toIncident({
                id: n.id, title: n.title, description: n.description,
                severity: n.type === 'missile' || n.type === 'test' ? 'CRITICAL' : 'HIGH', domain: 'MILITARY',
                source: n.source, latitude: n.latitude, longitude: n.longitude, country: n.country, timestamp: n.detectedAt,
              })) : undefined}>
              <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>{n.description}</div>
              {n.yield && <div style={{ fontSize: '9px', color: '#ff6b35', marginTop: '4px' }}>Yield: {n.yield}</div>}
            </Card>
          ))}
          {(!nuclear || nuclear.length === 0) && <Empty />}
        </div>
      )}

      {effectiveTab === 'military' && (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {(military || []).map(m => (
              <Card key={m.id} title={m.title} subtitle={`${m.type.toUpperCase()} • ${m.country} • ${m.source}`} color={MILITARY_TYPE_COLOR[m.type] || P.accent}
                onClick={onLocateIncident && m.latitude != null && m.longitude != null ? () => onLocateIncident(toIncident({
                  id: m.id, title: m.title, description: m.description,
                  severity: m.type === 'buildup' ? 'HIGH' : 'MEDIUM', domain: 'MILITARY',
                  source: m.source, latitude: m.latitude, longitude: m.longitude, country: m.country, timestamp: m.detectedAt,
                })) : undefined}>
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>{m.description}</div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {(m.forces || []).map(f => <span key={f} style={{ fontSize: '9px', padding: '1px 5px', background: `${P.accent}15`, border: `1px solid ${P.accent}30`, borderRadius: '2px', color: P.accent }}>{f}</span>)}
                </div>
              </Card>
          ))}
          {(!military || military.length === 0) && <Empty />}
        </div>
      )}

      {effectiveTab === 'internet' && (
        <div>
          <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em', marginBottom: '8px' }}>ACTIVE OUTAGES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            {(internet || []).map(o => (
              <Card key={o.id} title={`${o.country} — Internet Disruption`} subtitle={`${o.severity.toUpperCase()} • ${o.source}`} color={o.severity === 'major' ? '#ff3b5c' : o.severity === 'moderate' ? '#ff8800' : '#f5c542'}
                onClick={onLocateIncident && o.latitude != null && o.longitude != null ? () => onLocateIncident(toIncident({
                  id: o.id, title: `${o.country} — Internet Disruption`, description: o.description,
                  severity: o.severity === 'major' ? 'CRITICAL' : o.severity === 'moderate' ? 'MEDIUM' : 'LOW',
                  domain: 'CYBER', source: o.source, latitude: o.latitude, longitude: o.longitude, country: o.country,
                })) : undefined}>
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>{o.description}</div>
              </Card>
            ))}
            {(!internet || internet.length === 0) && <Empty />}
          </div>
        </div>
      )}

      {effectiveTab === 'space' && <SpaceNeoView events={spaceWeather} />}

      {effectiveTab === 'drones' && <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.1em' }}>🛩 DRONE / UAV ACTIVITY ({(drones || []).length})</div>
        {(drones || []).map(d => <Card key={d.id} title={d.description} subtitle={`${(d.type || '').toUpperCase()} • ${d.country} • ALT: ${d.altitude}m`} color={d.type === 'military' ? '#ff6b35' : '#06b6d4'}
          onClick={onLocateIncident && d.latitude != null && d.longitude != null ? () => onLocateIncident(toIncident({
            id: d.id, title: `Drone/UAV — ${d.country}`, description: d.description,
            severity: d.type === 'military' ? 'HIGH' : 'MEDIUM', domain: 'MILITARY',
            source: d.source, latitude: d.latitude, longitude: d.longitude, country: d.country, timestamp: d.detectedAt,
          })) : undefined}>
          <div style={{ fontSize: '9px', color: P.dim }}>Position: {d.latitude.toFixed(2)}°, {d.longitude.toFixed(2)}° • {new Date(d.detectedAt).toLocaleString()}</div>
          <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>Source: {d.source}</div>
        </Card>)}
        {(drones || []).length === 0 && <Empty msg="No drone activity detected" />}
      </div>}

    </div>
  )
}

const SPACE_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  solar_flare: { icon: '☀', label: 'Solar Flare', color: '#fbbf24' },
  cme: { icon: '💫', label: 'CME', color: '#ff8800' },
  geomagnetic_storm: { icon: '🧲', label: 'Geomagnetic Storm', color: '#a78bfa' },
  radiation_storm: { icon: '☢', label: 'Radiation Storm', color: '#ff3b5c' },
  radio_blackout: { icon: '📡', label: 'Radio Blackout', color: '#ef4444' },
  asteroid: { icon: '☄', label: 'Asteroid / NEO', color: '#ff6b35' },
  comet: { icon: '🌠', label: 'Comet', color: '#64c8ff' },
  neo: { icon: '🌑', label: 'Near-Earth Object', color: '#f5c542' },
  fireball: { icon: '🔥', label: 'Fireball / Meteor', color: '#ff3b5c' },
}

function SpaceNeoView({ events: rawEvents }: { events: SpaceWeatherEvent[] }) {
  const events = rawEvents || []
  const [filter, setFilter] = useState<string>('all')

  const asteroids = events.filter(e => e.type === 'asteroid' || e.type === 'neo' || e.type === 'comet')
  const fireballs = events.filter(e => e.type === 'fireball')
  const solarEvents = events.filter(e => !['asteroid', 'neo', 'comet', 'fireball'].includes(e.type))
  const hazardous = asteroids.filter(e => e.isHazardous)

  const filtered = filter === 'all' ? events
    : filter === 'neo' ? [...asteroids, ...fireballs]
    : filter === 'solar' ? solarEvents
    : filter === 'hazardous' ? hazardous
    : events.filter(e => e.type === filter)

  return (
    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fbbf24' }}>{solarEvents.length}</div>
          <div style={{ fontSize: '9px', color: P.dim, fontWeight: 600, letterSpacing: '0.08em' }}>SOLAR EVENTS</div>
        </div>
        <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ff6b35' }}>{asteroids.length}</div>
          <div style={{ fontSize: '9px', color: P.dim, fontWeight: 600, letterSpacing: '0.08em' }}>NEO / ASTEROIDS</div>
        </div>
        <div style={{ padding: '12px', background: P.card, border: `1px solid ${hazardous.length > 0 ? '#ff3b5c40' : P.border}`, borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: hazardous.length > 0 ? '#ff3b5c' : P.dim }}>{hazardous.length}</div>
          <div style={{ fontSize: '9px', color: hazardous.length > 0 ? '#ff3b5c' : P.dim, fontWeight: 600, letterSpacing: '0.08em' }}>HAZARDOUS</div>
        </div>
        <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ff3b5c' }}>{fireballs.length}</div>
          <div style={{ fontSize: '9px', color: P.dim, fontWeight: 600, letterSpacing: '0.08em' }}>FIREBALLS</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'ALL' },
          { id: 'neo', label: 'NEO & FIREBALLS' },
          { id: 'solar', label: 'SOLAR' },
          { id: 'hazardous', label: 'HAZARDOUS ONLY' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '4px 10px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
            background: filter === f.id ? '#fbbf2415' : 'transparent',
            border: `1px solid ${filter === f.id ? '#fbbf2440' : P.border}`,
            borderRadius: '4px', color: filter === f.id ? '#fbbf24' : P.dim,
            cursor: 'pointer', fontFamily: P.font,
          }}>{f.label}</button>
        ))}
      </div>

      {filtered.map(ev => {
        const cfg = SPACE_TYPE_CONFIG[ev.type] || { icon: '🌌', label: ev.type, color: P.dim }
        const sevCol = ev.severity === 'EXTREME' ? '#ff3b5c' : ev.severity === 'SEVERE' ? '#ff6b35' : ev.severity === 'MODERATE' ? '#f5c542' : '#64c8ff'

        return (
          <div key={ev.id} style={{ padding: '12px', background: P.card, border: `1px solid ${ev.isHazardous ? '#ff3b5c30' : P.border}`, borderLeft: `3px solid ${cfg.color}`, borderRadius: '6px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: P.text, lineHeight: 1.3 }}>{ev.title}</div>
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>
                  {cfg.label.toUpperCase()} · <span style={{ color: sevCol, fontWeight: 700 }}>{ev.severity}</span> · {new Date(ev.startTime).toLocaleDateString()} · {ev.source}
                </div>
              </div>
              {ev.isHazardous && (
                <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 8px', background: '#ff3b5c20', color: '#ff3b5c', border: '1px solid #ff3b5c40', borderRadius: '4px', letterSpacing: '0.08em' }}>HAZARDOUS</span>
              )}
            </div>

            <div style={{ fontSize: '10px', color: P.text, lineHeight: 1.5, marginBottom: '6px' }}>{ev.description}</div>

            {(ev.estimatedDiameter || ev.velocity || ev.missDistance || ev.closestApproachDate) && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px', padding: '8px 10px', background: '#0a0e17', borderRadius: '4px', border: `1px solid ${P.border}` }}>
                {ev.estimatedDiameter && (
                  <div><div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '2px' }}>DIAMETER</div><div style={{ fontSize: '11px', fontWeight: 700, color: '#ff6b35' }}>{ev.estimatedDiameter}</div></div>
                )}
                {ev.velocity && (
                  <div><div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '2px' }}>VELOCITY</div><div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>{ev.velocity}</div></div>
                )}
                {ev.missDistance && (
                  <div><div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '2px' }}>MISS DISTANCE</div><div style={{ fontSize: '11px', fontWeight: 700, color: ev.isHazardous ? '#ff3b5c' : '#00d4ff' }}>{ev.missDistance}</div></div>
                )}
                {ev.closestApproachDate && (
                  <div><div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '2px' }}>CLOSEST APPROACH</div><div style={{ fontSize: '11px', fontWeight: 700, color: P.accent }}>{ev.closestApproachDate}</div></div>
                )}
              </div>
            )}

            {ev.affectedSystems && ev.affectedSystems.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                {ev.affectedSystems.map(sys => (
                  <span key={sys} style={{ fontSize: '9px', padding: '2px 6px', background: '#fbbf2410', border: '1px solid #fbbf2430', borderRadius: '3px', color: '#fbbf24' }}>{sys}</span>
                ))}
              </div>
            )}

            {ev.kpIndex != null && (
              <div style={{ marginTop: '6px', fontSize: '9px', color: P.dim }}>Kp Index: <span style={{ fontWeight: 700, color: ev.kpIndex >= 7 ? '#ff3b5c' : ev.kpIndex >= 5 ? '#ff6b35' : '#fbbf24' }}>{ev.kpIndex}</span></div>
            )}
          </div>
        )
      })}

      {filtered.length === 0 && <Empty />}
    </div>
  )
}

type CyberCategory = 'all' | 'exploits' | 'ransomware' | 'vulnerabilities' | 'other'

const CYBER_CATS: { id: CyberCategory; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'ALL', icon: '🛡', color: '#ff3b5c' },
  { id: 'exploits', label: 'ACTIVELY EXPLOITED', icon: '🔴', color: '#ff3b5c' },
  { id: 'ransomware', label: 'RANSOMWARE', icon: '💀', color: '#ff6b35' },
  { id: 'vulnerabilities', label: 'CVE / VULNERABILITIES', icon: '🐛', color: '#f5c542' },
  { id: 'other', label: 'OTHER', icon: '⚡', color: '#00d4ff' },
]

function categorizeThreat(t: CyberThreat): CyberCategory {
  if (t.source === 'CISA KEV' || t.title.includes('Actively Exploited')) return 'exploits'
  if (t.type === 'ransomware') return 'ransomware'
  if (t.type === 'cve' || t.cveId) return 'vulnerabilities'
  return 'other'
}

function CyberThreatView({ threats }: { threats: CyberThreat[] }) {
  const [cat, setCat] = useState<CyberCategory>('all')

  const counts = useMemo(() => {
    const m: Record<CyberCategory, number> = { all: threats.length, exploits: 0, ransomware: 0, vulnerabilities: 0, other: 0 }
    for (const t of threats) m[categorizeThreat(t)]++
    return m
  }, [threats])

  const filtered = useMemo(() =>
    cat === 'all' ? threats : threats.filter(t => categorizeThreat(t) === cat),
    [threats, cat]
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {CYBER_CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={{
            padding: '5px 10px', fontSize: '9px', fontWeight: 700, fontFamily: P.font,
            background: cat === c.id ? `${c.color}15` : 'transparent',
            border: `1px solid ${cat === c.id ? c.color + '40' : P.border}`,
            borderRadius: '4px', color: cat === c.id ? c.color : P.dim,
            cursor: 'pointer', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>{c.icon} {c.label} <span style={{ opacity: 0.7 }}>({counts[c.id]})</span></button>
        ))}
      </div>

      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {filtered.map(c => {
          const cveUrl = c.sourceUrl || (c.cveId ? `https://nvd.nist.gov/vuln/detail/${c.cveId}` : null)
          const category = categorizeThreat(c)
          const catCfg = CYBER_CATS.find(cc => cc.id === category)
          return (
            <Card key={c.id}
              title={c.title}
              subtitle={`${c.source} • ${c.type.toUpperCase()} • ${new Date(c.publishedAt).toLocaleDateString()}`}
              color={sevColor(c.severity)}
            >
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', padding: '1px 5px', background: sevColor(c.severity) + '20', color: sevColor(c.severity), borderRadius: '2px', fontWeight: 700 }}>{c.severity}</span>
                {catCfg && <span style={{ fontSize: '9px', padding: '1px 5px', background: `${catCfg.color}15`, color: catCfg.color, borderRadius: '2px', fontWeight: 600 }}>{catCfg.icon} {catCfg.label}</span>}
                {c.cvssScore != null && <span style={{ fontSize: '9px', color: P.dim, fontWeight: 600 }}>CVSS: {c.cvssScore}</span>}
                {c.cveId && (
                  <span
                    onClick={(e) => { e.stopPropagation(); if (cveUrl) window.open(cveUrl, '_blank', 'noopener,noreferrer') }}
                    style={{
                      fontSize: '9px', fontWeight: 700, color: '#00d4ff', cursor: 'pointer',
                      padding: '1px 6px', background: '#00d4ff12', border: '1px solid #00d4ff30',
                      borderRadius: '3px', transition: 'all 0.15s',
                    }}
                    title={`Open ${c.cveId} details`}
                  >{c.cveId} ↗</span>
                )}
                {c.attackerGroup && <span style={{ fontSize: '9px', color: '#a78bfa' }}>Group: {c.attackerGroup}</span>}
                {c.targetSector && <span style={{ fontSize: '9px', color: P.dim }}>Sector: {c.targetSector}</span>}
              </div>
              {c.description && (
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '6px', lineHeight: 1.5 }}>
                  {c.description.length > 200 ? c.description.slice(0, 200) + '...' : c.description}
                </div>
              )}
              {cveUrl && !c.cveId && (
                <div style={{ marginTop: '6px' }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); window.open(cveUrl, '_blank', 'noopener,noreferrer') }}
                    style={{ fontSize: '9px', color: '#00d4ff', cursor: 'pointer', fontWeight: 600 }}
                  >View Details ↗</span>
                </div>
              )}
            </Card>
          )
        })}
        {filtered.length === 0 && <Empty msg="No threats in this category" />}
      </div>
    </div>
  )
}

function Empty({ msg }: { msg?: string }) {
  return <div style={{ padding: '20px', textAlign: 'center', color: '#4a5568', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>{msg || 'No data available'}</div>
}
