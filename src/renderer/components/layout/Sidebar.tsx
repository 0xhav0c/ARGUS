import { useState, useCallback, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
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
  i18nLabel: string
  icon: string
  color: string
  i18nShort: string
}

const DOMAINS: DomainConfig[] = [
  { id: 'CONFLICT', i18nLabel: 'sidebar.domainConflict', icon: '⚔', color: '#ff6b35', i18nShort: 'sidebar.shortConflict' },
  { id: 'CYBER', i18nLabel: 'sidebar.domainCyber', icon: '⚡', color: '#00ff87', i18nShort: 'sidebar.shortCyber' },
  { id: 'INTEL', i18nLabel: 'sidebar.domainIntel', icon: '◉', color: '#4a9eff', i18nShort: 'sidebar.shortIntel' },
  { id: 'FINANCE', i18nLabel: 'sidebar.domainFinance', icon: '◆', color: '#f5c542', i18nShort: 'sidebar.shortFinance' },
]

const SUBLAYERS: Record<IncidentDomain, { id: string; i18nKey: string }[]> = {
  CONFLICT: [
    { id: 'active-zones', i18nKey: 'sidebar.subActiveZones' },
    { id: 'military-movements', i18nKey: 'sidebar.subMilitaryMoves' },
    { id: 'refugee-flows', i18nKey: 'sidebar.subRefugeeFlows' },
    { id: 'arms-transfers', i18nKey: 'sidebar.subArmsTransfers' },
  ],
  CYBER: [
    { id: 'ddos-attacks', i18nKey: 'sidebar.subDdosAttacks' },
    { id: 'apt-groups', i18nKey: 'sidebar.subAptGroups' },
    { id: 'zero-days', i18nKey: 'sidebar.subZeroDayExploits' },
    { id: 'infra-outages', i18nKey: 'sidebar.subInfraOutages' },
  ],
  INTEL: [
    { id: 'geopolitical', i18nKey: 'sidebar.subGeopolitical' },
    { id: 'sanctions', i18nKey: 'sidebar.subSanctions' },
    { id: 'diplomatic', i18nKey: 'sidebar.subDiplomatic' },
    { id: 'nuclear', i18nKey: 'sidebar.subNuclearActivity' },
  ],
  FINANCE: [
    { id: 'markets', i18nKey: 'sidebar.subStockMarkets' },
    { id: 'commodities', i18nKey: 'sidebar.subCommodities' },
    { id: 'currencies', i18nKey: 'sidebar.subCurrencies' },
    { id: 'crypto', i18nKey: 'sidebar.subCrypto' },
  ],
}

interface TrackingConfig {
  id: TrackingLayer
  i18nLabel: string
  icon: string
  color: string
  i18nDesc: string
  featureKey: keyof FeatureFlags
}

const TRACKING_LAYERS: TrackingConfig[] = [
  { id: 'satellites', i18nLabel: 'sidebar.trackSatellites', icon: '🛰', color: '#a78bfa', i18nDesc: 'sidebar.trackSatellitesDesc', featureKey: 'trackSatellites' },
  { id: 'earthquakes', i18nLabel: 'sidebar.trackEarthquakes', icon: '◎', color: '#ff8800', i18nDesc: 'sidebar.trackEarthquakesDesc', featureKey: 'trackEarthquakes' },
]

const SIDEBAR_TABS = [
  { id: 'layers', icon: '☰', i18nKey: 'sidebar.tabLayers' },
  { id: 'tracking', icon: '📡', i18nKey: 'sidebar.tabTrack' },
  { id: 'views', icon: '◎', i18nKey: 'sidebar.tabViews' },
  { id: 'watchlist', icon: '★', i18nKey: 'sidebar.tabWatch' },
]

