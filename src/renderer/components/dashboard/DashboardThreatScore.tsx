import { useMemo, useState, type CSSProperties } from 'react'
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

const DOMAIN_ORDER: IncidentDomain[] = ['CONFLICT', 'CYBER', 'INTEL', 'FINANCE']
const DOMAIN_COLOR: Record<IncidentDomain, string> = {
  CONFLICT: '#ff6b35',
  CYBER: '#00ff87',
  INTEL: '#4a9eff',
  FINANCE: '#f5c542',
}

const SEV_WEIGHT: Record<IncidentSeverity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
}

/** Common English country names → flag emoji */
const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸',
  USA: '🇺🇸',
  US: '🇺🇸',
  'United Kingdom': '🇬🇧',
  UK: '🇬🇧',
  England: '🇬🇧',
  Germany: '🇩🇪',
  France: '🇫🇷',
  Italy: '🇮🇹',
  Spain: '🇪🇸',
  Ukraine: '🇺🇦',
  Russia: '🇷🇺',
  China: '🇨🇳',
  Japan: '🇯🇵',
  'South Korea': '🇰🇷',
  Korea: '🇰🇷',
  India: '🇮🇳',
  Pakistan: '🇵🇰',
  Iran: '🇮🇷',
  Iraq: '🇮🇶',
  Israel: '🇮🇱',
  Palestine: '🇵🇸',
  Syria: '🇸🇾',
  Turkey: '🇹🇷',
  Poland: '🇵🇱',
  Netherlands: '🇳🇱',
  Belgium: '🇧🇪',
  Sweden: '🇸🇪',
  Norway: '🇳🇴',
  Finland: '🇫🇮',
  Canada: '🇨🇦',
  Mexico: '🇲🇽',
  Brazil: '🇧🇷',
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  'New Zealand': '🇳🇿',
  Egypt: '🇪🇬',
  Nigeria: '🇳🇬',
  'South Africa': '🇿🇦',
  Ethiopia: '🇪🇹',
  Kenya: '🇰🇪',
  Taiwan: '🇹🇼',
  Vietnam: '🇻🇳',
  Thailand: '🇹🇭',
  Indonesia: '🇮🇩',
  Philippines: '🇵🇭',
  'Saudi Arabia': '🇸🇦',
  UAE: '🇦🇪',
  'United Arab Emirates': '🇦🇪',
  Afghanistan: '🇦🇫',
  Yemen: '🇾🇪',
  Lebanon: '🇱🇧',
  Jordan: '🇯🇴',
  Unknown: '🌐',
}

function flagForCountry(name: string): string {
  if (COUNTRY_FLAGS[name]) return COUNTRY_FLAGS[name]
  const short = name.split(',')[0].trim()
  if (COUNTRY_FLAGS[short]) return COUNTRY_FLAGS[short]
  return '🌍'
}

function threatBarColor(score: number): string {
  if (score < 30) return '#00ff87'
  if (score < 60) return '#f5c542'
  if (score < 80) return '#ff9f43'
  return '#ff3b5c'
}

const MS_12H = 12 * 3600000

type CountryAgg = {
  country: string
  incidents: Incident[]
  byDomain: Record<IncidentDomain, number>
  count: number
  severitySum: number
  domains: Set<IncidentDomain>
  recencyScore: number
}

function aggregateByCountry(incidents: Incident[]): Map<string, CountryAgg> {
  const m = new Map<string, CountryAgg>()
  const now = Date.now()
  for (const inc of incidents) {
    const country = inc.country?.trim() || 'Unknown'
    let g = m.get(country)
    if (!g) {
      g = {
        country,
        incidents: [],
        byDomain: { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0 },
        count: 0,
        severitySum: 0,
        domains: new Set(),
        recencyScore: 0,
      }
      m.set(country, g)
    }
    g.incidents.push(inc)
    g.count++
    g.severitySum += SEV_WEIGHT[inc.severity]
    g.domains.add(inc.domain)
    g.byDomain[inc.domain]++
    const ageH = Math.max(0, (now - new Date(inc.timestamp).getTime()) / 3600000)
    g.recencyScore += Math.exp(-ageH / 72) * 100
  }
  for (const g of m.values()) {
    g.recencyScore = g.count ? g.recencyScore / g.count : 0
  }
  return m
}

function computeThreatScores(aggs: CountryAgg[]): { row: CountryAgg & { score: number }; maxCount: number; maxSev: number }[] {
  const maxCount = Math.max(1, ...aggs.map(a => a.count))
  const maxSev = Math.max(1, ...aggs.map(a => a.severitySum))
  return aggs.map(a => {
    const countNorm = (a.count / maxCount) * 100
    const sevNorm = (a.severitySum / maxSev) * 100
    const divNorm = (a.domains.size / 4) * 100
    const recNorm = Math.min(100, a.recencyScore)
    const score = Math.round(
      0.4 * countNorm + 0.3 * sevNorm + 0.15 * divNorm + 0.15 * recNorm,
    )
    return { row: { ...a, score }, maxCount, maxSev }
  })
}

function trendForCountry(incidents: Incident[], country: string): 'up' | 'down' | 'flat' {
  const now = Date.now()
  const curStart = now - MS_12H
  const prevStart = now - 2 * MS_12H
  let cur = 0
  let prev = 0
  for (const inc of incidents) {
    const co = inc.country?.trim() || 'Unknown'
    if (co !== country) continue
    const t = new Date(inc.timestamp).getTime()
    if (t >= curStart) cur++
    else if (t >= prevStart && t < curStart) prev++
  }
  if (cur > prev) return 'up'
  if (cur < prev) return 'down'
  return 'flat'
}

