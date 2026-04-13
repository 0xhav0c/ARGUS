import { useState, useCallback, useMemo } from 'react'
import { useDraggable } from '@/hooks/useDraggable'
import { useBookmarkStore } from '@/stores/bookmark-store'
import { useNotesStore } from '@/stores/notes-store'
import { MarkdownText } from '@/components/ui/MarkdownText'
import type { Incident } from '../../../shared/types'

const P = {
  bg: 'rgba(10,14,23,0.95)',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: '#ff3b5c', text: '#fff' },
  HIGH: { bg: '#ff6b35', text: '#fff' },
  MEDIUM: { bg: '#ffb000', text: '#0a0e17' },
  LOW: { bg: '#4a9eff', text: '#fff' },
  INFO: { bg: '#4a5568', text: '#fff' },
}

const DOMAIN_ICONS: Record<string, string> = {
  CONFLICT: '\u2694', CYBER: '\u26A1', INTEL: '\u25C9', FINANCE: '\u25C6',
}

interface IncidentDetailProps {
  incident: Incident
  onClose: () => void
  onFlyTo?: (incident: Incident) => void
  screenPosition?: { x: number; y: number } | null
}

export function IncidentDetail({ incident, onClose, onFlyTo, screenPosition }: IncidentDetailProps) {
  const sevStyle = SEVERITY_COLORS[incident.severity] ?? SEVERITY_COLORS.INFO
  const { pos, isDragging, onMouseDown, elRef, initialized } = useDraggable(
    screenPosition ? { x: Math.min(screenPosition.x + 20, window.innerWidth - 310), y: Math.max(16, Math.min(screenPosition.y - 80, window.innerHeight - 400)) } : undefined
  )

  const baseStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 210,
    width: '300px', maxHeight: 'calc(100vh - 100px)',
    background: P.bg, border: `1px solid ${P.border}`,
    borderRadius: '8px', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)', fontFamily: P.font,
    userSelect: isDragging ? 'none' : 'auto',
  }

  const posStyle: React.CSSProperties = initialized
    ? { left: `${pos.x}px`, top: `${pos.y}px` }
    : screenPosition
      ? { left: `${Math.min(screenPosition.x + 20, window.innerWidth - 310)}px`, top: `${Math.max(16, Math.min(screenPosition.y - 80, window.innerHeight - 400))}px` }
      : { right: '160px', top: '16px' }

  return (
    <div ref={elRef} onMouseDown={onMouseDown} style={{ ...baseStyle, ...posStyle }}>
      {/* Header - drag handle */}
      <div data-drag-handle style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', borderBottom: `1px solid ${P.border}`,
        cursor: 'grab',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>{DOMAIN_ICONS[incident.domain]}</span>
          <span style={{
            padding: '2px 6px', fontSize: '9px', fontWeight: 700,
            borderRadius: '3px', background: sevStyle.bg, color: sevStyle.text,
          }}>{incident.severity}</span>
          {incident.country && (
            <span style={{ fontSize: '9px', color: P.accent }}>{incident.country}</span>
          )}
        </div>
        <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid #1a2744',
          color: P.dim, cursor: 'pointer', fontSize: '10px', fontFamily: P.font,
          fontWeight: 700, width: '24px', height: '24px', borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>X</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: P.text, margin: '0 0 8px', lineHeight: 1.4 }}>
          {incident.title}
        </h3>

        {incident.description && (
          <p style={{ fontSize: '10px', color: P.dim, lineHeight: 1.5, margin: '0 0 10px' }}>
            {incident.description}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px' }}>
          {[
            ['Source', incident.source, P.text],
            ['Time', new Date(incident.timestamp).toLocaleString(), '#ffb000'],
            ...(incident.country ? [['Location', incident.country, P.accent]] : []),
            ...(incident.latitude != null && incident.longitude != null ? [['Coords', `${incident.latitude.toFixed(2)}\u00B0, ${incident.longitude.toFixed(2)}\u00B0`, P.text]] : []),
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: P.dim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ color: color as string }}>{value}</span>
            </div>
          ))}
        </div>

        {Array.isArray(incident.tags) && incident.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '10px' }}>
            {incident.tags.map(tag => (
              <span key={tag} style={{
                padding: '2px 6px', fontSize: '9px',
                background: '#0d1220', border: `1px solid ${P.border}`,
                borderRadius: '3px', color: P.dim,
              }}>{tag}</span>
            ))}
          </div>
        )}

        <AIAnalysisSection incident={incident} />
        <NotesSection incidentId={incident.id} />
      </div>

      <div style={{ display: 'flex', borderTop: `1px solid ${P.border}` }}>
        {onFlyTo && (
          <button onClick={() => onFlyTo(incident)} style={{
            flex: 1, padding: '8px', fontSize: '10px', letterSpacing: '0.1em',
            color: P.accent, background: 'transparent', border: 'none',
            borderRight: `1px solid ${P.border}`, cursor: 'pointer', fontFamily: P.font,
            fontWeight: 600,
          }}>{'\u25CE'} LOCATE</button>
        )}
        <BookmarkBtn incidentId={incident.id} />
        {incident.sourceUrl && (
          <button onClick={() => window.open(incident.sourceUrl, '_blank', 'noopener,noreferrer')} style={{
            flex: 1, padding: '8px', fontSize: '10px', letterSpacing: '0.1em',
            color: '#4a9eff', background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: P.font, fontWeight: 600,
          }}>{'\u2197'} SOURCE</button>
        )}
      </div>
    </div>
  )
}

