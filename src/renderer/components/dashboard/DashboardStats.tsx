import { useMemo, useRef, useEffect, useState, type RefObject } from 'react'
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

const DOMAIN_CONFIG = [
  { id: 'CONFLICT' as const, label: 'CONFLICT', icon: '\u2694', color: '#ff6b35' },
  { id: 'CYBER' as const, label: 'CYBER', icon: '\u26A1', color: '#00ff87' },
  { id: 'INTEL' as const, label: 'INTEL', icon: '\u25C9', color: '#4a9eff' },
  { id: 'FINANCE' as const, label: 'FINANCE', icon: '\u25C6', color: '#f5c542' },
]

const DOMAIN_COLOR: Record<IncidentDomain, string> = {
  CONFLICT: '#ff6b35', CYBER: '#00ff87', INTEL: '#4a9eff', FINANCE: '#f5c542',
}

const SEV_CONFIG: { id: IncidentSeverity; color: string }[] = [
  { id: 'CRITICAL', color: '#ff3b5c' },
  { id: 'HIGH', color: '#ff6b35' },
  { id: 'MEDIUM', color: '#f5c542' },
  { id: 'LOW', color: '#00d4ff' },
  { id: 'INFO', color: '#4a5568' },
]

const ORDERED_SEV: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

function useContainerWidth(ref: RefObject<HTMLDivElement | null>) {
  const [w, setW] = useState(800)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setW(Math.floor(el.getBoundingClientRect().width))
    })
    ro.observe(el)
    setW(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [ref])
  return w
}

function useCanvasSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 300, h: 200 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(100, Math.floor(r.width)), h: Math.max(100, Math.floor(r.height)) })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ w: Math.max(100, Math.floor(r.width)), h: Math.max(100, Math.floor(r.height)) })
    return () => ro.disconnect()
  }, [ref])
  return size
}

function HourlyActivityChart({ incidents }: { incidents: Incident[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { w, h } = useCanvasSize(wrapRef)

  const buckets = useMemo(() => {
    const now = Date.now()
    const hourMs = 3600000
    const list: { start: number; byDomain: Record<IncidentDomain, number> }[] = []
    for (let i = 23; i >= 0; i--) {
      const start = now - (i + 1) * hourMs
      const end = now - i * hourMs
      const byDomain: Record<IncidentDomain, number> = { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0 }
      for (const inc of incidents) {
        const t = new Date(inc.timestamp).getTime()
        if (t >= start && t < end) byDomain[inc.domain]++
      }
      list.push({ start, byDomain })
    }
    return list
  }, [incidents])

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

    const padL = 30, padR = 4, padT = 6, padB = 22
    const chartW = w - padL - padR
    const chartH = h - padT - padB
    const n = buckets.length
    const gap = 1
    const barW = Math.max(2, (chartW - gap * (n - 1)) / n)

    let maxStack = 1
    for (const b of buckets) {
      const sum = DOMAIN_CONFIG.reduce((s, d) => s + b.byDomain[d.id], 0)
      maxStack = Math.max(maxStack, sum)
    }

    const domainOrder: IncidentDomain[] = ['CONFLICT', 'CYBER', 'INTEL', 'FINANCE']
    buckets.forEach((b, i) => {
      const x = padL + i * (barW + gap)
      let yBase = padT + chartH
      const total = domainOrder.reduce((s, d) => s + b.byDomain[d], 0)
      if (total === 0) {
        ctx.fillStyle = P.border
        ctx.fillRect(x, yBase - 1, barW, 1)
        return
      }
      for (const dom of domainOrder) {
        const c = b.byDomain[dom]
        if (!c) continue
        const segH = (c / maxStack) * chartH
        yBase -= segH
        ctx.fillStyle = DOMAIN_COLOR[dom]
        ctx.fillRect(x, yBase, barW, segH)
      }
    })

    ctx.strokeStyle = P.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padL, padT + chartH)
    ctx.lineTo(padL + chartW, padT + chartH)
    ctx.stroke()

    ctx.fillStyle = P.dim
    ctx.font = `500 7px ${P.font}`
    ctx.textAlign = 'center'
    const step = w < 300 ? 6 : 4
    for (let i = 0; i < n; i += step) {
      const x = padL + i * (barW + gap) + barW / 2
      const hour = new Date(buckets[i].start + 3600000).getHours()
      ctx.fillText(`${hour}h`, x, h - 6)
    }
    ctx.textAlign = 'right'
    ctx.fillText(String(maxStack), padL - 4, padT + 8)
  }, [buckets, w, h])

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>ACTIVITY (24H)</span>
        <InfoTip text="Hourly incident distribution over the last 24 hours. Each bar is color-coded by domain: orange=Conflict, green=Cyber, blue=Intel, yellow=Finance." size={11} />
      </div>
      <div ref={wrapRef} style={{ width: '100%', height: '140px' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
        {DOMAIN_CONFIG.map(d => (
          <span key={d.id} style={{ fontSize: '9px', color: d.color, fontFamily: P.font }}>{d.icon} {d.label}</span>
        ))}
      </div>
    </div>
  )
}