export function DashboardThreatScore({ incidents, onLocateIncident }: { incidents: Incident[]; onLocateIncident?: (i: Incident) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { summary, top15 } = useMemo(() => {
    const map = aggregateByCountry(incidents)
    const aggs = [...map.values()]
    const scored = computeThreatScores(aggs)
    scored.sort((a, b) => b.row.score - a.row.score)
    const slice = scored.slice(0, 15).map(s => s.row)
    const scores = slice.map(s => s.score)
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const highest = slice[0]
    return {
      summary: {
        countriesAffected: map.size,
        avgScore: avg,
        highest: highest ? { name: highest.country, score: highest.score } : null,
      },
      top15: slice,
    }
  }, [incidents])

  const card: CSSProperties = {
    background: P.card,
    border: `1px solid ${P.border}`,
    borderRadius: '8px',
    padding: '12px 14px',
  }

  return (
    <section
      style={{
        padding: '20px 24px',
        borderTop: `1px solid ${P.border}`,
        background: P.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{ width: '3px', height: '16px', background: P.accent, borderRadius: '2px' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: P.text, letterSpacing: '0.15em' }}>
          COUNTRY THREAT SCORE
        </span>
        <InfoTip text="Composite threat score per country weighted by: incident count, severity (Critical=5, High=3, Medium=2, Low=1), domain diversity bonus, and recency decay. Higher scores indicate more active and severe threat environments." />
        <span style={{ fontSize: '9px', color: P.dim }}>weighted: count · severity · domains · recency</span>
      </div>

      <div
        style={{
          ...card,
          marginBottom: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.15em', marginBottom: '4px' }}>
            COUNTRIES AFFECTED
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: P.accent }}>{summary.countriesAffected}</div>
        </div>
        <div>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.15em', marginBottom: '4px' }}>
            AVG THREAT (TOP 15)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f5c542' }}>{summary.avgScore}</div>
        </div>
        <div>
          <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.15em', marginBottom: '4px' }}>
            PEAK RISK
          </div>
          {summary.highest ? (
            <div style={{ fontSize: '11px', fontWeight: 600, color: P.text, fontFamily: P.font }}>
              <span style={{ marginRight: '6px' }}>{flagForCountry(summary.highest.name)}</span>
              {summary.highest.name}
              <span style={{ color: threatBarColor(summary.highest.score), marginLeft: '8px' }}>
                {summary.highest.score}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: P.dim }}>—</div>
          )}
        </div>
      </div>

      <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.15em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        TOP 15 BY THREAT SCORE <InfoTip text="Countries ranked by threat score. Click any row to expand and see domain breakdown, severity distribution, and trend indicators (↑ rising, ↓ declining)." size={11} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {top15.map((row, idx) => {
          const trend = trendForCountry(incidents, row.country)
          const totalD = DOMAIN_ORDER.reduce((s, d) => s + row.byDomain[d], 0) || 1
          const open = expanded === row.country

          return (
            <div key={row.country}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : row.country)}
                style={{
                  ...card,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: open ? `1px solid ${P.accent}` : `1px solid ${P.border}`,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px minmax(0,1fr) 32px 44px minmax(56px,1fr)',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: P.dim, fontFamily: P.font }}>{String(idx + 1).padStart(2, '0')}</span>
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>{flagForCountry(row.country)}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: P.text,
                        fontFamily: P.font,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.country}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', textAlign: 'center' }} aria-hidden title="12h vs prior 12h">
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: P.bg,
                      background: P.border,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      textAlign: 'center',
                      fontFamily: P.font,
                    }}
                    title="Incidents (all time in feed)"
                  >
                    {row.count}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      height: '8px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                    }}
                    title="Domain mix"
                  >
                    {DOMAIN_ORDER.map(d => {
                      const segW = (row.byDomain[d] / totalD) * 100
                      if (segW <= 0) return null
                      return (
                        <div
                          key={d}
                          style={{
                            width: `${segW}%`,
                            background: DOMAIN_COLOR[d],
                            minWidth: segW > 0 ? '2px' : 0,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${row.score}%`,
                        height: '100%',
                        background: threatBarColor(row.score),
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '8px', color: P.dim, fontFamily: P.font }}>threat score</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: threatBarColor(row.score), fontFamily: P.font }}>
                      {row.score}
                    </span>
                  </div>
                </div>
              </button>

              {open && (
                <div
                  style={{
                    ...card,
                    marginTop: '6px',
                    marginLeft: '8px',
                    borderLeft: `3px solid ${P.accent}`,
                  }}
                >
                  <div style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.12em', marginBottom: '8px' }}>
                    LAST 5 INCIDENTS
                  </div>
                  {[...row.incidents]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 5)
                    .map(inc => {
                      const clickable = !!onLocateIncident && inc.latitude != null && inc.longitude != null
                      return (
                        <div
                          key={inc.id}
                          onClick={clickable ? () => onLocateIncident(inc) : undefined}
                          style={{
                            padding: '6px 0',
                            borderTop: `1px solid ${P.border}`,
                            fontSize: '9px',
                            fontFamily: P.font,
                            color: P.text,
                            cursor: clickable ? 'pointer' : 'default',
                          }}
                          onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
                          onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' } : undefined}
                        >
                          <div style={{ color: DOMAIN_COLOR[inc.domain], marginBottom: '2px' }}>{inc.domain}</div>
                          <div style={{ color: P.text }}>{inc.title}{clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '8px' }}>◎</span>}</div>
                          <div style={{ color: P.dim, marginTop: '2px' }}>
                            {new Date(inc.timestamp).toISOString().replace('T', ' ').slice(0, 19)} · {inc.severity}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '8px', color: P.dim, marginTop: '12px', fontFamily: P.font }}>
        Trend: last 12h vs previous 12h incident count (↑ more · ↓ fewer · → same)
      </div>
    </section>
  )
}
