import { useMemo, useRef, useEffect, useState, type CSSProperties, type RefObject } from 'react'
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

const SEV_ORDER: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const SEV_COLOR: Record<IncidentSeverity, string> = {
  CRITICAL: '#ff3b5c',
  HIGH: '#ff6b35',
  MEDIUM: '#f5c542',
  LOW: '#00d4ff',
  INFO: '#4a5568',
}

type PeriodKey = '6h' | '12h' | '24h' | '7d'

const PERIOD_MS: Record<PeriodKey, number> = {
  '6h': 6 * 3600000,
  '12h': 12 * 3600000,
  '24h': 24 * 3600000,
  '7d': 7 * 86400000,
}

function useCanvasSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 400, h: 220 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(200, Math.floor(r.width)), h: Math.max(160, Math.floor(r.height)) })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ w: Math.max(200, Math.floor(r.width)), h: Math.max(160, Math.floor(r.height)) })
    return () => ro.disconnect()
  }, [ref])
  return size
}

function pctChange(prev: number, cur: number): number {
  if (prev === 0 && cur === 0) return 0
  if (prev === 0) return 100
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

function filterWindow(incidents: Incident[], start: number, end: number): Incident[] {
  return incidents.filter(i => {
    const t = new Date(i.timestamp).getTime()
    return t >= start && t < end
  })
}

type SliceStats = {
  total: number
  byDomain: Record<IncidentDomain, number>
  bySev: Record<IncidentSeverity, number>
  topCountries: { name: string; n: number }[]
  tags: Set<string>
}

function buildStats(list: Incident[]): SliceStats {
  const byDomain: Record<IncidentDomain, number> = {
    CONFLICT: 0,
    CYBER: 0,
    INTEL: 0,
    FINANCE: 0,
  }
  const bySev = {} as Record<IncidentSeverity, number>
  for (const s of SEV_ORDER) bySev[s] = 0
  const countryMap = new Map<string, number>()
  const tags = new Set<string>()
  for (const i of list) {
    byDomain[i.domain]++
    bySev[i.severity]++
    const c = i.country?.trim() || 'Unknown'
    countryMap.set(c, (countryMap.get(c) || 0) + 1)
    for (const t of i.tags) {
      const norm = t.trim()
      if (norm) tags.add(norm.toLowerCase())
    }
  }
  const topCountries = [...countryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, n }))
  return { total: list.length, byDomain, bySev, topCountries, tags }
}

function SpikeLabel({ v }: { v: number }) {
  if (Math.abs(v) <= 50) return null
  return (
    <span
      style={{
        marginLeft: '6px',
        fontSize: '9px',
        fontWeight: 800,
        color: '#ff3b5c',
        letterSpacing: '0.08em',
      }}
    >
      SPIKE
    </span>
  )
}

function metricColor(pct: number): string {
  return Math.abs(pct) > 50 ? '#ff3b5c' : P.text
}

function DualPeriodChart({
  prev,
  cur,
  periodLabel,
}: {
  prev: SliceStats
  cur: SliceStats
  periodLabel: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { w, h } = useCanvasSize(wrapRef)

  const labels = ['TOTAL', ...DOMAIN_ORDER]
  const prevVals = [prev.total, ...DOMAIN_ORDER.map(d => prev.byDomain[d])]
  const curVals = [cur.total, ...DOMAIN_ORDER.map(d => cur.byDomain[d])]
  const maxV = Math.max(1, ...prevVals, ...curVals)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = P.card
    ctx.fillRect(0, 0, w, h)

    const padL = 44
    const padR = 16
    const padT = 28
    const padB = 36
    const chartW = w - padL - padR
    const chartH = h - padT - padB
    const n = labels.length
    const groupW = chartW / n
    const barW = Math.max(4, (groupW - 6) / 2)

    ctx.strokeStyle = P.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padL, padT + chartH)
    ctx.lineTo(padL + chartW, padT + chartH)
    ctx.stroke()

    labels.forEach((lab, i) => {
      const gx = padL + i * groupW + groupW / 2
      const pv = prevVals[i]
      const cv = curVals[i]
      const h1 = (pv / maxV) * chartH
      const h2 = (cv / maxV) * chartH
      const x1 = gx - barW - 2
      const x2 = gx + 2
      const base = padT + chartH

      ctx.fillStyle = P.dim
      ctx.fillRect(x1, base - h1, barW, h1)
      const fillCur =
        lab === 'TOTAL' ? P.accent : DOMAIN_COLOR[lab as IncidentDomain] || P.accent
      ctx.fillStyle = fillCur
      ctx.globalAlpha = 0.85
      ctx.fillRect(x2, base - h2, barW, h2)
      ctx.globalAlpha = 1

      ctx.fillStyle = P.dim
      ctx.font = `600 9px ${P.font}`
      ctx.textAlign = 'center'
      const short = lab === 'TOTAL' ? 'ALL' : lab.slice(0, 3)
      ctx.fillText(short, gx, h - 8)
    })

    ctx.textAlign = 'left'
    ctx.font = `600 9px ${P.font}`
    ctx.fillStyle = P.dim
    ctx.fillText(`prev vs current (${periodLabel})`, padL, 14)
    ctx.fillStyle = P.text
    ctx.fillRect(padL, 18, 10, 6)
    ctx.fillStyle = P.dim
    ctx.fillText('previous', padL + 14, 22)
    ctx.fillStyle = P.accent
    ctx.fillRect(padL + 72, 18, 10, 6)
    ctx.fillStyle = P.dim
    ctx.fillText('current', padL + 86, 22)
  }, [w, h, prevVals, curVals, maxV, labels, periodLabel])

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '220px', overflow: 'hidden', minWidth: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

