import { useState, useCallback, useMemo, memo } from 'react'
import { useLayerStore } from '@/stores/layer-store'
import { useViewStore } from '@/stores/view-store'
import { useWatchlistStore } from '@/stores/watchlist-store'
import { useTrackingStore } from '@/stores/tracking-store'
import { useSettingsStore } from '@/stores/settings-store'
import type { IncidentDomain, TrackingLayer, FeatureFlags } from '../../../shared/types'

const P = {
  bg: 'rgba(10,14,23,0.95)',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onApplyView?: (viewId: string) => void
  activePanel?: string
}

interface DomainConfig {
  id: IncidentDomain
  label: string
  icon: string
  color: string
  shortLabel: string
}

const DOMAINS: DomainConfig[] = [
  { id: 'CONFLICT', label: 'Conflict', icon: '⚔', color: '#ff6b35', shortLabel: 'CON' },
  { id: 'CYBER', label: 'Cyber', icon: '⚡', color: '#00ff87', shortLabel: 'CYB' },
  { id: 'INTEL', label: 'Intel', icon: '◉', color: '#4a9eff', shortLabel: 'INT' },
  { id: 'FINANCE', label: 'Finance', icon: '◆', color: '#f5c542', shortLabel: 'FIN' },
]

const SUBLAYERS: Record<IncidentDomain, { id: string; label: string }[]> = {
  CONFLICT: [
    { id: 'active-zones', label: 'Active Zones' },
    { id: 'military-movements', label: 'Military Moves' },
    { id: 'refugee-flows', label: 'Refugee Flows' },
    { id: 'arms-transfers', label: 'Arms Transfers' },
  ],
  CYBER: [
    { id: 'ddos-attacks', label: 'DDoS Attacks' },
    { id: 'apt-groups', label: 'APT Groups' },
    { id: 'zero-days', label: 'Zero-Day Exploits' },
    { id: 'infra-outages', label: 'Infra Outages' },
  ],
  INTEL: [
    { id: 'geopolitical', label: 'Geopolitical' },
    { id: 'sanctions', label: 'Sanctions' },
    { id: 'diplomatic', label: 'Diplomatic' },
    { id: 'nuclear', label: 'Nuclear Activity' },
  ],
  FINANCE: [
    { id: 'markets', label: 'Stock Markets' },
    { id: 'commodities', label: 'Commodities' },
    { id: 'currencies', label: 'Currencies' },
    { id: 'crypto', label: 'Crypto' },
  ],
}

interface TrackingConfig {
  id: TrackingLayer
  label: string
  icon: string
  color: string
  description: string
  featureKey: keyof FeatureFlags
}

const TRACKING_LAYERS: TrackingConfig[] = [
  { id: 'flights', label: 'Flights', icon: '✈', color: '#00b4ff', description: 'Live aircraft positions', featureKey: 'trackFlights' },
  { id: 'vessels', label: 'Vessels', icon: '⚓', color: '#64c8ff', description: 'Ship tracking', featureKey: 'trackVessels' },
  { id: 'satellites', label: 'Satellites', icon: '🛰', color: '#a78bfa', description: 'Orbital satellite tracking', featureKey: 'trackSatellites' },
  { id: 'earthquakes', label: 'Earthquakes', icon: '◎', color: '#ff8800', description: 'USGS seismic data', featureKey: 'trackEarthquakes' },
  { id: 'disasters', label: 'Disasters', icon: '⚠', color: '#ff60a0', description: 'NASA EONET events', featureKey: 'trackDisasters' },
]

const SIDEBAR_TABS = [
  { id: 'layers', icon: '☰', label: 'Layers' },
  { id: 'tracking', icon: '📡', label: 'Track' },
  { id: 'views', icon: '◎', label: 'Views' },
  { id: 'watchlist', icon: '★', label: 'Watch' },
]