function AIAnalysisSection({ incident }: { incident: Incident }) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [model, setModel] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleAnalyze = async () => {
    setLoading(true)
    setAnalysis(null)
    try {
      const res = await window.argus.aiAnalyzeIncident({
        title: incident.title,
        description: incident.description || '',
        domain: incident.domain,
        severity: incident.severity,
        country: incident.country || '',
        source: incident.source || '',
        timestamp: incident.timestamp,
      })
      setAnalysis(res.summary)
      setModel(res.model)
    } catch (err: any) {
      setAnalysis(`Error: ${err?.message || 'AI unavailable'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '10px', borderTop: `1px solid ${P.border}`, paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontSize: '9px', color: P.dim, fontWeight: 700, letterSpacing: '0.08em' }}>AI ANALYSIS</span>
        <button onClick={handleAnalyze} disabled={loading} style={{
          padding: '2px 8px', fontSize: '9px', fontWeight: 600,
          background: loading ? 'transparent' : '#a855f715',
          border: `1px solid ${loading ? P.border : '#a855f740'}`,
          borderRadius: '3px', color: loading ? P.dim : '#a855f7',
          cursor: loading ? 'wait' : 'pointer', fontFamily: P.font,
        }}>{loading ? 'ANALYZING...' : analysis ? 'RE-ANALYZE' : 'ANALYZE'}</button>
        {analysis && (
          <button onClick={() => setExpanded(e => !e)} style={{
            padding: '2px 6px', fontSize: '9px', background: 'transparent',
            border: `1px solid ${P.border}`, borderRadius: '3px',
            color: P.dim, cursor: 'pointer', fontFamily: P.font,
          }}>{expanded ? '\u25BC' : '\u25B6'}</button>
        )}
      </div>
      {loading && <div style={{ fontSize: '9px', color: '#a855f7' }}>Analyzing incident with AI...</div>}
      {analysis && expanded && (
        <div style={{ marginTop: '4px' }}>
          <MarkdownText text={analysis} style={{ fontSize: '10px', color: P.text, background: '#0d1220', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }} />
          {model && model !== 'error' && (
            <div style={{ fontSize: '9px', color: P.dim, marginTop: '3px', textAlign: 'right' }}>model: {model}</div>
          )}
        </div>
      )}
    </div>
  )
}


function NotesSection({ incidentId }: { incidentId: string }) {
  const allNotes = useNotesStore(s => s.notes)
  const addNote = useNotesStore(s => s.addNote)
  const deleteNote = useNotesStore(s => s.deleteNote)
  const notes = useMemo(() => allNotes.filter(n => n.incidentId === incidentId), [allNotes, incidentId])
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (!input.trim()) return
    addNote(incidentId, input.trim())
    setInput('')
  }

  return (
    <div style={{ marginTop: '10px', borderTop: `1px solid ${P.border}`, paddingTop: '8px' }}>
      <span style={{ fontSize: '9px', color: P.dim, fontWeight: 700, letterSpacing: '0.08em' }}>ANALYST NOTES ({notes.length})</span>
      <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a note..."
          style={{ flex: 1, padding: '4px 8px', fontSize: '10px', background: '#0d1220', border: `1px solid ${P.border}`, borderRadius: '4px', color: P.text, fontFamily: P.font, outline: 'none' }} />
        <button onClick={handleAdd} style={{
          padding: '4px 8px', fontSize: '9px', fontWeight: 700, background: '#00d4ff15',
          border: '1px solid #00d4ff40', borderRadius: '4px', color: P.accent, cursor: 'pointer', fontFamily: P.font,
        }}>+</button>
      </div>
      {notes.map(n => (
        <div key={n.id} style={{ display: 'flex', alignItems: 'start', gap: '6px', marginTop: '4px', padding: '4px 6px', background: '#0d1220', borderRadius: '4px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: P.text, lineHeight: 1.4 }}>{n.content}</div>
            <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>{new Date(n.createdAt).toLocaleString()}</div>
          </div>
          <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '10px', padding: '0 2px', flexShrink: 0 }}>{'\u2715'}</button>
        </div>
      ))}
    </div>
  )
}

function BookmarkBtn({ incidentId }: { incidentId: string }) {
  const isBookmarked = useBookmarkStore(s => s.isBookmarked(incidentId))
  const addPin = useBookmarkStore(s => s.addPin)
  const pins = useBookmarkStore(s => s.pins)
  const removePin = useBookmarkStore(s => s.removePin)

  const toggle = () => {
    if (isBookmarked) {
      const pin = pins.find(p => p.incidentId === incidentId)
      if (pin) removePin(pin.id)
    } else {
      addPin(incidentId, 'Important')
    }
  }

  return (
    <button onClick={toggle} style={{
      flex: 1, padding: '8px', fontSize: '10px', letterSpacing: '0.1em',
      color: isBookmarked ? '#f5c542' : '#4a5568', background: 'transparent', border: 'none',
      borderRight: '1px solid #141c2e', cursor: 'pointer',
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
    }}>{isBookmarked ? '★' : '☆'} PIN</button>
  )
}