export function DashboardTimeAnalysis({ incidents }: { incidents: Incident[] }) {
  const [period, setPeriod] = useState<PeriodKey>('24h')

  const { now, curStats, prevStats, newTags, periodLabel } = useMemo(() => {
    const ms = PERIOD_MS[period]
    const nowT = Date.now()
    const curStartT = nowT - ms
    const prevStartT = nowT - 2 * ms
    const curList = filterWindow(incidents, curStartT, nowT)
    const prevList = filterWindow(incidents, prevStartT, curStartT)
    const curStatsInner = buildStats(curList)
    const prevStatsInner = buildStats(prevList)
    const newT = new Set<string>()
    for (const t of curStatsInner.tags) {
      if (!prevStatsInner.tags.has(t)) newT.add(t)
    }
    return {
      now: nowT,
      curStats: curStatsInner,
      prevStats: prevStatsInner,
      newTags: [...newT].sort(),
      periodLabel: period,
    }
  }, [incidents, period])

  const totalPct = pctChange(prevStats.total, curStats.total)

  const card: CSSProperties = {
    background: P.card,
    border: `1px solid ${P.border}`,
    borderRadius: '8px',
    padding: '12px 14px',
  }

  const periods: PeriodKey[] = ['6h', '12h', '24h', '7d']

  return (
    <section
      style={{
        padding: '16px 20px',
        borderTop: `1px solid ${P.border}`,
        background: P.bg,
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '3px', height: '16px', background: P.accent, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: P.text, letterSpacing: '0.15em' }}>
            TIME ANALYSIS
          </span>
          <InfoTip text="Compares incident patterns between two equal time windows. 'Current' is the most recent period, 'Previous' is the window before it. Helps detect trend changes." />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {periods.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                fontFamily: P.font,
                fontSize: '9px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '4px',
                border: `1px solid ${period === p ? P.accent : P.border}`,
                background: period === p ? `${P.accent}22` : P.bg,
                color: period === p ? P.accent : P.dim,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ ...card, flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.08em' }}>TOTAL EVENTS</span>
            <InfoTip text="Total incident count in the current vs previous time window. Percentage shows change rate. SPIKE label appears when change exceeds 50%." />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: P.accent }}>{curStats.total}</div>
            <span style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>current</span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: P.dim, fontFamily: P.font }}>
              vs {prevStats.total}
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: P.font,
                color: metricColor(totalPct),
              }}
            >
              {totalPct >= 0 ? '+' : ''}
              {totalPct}%
            </span>
            <SpikeLabel v={totalPct} />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: '12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em' }}>
            DUAL BAR — TOTAL & DOMAINS
          </span>
          <InfoTip text="Side-by-side comparison of incident counts per domain. Grey bars = previous period, colored bars = current period." />
        </div>
        <DualPeriodChart prev={prevStats} cur={curStats} periodLabel={periodLabel} />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ ...card, flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.08em' }}>BY DOMAIN (% Δ)</span>
            <InfoTip text="Percentage change in incident count per domain between the two periods. Positive = increase, negative = decrease." />
          </div>
          {DOMAIN_ORDER.map(d => {
            const p = prevStats.byDomain[d]
            const c = curStats.byDomain[d]
            const ch = pctChange(p, c)
            return (
              <div
                key={d}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: `1px solid ${P.border}`,
                  fontSize: '9px',
                  fontFamily: P.font,
                }}
              >
                <span style={{ color: DOMAIN_COLOR[d], fontWeight: 600 }}>{d}</span>
                <span style={{ color: P.dim }}>
                  {c} vs {p}
                </span>
                <span style={{ color: metricColor(ch), fontWeight: 700 }}>
                  {ch >= 0 ? '+' : ''}
                  {ch}%
                  <SpikeLabel v={ch} />
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ ...card, flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.08em' }}>
              SEVERITY (CUR vs PREV)
            </span>
            <InfoTip text="Severity level comparison between current and previous periods. Bar lengths are proportional to incident counts." />
          </div>
          {SEV_ORDER.map(s => {
            const p = prevStats.bySev[s]
            const c = curStats.bySev[s]
            const ch = pctChange(p, c)
            const maxS = Math.max(1, curStats.total, prevStats.total)
            const wCur = (c / maxS) * 100
            const wPrev = (p / maxS) * 100
            return (
              <div key={s} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: P.font }}>
                  <span style={{ color: SEV_COLOR[s] }}>{s}</span>
                  <span style={{ color: metricColor(ch) }}>
                    {c} / {p}
                    <span style={{ color: metricColor(ch), marginLeft: '6px' }}>
                      {ch >= 0 ? '+' : ''}
                      {ch}%
                    </span>
                    <SpikeLabel v={ch} />
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '6px', marginTop: '4px' }}>
                  <div
                    style={{
                      flex: wPrev || 0.001,
                      background: P.dim,
                      borderRadius: '2px',
                      minWidth: p ? 2 : 0,
                    }}
                    title={`previous ${p}`}
                  />
                  <div
                    style={{
                      flex: wCur || 0.001,
                      background: SEV_COLOR[s],
                      borderRadius: '2px',
                      minWidth: c ? 2 : 0,
                    }}
                    title={`current ${c}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ ...card, marginBottom: '12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em' }}>TOP 5 COUNTRIES</span>
          <InfoTip text="Most affected countries in each period, ranked by incident count." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '9px', color: P.accent, marginBottom: '6px' }}>CURRENT</div>
            {curStats.topCountries.map((row, i) => (
              <div
                key={`c-${row.name}`}
                style={{
                  fontSize: '9px',
                  fontFamily: P.font,
                  color: P.text,
                  padding: '3px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {i + 1}. {row.name}
                </span>
                <span style={{ color: P.dim }}>{row.n}</span>
              </div>
            ))}
            {!curStats.topCountries.length && (
              <div style={{ fontSize: '9px', color: P.dim }}>No data</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: '9px', color: P.dim, marginBottom: '6px' }}>PREVIOUS</div>
            {prevStats.topCountries.map((row, i) => (
              <div
                key={`p-${row.name}`}
                style={{
                  fontSize: '9px',
                  fontFamily: P.font,
                  color: P.text,
                  padding: '3px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {i + 1}. {row.name}
                </span>
                <span style={{ color: P.dim }}>{row.n}</span>
              </div>
            ))}
            {!prevStats.topCountries.length && (
              <div style={{ fontSize: '9px', color: P.dim }}>No data</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...card, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em' }}>
            NEW TAGS / TOPICS (CURRENT PERIOD ONLY)
          </span>
          <InfoTip text="Keywords and tags that appear in the current period but were not present in the previous period. Useful for detecting emerging threats." />
        </div>
        {newTags.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {newTags.map(t => (
              <span
                key={t}
                style={{
                  fontSize: '9px',
                  fontFamily: P.font,
                  color: P.accent,
                  border: `1px solid ${P.border}`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  background: P.bg,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>None in this window</div>
        )}
      </div>

      <div style={{ fontSize: '9px', color: P.dim, marginTop: '10px', fontFamily: P.font }}>
        Windows end at {new Date(now).toISOString().replace('T', ' ').slice(0, 16)} UTC · SPIKE if |Δ| {'>'} 50%
      </div>
    </section>
  )
}
