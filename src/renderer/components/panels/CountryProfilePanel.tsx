import { useMemo, useEffect, useRef } from 'react'
import { useDraggable } from '@/hooks/useDraggable'
import type { Incident, CountryProfile, IncidentDomain } from '../../../shared/types'

const P = {
  bg: 'rgba(10,14,23,0.96)',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff3b5c',
  HIGH: '#ff6b35',
  MEDIUM: '#f5c542',
  LOW: '#3fb950',
  STABLE: '#00d4ff',
}

const DOMAIN_COLORS: Record<IncidentDomain, string> = {
  CONFLICT: '#ff6b35',
  CYBER: '#00ff87',
  INTEL: '#4a9eff',
  FINANCE: '#f5c542',
}

/** Static reference figures for analyst context (not live market data). */
const ECONOMIC_BY_CODE: Record<string, { gdp?: string; currency: string; index: string }> = {
  US: { gdp: '~$28.8T nominal', currency: 'USD — US Dollar', index: 'S&P 500' },
  CN: { gdp: '~$18.5T nominal', currency: 'CNY — Renminbi', index: 'CSI 300' },
  RU: { gdp: '~$2.0T nominal', currency: 'RUB — Ruble', index: 'MOEX' },
  TR: { gdp: '~$1.1T nominal', currency: 'TRY — Lira', index: 'BIST 100' },
  DE: { gdp: '~$4.5T nominal', currency: 'EUR — Euro', index: 'DAX' },
  GB: { gdp: '~$3.3T nominal', currency: 'GBP — Pound', index: 'FTSE 100' },
  UK: { gdp: '~$3.3T nominal', currency: 'GBP — Pound', index: 'FTSE 100' },
  FR: { gdp: '~$3.0T nominal', currency: 'EUR — Euro', index: 'CAC 40' },
  JP: { gdp: '~$4.2T nominal', currency: 'JPY — Yen', index: 'Nikkei 225' },
  IN: { gdp: '~$3.9T nominal', currency: 'INR — Rupee', index: 'Nifty 50' },
  BR: { gdp: '~$2.2T nominal', currency: 'BRL — Real', index: 'Bovespa' },
  SA: { gdp: '~$1.1T nominal', currency: 'SAR — Riyal', index: 'Tadawul' },
  AE: { gdp: '~$0.5T nominal', currency: 'AED — Dirham', index: 'DFMGI' },
  IL: { gdp: '~$0.5T nominal', currency: 'ILS — Shekel', index: 'TA-35' },
  IR: { currency: 'IRR — Rial', index: 'TEDPIX' },
  UA: { gdp: '~$0.2T nominal', currency: 'UAH — Hryvnia', index: 'UX' },
  KR: { gdp: '~$1.7T nominal', currency: 'KRW — Won', index: 'KOSPI' },
}

interface CountryProfilePanelProps {
  country: CountryProfile
  incidents: Incident[]
  onClose: () => void
  onFlyTo: () => void
  onLocateIncident?: (incident: Incident) => void
}

