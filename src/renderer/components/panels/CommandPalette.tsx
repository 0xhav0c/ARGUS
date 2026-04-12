import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { MarkdownText } from '@/components/ui/MarkdownText'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

export interface Command {
  id: string
  label: string
  shortcut?: string
  category: string
  icon: string
  action: () => void
}

interface Props {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}

/* ── Keyboard Shortcuts Guide Modal ── */
export function KeyboardShortcutsGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  const sections: { title: string; shortcuts: { keys: string; desc: string }[] }[] = [
    { title: 'Navigation', shortcuts: [
      { keys: 'Alt + 1-8', desc: 'Quick switch between tabs (Intelligence...Feed)' },
      { keys: 'Ctrl + K', desc: 'Toggle command palette' },
      { keys: '?', desc: 'Open this shortcuts guide' },
    ]},
    { title: 'Globe / Map', shortcuts: [
      { keys: 'Home', desc: 'Reset globe to default view' },
      { keys: 'Ctrl + F', desc: 'Toggle fullscreen map' },
      { keys: 'N', desc: 'Fly to next incident' },
      { keys: 'P', desc: 'Fly to previous incident' },
    ]},
    { title: 'Actions', shortcuts: [
      { keys: 'B', desc: 'Bookmark selected incident' },
      { keys: 'R', desc: 'Refresh feeds' },
      { keys: 'Escape', desc: 'Close popup / panel' },
    ]},
    { title: 'Playback', shortcuts: [
      { keys: 'Space', desc: 'Play / pause timeline' },
      { keys: '[', desc: 'Decrease playback speed' },
      { keys: ']', desc: 'Increase playback speed' },
    ]},
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '520px', maxHeight: '70vh', background: P.card, border: `1px solid ${P.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: P.text, letterSpacing: '0.1em' }}>KEYBOARD SHORTCUTS</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
        <div style={{ padding: '12px 20px', overflowY: 'auto', maxHeight: 'calc(70vh - 60px)' }}>
          {sections.map(s => (
            <div key={s.title} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', color: P.accent, letterSpacing: '0.12em', marginBottom: '8px', textTransform: 'uppercase' }}>{s.title}</div>
              {s.shortcuts.map(sc => (
                <div key={sc.keys} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${P.border}22` }}>
                  <span style={{ fontSize: '12px', color: P.text, opacity: 0.85 }}>{sc.desc}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {sc.keys.split(' + ').map((k, i) => (
                      <span key={i} style={{ fontSize: '10px', color: P.accent, padding: '2px 8px', background: `${P.accent}10`, border: `1px solid ${P.accent}30`, borderRadius: '4px', fontFamily: P.font }}>{k.trim()}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CommandPalette({ isOpen, onClose, commands }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const filtered = query.length === 0 ? commands : commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c)
    return acc
  }, {})

  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && filtered[selectedIdx]) { filtered[selectedIdx].action(); onClose() }
    else if (e.key === 'Escape') onClose()
  }, [filtered, selectedIdx, onClose])

  if (!isOpen) return null

  let flatIdx = 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '580px', maxHeight: '420px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: P.accent, fontSize: '14px' }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: P.text, fontSize: '14px', fontFamily: P.font }}
          />
          <span style={{ fontSize: '9px', color: P.dim, padding: '2px 6px', border: `1px solid ${P.border}`, borderRadius: '3px' }}>ESC</span>
        </div>
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px 0' }}>
          {Object.entries(grouped).map(([cat, cmds]) => (
            <div key={cat}>
              <div style={{ padding: '6px 16px', fontSize: '9px', color: P.dim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{cat}</div>
              {cmds.map(cmd => {
                const idx = flatIdx++
                return (
                  <div key={cmd.id} onClick={() => { cmd.action(); onClose() }}
                    style={{
                      padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                      cursor: 'pointer', background: idx === selectedIdx ? `${P.accent}10` : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <span style={{ fontSize: '14px', width: '22px', textAlign: 'center' }}>{cmd.icon}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: idx === selectedIdx ? P.text : P.dim }}>{cmd.label}</span>
                    {cmd.shortcut && <span style={{ fontSize: '9px', color: P.dim, padding: '2px 6px', border: `1px solid ${P.border}`, borderRadius: '3px' }}>{cmd.shortcut}</span>}
                  </div>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: P.dim, fontSize: '12px' }}>No commands found</div>}
        </div>
      </div>
    </div>
  )
}

/* ── AI Threat Summarizer Panel ── */
const aiInputStyle: CSSProperties = {
  width: '100%', padding: '10px 14px', background: P.bg, border: `1px solid ${P.border}`,
  borderRadius: '8px', color: P.text, fontFamily: P.font, fontSize: '13px',
  outline: 'none', boxSizing: 'border-box', resize: 'none',
}

const EXAMPLE_QUERIES = [
  'What happened in the Middle East in the last 6 hours?',
  'What are the current cyber threats?',
  'Ukraine-Russia conflict summary',
  'Summarize critical events today',
  'Financial market disruption risks',
]

export function AIPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ summary: string; model: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [status, setStatus] = useState<{ ollama: boolean; openai: boolean; custom?: boolean } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      window.argus.aiCheck?.().then(s => setStatus(s)).catch(() => {})
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setResult(null)
    setElapsed(0)
    const start = Date.now()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const res = await window.argus.aiSummarize(query.trim())
      setResult(res)
    } catch (err: any) {
      const msg = err?.message || 'Unknown error'
      const hint = msg.includes('timeout') || msg.includes('abort')
        ? '\n\nThe AI provider took too long to respond. Check if your AI backend is running and accessible.'
        : msg.includes('fetch') || msg.includes('ECONNREFUSED')
        ? '\n\nCould not connect to the AI provider. Make sure the service is running.'
        : ''
      setResult({ summary: `Error: ${msg}${hint}`, model: 'error' })
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '640px', maxHeight: '80vh', background: P.card, border: `1px solid ${P.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>🤖</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: P.text, letterSpacing: '0.1em' }}>AI THREAT ANALYST</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {status && (
              <span style={{ fontSize: '9px', color: status.ollama || status.openai || status.custom ? '#00ff87' : '#ff3b5c' }}>
                {status.ollama ? 'Ollama ✓' : status.openai ? 'OpenAI ✓' : status.custom ? 'Custom AI ✓' : 'No AI backend'}
              </span>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          <textarea
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Ask about threats, regions, events..."
            rows={2}
            style={aiInputStyle}
          />

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {EXAMPLE_QUERIES.map((q, i) => (
              <button key={i} onClick={() => { setQuery(q); setTimeout(handleSubmit, 50) }}
                style={{ padding: '3px 8px', fontSize: '8px', background: `${P.accent}10`, border: `1px solid ${P.accent}25`, borderRadius: '4px', color: P.accent, cursor: 'pointer', fontFamily: P.font }}>
                {q.length > 35 ? q.slice(0, 35) + '...' : q}
              </button>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={loading || !query.trim()}
            style={{ marginTop: '12px', padding: '8px 20px', fontSize: '11px', fontWeight: 600, background: loading ? P.dim + '30' : `${P.accent}20`, border: `1px solid ${loading ? P.dim : P.accent}50`, borderRadius: '6px', color: loading ? P.text : P.accent, cursor: loading ? 'wait' : 'pointer', fontFamily: P.font, letterSpacing: '0.08em', width: '100%' }}>
            {loading ? `ANALYZING... ${elapsed}s` : 'ANALYZE'}
          </button>
          {loading && elapsed >= 10 && (
            <div style={{ marginTop: '6px', fontSize: '9px', color: '#f5c542', textAlign: 'center' }}>
              {elapsed >= 30 ? '⚠ This is taking unusually long. Your AI provider may be slow or unresponsive.' : 'Waiting for AI response...'}
            </div>
          )}

          {result && (
            <div style={{ marginTop: '16px', padding: '16px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
              <div style={{ fontSize: '8px', color: P.dim, marginBottom: '8px', letterSpacing: '0.1em' }}>
                MODEL: {result.model.toUpperCase()}
              </div>
              <MarkdownText text={result.summary} style={{ fontSize: '12px', color: P.text }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
