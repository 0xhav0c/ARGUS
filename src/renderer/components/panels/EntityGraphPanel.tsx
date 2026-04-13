import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ExtractedEntity, SentimentData } from '../../../shared/types'
import { InfoTip } from '../ui/InfoTip'
import { MarkdownText } from '../ui/MarkdownText'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

type ViewMode = 'entities' | 'sentiment' | 'graph'

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  person: { icon: '👤', color: '#f5c542' },
  organization: { icon: '🏛', color: '#00d4ff' },
  location: { icon: '📍', color: '#ff6b35' },
  weapon: { icon: '⚔', color: '#ff3b5c' },
  event: { icon: '⚡', color: '#a78bfa' },
}

interface GNode {
  id: string; name: string; type: string; mentions: number
  x: number; y: number; vx: number; vy: number; radius: number
}
interface GEdge { source: string; target: string; relation: string }

function ForceGraph({ entities, onSelect, selectedId }: { entities: ExtractedEntity[]; onSelect: (e: ExtractedEntity | null) => void; selectedId: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{ nodes: GNode[]; edges: GEdge[]; zoom: number; panX: number; panY: number; dragging: string | null; dragStartX: number; dragStartY: number; isPanning: boolean; panStartX: number; panStartY: number; hovered: string | null; minMentions: number }>({
    nodes: [], edges: [], zoom: 1, panX: 0, panY: 0, dragging: null, dragStartX: 0, dragStartY: 0, isPanning: false, panStartX: 0, panStartY: 0, hovered: null, minMentions: 1,
  })
  const [minMentions, setMinMentions] = useState(1)
  const [detailEntity, setDetailEntity] = useState<ExtractedEntity | null>(null)
  const rafRef = useRef(0)

  const graphEntities = useMemo(() =>
    entities.filter(e => e.relatedEntities.length > 0 && e.mentions >= minMentions).slice(0, 50)
  , [entities, minMentions])

  useEffect(() => {
    const W = containerRef.current?.clientWidth || 600
    const H = 400
    const nodeMap = new Map<string, GNode>()
    graphEntities.forEach((e, i) => {
      const angle = (i / graphEntities.length) * Math.PI * 2
      const r = Math.min(W, H) * 0.3
      nodeMap.set(e.id, {
        id: e.id, name: e.name, type: e.type, mentions: e.mentions,
        x: W / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
        y: H / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0, radius: Math.max(8, Math.min(e.mentions * 2.5, 28)),
      })
    })
    const edges: GEdge[] = []
    const edgeSet = new Set<string>()
    graphEntities.forEach(e => {
      e.relatedEntities.forEach(rel => {
        if (nodeMap.has(rel.id)) {
          const key = [e.id, rel.id].sort().join('-')
          if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ source: e.id, target: rel.id, relation: rel.relation }) }
        }
      })
    })
    stateRef.current.nodes = Array.from(nodeMap.values())
    stateRef.current.edges = edges
    stateRef.current.panX = 0
    stateRef.current.panY = 0
    stateRef.current.zoom = 1
  }, [graphEntities])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let running = true
    let alpha = 1.0
    const ALPHA_DECAY = 0.995
    const ALPHA_MIN = 0.001
    const nodeIndex = new Map<string, typeof stateRef.current.nodes[0]>()

    const tick = () => {
      if (!running) return
      const s = stateRef.current
      const { nodes, edges, zoom, panX, panY } = s
      const W = canvas.width / (window.devicePixelRatio || 1)
      const H = canvas.height / (window.devicePixelRatio || 1)

      nodeIndex.clear()
      for (const n of nodes) nodeIndex.set(n.id, n)

      if (alpha > ALPHA_MIN) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x; const dy = nodes[j].y - nodes[i].y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = (600 / (dist * dist)) * alpha
            nodes[i].vx -= (dx / dist) * force; nodes[i].vy -= (dy / dist) * force
            nodes[j].vx += (dx / dist) * force; nodes[j].vy += (dy / dist) * force
          }
        }
        for (const edge of edges) {
          const src = nodeIndex.get(edge.source); const tgt = nodeIndex.get(edge.target)
          if (!src || !tgt) continue
          const dx = tgt.x - src.x; const dy = tgt.y - src.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (dist - 100) * 0.008 * alpha
          src.vx += (dx / dist) * force; src.vy += (dy / dist) * force
          tgt.vx -= (dx / dist) * force; tgt.vy -= (dy / dist) * force
        }
        const cx = W / 2; const cy = H / 2
        for (const n of nodes) {
          n.vx += (cx - n.x) * 0.0005 * alpha; n.vy += (cy - n.y) * 0.0005 * alpha
          n.vx *= 0.6; n.vy *= 0.6
          if (s.dragging !== n.id) { n.x += n.vx; n.y += n.vy }
          n.x = Math.max(n.radius, Math.min(W - n.radius, n.x))
          n.y = Math.max(n.radius, Math.min(H - n.radius, n.y))
        }
        alpha *= ALPHA_DECAY
      }

      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save(); ctx.scale(dpr, dpr); ctx.translate(panX, panY); ctx.scale(zoom, zoom)

      for (const edge of edges) {
        const src = nodeIndex.get(edge.source); const tgt = nodeIndex.get(edge.target)
        if (!src || !tgt) continue
        ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y)
        ctx.strokeStyle = '#141c2e'; ctx.lineWidth = 1; ctx.stroke()
        const mx = (src.x + tgt.x) / 2; const my = (src.y + tgt.y) / 2
        ctx.fillStyle = '#4a556880'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center'
        ctx.fillText(edge.relation, mx, my - 3)
      }

      for (const n of nodes) {
        const t = TYPE_ICONS[n.type] || { icon: '◉', color: '#00d4ff' }
        const isHovered = s.hovered === n.id
        const isSelected = selectedId === n.id
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = (isHovered || isSelected) ? t.color + '50' : t.color + '25'; ctx.fill()
        ctx.strokeStyle = (isHovered || isSelected) ? t.color : t.color + '80'
        ctx.lineWidth = isSelected ? 2 : 1; ctx.stroke()
        ctx.fillStyle = '#c8d6e5'; ctx.font = `${Math.max(8, n.radius * 0.6)}px JetBrains Mono, monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(t.icon, n.x, n.y)
        ctx.fillStyle = isHovered ? '#c8d6e5' : '#8a9ab5'; ctx.font = '9px JetBrains Mono, monospace'
        ctx.fillText(n.name.length > 12 ? n.name.slice(0, 11) + '…' : n.name, n.x, n.y + n.radius + 10)
        ctx.fillStyle = '#4a5568'; ctx.font = '9px JetBrains Mono, monospace'
        ctx.fillText(`${n.mentions}x`, n.x, n.y + n.radius + 19)
      }
      ctx.restore()

      if (alpha > ALPHA_MIN || s.dragging) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(rafRef.current) }
  }, [graphEntities, selectedId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const W = containerRef.current?.clientWidth || 600
      const H = 400
      const dpr = window.devicePixelRatio || 1
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const findNodeAt = useCallback((mx: number, my: number) => {
    const s = stateRef.current
    const x = (mx - s.panX) / s.zoom; const y = (my - s.panY) / s.zoom
    for (let i = s.nodes.length - 1; i >= 0; i--) {
      const n = s.nodes[i]
      if ((x - n.x) ** 2 + (y - n.y) ** 2 <= (n.radius + 4) ** 2) return n
    }
    return null
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    const node = findNodeAt(mx, my)
    if (node) {
      stateRef.current.dragging = node.id
    } else {
      stateRef.current.isPanning = true; stateRef.current.panStartX = e.clientX - stateRef.current.panX; stateRef.current.panStartY = e.clientY - stateRef.current.panY
    }
  }, [findNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    const s = stateRef.current
    if (s.dragging) {
      const n = s.nodes.find(nd => nd.id === s.dragging)
      if (n) { n.x = (mx - s.panX) / s.zoom; n.y = (my - s.panY) / s.zoom; n.vx = 0; n.vy = 0 }
    } else if (s.isPanning) {
      s.panX = e.clientX - s.panStartX; s.panY = e.clientY - s.panStartY
    } else {
      const node = findNodeAt(mx, my)
      s.hovered = node?.id ?? null
      if (canvasRef.current) canvasRef.current.style.cursor = node ? 'grab' : 'default'
    }
  }, [findNodeAt])

  const handleMouseUp = useCallback(() => {
    const s = stateRef.current
    if (s.dragging) {
      const n = s.nodes.find(nd => nd.id === s.dragging)
      if (n) {
        const entity = entities.find(e => e.id === n.id)
        if (entity) { onSelect(selectedId === entity.id ? null : entity); setDetailEntity(selectedId === entity.id ? null : entity) }
      }
      s.dragging = null
    }
    s.isPanning = false
  }, [entities, onSelect, selectedId])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const s = stateRef.current
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    s.zoom = Math.max(0.3, Math.min(3, s.zoom * delta))
  }, [])

  const maxMentions = useMemo(() => Math.max(...entities.map(e => e.mentions), 1), [entities])

  return (
    <div ref={containerRef} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: `1px solid ${P.border}` }}>
        <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>MIN MENTIONS <InfoTip text="Filter graph nodes by minimum mention count. Increase to reduce noise and show only frequently referenced entities." size={10} /></span>
        <input type="range" min={1} max={Math.max(maxMentions, 2)} value={minMentions} onChange={e => setMinMentions(Number(e.target.value))} style={{ flex: 1, maxWidth: '150px', accentColor: P.accent }} />
        <span style={{ fontSize: '9px', color: P.accent, fontWeight: 700 }}>{minMentions}</span>
        <span style={{ fontSize: '9px', color: P.dim, marginLeft: '8px' }}>{graphEntities.length} nodes</span>
      </div>
      <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onWheel={handleWheel} style={{ display: 'block', width: '100%', height: '400px' }} />
      {detailEntity && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${P.border}`, background: P.bg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: P.text }}>{(TYPE_ICONS[detailEntity.type] || { icon: '◉' }).icon} {detailEntity.name}</span>
            <button onClick={() => { setDetailEntity(null); onSelect(null) }} style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '12px', fontFamily: P.font }}>✕</button>
          </div>
          <div style={{ fontSize: '9px', color: P.dim, marginBottom: '6px' }}>{detailEntity.type.toUpperCase()} · {detailEntity.mentions} mentions · {detailEntity.incidentIds.length} incidents</div>
          {detailEntity.relatedEntities.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {detailEntity.relatedEntities.map(r => (
                <span key={r.id} style={{ fontSize: '9px', padding: '2px 6px', background: `${P.accent}12`, border: `1px solid ${P.accent}25`, borderRadius: '3px', color: P.accent }}>
                  {r.name} <span style={{ color: P.dim }}>({r.relation})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {graphEntities.length === 0 && (
        <div style={{ textAlign: 'center', color: P.dim, fontSize: '11px', padding: '40px' }}>Collecting data for knowledge graph...</div>
      )}
    </div>
  )
}

export function EntityGraphPanel() {
  const [mode, setMode] = useState<ViewMode>('entities')
  const [entities, setEntities] = useState<ExtractedEntity[]>([])
  const [sentiment, setSentiment] = useState<SentimentData[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<ExtractedEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ent, sent] = await Promise.all([window.argus.getEntities(), window.argus.getSentiment()])
      setEntities(ent)
      setSentiment(sent)
    } catch (err: any) {
      setError(err?.message || 'Failed to load entity data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = entities
    if (filter !== 'all') list = list.filter(e => e.type === filter)
    if (search) list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [entities, filter, search])

  const tabs: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'entities', label: 'ENTITIES', icon: '◉', tip: 'Named entities (people, organizations, locations) automatically extracted from incident text using NLP. Shows mention frequency and related entities.' },
    { id: 'sentiment', label: 'SENTIMENT', icon: '◐', tip: 'Overall sentiment analysis of incoming intelligence. Tracks positive/negative/neutral tone across incidents and domains over time.' },
    { id: 'graph', label: 'KNOWLEDGE GRAPH', icon: '⬡', tip: 'Interactive network visualization showing relationships between entities. Nodes = entities, edges = co-occurrence in incidents. Use Min Mentions slider to filter noise.' },
  ]

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: P.dim, fontFamily: P.font, fontSize: '11px' }}>Extracting entities from incidents...</div>
  if (error) return (
    <div style={{ padding: '30px', textAlign: 'center', fontFamily: P.font }}>
      <div style={{ color: '#ff3b5c', fontSize: '11px', marginBottom: '8px' }}>⚠ {error}</div>
      <button onClick={load} style={{ padding: '6px 14px', background: `${P.accent}15`, border: `1px solid ${P.accent}40`, borderRadius: '4px', color: P.accent, fontSize: '10px', cursor: 'pointer', fontFamily: P.font }}>RETRY</button>
    </div>
  )

  return (
    <div style={{ fontFamily: P.font, padding: '16px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setMode(t.id)} style={{
            padding: '6px 12px', background: mode === t.id ? `${P.accent}15` : 'transparent',
            border: `1px solid ${mode === t.id ? P.accent + '40' : P.border}`,
            borderRadius: '4px', color: mode === t.id ? P.accent : P.dim,
            fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.08em',
          }}>{t.icon} {t.label}{mode === t.id && <InfoTip text={(t as any).tip} size={10} />}</button>
        ))}
      </div>

      {mode === 'entities' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entities..."
              style={{ flex: 1, minWidth: '200px', padding: '6px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontSize: '11px', fontFamily: P.font, outline: 'none' }} />
            {['all', 'person', 'organization', 'location', 'weapon'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 8px', background: filter === f ? `${P.accent}15` : 'transparent',
                border: `1px solid ${filter === f ? P.accent + '40' : P.border}`,
                borderRadius: '3px', color: filter === f ? P.accent : P.dim,
                fontSize: '9px', cursor: 'pointer', fontFamily: P.font, textTransform: 'uppercase',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {filtered.slice(0, 60).map(e => {
              const t = TYPE_ICONS[e.type] || { icon: '◉', color: P.accent }
              return (
                <div key={e.id} onClick={() => setSelectedEntity(selectedEntity?.id === e.id ? null : e)}
                  style={{
                    padding: '10px 12px', background: selectedEntity?.id === e.id ? `${t.color}10` : P.card,
                    border: `1px solid ${selectedEntity?.id === e.id ? t.color + '40' : P.border}`,
                    borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: P.text }}>{t.icon} {e.name}</span>
                    {e.sanctioned && <span style={{ fontSize: '9px', padding: '1px 5px', background: '#ff3b5c20', color: '#ff3b5c', borderRadius: '3px', fontWeight: 700 }}>SANCTIONED</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: P.dim }}>
                    <span>{e.type.toUpperCase()}</span>
                    <span>• {e.mentions} mentions</span>
                    <span>• {e.incidentIds.length} incidents</span>
                  </div>
                  {selectedEntity?.id === e.id && e.relatedEntities.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${P.border}` }}>
                      <div style={{ fontSize: '9px', color: P.dim, marginBottom: '4px', letterSpacing: '0.1em' }}>RELATED ENTITIES</div>
                      {e.relatedEntities.slice(0, 5).map(r => (
                        <div key={r.id} style={{ fontSize: '10px', color: P.text, padding: '2px 0' }}>
                          <span style={{ color: P.accent }}>{r.name}</span> <span style={{ color: P.dim }}>({r.relation})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {mode === 'sentiment' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
          {sentiment.map(s => {
            const barWidth = Math.abs(s.score)
            const barColor = s.score > 0 ? '#00e676' : '#ff3b5c'
            return (
              <div key={s.region} style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: P.text }}>{s.region}</span>
                  <span style={{ fontSize: '9px', color: barColor, fontWeight: 700 }}>
                    {s.trend === 'improving' ? '↑' : s.trend === 'worsening' ? '↓' : '→'} {s.trend.toUpperCase()}
                  </span>
                </div>
                <div style={{ height: '6px', background: P.border, borderRadius: '3px', marginBottom: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(barWidth, 100)}%`, background: barColor, borderRadius: '3px', marginLeft: s.score > 0 ? '50%' : `${50 - barWidth}%`, transition: 'all 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: P.dim }}>
                  <span>🟢 {s.positive} pos</span>
                  <span>⚪ {s.neutral} neu</span>
                  <span>🔴 {s.negative} neg</span>
                </div>
                <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>Score: {s.score} | {s.sampleSize} samples</div>
              </div>
            )
          })}
          {sentiment.length === 0 && <div style={{ padding: '20px', color: P.dim, fontSize: '11px' }}>Not enough data for sentiment analysis</div>}
        </div>
      )}

      {mode === 'graph' && (
        <ForceGraph entities={entities} onSelect={setSelectedEntity} selectedId={selectedEntity?.id ?? null} />
      )}

      {/* AI Entity Analysis */}
      <AIEntitySection />
    </div>
  )
}

/* ── AI Entity Analysis ── */
function AIEntitySection() {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleAnalyze = async () => {
    setLoading(true)
    setAnalysis(null)
    try {
      const res = await window.argus.aiEntities()
      setAnalysis(res.summary)
      setModel(res.model)
    } catch (err: any) {
      setAnalysis(`Error: ${err?.message || 'AI unavailable'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '16px', padding: '14px 16px', background: P.card, border: `1px solid #a855f720`, borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: analysis ? '10px' : '0' }}>
        <span style={{ fontSize: '12px' }}>🤖</span>
        <span style={{ fontSize: '9px', color: '#a855f7', fontWeight: 700, letterSpacing: '0.1em' }}>AI ENTITY ANALYSIS</span>
        <div style={{ flex: 1 }} />
        {analysis && (
          <button onClick={() => setExpanded(e => !e)} style={{
            padding: '2px 6px', fontSize: '9px', background: 'transparent',
            border: `1px solid ${P.border}`, borderRadius: '3px',
            color: P.dim, cursor: 'pointer', fontFamily: P.font,
          }}>{expanded ? '\u25BC' : '\u25B6'}</button>
        )}
        <button onClick={handleAnalyze} disabled={loading} style={{
          padding: '4px 12px', fontSize: '9px', fontWeight: 700,
          background: loading ? 'transparent' : '#a855f718',
          border: `1px solid ${loading ? P.border : '#a855f740'}`,
          borderRadius: '4px', color: loading ? P.dim : '#a855f7',
          cursor: loading ? 'wait' : 'pointer', fontFamily: P.font, letterSpacing: '0.06em',
        }}>{loading ? 'ANALYZING...' : analysis ? 'RE-ANALYZE' : 'ANALYZE ENTITIES'}</button>
      </div>
      {loading && (
        <div style={{ fontSize: '9px', color: '#a855f7', padding: '8px 0' }}>
          AI is extracting and analyzing entities from recent incidents...
        </div>
      )}
      {analysis && expanded && (
        <div>
          <MarkdownText text={analysis} style={{ fontSize: '10px', color: P.text, background: P.bg, padding: '10px', borderRadius: '4px', maxHeight: '350px', overflowY: 'auto' }} />
          {model && model !== 'error' && (
            <div style={{ fontSize: '9px', color: P.dim, marginTop: '3px', textAlign: 'right' }}>model: {model}</div>
          )}
        </div>
      )}
    </div>
  )
}