export function CountryProfilePanel({ country, incidents, onClose, onFlyTo, onLocateIncident }: CountryProfilePanelProps) {
  const { pos, isDragging, onMouseDown, elRef, initialized } = useDraggable()
  const countryIncidents = useMemo(() =>
    incidents.filter(i =>
      i.country?.toLowerCase() === country.name.toLowerCase() ||
      i.country?.toLowerCase() === country.code.toLowerCase()
    ),
    [incidents, country]
  )

  const domainBreakdown = useMemo(() => {
    const counts: Record<IncidentDomain, number> = { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0 }
    for (const i of countryIncidents) counts[i.domain]++
    return counts
  }, [countryIncidents])

  const severityBreakdown = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 }
    for (const i of countryIncidents) counts[i.severity]++
    return counts
  }, [countryIncidents])

  const recentIncidents = useMemo(() =>
    [...countryIncidents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8),
    [countryIncidents]
  )

  const threatMetrics = useMemo(() => {
    const weights: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
      INFO: 0,
    }
    const now = Date.now()
    const h12 = 12 * 60 * 60 * 1000
    let last12 = 0
    let prev12 = 0
    let weighted = 0
    for (const i of countryIncidents) {
      weighted += weights[i.severity] ?? 0
      const t = new Date(i.timestamp).getTime()
      if (t >= now - h12) last12 += 1
      else if (t >= now - 2 * h12) prev12 += 1
    }
    const n = countryIncidents.length
    const threatScore =
      n === 0
        ? 0
        : Math.min(
            100,
            Math.round((weighted / (n * 4)) * 58 + Math.min(n, 30) * 1.4)
          )
    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (last12 > prev12) trend = 'up'
    else if (last12 < prev12) trend = 'down'
    return { threatScore, last12, prev12, trend }
  }, [countryIncidents])

  const totalDomain = Object.values(domainBreakdown).reduce((a, b) => a + b, 0)

  const gaugeColor =
    threatMetrics.threatScore < 30
      ? '#3fb950'
      : threatMetrics.threatScore < 60
        ? '#f5c542'
        : threatMetrics.threatScore < 80
          ? '#ff6b35'
          : '#ff3b5c'

  const economic = ECONOMIC_BY_CODE[country.code.toUpperCase()]

  return (
    <div ref={elRef} onMouseDown={onMouseDown} style={{
      position: 'absolute',
      ...(initialized
        ? { left: `${pos.x}px`, top: `${pos.y}px` }
        : { top: '40px', right: '170px' }
      ),
      zIndex: 210,
      width: '340px', maxHeight: 'calc(100vh - 100px)',
      background: P.bg, border: `1px solid ${P.border}`,
      borderRadius: '8px', fontFamily: P.font,
      backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      userSelect: isDragging ? 'none' : 'auto',
    }}>
      {/* Header - drag handle */}
      <div data-drag-handle style={{
        padding: '12px 14px', borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', gap: '10px',
        cursor: 'grab',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>{getFlagEmoji(country.code)}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: P.text, letterSpacing: '0.05em' }}>
              {country.name.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>
            {country.capital} · {country.continent}
          </div>
        </div>
        <span style={{
          fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
          padding: '3px 8px', borderRadius: '3px',
          background: RISK_COLORS[country.riskLevel] + '20',
          color: RISK_COLORS[country.riskLevel],
          border: `1px solid ${RISK_COLORS[country.riskLevel]}40`,
        }}>{country.riskLevel}</span>
        <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} style={{
          background: 'transparent', border: 'none', color: P.dim,
          cursor: 'pointer', fontSize: '14px', fontFamily: P.font, padding: '0 2px',
        }}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>

        {/* Quick Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px',
          marginBottom: '12px',
        }}>
          <StatBox label="POPULATION" value={formatPop(country.population)} />
          <StatBox label="AREA" value={`${(country.area / 1000).toFixed(0)}K km²`} />
          <StatBox label="INCIDENTS" value={String(countryIncidents.length)} color={countryIncidents.length > 10 ? '#ff6b35' : P.accent} />
        </div>

        {/* Flags / Tags */}
        {country.flags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            {country.flags.map(flag => (
              <span key={flag} style={{
                fontSize: '8px', padding: '2px 6px', borderRadius: '3px',
                background: '#1a2235', color: P.dim, border: `1px solid ${P.border}`,
                letterSpacing: '0.05em',
              }}>{flag}</span>
            ))}
          </div>
        )}

        {/* Domain Breakdown */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.2em', marginBottom: '6px' }}>
            DOMAIN BREAKDOWN
          </div>
          {totalDomain > 0 ? (
            <>
              <div style={{
                display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden',
                background: '#0d1220', marginBottom: '6px',
              }}>
                {(Object.entries(domainBreakdown) as [IncidentDomain, number][])
                  .filter(([, c]) => c > 0)
                  .map(([domain, count]) => (
                    <div key={domain} style={{
                      width: `${(count / totalDomain) * 100}%`,
                      background: DOMAIN_COLORS[domain],
                      transition: 'width 0.3s',
                    }} />
                  ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(Object.entries(domainBreakdown) as [IncidentDomain, number][])
                  .filter(([, c]) => c > 0)
                  .map(([domain, count]) => (
                    <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '1px', background: DOMAIN_COLORS[domain] }} />
                      <span style={{ fontSize: '9px', color: P.dim }}>{domain}</span>
                      <span style={{ fontSize: '9px', color: P.text, fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '9px', color: P.dim }}>No incidents recorded</div>
          )}
        </div>

        {/* Severity */}
        {totalDomain > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.2em', marginBottom: '6px' }}>
              SEVERITY
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {([['CRITICAL', '#ff3b5c'], ['HIGH', '#ff6b35'], ['MEDIUM', '#f5c542'], ['LOW', '#3fb950']] as const).map(([sev, col]) => (
                <div key={sev} style={{
                  flex: 1, textAlign: 'center', padding: '4px 0',
                  background: severityBreakdown[sev] > 0 ? col + '15' : '#0d1220',
                  border: `1px solid ${severityBreakdown[sev] > 0 ? col + '40' : P.border}`,
                  borderRadius: '3px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: severityBreakdown[sev] > 0 ? col : P.dim }}>
                    {severityBreakdown[sev]}
                  </div>
                  <div style={{ fontSize: '7px', color: P.dim }}>{sev}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Incidents */}
        {recentIncidents.length > 0 && (
          <div>
            <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.2em', marginBottom: '6px' }}>
              RECENT INCIDENTS
            </div>
            {recentIncidents.map(inc => {
              const clickable = !!onLocateIncident && inc.latitude != null && inc.longitude != null
              return (
                <div key={inc.id}
                  onClick={clickable ? () => onLocateIncident(inc) : undefined}
                  style={{
                    padding: '6px 8px', marginBottom: '3px',
                    background: '#0d1220', borderRadius: '4px',
                    borderLeft: `2px solid ${DOMAIN_COLORS[inc.domain]}`,
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.08)' } : undefined}
                  onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = '#0d1220' } : undefined}
                >
                  <div style={{
                    fontSize: '9px', color: P.text, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{inc.title}{clickable && <span style={{ color: '#00d4ff', marginLeft: 6 }}>◎</span>}</div>
                  <div style={{ fontSize: '8px', color: P.dim, marginTop: '2px' }}>
                    {inc.domain} · {inc.severity} · {timeAgo(inc.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Threat Assessment */}
        <div style={{ marginTop: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.2em', marginBottom: '6px' }}>
            THREAT ASSESSMENT
          </div>
          <div style={{
            padding: '10px 12px', background: P.card, borderRadius: '4px',
            border: `1px solid ${P.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: gaugeColor, fontFamily: P.font }}>
                {threatMetrics.threatScore}
              </span>
              <span style={{ fontSize: '9px', color: P.dim }}>/ 100</span>
            </div>
            <div style={{
              height: '6px', borderRadius: '3px', background: '#0a0e17',
              border: `1px solid ${P.border}`, overflow: 'hidden', marginBottom: '8px',
            }}>
              <div style={{
                height: '100%', width: `${threatMetrics.threatScore}%`,
                background: gaugeColor, borderRadius: '2px', transition: 'width 0.35s ease',
              }} />
            </div>
            <div style={{ fontSize: '9px', color: P.dim, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>12h trend:</span>
              <span style={{ color: P.text, fontWeight: 600 }}>
                {threatMetrics.last12} vs {threatMetrics.prev12} prior
              </span>
              <span style={{
                color: threatMetrics.trend === 'up' ? '#ff6b35' : threatMetrics.trend === 'down' ? '#3fb950' : P.dim,
                fontWeight: 700,
              }}>
                {threatMetrics.trend === 'up' ? '▲ RISING' : threatMetrics.trend === 'down' ? '▼ FALLING' : '■ STABLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.2em', marginBottom: '6px' }}>
            ACTIVITY TIMELINE (24H)
          </div>
          <div style={{
            padding: '8px 10px', background: P.card, borderRadius: '4px',
            border: `1px solid ${P.border}`,
          }}>
            <CountryActivitySparkline incidents={countryIncidents} accent={P.accent} dim={P.dim} border={P.border} />
          </div>
        </div>

        {/* Economic Indicators */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.2em', marginBottom: '6px' }}>
            ECONOMIC INDICATORS
          </div>
          {economic ? (
            <div style={{
              padding: '10px 12px', background: P.card, borderRadius: '4px',
              border: `1px solid ${P.border}`, fontSize: '9px', color: P.text,
            }}>
              {economic.gdp && (
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: P.dim }}>GDP · </span>
                  <span style={{ fontWeight: 600 }}>{economic.gdp}</span>
                </div>
              )}
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: P.dim }}>Currency · </span>
                <span style={{ fontWeight: 600 }}>{economic.currency}</span>
              </div>
              <div>
                <span style={{ color: P.dim }}>Major index · </span>
                <span style={{ fontWeight: 600 }}>{economic.index}</span>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: '9px', color: P.dim, padding: '8px 10px', background: P.card,
              borderRadius: '4px', border: `1px solid ${P.border}`,
            }}>
              No static economic profile for this country.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px', borderTop: `1px solid ${P.border}`,
        display: 'flex', gap: '6px',
      }}>
        <button onClick={onFlyTo} style={{
          flex: 1, padding: '6px', background: P.accent + '15',
          border: `1px solid ${P.accent}40`, borderRadius: '4px',
          color: P.accent, fontSize: '9px', fontWeight: 600,
          cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.1em',
        }}>LOCATE</button>
      </div>
    </div>
  )
}

function CountryActivitySparkline({
  incidents,
  accent,
  dim,
  border,
}: {
  incidents: Incident[]
  accent: string
  dim: string
  border: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = 200
    const h = 40
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const buckets = new Array(24).fill(0)
    const now = Date.now()
    const windowMs = 24 * 60 * 60 * 1000
    const start = now - windowMs
    for (const inc of incidents) {
      const t = new Date(inc.timestamp).getTime()
      if (t < start || t > now) continue
      const idx = Math.min(23, Math.max(0, Math.floor(((t - start) / windowMs) * 24)))
      buckets[idx] += 1
    }

    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

    const max = Math.max(1, ...buckets)
    const pad = 4
    const innerW = w - pad * 2
    const innerH = h - pad * 2
    ctx.beginPath()
    for (let i = 0; i < 24; i++) {
      const x = pad + (i / 23) * innerW
      const y = pad + innerH * (1 - buckets[i] / max)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = dim
    ctx.font = "8px 'JetBrains Mono', 'Fira Code', monospace"
    ctx.fillText('24h', w - 26, h - 5)
  }, [incidents, accent, border])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: '6px 8px', background: '#0d1220',
      borderRadius: '4px', border: `1px solid ${P.border}`, textAlign: 'center',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: color || P.text }}>{value}</div>
      <div style={{ fontSize: '7px', color: P.dim, letterSpacing: '0.1em', marginTop: '1px' }}>{label}</div>
    </div>
  )
}

function getFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function formatPop(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
