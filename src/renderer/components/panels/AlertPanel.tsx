import { useState, useCallback } from 'react'
import { useAlertStore } from '@/stores/alert-store'
import { useNotificationStore, type AppNotification } from '@/stores/notification-store'
import type { Incident, IncidentDomain, IncidentSeverity } from '../../../shared/types'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#ffb000', LOW: '#4a9eff', INFO: '#4a5568',
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  incident: { icon: '⚑', color: '#ff6b35', label: 'INCIDENT' },
  tweet: { icon: '𝕏', color: '#4a9eff', label: 'TWEET' },
  earthquake: { icon: '◎', color: '#ff8800', label: 'EARTHQUAKE' },
  disaster: { icon: '⚠', color: '#ff60a0', label: 'DISASTER' },
}

const DOMAIN_OPTIONS: IncidentDomain[] = ['CONFLICT', 'CYBER', 'INTEL', 'FINANCE']
const SEVERITY_OPTIONS: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

interface AlertPanelProps {
  isOpen: boolean
  onToggle: () => void
  onSelectIncident?: (incident: Incident) => void
  onNavigate?: (notif: AppNotification) => void
}

export function AlertPanel({ isOpen, onToggle, onSelectIncident, onNavigate }: AlertPanelProps) {
  const [tab, setTab] = useState<'log' | 'rules' | 'matches'>('log')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [ruleName, setRuleName] = useState('')
  const [selDomains, setSelDomains] = useState<IncidentDomain[]>([])
  const [selSeverities, setSelSeverities] = useState<IncidentSeverity[]>([])
  const [keywordsText, setKeywordsText] = useState('')
  const [sound, setSound] = useState(true)
  const [desktop, setDesktop] = useState(true)
  const [regionText, setRegionText] = useState('')

  const notifications = useNotificationStore(s => s.notifications)
  const markRead = useNotificationStore(s => s.markRead)
  const markAllRead = useNotificationStore(s => s.markAllRead)
  const dismissAll = useNotificationStore(s => s.dismissAll)

  const rules = useAlertStore(s => s.rules)
  const addRule = useAlertStore(s => s.addRule)
  const removeRule = useAlertStore(s => s.removeRule)
  const toggleRule = useAlertStore(s => s.toggleRule)
  const alertNotifications = useAlertStore(s => s.notifications)
  const alertUnread = useAlertStore(s => s.unreadCount)
  const markAlertRead = useAlertStore(s => s.markRead)
  const markAllAlertRead = useAlertStore(s => s.markAllRead)
  const clearAlertNotifs = useAlertStore(s => s.clearNotifications)

  const filteredNotifs = typeFilter
    ? notifications.filter(n => n.type === typeFilter)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  const toggleDomain = (d: IncidentDomain) =>
    setSelDomains(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]))
  const toggleSeverity = (s: IncidentSeverity) =>
    setSelSeverities(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]))

  const handleSaveRule = () => {
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(Boolean)
    addRule({
      name: ruleName.trim() || 'Untitled rule',
      conditions: {
        ...(selDomains.length ? { domains: selDomains } : {}),
        ...(selSeverities.length ? { severities: selSeverities } : {}),
        ...(keywords.length ? { keywords } : {}),
        ...(regionText.trim() ? { region: regionText.trim() } : {}),
      },
      enabled: true, sound, desktop,
    })
    setRuleName(''); setSelDomains([]); setSelSeverities([]); setKeywordsText('')
    setRegionText(''); setSound(true); setDesktop(true); setFormOpen(false)
  }

  const handleNotifClick = useCallback((n: AppNotification) => {
    markRead(n.id)
    onNavigate?.(n)
    onToggle()
  }, [markRead, onNavigate, onToggle])

  if (!isOpen) return null

  const typeCounts = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{
      position: 'absolute', right: '16px', top: '48px', zIndex: 220,
      width: '400px', maxHeight: 'min(620px, 80vh)',
      background: `linear-gradient(180deg, ${P.card}ee 0%, ${P.bg} 100%)`,
      border: `1px solid ${P.border}`, borderRadius: '8px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(12px)', fontFamily: P.font,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', borderBottom: `1px solid ${P.border}`,
      }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: P.text, letterSpacing: '0.1em' }}>ALERTS</span>
          {unreadCount > 0 && (
            <span style={{
              background: '#ff3b5c', color: '#fff', fontSize: '8px', fontWeight: 700,
              padding: '1px 5px', borderRadius: '8px', marginLeft: '4px',
            }}>{unreadCount}</span>
          )}
          <div style={{ width: '1px', height: '12px', background: P.border, margin: '0 6px' }} />
          {(['log', 'matches', 'rules'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              background: tab === t ? `${P.accent}22` : 'transparent',
              border: `1px solid ${tab === t ? P.accent : 'transparent'}`,
              color: tab === t ? P.accent : P.dim,
              cursor: 'pointer', fontSize: '8px', fontFamily: P.font,
              letterSpacing: '0.12em', padding: '3px 8px', borderRadius: '3px',
            }}>{t === 'log' ? 'LOG' : t === 'matches' ? `MATCHES${alertUnread > 0 ? ` (${alertUnread})` : ''}` : 'RULES'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {tab === 'log' && (
            <>
              <button type="button" onClick={markAllRead} style={{
                background: 'transparent', border: 'none', color: P.accent,
                cursor: 'pointer', fontSize: '8px', fontFamily: P.font,
              }}>READ ALL</button>
              <button type="button" onClick={dismissAll} style={{
                background: 'transparent', border: 'none', color: P.dim,
                cursor: 'pointer', fontSize: '8px', fontFamily: P.font,
              }}>CLEAR</button>
            </>
          )}
          <button type="button" onClick={onToggle} style={{
            background: 'transparent', border: 'none', color: P.dim,
            cursor: 'pointer', fontSize: '12px', fontFamily: P.font, padding: '0 2px',
          }}>✕</button>
        </div>
      </div>

      {tab === 'log' && (
        <>
          {/* Type filter bar */}
          <div style={{
            display: 'flex', gap: '3px', padding: '6px 10px',
            borderBottom: `1px solid ${P.border}`, flexWrap: 'wrap',
          }}>
            <button onClick={() => setTypeFilter(null)} style={{
              padding: '2px 8px', fontSize: '8px', fontFamily: P.font,
              background: !typeFilter ? `${P.accent}20` : 'transparent',
              border: `1px solid ${!typeFilter ? P.accent + '60' : P.border}`,
              borderRadius: '3px', cursor: 'pointer',
              color: !typeFilter ? P.accent : P.dim,
            }}>ALL ({notifications.length})</button>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <button key={type} onClick={() => setTypeFilter(typeFilter === type ? null : type)} style={{
                padding: '2px 8px', fontSize: '8px', fontFamily: P.font,
                background: typeFilter === type ? `${cfg.color}20` : 'transparent',
                border: `1px solid ${typeFilter === type ? cfg.color + '60' : P.border}`,
                borderRadius: '3px', cursor: 'pointer',
                color: typeFilter === type ? cfg.color : P.dim,
              }}>{cfg.icon} {typeCounts[type] || 0}</button>
            ))}
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {filteredNotifs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '9px', color: P.dim }}>
                No alerts yet. New incidents, tweets, earthquakes, and disasters will appear here.
              </div>
            ) : filteredNotifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] || { icon: '◆', color: P.accent, label: 'EVENT' }
              const sevColor = n.severity ? SEV_COLORS[n.severity] : cfg.color
              const age = Date.now() - n.timestamp
              const ageStr = age < 60000 ? 'just now'
                : age < 3600000 ? `${Math.floor(age / 60000)}m ago`
                : age < 86400000 ? `${Math.floor(age / 3600000)}h ago`
                : `${Math.floor(age / 86400000)}d ago`

              return (
                <button key={n.id} type="button" onClick={() => handleNotifClick(n)} style={{
                  width: '100%', display: 'flex', gap: '10px', padding: '10px 12px',
                  background: n.read ? 'transparent' : `${cfg.color}05`,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: `1px solid ${P.border}20`,
                  borderLeft: `3px solid ${sevColor}`,
                  fontFamily: P.font, transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${cfg.color}0a`}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : `${cfg.color}05`}
                >
                  <div style={{
                    fontSize: '14px', lineHeight: 1, flexShrink: 0, marginTop: '2px',
                    color: cfg.color,
                  }}>{cfg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '7px', fontWeight: 700, color: cfg.color,
                        letterSpacing: '0.12em', padding: '1px 4px',
                        background: `${cfg.color}12`, borderRadius: '2px',
                      }}>{cfg.label}</span>
                      {n.severity && (
                        <span style={{
                          fontSize: '7px', fontWeight: 700, color: sevColor,
                          letterSpacing: '0.1em',
                        }}>{n.severity}</span>
                      )}
                      {n.magnitude && (
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#ff8800' }}>
                          M{n.magnitude.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '10px', color: n.read ? P.dim : P.text, fontWeight: n.read ? 400 : 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      lineHeight: '1.3',
                    }}>{n.title}</div>
                    <div style={{ fontSize: '8px', color: P.dim, marginTop: '3px' }}>
                      {n.subtitle && <span>{n.subtitle} · </span>}
                      {ageStr}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: cfg.color, marginTop: '6px', flexShrink: 0,
                      boxShadow: `0 0 6px ${cfg.color}80`,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'matches' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', borderBottom: `1px solid ${P.border}`, gap: '6px' }}>
            <button type="button" onClick={markAllAlertRead} style={{ background: 'transparent', border: 'none', color: P.accent, cursor: 'pointer', fontSize: '8px', fontFamily: P.font }}>READ ALL</button>
            <button type="button" onClick={clearAlertNotifs} style={{ background: 'transparent', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '8px', fontFamily: P.font }}>CLEAR</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {alertNotifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '9px', color: P.dim }}>
                No rule matches yet. Incoming incidents that match your alert rules will appear here.
              </div>
            ) : alertNotifications.map(an => {
              const sevColor = SEV_COLORS[an.incident.severity] || P.accent
              const age = Date.now() - new Date(an.timestamp).getTime()
              const ageStr = age < 60000 ? 'just now' : age < 3600000 ? `${Math.floor(age / 60000)}m ago` : age < 86400000 ? `${Math.floor(age / 3600000)}h ago` : `${Math.floor(age / 86400000)}d ago`
              return (
                <button key={an.id} type="button" onClick={() => { markAlertRead(an.id); onSelectIncident?.(an.incident); onToggle() }} style={{
                  width: '100%', display: 'flex', gap: '10px', padding: '10px 12px',
                  background: an.read ? 'transparent' : `${sevColor}08`,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: `1px solid ${P.border}20`, borderLeft: `3px solid ${sevColor}`,
                  fontFamily: P.font, transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${sevColor}0a`}
                onMouseLeave={e => e.currentTarget.style.background = an.read ? 'transparent' : `${sevColor}08`}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '7px', fontWeight: 700, color: P.accent, letterSpacing: '0.12em', padding: '1px 4px', background: `${P.accent}12`, borderRadius: '2px' }}>RULE</span>
                      <span style={{ fontSize: '8px', color: P.dim }}>{an.ruleName}</span>
                      <span style={{ fontSize: '7px', fontWeight: 700, color: sevColor, letterSpacing: '0.1em' }}>{an.incident.severity}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: an.read ? P.dim : P.text, fontWeight: an.read ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {an.incident.title}
                    </div>
                    <div style={{ fontSize: '8px', color: P.dim, marginTop: '3px' }}>{an.incident.domain} · {ageStr}</div>
                  </div>
                  {!an.read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sevColor, marginTop: '6px', flexShrink: 0, boxShadow: `0 0 6px ${sevColor}80` }} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'rules' && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" onClick={() => setFormOpen(o => !o)} style={{
            alignSelf: 'flex-start',
            background: `${P.accent}18`, border: `1px solid ${P.accent}55`,
            color: P.accent, cursor: 'pointer', fontSize: '9px', fontFamily: P.font,
            letterSpacing: '0.12em', padding: '6px 12px', borderRadius: '4px',
          }}>{formOpen ? 'CANCEL' : 'CREATE RULE'}</button>

          {formOpen && (
            <div style={{
              background: P.bg, border: `1px solid ${P.border}`,
              borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <label style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em' }}>RULE NAME</label>
              <input value={ruleName} onChange={e => setRuleName(e.target.value)} style={{
                background: P.card, border: `1px solid ${P.border}`,
                color: P.text, fontFamily: P.font, fontSize: '10px', padding: '6px 8px', borderRadius: '4px',
              }} />
              <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em' }}>DOMAINS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DOMAIN_OPTIONS.map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: P.text, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selDomains.includes(d)} onChange={() => toggleDomain(d)} /> {d}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em' }}>SEVERITIES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SEVERITY_OPTIONS.map(sv => (
                  <label key={sv} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: P.text, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selSeverities.includes(sv)} onChange={() => toggleSeverity(sv)} /> {sv}
                  </label>
                ))}
              </div>
              <label style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em' }}>KEYWORDS (COMMA-SEPARATED)</label>
              <input value={keywordsText} onChange={e => setKeywordsText(e.target.value)} placeholder="e.g. missile, breach" style={{
                background: P.card, border: `1px solid ${P.border}`,
                color: P.text, fontFamily: P.font, fontSize: '10px', padding: '6px 8px', borderRadius: '4px',
              }} />
              <label style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em' }}>REGION (COUNTRY NAME)</label>
              <input value={regionText} onChange={e => setRegionText(e.target.value)} placeholder="e.g. Ukraine, Iran" style={{
                background: P.card, border: `1px solid ${P.border}`,
                color: P.text, fontFamily: P.font, fontSize: '10px', padding: '6px 8px', borderRadius: '4px',
              }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: P.text, cursor: 'pointer' }}>
                <input type="checkbox" checked={sound} onChange={() => setSound(v => !v)} /> Sound
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: P.text, cursor: 'pointer' }}>
                <input type="checkbox" checked={desktop} onChange={() => setDesktop(v => !v)} /> Desktop notification
              </label>
              <button type="button" onClick={handleSaveRule} style={{
                marginTop: '4px', background: P.accent, border: 'none', color: P.bg,
                cursor: 'pointer', fontSize: '9px', fontFamily: P.font, fontWeight: 700,
                letterSpacing: '0.1em', padding: '8px', borderRadius: '4px',
              }}>SAVE</button>
            </div>
          )}

          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.15em' }}>ACTIVE RULES</div>
          {rules.map(rule => (
            <div key={rule.id} style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: '6px', padding: '8px 10px',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: rule.enabled ? P.text : P.dim, fontWeight: 600 }}>{rule.name}</span>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button type="button" onClick={() => toggleRule(rule.id)} style={{
                    background: 'transparent', border: `1px solid ${P.border}`,
                    color: P.accent, cursor: 'pointer', fontSize: '8px', fontFamily: P.font,
                    padding: '2px 6px', borderRadius: '3px',
                  }}>{rule.enabled ? 'DISABLE' : 'ENABLE'}</button>
                  <button type="button" onClick={() => removeRule(rule.id)} style={{
                    background: 'transparent', border: `1px solid ${P.border}`,
                    color: '#ff3b5c', cursor: 'pointer', fontSize: '8px', fontFamily: P.font,
                    padding: '2px 6px', borderRadius: '3px',
                  }}>DEL</button>
                </div>
              </div>
              <div style={{ fontSize: '8px', color: P.dim }}>
                triggers: {rule.triggerCount}
                {rule.lastTriggered && ` · last ${new Date(rule.lastTriggered).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
