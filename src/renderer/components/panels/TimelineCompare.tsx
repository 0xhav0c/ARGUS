import { useState, useMemo } from 'react'
import type { Incident } from '../../../shared/types'
import { InfoTip } from '../ui/InfoTip'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

const DOMAIN_COLORS: Record<string, string> = { CONFLICT: '#ff3b5c', CYBER: '#00d4ff', INTEL: '#a78bfa', FINANCE: '#f5c542', MILITARY: '#7c3aed', ENVIRONMENT: '#10b981' }

interface Props {
  incidents: Incident[]
}

type Period = '24h' | '7d' | '30d'

const PERIOD_MS: Record<Period, number> = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }

export function TimelineCompare({ incidents }: Props) {
  const [period, setPeriod] = useState<Period>('7d')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')

  const analysis = useMemo(() => {
    const now = Date.now()
    const ms = PERIOD_MS[period]
    const currentStart = now - ms
    const prevStart = now - 2 * ms

    let all = incidents
    if (selectedRegion !== 'all') all = all.filter(i => i.country === selectedRegion)

    const current = all.filter(i => new Date(i.timestamp).getTime() >= currentStart)
    const previous = all.filter(i => {
      const t = new Date(i.timestamp).getTime()
      return t >= prevStart && t < currentStart
    })

    const domainBreakdown = (list: Incident[]) => {
      const counts: Record<string, number> = { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0, MILITARY: 0, ENVIRONMENT: 0 }
      for (const i of list) counts[i.domain] = (counts[i.domain] || 0) + 1
      return counts
    }

    const sevBreakdown = (list: Incident[]) => {
      const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 }
      for (const i of list) counts[i.severity] = (counts[i.severity] || 0) + 1
      return counts
    }

    const curDomains = domainBreakdown(current)
    const prevDomains = domainBreakdown(previous)
    const curSev = sevBreakdown(current)
    const prevSev = sevBreakdown(previous)

    return { current, previous, curDomains, prevDomains, curSev, prevSev }
  }, [incidents, period, selectedRegion])

  const regions = useMemo(() => {
    const countryCount = new Map<string, number>()
    for (const i of incidents) {
      if (!i.country) continue
      const c = i.country.trim()
      if (c.length < 2) continue
      countryCount.set(c, (countryCount.get(c) || 0) + 1)
    }
    const sorted = [...countryCount.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
    return ['all', ...sorted]
  }, [incidents])

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? '+100%' : '0%'
    const pct = ((cur - prev) / prev) * 100
    return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
  }

  const changeColor = (cur: number, prev: number) => cur > prev ? '#ff3b5c' : cur < prev ? '#00e676' : P.dim

  if (incidents.length === 0) {
    return (
      <div style={{ fontFamily: P.font, padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '20px', marginBottom: '12px', opacity: 0.3 }}>◉</div>
        <div style={{ fontSize: '11px', color: P.dim }}>No incidents available for timeline comparison</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: P.font, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: P.accent, fontWeight: 700, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>◉ TIMELINE COMPARISON <InfoTip text="Side-by-side comparison of two consecutive time periods. Shows how incident counts, domain distribution, and severity levels have changed. Useful for identifying emerging trends." /></div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['24h', '7d', '30d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '4px 10px', background: period === p ? `${P.accent}15` : 'transparent',
              border: `1px solid ${period === p ? P.accent + '40' : P.border}`,
              borderRadius: '3px', color: period === p ? P.accent : P.dim,
              fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font,
            }}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
          style={{ padding: '5px 8px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '10px', fontFamily: P.font, outline: 'none' }}>
          {regions.map(r => <option key={r} value={r}>{r === 'all' ? 'All Countries' : r}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
          <div style={{ fontSize: '9px', color: P.dim, marginBottom: '6px', letterSpacing: '0.1em' }}>CURRENT PERIOD</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: P.text }}>{analysis.current.length}</div>
          <div style={{ fontSize: '10px', color: changeColor(analysis.current.length, analysis.previous.length), fontWeight: 700 }}>
            {pctChange(analysis.current.length, analysis.previous.length)} vs previous
          </div>
        </div>
        <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
          <div style={{ fontSize: '9px', color: P.dim, marginBottom: '6px', letterSpacing: '0.1em' }}>PREVIOUS PERIOD</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: P.dim }}>{analysis.previous.length}</div>
          <div style={{ fontSize: '10px', color: P.dim }}>baseline</div>
        </div>
      </div>

      <div style={{ fontSize: '9px', color: P.dim, marginBottom: '8px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>DOMAIN COMPARISON <InfoTip text="Incident count per domain (Conflict, Cyber, Intel, Finance) for the current vs previous period. Red = increase (more incidents), Green = decrease (fewer incidents)." size={11} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px', marginBottom: '16px' }}>
        {Object.entries(analysis.curDomains).map(([domain, count]) => {
          const prev = analysis.prevDomains[domain] || 0
          return (
            <div key={domain} style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: DOMAIN_COLORS[domain] || P.dim, fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>{domain}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: P.text }}>{count}</div>
              <div style={{ fontSize: '9px', color: changeColor(count, prev) }}>{pctChange(count, prev)}</div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '9px', color: P.dim, marginBottom: '8px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>SEVERITY COMPARISON <InfoTip text="Severity distribution comparison between periods. Shows how the proportion of Critical, High, Medium, and Low incidents has shifted." size={11} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px' }}>
        {Object.entries(analysis.curSev).map(([sev, count]) => {
          const prev = analysis.prevSev[sev] || 0
          const colors: Record<string, string> = { CRITICAL: '#ff3b5c', HIGH: '#ff6b35', MEDIUM: '#f5c542', LOW: '#00d4ff' }
          return (
            <div key={sev} style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: colors[sev] || P.dim, fontWeight: 700, marginBottom: '4px' }}>{sev}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: P.text }}>{count}</div>
              <div style={{ fontSize: '9px', color: changeColor(count, prev) }}>{pctChange(count, prev)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