function TopCountriesChart({ incidents }: { incidents: Incident[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { w, h } = useCanvasSize(wrapRef)

  const top = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of incidents) {
      const c = i.country || 'Unknown'
      m.set(c, (m.get(c) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [incidents])

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

    const max = Math.max(1, ...top.map(([, v]) => v))
    const rowH = Math.min(18, (h - 8) / Math.max(1, top.length))
    const labelW = Math.min(80, w * 0.32)
    const barX = labelW + 4
    const barW = w - barX - 30

    ctx.textBaseline = 'middle'
    top.forEach(([country, count], i) => {
      const y = 4 + i * (rowH + 2)
      const midY = y + rowH / 2
      ctx.fillStyle = P.text
      ctx.font = `500 8px ${P.font}`
      ctx.textAlign = 'left'
      const maxLen = Math.floor(labelW / 6)
      const label = country.length > maxLen ? `${country.slice(0, maxLen - 1)}…` : country
      ctx.fillText(label, 2, midY)

      const bw = (count / max) * barW
      ctx.fillStyle = P.border
      ctx.fillRect(barX, y + 3, barW, rowH - 6)
      const grd = ctx.createLinearGradient(barX, 0, barX + bw, 0)
      grd.addColorStop(0, P.accent)
      grd.addColorStop(1, '#0088aa')
      ctx.fillStyle = grd
      ctx.fillRect(barX, y + 3, Math.max(2, bw), rowH - 6)

      ctx.fillStyle = P.dim
      ctx.font = `600 8px ${P.font}`
      ctx.textAlign = 'left'
      ctx.fillText(String(count), barX + barW + 4, midY)
    })
  }, [top, w, h])

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>TOP COUNTRIES</span>
        <InfoTip text="Countries with the most incidents in the last 24 hours, ranked by total count." size={11} />
      </div>
      <div ref={wrapRef} style={{ width: '100%', height: '160px' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

function SeverityDonutChart({ incidents }: { incidents: Incident[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { w, h } = useCanvasSize(wrapRef)

  const counts = useMemo(() => {
    const c: Partial<Record<IncidentSeverity, number>> = {}
    for (const s of ORDERED_SEV) c[s] = 0
    for (const i of incidents) c[i.severity] = (c[i.severity] || 0) + 1
    return c as Record<IncidentSeverity, number>
  }, [incidents])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const side = Math.min(w, h)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(side * dpr)
    canvas.height = Math.floor(side * dpr)
    canvas.style.width = `${side}px`
    canvas.style.height = `${side}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = P.card
    ctx.fillRect(0, 0, side, side)

    const cx = side / 2, cy = side / 2
    const rOuter = Math.min(cx, cy) - 8
    const rInner = rOuter * 0.55
    const total = ORDERED_SEV.reduce((s, k) => s + (counts[k] || 0), 0) || 1

    let a0 = -Math.PI / 2
    for (const sev of ORDERED_SEV) {
      const n = counts[sev] || 0
      const a1 = a0 + (n / total) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(cx, cy, rOuter, a0, a1)
      ctx.arc(cx, cy, rInner, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = SEV_CONFIG.find(s => s.id === sev)!.color
      ctx.fill()
      a0 = a1
    }

    ctx.fillStyle = P.bg
    ctx.beginPath()
    ctx.arc(cx, cy, rInner - 1, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.text
    ctx.font = `700 ${side < 140 ? 11 : 14}px ${P.font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(total), cx, cy - 4)
    ctx.fillStyle = P.dim
    ctx.font = `600 6px ${P.font}`
    ctx.fillText('TOTAL', cx, cy + 10)
  }, [counts, w, h])

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>SEVERITY</span>
        <InfoTip text="Severity distribution across all incidents. The center number shows the total count." size={11} />
      </div>
      <div ref={wrapRef} style={{ width: '100%', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', justifyContent: 'center', marginTop: '4px' }}>
        {SEV_CONFIG.map(s => (
          <span key={s.id} style={{ fontSize: '9px', color: P.dim, fontFamily: P.font, whiteSpace: 'nowrap' }}>
            <span style={{ color: s.color, marginRight: '3px' }}>●</span>{s.id} {counts[s.id] || 0}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DashboardStats({ incidents }: { incidents: Incident[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const containerW = useContainerWidth(containerRef)
  const [dbCounts, setDbCounts] = useState<{ total: number; today: number; last24h: number } | null>(null)

  useEffect(() => {
    window.argus?.getIncidentCounts?.().then(setDbCounts).catch(() => {})
    const iv = setInterval(() => {
      window.argus?.getIncidentCounts?.().then(setDbCounts).catch(() => {})
    }, 60000)
    return () => clearInterval(iv)
  }, [])

  const lastRefreshed = useMemo(() => new Date().toLocaleTimeString(), [incidents.length])

  const stats = useMemo(() => {
    const now = Date.now()
    const last24h = incidents.filter(i => now - new Date(i.timestamp).getTime() < 86400000)

    const byDomain: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    for (const i of last24h) {
      byDomain[i.domain] = (byDomain[i.domain] || 0) + 1
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
    }

    const countries = new Set(last24h.map(i => i.country).filter(Boolean))

    return {
      last24h: last24h.length,
      dbTotal: dbCounts?.total ?? incidents.length,
      cacheTotal: incidents.length,
      byDomain,
      bySeverity,
      countries: countries.size,
    }
  }, [incidents, dbCounts])

  const chartCols = containerW < 450 ? '1fr' : containerW < 650 ? '1fr 1fr' : '1fr 1fr 1fr'

  return (
    <section ref={containerRef} style={{
      padding: '16px 20px', borderTop: `1px solid ${P.border}`,
      background: P.bg, boxSizing: 'border-box', width: '100%', minWidth: 0, overflowX: 'hidden' as const,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ width: '3px', height: '14px', background: P.accent, borderRadius: '2px' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: P.text }}>SITUATION OVERVIEW</span>
        <InfoTip text="Overview of incidents collected in the last 24 hours from RSS feeds, APIs and other intelligence sources. Database total shows all cached incidents." />
        <span style={{ fontSize: '9px', color: P.dim }}>last 24h &middot; {stats.dbTotal} in db</span>
        <span style={{ fontSize: '9px', color: P.dim }}>Updated {lastRefreshed}</span>
      </div>

      {/* Stat cards - use flex with wrap instead of grid for better adaptability */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: '1 1 100px', minWidth: '90px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>LAST 24H</div>
            <InfoTip text="Number of incidents detected in the last 24 hours across all domains and sources." size={11} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: P.accent }}>{stats.last24h}</div>
          <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>{stats.cacheTotal} cached</div>
        </div>

        <div style={{ flex: '1 1 100px', minWidth: '90px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>COUNTRIES</div>
            <InfoTip text="Unique countries mentioned in incidents from the last 24 hours." size={11} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#00ff87' }}>{stats.countries}</div>
          <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>in 24h</div>
        </div>

        {DOMAIN_CONFIG.map(d => (
          <div key={d.id} style={{ flex: '1 1 90px', minWidth: '80px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px' }}>{d.icon}</span>
              <span style={{ fontSize: '9px', color: d.color, letterSpacing: '0.06em', fontWeight: 600 }}>{d.label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: d.color }}>{stats.byDomain[d.id] || 0}</div>
          </div>
        ))}
      </div>

      {/* Severity bar */}
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>SEVERITY (24H)</div>
          <InfoTip text="Incident severity breakdown for the last 24h. CRITICAL = immediate threat, HIGH = significant risk, MEDIUM = notable, LOW = monitoring, INFO = awareness only." size={11} />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {SEV_CONFIG.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: s.color }} />
              <span style={{ fontSize: '9px', color: P.dim }}>{s.id}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{stats.bySeverity[s.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts - responsive flex wrap */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}><HourlyActivityChart incidents={incidents} /></div>
        <div style={{ flex: '1 1 160px', minWidth: 0 }}><TopCountriesChart incidents={incidents} /></div>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}><SeverityDonutChart incidents={incidents} /></div>
      </div>
    </section>
  )
}
