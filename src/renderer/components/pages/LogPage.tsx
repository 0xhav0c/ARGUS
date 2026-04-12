import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useLogStore, type LogLevel, type LogCategory, argusLog } from '@/stores/log-store'

function useMainProcessLogs() {
  useEffect(() => {
    if (!window.argus?.onMainLog) return
    const dispose = window.argus.onMainLog((data) => {
      const level = (['debug', 'info', 'warn', 'error'].includes(data.level) ? data.level : 'info') as LogLevel
      const validCats: LogCategory[] = ['feed', 'api', 'twitter', 'finance', 'tracking', 'globe', 'ai', 'ipc', 'ui', 'system', 'network', 'database']
      const category = (validCats.includes(data.category as LogCategory) ? data.category : 'system') as LogCategory
      argusLog(level, category, `[main] ${data.message}`, data.detail)
    })
    return dispose
  }, [])
}

const P = {
  bg: '#0a0e17', card: '#0d1220', border: '#141c2e',
  accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5',
  green: '#00e676', red: '#ff3b5c', yellow: '#f5c542', orange: '#ff6b35',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const LEVEL_STYLE: Record<LogLevel, { color: string; bg: string; label: string }> = {
  debug: { color: P.dim, bg: '#4a556812', label: 'DBG' },
  info: { color: P.accent, bg: '#00d4ff0a', label: 'INF' },
  warn: { color: P.yellow, bg: '#f5c54210', label: 'WRN' },
  error: { color: P.red, bg: '#ff3b5c10', label: 'ERR' },
}

const CATEGORY_COLORS: Record<LogCategory, string> = {
  feed: '#3fb950', api: '#a78bfa', twitter: '#1da1f2', finance: P.yellow,
  tracking: P.orange, globe: '#06b6d4', ai: '#e879f9', ipc: '#6366f1',
  ui: '#14b8a6', system: P.dim, network: '#f97316', database: '#8b5cf6',
}

const ALL_CATEGORIES: LogCategory[] = [
  'feed', 'api', 'twitter', 'finance', 'tracking', 'globe',
  'ai', 'ipc', 'ui', 'system', 'network', 'database',
]

type SubTab = 'all' | 'feed' | 'api' | 'network' | 'system'
const SUB_TABS: { id: SubTab; label: string; categories: LogCategory[] }[] = [
  { id: 'all', label: 'ALL LOGS', categories: ALL_CATEGORIES },
  { id: 'feed', label: 'FEED & DATA', categories: ['feed', 'twitter', 'finance', 'tracking'] },
  { id: 'api', label: 'API & AI', categories: ['api', 'ai', 'ipc'] },
  { id: 'network', label: 'NETWORK', categories: ['network', 'globe'] },
  { id: 'system', label: 'SYSTEM & UI', categories: ['system', 'ui', 'database'] },
]

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

export function LogPage() {
  useMainProcessLogs()
  const entries = useLogStore(s => s.entries)
  const enabled = useLogStore(s => s.enabled)
  const setEnabled = useLogStore(s => s.setEnabled)
  const clear = useLogStore(s => s.clear)

  const [subTab, setSubTab] = useState<SubTab>('all')
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(['debug', 'info', 'warn', 'error']))
  const [searchQ, setSearchQ] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  const activeCategories = SUB_TABS.find(t => t.id === subTab)?.categories || ALL_CATEGORIES

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase()
    return entries.filter(e =>
      activeCategories.includes(e.category) &&
      levelFilter.has(e.level) &&
      (!q || e.message.toLowerCase().includes(q) || (e.detail && e.detail.toLowerCase().includes(q)))
    )
  }, [entries, activeCategories, levelFilter, searchQ])

  useEffect(() => {
    if (autoScroll && listRef.current && entries.length > prevCountRef.current) {
      listRef.current.scrollTop = 0
    }
    prevCountRef.current = entries.length
  }, [entries.length, autoScroll])

  const toggleLevel = useCallback((lv: LogLevel) => {
    setLevelFilter(prev => {
      const next = new Set(prev)
      if (next.has(lv)) next.delete(lv)
      else next.add(lv)
      return next
    })
  }, [])

  const stats = useMemo(() => {
    const s = { debug: 0, info: 0, warn: 0, error: 0 }
    for (const e of entries) s[e.level]++
    return s
  }, [entries])

  const handleTestLog = useCallback(() => {
    argusLog('info', 'system', 'Debug mode test log entry', 'This is a test detail to verify logging is working.')
    argusLog('warn', 'feed', 'Feed refresh test', 'Simulated feed refresh warning.')
    argusLog('debug', 'network', 'Network connectivity check', JSON.stringify({ status: 'ok', latency: '42ms' }))
  }, [])

  return (
    <div style={{ fontFamily: P.font, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: `1px solid ${P.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: enabled ? P.green : P.dim }}>●</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: P.text, letterSpacing: '0.12em' }}>DEBUG LOG</span>
          <span style={{ fontSize: '9px', color: P.dim }}>{entries.length} entries</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Stats badges */}
          {(Object.entries(stats) as [LogLevel, number][]).map(([lv, count]) => (
            <span key={lv} style={{
              fontSize: '8px', fontWeight: 700, padding: '2px 6px',
              borderRadius: '3px', color: LEVEL_STYLE[lv].color,
              background: LEVEL_STYLE[lv].bg, border: `1px solid ${LEVEL_STYLE[lv].color}20`,
            }}>{LEVEL_STYLE[lv].label} {count}</span>
          ))}
          <div style={{ width: '1px', height: '16px', background: P.border, margin: '0 4px' }} />
          <button onClick={() => setAutoScroll(!autoScroll)} style={{
            padding: '3px 8px', fontSize: '8px', fontFamily: P.font, fontWeight: 600,
            background: autoScroll ? `${P.accent}15` : 'transparent',
            border: `1px solid ${autoScroll ? P.accent + '40' : P.border}`,
            borderRadius: '3px', color: autoScroll ? P.accent : P.dim, cursor: 'pointer',
          }}>AUTO-SCROLL {autoScroll ? 'ON' : 'OFF'}</button>
          <button onClick={handleTestLog} style={{
            padding: '3px 8px', fontSize: '8px', fontFamily: P.font, fontWeight: 600,
            background: 'transparent', border: `1px solid ${P.border}`,
            borderRadius: '3px', color: P.dim, cursor: 'pointer',
          }}>TEST</button>
          <button onClick={clear} style={{
            padding: '3px 8px', fontSize: '8px', fontFamily: P.font, fontWeight: 600,
            background: 'transparent', border: `1px solid ${P.border}`,
            borderRadius: '3px', color: P.dim, cursor: 'pointer',
          }}>CLEAR</button>
          <button onClick={() => setEnabled(!enabled)} style={{
            padding: '4px 12px', fontSize: '9px', fontFamily: P.font, fontWeight: 700,
            background: enabled ? `${P.green}15` : `${P.red}15`,
            border: `1px solid ${enabled ? P.green + '40' : P.red + '40'}`,
            borderRadius: '4px', color: enabled ? P.green : P.red, cursor: 'pointer',
            letterSpacing: '0.08em',
          }}>{enabled ? '● LOGGING ON' : '○ LOGGING OFF'}</button>
        </div>
      </div>

      {/* Sub-tabs + level filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '6px 20px', borderBottom: `1px solid ${P.border}`,
        flexWrap: 'wrap',
      }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '6px 12px', fontSize: '9px', fontWeight: 700, fontFamily: P.font,
            background: subTab === t.id ? `${P.accent}12` : 'transparent',
            border: 'none', borderBottom: `2px solid ${subTab === t.id ? P.accent : 'transparent'}`,
            color: subTab === t.id ? P.accent : P.dim, cursor: 'pointer',
            letterSpacing: '0.06em',
          }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: P.dim, letterSpacing: '0.1em', marginRight: '4px' }}>LEVEL:</span>
          {(['debug', 'info', 'warn', 'error'] as LogLevel[]).map(lv => (
            <button key={lv} onClick={() => toggleLevel(lv)} style={{
              padding: '3px 8px', fontSize: '8px', fontFamily: P.font, fontWeight: 600,
              background: levelFilter.has(lv) ? `${LEVEL_STYLE[lv].color}18` : 'transparent',
              border: `1px solid ${levelFilter.has(lv) ? LEVEL_STYLE[lv].color + '40' : P.border}`,
              borderRadius: '3px', color: levelFilter.has(lv) ? LEVEL_STYLE[lv].color : P.dim,
              cursor: 'pointer',
            }}>{LEVEL_STYLE[lv].label}</button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '8px 20px', borderBottom: `1px solid ${P.border}` }}>
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Search logs..."
          style={{
            width: '100%', padding: '6px 12px', fontSize: '10px', fontFamily: P.font,
            background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px',
            color: P.text, outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = P.accent + '50' }}
          onBlur={e => { e.currentTarget.style.borderColor = P.border }}
        />
      </div>

      {/* Log list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        {!enabled && entries.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: '13px', color: P.text, fontWeight: 600, marginBottom: '8px' }}>Debug Logging is Off</div>
            <div style={{ fontSize: '10px', color: P.dim, lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
              Enable logging to capture application events in real-time. Logs include feed updates, API calls, network activity, AI interactions, and system events.
            </div>
            <button onClick={() => setEnabled(true)} style={{
              marginTop: '16px', padding: '8px 24px', fontSize: '10px', fontFamily: P.font,
              fontWeight: 700, background: `${P.green}15`, border: `1px solid ${P.green}40`,
              borderRadius: '6px', color: P.green, cursor: 'pointer', letterSpacing: '0.1em',
            }}>ENABLE LOGGING</button>
          </div>
        )}
        {enabled && filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>
            {entries.length === 0 ? 'Waiting for log entries...' : 'No entries match current filters.'}
          </div>
        )}
        {filtered.map(entry => {
          const ls = LEVEL_STYLE[entry.level]
          const cc = CATEGORY_COLORS[entry.category]
          const isExpanded = expandedId === entry.id
          return (
            <div
              key={entry.id}
              onClick={() => entry.detail && setExpandedId(isExpanded ? null : entry.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0',
                padding: '4px 20px', borderBottom: `1px solid ${P.border}08`,
                background: isExpanded ? '#111827' : entry.level === 'error' ? '#ff3b5c06' : entry.level === 'warn' ? '#f5c54206' : 'transparent',
                cursor: entry.detail ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#0d122080' }}
              onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = entry.level === 'error' ? '#ff3b5c06' : entry.level === 'warn' ? '#f5c54206' : 'transparent' }}
            >
              <span style={{ fontSize: '9px', color: P.dim, fontVariantNumeric: 'tabular-nums', width: '82px', flexShrink: 0, paddingTop: '2px' }}>
                {formatTime(entry.timestamp)}
              </span>
              <span style={{
                fontSize: '8px', fontWeight: 700, color: ls.color, width: '28px', flexShrink: 0,
                padding: '2px 0', textAlign: 'center',
              }}>{ls.label}</span>
              <span style={{
                fontSize: '8px', fontWeight: 600, color: cc, width: '60px', flexShrink: 0,
                padding: '2px 4px', letterSpacing: '0.03em', textTransform: 'uppercase',
              }}>{entry.category}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '10px', color: P.text, lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {entry.message}
                  {entry.detail && !isExpanded && (
                    <span style={{ color: P.dim, fontSize: '9px', marginLeft: '6px' }}>▸</span>
                  )}
                </div>
                {isExpanded && entry.detail && (
                  <pre style={{
                    margin: '4px 0 2px', padding: '8px 10px', fontSize: '9px',
                    background: '#0a0e17', border: `1px solid ${P.border}`,
                    borderRadius: '4px', color: P.dim, lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    fontFamily: P.font, overflow: 'hidden',
                  }}>{entry.detail}</pre>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
