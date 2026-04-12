import { useState, useEffect, useCallback } from 'react'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

export function AnomalyRiskPanel() {
  const [tab, setTab] = useState<'anomalies' | 'risk'>('anomalies')
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, r] = await Promise.all([
        window.argus.getAnomalies().catch(() => []),
        window.argus.getPredictiveRisk().catch(() => []),
      ])
      setAnomalies(a); setRisks(r)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const sevColor = (s: string) => ({ HIGH: '#ff3b5c', MEDIUM: '#f5c542', LOW: '#00d4ff' }[s] || P.dim)
  const trendIcon = (t: string) => ({ increasing: '↑', stable: '→', decreasing: '↓' }[t] || '?')
  const trendColor = (t: string) => ({ increasing: '#ff3b5c', stable: '#f5c542', decreasing: '#00e676' }[t] || P.dim)

  if (loading) return <div style={{ padding: '30px', textAlign: 'center', color: P.dim, fontFamily: P.font }}>Analyzing patterns...</div>

  return (
    <div style={{ fontFamily: P.font }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button onClick={() => setTab('anomalies')} style={{ padding: '5px 10px', background: tab === 'anomalies' ? `#ff3b5c15` : 'transparent', border: `1px solid ${tab === 'anomalies' ? '#ff3b5c40' : P.border}`, borderRadius: '4px', color: tab === 'anomalies' ? '#ff3b5c' : P.dim, fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font }}>🔍 ANOMALIES ({anomalies.length})</button>
        <button onClick={() => setTab('risk')} style={{ padding: '5px 10px', background: tab === 'risk' ? `${P.accent}15` : 'transparent', border: `1px solid ${tab === 'risk' ? P.accent + '40' : P.border}`, borderRadius: '4px', color: tab === 'risk' ? P.accent : P.dim, fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font }}>📊 PREDICTIVE RISK ({risks.length})</button>
      </div>

      {tab === 'anomalies' && (
        <div>
          {anomalies.map((a: any) => (
            <div key={a.id} style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderLeft: `3px solid ${sevColor(a.severity)}`, borderRadius: '6px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: P.text }}>{a.title}</span>
                <span style={{ fontSize: '8px', padding: '2px 5px', background: sevColor(a.severity) + '20', color: sevColor(a.severity), borderRadius: '2px' }}>{a.severity}</span>
              </div>
              <div style={{ fontSize: '9px', color: P.dim, lineHeight: '1.5' }}>{a.description}</div>
              <div style={{ fontSize: '8px', color: P.dim, marginTop: '4px' }}>{a.type.toUpperCase()} • {a.relatedIncidents?.length || 0} related events</div>
            </div>
          ))}
          {anomalies.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>No anomalies detected — patterns are within normal ranges</div>}
        </div>
      )}

      {tab === 'risk' && (
        <div>
          {risks.map((r: any, i: number) => (
            <div key={i} style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', marginBottom: '6px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `conic-gradient(${r.riskScore >= 70 ? '#ff3b5c' : r.riskScore >= 40 ? '#f5c542' : '#00e676'} ${r.riskScore * 3.6}deg, #141c2e 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: P.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: P.text }}>{r.riskScore}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: P.text }}>
                  {r.region} <span style={{ fontSize: '10px', color: trendColor(r.trend) }}>{trendIcon(r.trend)}</span>
                </div>
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>{r.prediction}</div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {(r.factors || []).map((f: string) => <span key={f} style={{ fontSize: '7px', padding: '1px 4px', background: `${P.accent}10`, border: `1px solid ${P.accent}20`, borderRadius: '2px', color: P.accent }}>{f}</span>)}
                </div>
              </div>
            </div>
          ))}
          {risks.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>Insufficient data for risk prediction</div>}
        </div>
      )}
    </div>
  )
}