export const Sidebar = memo(function Sidebar({ collapsed, onToggle, onApplyView }: SidebarProps) {
  const layers = useLayerStore(s => s.layers)
  const toggleLayer = useLayerStore(s => s.toggleLayer)
  const toggleSublayer = useLayerStore(s => s.toggleSublayer)
  const views = useViewStore(s => s.views)
  const removeView = useViewStore(s => s.removeView)
  const watchItems = useWatchlistStore(s => s.items)
  const addWatchItem = useWatchlistStore(s => s.addItem)
  const removeWatchItem = useWatchlistStore(s => s.removeItem)
  const toggleWatchItem = useWatchlistStore(s => s.toggleItem)
  const trackingEnabled = useTrackingStore(s => s.enabledLayers)
  const toggleTrackingLayer = useTrackingStore(s => s.toggleLayer)
  const trackingLoading = useTrackingStore(s => s.loading)
  const flightCount = useTrackingStore(s => s.flights.length)
  const vesselCount = useTrackingStore(s => s.vessels.length)
  const quakeCount = useTrackingStore(s => s.earthquakes.length)
  const disasterCount = useTrackingStore(s => s.disasters.length)
  const satelliteCount = useTrackingStore(s => s.satellites.length)
  const features = useSettingsStore(s => s.features)
  const visibleTrackingLayers = useMemo(() => TRACKING_LAYERS.filter(t => features?.[t.featureKey] ?? true), [features])

  const [expandedDomain, setExpandedDomain] = useState<IncidentDomain | null>(null)
  const [tab, setTab] = useState<string>('layers')
  const [newWatchValue, setNewWatchValue] = useState('')

  const handleAddWatch = useCallback(() => {
    if (!newWatchValue.trim()) return
    addWatchItem({ type: 'keyword', value: newWatchValue.trim(), enabled: true })
    setNewWatchValue('')
  }, [newWatchValue, addWatchItem])

  if (collapsed) {
    return (
      <aside style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '38px', background: 'rgba(10,14,23,0.9)',
        border: `1px solid ${P.border}`,
        borderRadius: '8px',
        fontFamily: P.font, paddingTop: '4px',
        backdropFilter: 'blur(12px)',
        height: '100%', overflow: 'hidden',
      }}>
        <button onClick={onToggle} style={{
          width: '32px', height: '28px', background: 'transparent',
          border: 'none', color: P.dim, cursor: 'pointer', fontSize: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '8px', fontFamily: P.font,
        }}>▶</button>

        {DOMAINS.map(d => {
          const layer = layers.find(l => l.domain === d.id)
          const isActive = layer?.visible ?? true
          return (
            <button key={d.id} onClick={() => toggleLayer(d.id)} title={d.label} style={{
              width: '32px', height: '28px', background: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: '12px',
              color: isActive ? d.color : P.dim + '40',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', marginBottom: '2px', fontFamily: P.font,
              opacity: isActive ? 1 : 0.3,
            }}>{d.icon}</button>
          )
        })}
      </aside>
    )
  }

  return (
    <aside style={{
      display: 'flex', flexDirection: 'column',
      width: '220px', background: 'rgba(10,14,23,0.95)',
      border: `1px solid ${P.border}`,
      borderRadius: '8px',
      fontFamily: P.font,
      backdropFilter: 'blur(12px)',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${P.border}`, height: '32px',
      }}>
        {SIDEBAR_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, height: '100%', border: 'none', cursor: 'pointer',
            background: tab === t.id ? '#0d1220' : 'transparent',
            color: tab === t.id ? P.accent : P.dim,
            fontSize: '9px', fontFamily: P.font,
            borderBottom: tab === t.id ? `2px solid ${P.accent}` : '2px solid transparent',
            transition: 'all 0.2s', letterSpacing: '0.1em',
          }}>{t.icon} {t.label.toUpperCase()}</button>
        ))}
        <button onClick={onToggle} style={{
          width: '28px', height: '100%', border: 'none', background: 'transparent',
          color: P.dim, cursor: 'pointer', fontSize: '10px', fontFamily: P.font,
          borderLeft: `1px solid ${P.border}`,
        }}>◀</button>
      </div>

      {/* LAYERS TAB */}
      {tab === 'layers' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: '9px', color: P.dim, letterSpacing: '0.2em' }}>
            DOMAIN LAYERS
          </div>
          {DOMAINS.map(domain => {
            const layer = layers.find(l => l.domain === domain.id)
            const isActive = layer?.visible ?? true
            const isExpanded = expandedDomain === domain.id

            return (
              <div key={domain.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px',
                  background: isExpanded ? '#0d1220' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  <button onClick={() => toggleLayer(domain.id)} style={{
                    width: '14px', height: '14px', borderRadius: '3px', border: 'none',
                    background: isActive ? domain.color + '25' : '#0d1220',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', color: isActive ? domain.color : P.dim,
                    transition: 'all 0.2s',
                  }}>{isActive ? '✓' : ''}</button>

                  <button onClick={() => setExpandedDomain(isExpanded ? null : domain.id)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', fontFamily: P.font,
                  }}>
                    <span style={{ fontSize: '11px', color: isActive ? domain.color : P.dim, transition: 'color 0.2s' }}>
                      {domain.icon}
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                      color: isActive ? P.text : P.dim, transition: 'color 0.2s',
                    }}>{domain.label.toUpperCase()}</span>
                  </button>

                  <span style={{
                    fontSize: '9px', color: P.dim, transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                  }}>▸</span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 10px 6px 36px' }}>
                    {SUBLAYERS[domain.id].map(sub => {
                      const sublayer = layer?.sublayers.find(s => s.id === sub.id)
                      const subActive = sublayer?.visible ?? false
                      return (
                        <button key={sub.id} onClick={() => toggleSublayer(domain.id, sub.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          width: '100%', padding: '3px 0', background: 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: P.font,
                        }}>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '2px',
                            border: `1px solid ${subActive ? domain.color + '80' : P.border}`,
                            background: subActive ? domain.color + '30' : 'transparent',
                            fontSize: '6px', color: domain.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{subActive ? '✓' : ''}</span>
                          <span style={{ fontSize: '9px', color: subActive ? P.text : P.dim }}>{sub.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* TRACKING TAB */}
      {tab === 'tracking' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: '9px', color: P.dim, letterSpacing: '0.2em' }}>
            LIVE TRACKING LAYERS
          </div>
          {visibleTrackingLayers.map(track => {
            const isActive = trackingEnabled[track.id]
            const isLoading = trackingLoading[track.id]
            const count = track.id === 'flights' ? flightCount
              : track.id === 'vessels' ? vesselCount
              : track.id === 'earthquakes' ? quakeCount
              : track.id === 'satellites' ? satelliteCount
              : disasterCount

            return (
              <div key={track.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px',
                background: isActive ? '#0d1220' : 'transparent',
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
              onClick={() => toggleTrackingLayer(track.id)}
              >
                <button style={{
                  width: '14px', height: '14px', borderRadius: '3px', border: 'none',
                  background: isActive ? track.color + '25' : '#0d1220',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', color: isActive ? track.color : P.dim,
                  transition: 'all 0.2s', flexShrink: 0,
                }}>{isActive ? '✓' : ''}</button>

                <span style={{
                  fontSize: '12px', color: isActive ? track.color : P.dim,
                  transition: 'color 0.2s', flexShrink: 0,
                }}>{track.icon}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                    color: isActive ? P.text : P.dim, transition: 'color 0.2s',
                  }}>{track.label.toUpperCase()}</div>
                  <div style={{ fontSize: '9px', color: P.dim, marginTop: '1px' }}>
                    {track.description}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {isLoading ? (
                    <span style={{
                      fontSize: '9px', color: track.color,
                      animation: 'pulse 1s infinite',
                    }}>Loading...</span>
                  ) : isActive ? (
                    <span style={{ fontSize: '9px', color: track.color, fontWeight: 600 }}>
                      {count}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}

          {/* Day/Night toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px', marginTop: '4px',
            borderTop: `1px solid ${P.border}`,
            background: (trackingEnabled as any).daynight ? '#0d1220' : 'transparent',
            cursor: 'pointer',
          }}
          onClick={() => toggleTrackingLayer('daynight' as any)}
          >
            <button style={{
              width: '14px', height: '14px', borderRadius: '3px', border: 'none',
              background: (trackingEnabled as any).daynight ? '#fbbf2425' : '#0d1220',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', color: (trackingEnabled as any).daynight ? '#fbbf24' : P.dim,
              transition: 'all 0.2s', flexShrink: 0,
            }}>{(trackingEnabled as any).daynight ? '\u2713' : ''}</button>
            <span style={{
              fontSize: '12px', color: (trackingEnabled as any).daynight ? '#fbbf24' : P.dim,
            }}>{'\u263C'}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                color: (trackingEnabled as any).daynight ? P.text : P.dim,
              }}>DAY / NIGHT</div>
              <div style={{ fontSize: '9px', color: P.dim }}>Solar terminator overlay</div>
            </div>
          </div>

          {/* Infrastructure toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px',
            background: (trackingEnabled as any).infrastructure ? '#0d1220' : 'transparent',
            cursor: 'pointer',
          }}
          onClick={() => toggleTrackingLayer('infrastructure' as any)}
          >
            <button style={{
              width: '14px', height: '14px', borderRadius: '3px', border: 'none',
              background: (trackingEnabled as any).infrastructure ? '#ff8c0025' : '#0d1220',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', color: (trackingEnabled as any).infrastructure ? '#ff8c00' : P.dim,
              transition: 'all 0.2s', flexShrink: 0,
            }}>{(trackingEnabled as any).infrastructure ? '\u2713' : ''}</button>
            <span style={{
              fontSize: '12px', color: (trackingEnabled as any).infrastructure ? '#ff8c00' : P.dim,
            }}>{'\u26D3'}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                color: (trackingEnabled as any).infrastructure ? P.text : P.dim,
              }}>INFRASTRUCTURE</div>
              <div style={{ fontSize: '9px', color: P.dim }}>Pipelines, cables, chokepoints</div>
            </div>
          </div>

          {/* Conflict Zones toggle */}
          {[
            { key: 'conflictZones', label: 'CONFLICT ZONES', desc: 'Active conflict boundaries', color: '#ff3b5c', icon: '⬡' },
            { key: 'tradeRoutes', label: 'TRADE ROUTES', desc: 'Maritime & pipeline routes', color: '#f5c542', icon: '⛵' },
            { key: 'sigint', label: 'SIGINT / RF', desc: 'GPS jamming & interference', color: '#a78bfa', icon: '📡' },
            { key: 'weather', label: 'WEATHER', desc: 'Extreme weather alerts', color: '#64c8ff', icon: '🌪' },
            { key: 'pandemic', label: 'PANDEMIC', desc: 'Disease outbreaks', color: '#ff8800', icon: '🦠' },
            { key: 'nuclear', label: 'NUCLEAR/WMD', desc: 'Nuclear facilities & missiles', color: '#f5c542', icon: '☢' },
            { key: 'military', label: 'MILITARY', desc: 'Exercises & deployments', color: '#a78bfa', icon: '🎖' },
            { key: 'energy', label: 'ENERGY', desc: 'Power plants & pipelines', color: '#ffd700', icon: '⚡' },
            { key: 'migration', label: 'MIGRATION', desc: 'Refugee & migration routes', color: '#ff3b5c', icon: '🚶' },
            { key: 'internet', label: 'INTERNET', desc: 'Outages & infrastructure', color: '#00e676', icon: '🌐' },
          ].map(item => (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px',
              background: (trackingEnabled as any)[item.key] ? '#0d1220' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => toggleTrackingLayer(item.key as any)}
            >
              <button style={{
                width: '14px', height: '14px', borderRadius: '3px', border: 'none',
                background: (trackingEnabled as any)[item.key] ? item.color + '25' : '#0d1220',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', color: (trackingEnabled as any)[item.key] ? item.color : P.dim,
                transition: 'all 0.2s', flexShrink: 0,
              }}>{(trackingEnabled as any)[item.key] ? '✓' : ''}</button>
              <span style={{ fontSize: '12px', color: (trackingEnabled as any)[item.key] ? item.color : P.dim }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: (trackingEnabled as any)[item.key] ? P.text : P.dim }}>{item.label}</div>
                <div style={{ fontSize: '9px', color: P.dim }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <div style={{
            padding: '8px 10px', borderTop: `1px solid ${P.border}`, marginTop: '8px',
          }}>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.15em', marginBottom: '4px' }}>
              DATA SOURCES
            </div>
            <div style={{ fontSize: '9px', color: P.dim, lineHeight: '1.6' }}>
              ✈ OpenSky Network (live)<br/>
              ⚓ AIS Global (sample)<br/>
              🛰 CelesTrak TLE (live)<br/>
              ◎ USGS Earthquake Feed<br/>
              ⚠ NASA EONET<br/>
              ⬡ Conflict zones (curated)<br/>
              ⛵ Trade routes &amp; chokepoints<br/>
              📡 SIGINT/RF monitoring
            </div>
          </div>
        </div>
      )}

      {/* VIEWS TAB */}
      {tab === 'views' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: '9px', color: P.dim, letterSpacing: '0.2em' }}>
            SAVED VIEWS
          </div>
          {views.map(view => (
            <div key={view.id} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0d1220'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '10px', color: P.accent }}>◎</span>
              <button onClick={() => onApplyView?.(view.id)} style={{
                flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontFamily: P.font,
                fontSize: '10px', color: P.text,
              }}>{view.name}</button>
              {!view.id.startsWith('default') && (
                <button onClick={() => removeView(view.id)} style={{
                  background: 'transparent', border: 'none', color: P.dim,
                  cursor: 'pointer', fontSize: '9px', fontFamily: P.font,
                }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WATCHLIST TAB */}
      {tab === 'watchlist' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: '9px', color: P.dim, letterSpacing: '0.2em' }}>
            WATCHLIST
          </div>
          <div style={{ padding: '4px 10px 8px', display: 'flex', gap: '4px' }}>
            <input
              type="text"
              placeholder="Add keyword..."
              value={newWatchValue}
              onChange={e => setNewWatchValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWatch()}
              style={{
                flex: 1, height: '22px', background: '#0d1220',
                border: `1px solid ${P.border}`, borderRadius: '3px',
                padding: '0 6px', color: P.text, fontSize: '9px',
                fontFamily: P.font, outline: 'none',
              }}
            />
            <button onClick={handleAddWatch} style={{
              height: '22px', padding: '0 8px', background: P.accent + '20',
              border: `1px solid ${P.accent}40`, borderRadius: '3px',
              color: P.accent, fontSize: '9px', cursor: 'pointer', fontFamily: P.font,
            }}>+</button>
          </div>
          {watchItems.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px',
            }}>
              <button onClick={() => toggleWatchItem(item.id)} style={{
                width: '10px', height: '10px', borderRadius: '2px',
                border: `1px solid ${item.enabled ? P.accent + '80' : P.border}`,
                background: item.enabled ? P.accent + '25' : 'transparent',
                cursor: 'pointer', fontSize: '6px', color: P.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.enabled ? '✓' : ''}</button>
              <span style={{ flex: 1, fontSize: '9px', color: item.enabled ? P.text : P.dim }}>{item.value}</span>
              <span style={{ fontSize: '9px', color: P.dim }}>{item.matchCount}</span>
              <button onClick={() => removeWatchItem(item.id)} style={{
                background: 'transparent', border: 'none', color: P.dim,
                cursor: 'pointer', fontSize: '9px', fontFamily: P.font,
              }}>✕</button>
            </div>
          ))}
          {watchItems.length === 0 && (
            <div style={{ padding: '16px 10px', fontSize: '9px', color: P.dim, textAlign: 'center' }}>
              No watchlist items
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${P.border}`, padding: '6px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>LAYERS</span>
        <span style={{ fontSize: '10px', color: P.accent, fontWeight: 600 }}>
          {layers.filter(l => l.visible).length}/{layers.length}
        </span>
      </div>
    </aside>
  )
})
