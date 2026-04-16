import { useState, useEffect, useCallback } from 'react'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

interface Props {
  onLocateIncident?: (incident: any) => void
}

export function AnomalyRiskPanel({ onLocateIncident }: Props) {
  const [tab, setTab] = useState<'anomalies' | 'risk'>('anomalies')
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  const sevColor = (s: string) => ({ HIGH: '#ff3b5c', MEDIUM: '#f5c542', LOW: '#00d4ff' }[s] || '#c8d6e5')
  const trendIcon = (t: string) => ({ increasing: '↑', stable: '→', decreasing: '↓' }[t] || '?')
  const trendColor = (t: string) => ({ increasing: '#ff3b5c', stable: '#f5c542', decreasing: '#00e676' }[t] || P.dim)

  const riskScoreColor = (score: number) => score >= 70 ? '#ff3b5c' : score >= 40 ? '#f5c542' : '#00e676'
  const riskScoreLabel = (score: number) => score >= 70 ? 'HIGH RISK' : score >= 40 ? 'ELEVATED' : 'LOW RISK'

  if (loading) return <div style={{ padding: '30px', textAlign: 'center', color: P.dim, fontFamily: P.font, fontSize: '11px' }}>Analyzing patterns...</div>

  return (
    <div style={{ fontFamily: P.font }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button onClick={() => setTab('anomalies')} style={{ padding: '6px 12px', background: tab === 'anomalies' ? '#ff3b5c18' : 'transparent', border: `1px solid ${tab === 'anomalies' ? '#ff3b5c50' : P.border}`, borderRadius: '4px', color: tab === 'anomalies' ? '#ff3b5c' : P.dim, fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font }}>🔍 ANOMALIES ({anomalies.length})</button>
        <button onClick={() => setTab('risk')} style={{ padding: '6px 12px', background: tab === 'risk' ? `${P.accent}18` : 'transparent', border: `1px solid ${tab === 'risk' ? P.accent + '50' : P.border}`, borderRadius: '4px', color: tab === 'risk' ? P.accent : P.dim, fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font }}>📊 RISK ASSESSMENT ({risks.length})</button>
      </div>

      {tab === 'anomalies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {anomalies.map((a: any) => {
            const incidents: any[] = a.relatedIncidents || []
            const isOpen = expanded === a.id
            return (
              <div key={a.id} style={{
                background: '#111827', border: '1px solid #1e293b',
                borderLeft: `4px solid ${sevColor(a.severity)}`, borderRadius: '8px',
                overflow: 'hidden',
              }}>
                {/* Header — clickable */}
                <div onClick={() => setExpanded(isOpen ? null : a.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a2332' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
                        {a.title}
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>{isOpen ? '▼' : '▶'}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '3px 8px', background: sevColor(a.severity) + '25', color: sevColor(a.severity), borderRadius: '4px', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>{a.severity}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.5 }}>{a.description}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                    {(a.type === 'correlation' ? 'CO-OCCURRENCE' : a.type?.toUpperCase()) || 'UNKNOWN'} • {incidents.length} related incidents
                  </div>
                </div>

                {/* Related Incidents — always visible as cards when expanded */}
                {isOpen && incidents.length > 0 && (
                  <div style={{ borderTop: '1px solid #1e293b' }}>
                    {incidents.map((inc: any, idx: number) => {
                      const hasCoords = inc.latitude != null && inc.longitude != null && onLocateIncident
                      return (
                        <div key={inc.id || idx}
                          onClick={hasCoords ? (e) => {
                            e.stopPropagation()
                            onLocateIncident({
                              id: inc.id, title: inc.title, description: inc.title,
                              severity: inc.severity, domain: inc.domain, source: 'Anomaly Detection',
                              latitude: inc.latitude, longitude: inc.longitude,
                              country: inc.country || '', timestamp: inc.timestamp, tags: [],
                            })
                          } : undefined}
                          style={{
                            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                            background: idx % 2 === 0 ? '#0f172a' : '#111827',
                            borderBottom: idx < incidents.length - 1 ? '1px solid #1e293b08' : 'none',
                            cursor: hasCoords ? 'pointer' : 'default',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={hasCoords ? e => { e.currentTarget.style.background = '#1e293b' } : undefined}
                          onMouseLeave={hasCoords ? e => { e.currentTarget.style.background = idx % 2 === 0 ? '#0f172a' : '#111827' } : undefined}
                        >
                          {/* Severity dot */}
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sevColor(inc.severity), flexShrink: 0 }} />
                          {/* Title + country */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inc.title}
                            </div>
                            {inc.country && (
                              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{inc.country}</div>
                            )}
                          </div>
                          {/* Tags + locate icon */}
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', padding: '2px 6px', background: sevColor(inc.severity) + '20', color: sevColor(inc.severity), borderRadius: '3px', fontWeight: 600 }}>{inc.severity}</span>
                            <span style={{ fontSize: '9px', padding: '2px 6px', background: '#1e293b', color: '#94a3b8', borderRadius: '3px' }}>{inc.domain}</span>
                            {hasCoords && <span style={{ fontSize: '10px', color: P.accent }} title="Locate on globe">📍</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isOpen && incidents.length === 0 && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                    No related incidents available
                  </div>
                )}
              </div>
            )
          })}
          {anomalies.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '11px', background: '#111827', borderRadius: '8px', border: '1px solid #1e293b' }}>
              No anomalies detected — patterns are within normal ranges
            </div>
          )}
        </div>
      )}

      {tab === 'risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {risks.map((r: any, i: number) => {
            const scoreColor = riskScoreColor(r.riskScore)
            return (
              <div key={i} style={{
                padding: '16px', background: '#111827', border: '1px solid #1e293b',
                borderRadius: '8px', transition: 'all 0.15s',
              }}>
                {/* Region header with score */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                  {/* Score gauge */}
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: `conic-gradient(${scoreColor} ${r.riskScore * 3.6}deg, #1e293b 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%', background: '#111827',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 800, color: scoreColor,
                    }}>{r.riskScore}</div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                      {r.region}
                      <span style={{ fontSize: '11px', color: trendColor(r.trend), marginLeft: '8px', fontWeight: 600 }}>
                        {trendIcon(r.trend)} {r.trend?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: scoreColor, fontWeight: 700, letterSpacing: '0.05em' }}>
                      {riskScoreLabel(r.riskScore)}
                    </div>
                  </div>
                </div>

                {/* Score explanation */}
                <div style={{ padding: '10px 12px', background: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b', marginBottom: '10px' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px' }}>SCORE BREAKDOWN</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: r.riskScore >= 70 ? '#ff3b5c' : r.riskScore >= 40 ? '#f5c542' : '#00e676' }}>{r.riskScore}</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>Overall</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: trendColor(r.trend) }}>{trendIcon(r.trend)}</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>Threat Level</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>{(r.factors || []).length}</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>Factors</div>
                    </div>
                  </div>
                </div>

                {/* Assessment */}
                {r.prediction && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '10px', padding: '0 2px' }}>
                    {r.prediction}
                  </div>
                )}

                {/* Contributing factors */}
                {(r.factors || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px' }}>CONTRIBUTING FACTORS</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(r.factors || []).map((f: string) => (
                        <span key={f} style={{
                          fontSize: '10px', padding: '3px 8px',
                          background: `${P.accent}12`, border: `1px solid ${P.accent}25`,
                          borderRadius: '4px', color: '#93c5fd', fontWeight: 500,
                        }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {risks.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '11px', background: '#111827', borderRadius: '8px', border: '1px solid #1e293b' }}>
              Insufficient data for risk assessment — need more incidents to detect patterns
            </div>
          )}
        </div>
      )}
    </div>
  )
}