export const Sidebar = memo(function Sidebar({ collapsed, onToggle, onApplyView }: SidebarProps) {
  const { t } = useTranslation()
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
  const quakeCount = useTrackingStore(s => s.earthquakes.length)
  const satelliteCount = useTrackingStore(s => s.satellites.length)
  const features = useSettingsStore(s => s.features)
  const visibleTrackingLayers = useMemo(() => TRACKING_LAYERS.filter(tl => features?.[tl.featureKey] ?? true), [features])

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
            <button key={d.id} onClick={() => toggleLayer(d.id)} title={t(d.i18nLabel)} style={{
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
        {SIDEBAR_TABS.map(st => (
          <button key={st.id} onClick={() => setTab(st.id)} style={{
            flex: 1, height: '100%', border: 'none', cursor: 'pointer',
            background: tab === st.id ? '#0d1220' : 'transparent',
            color: tab === st.id ? P.accent : P.dim,
            fontSize: '9px', fontFamily: P.font,
            borderBottom: tab === st.id ? `2px solid ${P.accent}` : '2px solid transparent',
            transition: 'all 0.2s', letterSpacing: '0.1em',
          }}>{st.icon} {t(st.i18nKey).toUpperCase()}</button>
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
            {t('sidebar.domainLayers')}
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
                    }}>{t(domain.i18nLabel).toUpperCase()}</span>
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
                          <span style={{ fontSize: '9px', color: subActive ? P.text : P.dim }}>{t(sub.i18nKey)}</span>
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
            {t('sidebar.liveTrackingLayers')}
          </div>
          {visibleTrackingLayers.map(track => {
            const isActive = trackingEnabled[track.id]
            const isLoading = trackingLoading[track.id]
            const count = track.id === 'earthquakes' ? quakeCount : satelliteCount

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
                  }}>{t(track.i18nLabel).toUpperCase()}</div>
                  <div style={{ fontSize: '9px', color: P.dim, marginTop: '1px' }}>
                    {t(track.i18nDesc)}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {isLoading ? (
                    <span style={{
                      fontSize: '9px', color: track.color,
                      animation: 'pulse 1s infinite',
                    }}>{t('app.loading')}</span>
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
              }}>{t('sidebar.layerDayNight')}</div>
              <div style={{ fontSize: '9px', color: P.dim }}>{t('sidebar.layerDayNightDesc')}</div>
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
              }}>{t('sidebar.layerInfrastructure')}</div>
              <div style={{ fontSize: '9px', color: P.dim }}>{t('sidebar.layerInfrastructureDesc')}</div>
            </div>
          </div>

          {/* Conflict Zones toggle */}
          {[
            { key: 'conflictZones', i18nLabel: 'sidebar.layerConflictZones', i18nDesc: 'sidebar.layerConflictZonesDesc', color: '#ff3b5c', icon: '⬡' },
            { key: 'tradeRoutes', i18nLabel: 'sidebar.layerTradeRoutes', i18nDesc: 'sidebar.layerTradeRoutesDesc', color: '#f5c542', icon: '⛵' },
            { key: 'sigint', i18nLabel: 'sidebar.layerSigint', i18nDesc: 'sidebar.layerSigintDesc', color: '#a78bfa', icon: '📡' },
            { key: 'pandemic', i18nLabel: 'sidebar.layerPandemic', i18nDesc: 'sidebar.layerPandemicDesc', color: '#ff8800', icon: '🦠' },
            { key: 'nuclear', i18nLabel: 'sidebar.layerNuclear', i18nDesc: 'sidebar.layerNuclearDesc', color: '#f5c542', icon: '☢' },
            { key: 'military', i18nLabel: 'sidebar.layerMilitary', i18nDesc: 'sidebar.layerMilitaryDesc', color: '#a78bfa', icon: '🎖' },
            { key: 'energy', i18nLabel: 'sidebar.layerEnergy', i18nDesc: 'sidebar.layerEnergyDesc', color: '#ffd700', icon: '⚡' },
            { key: 'migration', i18nLabel: 'sidebar.layerMigration', i18nDesc: 'sidebar.layerMigrationDesc', color: '#ff3b5c', icon: '🚶' },
            { key: 'internet', i18nLabel: 'sidebar.layerInternet', i18nDesc: 'sidebar.layerInternetDesc', color: '#00e676', icon: '🌐' },
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
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: (trackingEnabled as any)[item.key] ? P.text : P.dim }}>{t(item.i18nLabel)}</div>
                <div style={{ fontSize: '9px', color: P.dim }}>{t(item.i18nDesc)}</div>
              </div>
            </div>
          ))}

          <div style={{
            padding: '8px 10px', borderTop: `1px solid ${P.border}`, marginTop: '8px',
          }}>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.15em', marginBottom: '4px' }}>
              {t('sidebar.dataSources')}
            </div>
            <div style={{ fontSize: '9px', color: P.dim, lineHeight: '1.6' }}>
              🛰 {t('sidebar.sourceCelestrak')}<br/>
              ◎ {t('sidebar.sourceUSGS')}<br/>
              ⬡ {t('sidebar.sourceConflict')}<br/>
              ⛵ {t('sidebar.sourceTrade')}<br/>
              📡 {t('sidebar.sourceSigint')}
            </div>
          </div>
        </div>
      )}

      {/* VIEWS TAB */}
      {tab === 'views' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px 4px', fontSize: '9px', color: P.dim, letterSpacing: '0.2em' }}>
            {t('sidebar.savedViews')}
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
            {t('sidebar.watchlist')}
          </div>
          <div style={{ padding: '4px 10px 8px', display: 'flex', gap: '4px' }}>
            <input
              type="text"
              placeholder={t('sidebar.addKeyword')}
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
              {t('sidebar.noWatchlistItems')}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${P.border}`, padding: '6px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>{t('sidebar.layers')}</span>
        <span style={{ fontSize: '10px', color: P.accent, fontWeight: 600 }}>
          {layers.filter(l => l.visible).length}/{layers.length}
        </span>
      </div>
    </aside>
  )
})
