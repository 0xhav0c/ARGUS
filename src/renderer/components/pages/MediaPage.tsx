import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTVStore, type UserTVChannel } from '@/stores/tv-store'
import { DashboardTweets } from '@/components/dashboard/DashboardTweets'
import { HLSPlayer } from '@/components/media/HLSPlayer'
import type { TelegramMessage } from '../../../shared/types'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

type GridSize = '2x2' | '3x3' | '4x4'

interface TVTemplate {
  id: string
  name: string
  gridSize: GridSize
  channelIds: string[]
}

const GRID_SIZES: { id: GridSize; label: string; cols: number }[] = [
  { id: '2x2', label: '2×2', cols: 2 },
  { id: '3x3', label: '3×3', cols: 3 },
  { id: '4x4', label: '4×4', cols: 4 },
]

/** Check if input looks like a YouTube channel ID (UC..., 20+ chars) */
function isYouTubeChannelId(input: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(input) && !input.includes('.')
}

function getStoredTemplates(): TVTemplate[] {
  try {
    const raw = localStorage.getItem('argus-tv-templates')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveStoredTemplates(templates: TVTemplate[]) {
  localStorage.setItem('argus-tv-templates', JSON.stringify(templates))
}

const PRIORITY_COLORS: Record<string, string> = { high: '#ff3b5c', medium: '#ffb000', low: '#4a5568' }
const CAT_COLORS: Record<string, string> = { conflict: '#ff6b35', cyber: '#00ff87', osint: '#4a9eff', geopolitics: '#a855f7', custom: '#f5c542' }
const TG_CATEGORIES = ['all', 'conflict', 'cyber', 'osint', 'geopolitics', 'custom'] as const

function TelegramMonitor() {
  const [messages, setMessages] = useState<TelegramMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [catFilter, setCatFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [chName, setChName] = useState('')
  const [chTitle, setChTitle] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchMessages = useCallback(async () => {
    if (!window.argus) return
    setLoading(true)
    try {
      const data = await window.argus.getTelegramMessages()
      if (mountedRef.current && Array.isArray(data)) setMessages(data)
    } catch { /* ignore */ }
    finally { if (mountedRef.current) setLoading(false) }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchMessages()
    timerRef.current = setInterval(fetchMessages, 60000)
    return () => { mountedRef.current = false; if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchMessages])

  const filtered = useMemo(() =>
    catFilter === 'all' ? messages : messages.filter(m => m.category === catFilter)
  , [messages, catFilter])

  const handleAddChannel = useCallback(async () => {
    if (!chName.trim()) return
    await window.argus?.addTelegramChannel(chName.trim(), chTitle.trim() || chName.trim())
    setChName(''); setChTitle(''); setAddOpen(false)
    fetchMessages()
  }, [chName, chTitle, fetchMessages])

  const handleRemoveChannel = useCallback(async (name: string) => {
    await window.argus?.removeTelegramChannel(name)
    fetchMessages()
  }, [fetchMessages])

  const customChannels = useMemo(() => {
    const seen = new Set<string>()
    return messages.filter(m => m.category === 'custom' && !seen.has(m.channel) && seen.add(m.channel)).map(m => ({ name: m.channel, title: m.channelTitle }))
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: P.font }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: P.accent, letterSpacing: '0.12em' }}>TELEGRAM</span>
          {loading && <span style={{ fontSize: '9px', color: P.dim }}>fetching...</span>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setAddOpen(o => !o)} style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}40`, color: P.accent, cursor: 'pointer', fontSize: '9px', fontFamily: P.font, padding: '2px 8px', borderRadius: '3px', letterSpacing: '0.08em' }}>
            {addOpen ? 'CANCEL' : '+ CHANNEL'}
          </button>
          <button onClick={fetchMessages} style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.dim, cursor: 'pointer', fontSize: '9px', fontFamily: P.font, padding: '2px 8px', borderRadius: '3px' }}>
            REFRESH
          </button>
        </div>
      </div>

      {addOpen && (
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${P.border}`, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={chName} onChange={e => setChName(e.target.value)} placeholder="Channel @name" style={{ flex: 1, minWidth: '100px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '3px', padding: '4px 8px', color: P.text, fontFamily: P.font, fontSize: '9px' }} />
          <input value={chTitle} onChange={e => setChTitle(e.target.value)} placeholder="Display title" style={{ flex: 1, minWidth: '100px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '3px', padding: '4px 8px', color: P.text, fontFamily: P.font, fontSize: '9px' }} />
          <button onClick={handleAddChannel} style={{ background: P.accent, border: 'none', color: P.bg, cursor: 'pointer', fontSize: '9px', fontFamily: P.font, fontWeight: 700, padding: '5px 12px', borderRadius: '3px' }}>ADD</button>
        </div>
      )}

      {customChannels.length > 0 && (
        <div style={{ padding: '6px 12px', borderBottom: `1px solid ${P.border}`, display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>CUSTOM:</span>
          {customChannels.map(c => (
            <span key={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', background: '#f5c54215', border: '1px solid #f5c54230', borderRadius: '3px', fontSize: '9px', color: '#f5c542' }}>
              {c.title}
              <button onClick={() => handleRemoveChannel(c.name)} style={{ background: 'none', border: 'none', color: '#ff3b5c80', cursor: 'pointer', fontSize: '9px', fontFamily: P.font, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '3px', padding: '6px 12px', borderBottom: `1px solid ${P.border}`, flexWrap: 'wrap' }}>
        {TG_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)} style={{
            padding: '2px 8px', fontSize: '9px', fontFamily: P.font,
            background: catFilter === cat ? `${CAT_COLORS[cat] || P.accent}15` : 'transparent',
            border: `1px solid ${catFilter === cat ? (CAT_COLORS[cat] || P.accent) + '40' : P.border}`,
            borderRadius: '3px', cursor: 'pointer',
            color: catFilter === cat ? (CAT_COLORS[cat] || P.accent) : P.dim,
          }}>{cat.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '9px', color: P.dim }}>No messages in this category.</div>
        ) : filtered.map(msg => (
          <div key={msg.id} style={{
            padding: '8px 12px', borderBottom: `1px solid ${P.border}15`,
            borderLeft: `3px solid ${PRIORITY_COLORS[msg.priority] || P.dim}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: CAT_COLORS[msg.category] || P.dim, letterSpacing: '0.1em', padding: '1px 4px', background: `${CAT_COLORS[msg.category] || P.dim}12`, borderRadius: '2px' }}>
                {msg.category.toUpperCase()}
              </span>
              <span style={{ fontSize: '9px', color: P.accent, fontWeight: 600 }}>{msg.channelTitle}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: PRIORITY_COLORS[msg.priority], letterSpacing: '0.08em' }}>
                {msg.priority.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: P.text, lineHeight: 1.4, marginBottom: '3px', wordBreak: 'break-word' }}>
              {msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content}
            </div>
            <div style={{ fontSize: '9px', color: P.dim }}>
              {new Date(msg.timestamp).toLocaleString()}
              {msg.views != null && ` · ${(msg.views / 1000).toFixed(1)}k views`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MediaPage({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const channels = useTVStore(s => s.channels)
  const categories = useTVStore(s => s.categories)

  const [gridSize, setGridSize] = useState<GridSize>('2x2')
  const [activeChannels, setActiveChannels] = useState<(UserTVChannel | null)[]>([])
  const [templates, setTemplates] = useState<TVTemplate[]>(getStoredTemplates)
  const [templateName, setTemplateName] = useState('')
  const [category, setCategory] = useState('all')
  const [channelPicker, setChannelPicker] = useState<number | null>(null)
  const [dragSlot, setDragSlot] = useState<number | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slot: number } | null>(null)
  const [mutedSlots, setMutedSlots] = useState<Record<number, boolean>>({})
  const [volumeLevels, setVolumeLevels] = useState<Record<number, number>>({})
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({})
  // Resolved YouTube video IDs: channelId → { videoId, loading }
  const [resolvedIds, setResolvedIds] = useState<Record<string, { videoId: string | null; loading: boolean }>>({})
  const resolvingRef = useRef<Set<string>>(new Set())

  const gridConfig = GRID_SIZES.find(g => g.id === gridSize)!
  const totalSlots = gridConfig.cols * gridConfig.cols

  const ensureSlots = useCallback((size: GridSize) => {
    const config = GRID_SIZES.find(g => g.id === size)!
    const total = config.cols * config.cols
    setActiveChannels(prev => {
      const next = [...prev]
      while (next.length < total) next.push(null)
      return next.slice(0, total)
    })
  }, [])

  const handleGridChange = useCallback((size: GridSize) => {
    setGridSize(size)
    ensureSlots(size)
  }, [ensureSlots])

  const handleSelectChannel = useCallback((slotIndex: number, channel: UserTVChannel) => {
    setActiveChannels(prev => {
      const next = [...prev]
      while (next.length <= slotIndex) next.push(null)
      next[slotIndex] = channel
      return next
    })
    setChannelPicker(null)
  }, [])

  const handleSwapSlots = useCallback((from: number, to: number) => {
    if (from === to || from == null) return
    setActiveChannels(prev => {
      const next = [...prev]
      const temp = next[from]
      next[from] = next[to]
      next[to] = temp
      return next
    })
  }, [])

  // Resolve YouTube channel IDs → video IDs (for embed) via main process
  useEffect(() => {
    activeChannels.forEach(ch => {
      if (!ch?.url) return
      const url = ch.url
      if (!isYouTubeChannelId(url)) return
      if (url in resolvedIds || resolvingRef.current.has(url)) return
      resolvingRef.current.add(url)
      setResolvedIds(prev => ({ ...prev, [url]: { videoId: null, loading: true } }))
      window.argus?.resolveYtLive(url).then(videoId => {
        setResolvedIds(prev => ({
          ...prev,
          [url]: { videoId: videoId as string | null, loading: false },
        }))
      }).catch(() => {
        setResolvedIds(prev => ({
          ...prev,
          [url]: { videoId: null, loading: false },
        }))
      }).finally(() => {
        resolvingRef.current.delete(url)
      })
    })
  }, [activeChannels, resolvedIds])

  /** Build the embed URL for a channel — returns null if not yet resolved */
  const getEmbedUrl = useCallback((ch: UserTVChannel, muted: boolean): string | null => {
    const url = ch.url
    const m = muted ? '1' : '0'
    // Origin query param required by YouTube when enablejsapi=1; falling back to 127.0.0.1
    // matches the renderer server bind address used in packaged builds.
    const origin = encodeURIComponent(`${window.location.protocol}//${window.location.host}`)
    const ytParams = `autoplay=1&mute=${m}&enablejsapi=1&modestbranding=1&rel=0&playsinline=1&origin=${origin}`
    if (isYouTubeChannelId(url)) {
      const resolved = resolvedIds[url]
      if (!resolved || resolved.loading) return null
      if (!resolved.videoId) return null
      return `https://www.youtube.com/embed/${resolved.videoId}?${ytParams}`
    }
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return `https://www.youtube.com/embed/${url}?${ytParams}`
    if (url.includes('youtube.com/watch')) { try { const id = new URL(url).searchParams.get('v'); if (id) return `https://www.youtube.com/embed/${id}?${ytParams}` } catch {} }
    if (url.includes('youtu.be/')) { const id = url.split('youtu.be/')[1]?.split('?')[0]; if (id) return `https://www.youtube.com/embed/${id}?${ytParams}` }
    if (url.includes('youtube.com/embed')) return url
    if (url.includes('twitch.tv')) { const tc = url.split('twitch.tv/')[1]?.split('/')[0]; if (tc) return `https://player.twitch.tv/?channel=${tc}&parent=${window.location.hostname || '127.0.0.1'}&muted=${muted}` }
    if (url.endsWith('.m3u8') || url.includes('.m3u8?')) return url
    return url
  }, [resolvedIds])

  /** Check if a URL is a direct HLS stream (not YouTube/Twitch iframe) */
  const isHlsStream = useCallback((url: string): boolean => {
    return url.endsWith('.m3u8') || url.includes('.m3u8?') || url.includes('.m3u8&')
  }, [])

  const toggleMute = useCallback((slot: number) => {
    setMutedSlots(prev => {
      const isMuted = prev[slot] !== false
      const newState = { ...prev, [slot]: !isMuted }
      // Post message to YouTube iframe to toggle mute
      const iframe = iframeRefs.current[slot]
      if (iframe?.contentWindow) {
        const cmd = !isMuted
          ? '{"event":"command","func":"mute","args":""}'
          : '{"event":"command","func":"unMute","args":""}'
        iframe.contentWindow.postMessage(cmd, '*')
      }
      return newState
    })
  }, [])

  const handleVolumeChange = useCallback((slot: number, vol: number) => {
    setVolumeLevels(prev => ({ ...prev, [slot]: vol }))
    if (vol > 0 && mutedSlots[slot] !== false) {
      setMutedSlots(prev => ({ ...prev, [slot]: false }))
    }
    if (vol === 0) {
      setMutedSlots(prev => ({ ...prev, [slot]: true }))
    }
    const iframe = iframeRefs.current[slot]
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*')
      if (vol > 0) iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*')
    }
  }, [mutedSlots])

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) return
    const t: TVTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      gridSize,
      channelIds: activeChannels.map(c => c?.id || ''),
    }
    const updated = [...templates, t]
    setTemplates(updated)
    saveStoredTemplates(updated)
    setTemplateName('')
  }, [templateName, gridSize, activeChannels, templates])

  const handleLoadTemplate = useCallback((t: TVTemplate) => {
    setGridSize(t.gridSize)
    const loaded = t.channelIds.map(id => channels.find(c => c.id === id) || null)
    setActiveChannels(loaded)
  }, [channels])

  const handleDeleteTemplate = useCallback((id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    saveStoredTemplates(updated)
  }, [templates])

  const filteredChannels = useMemo(() => {
    if (category === 'all') return channels
    return channels.filter(c => c.category === category)
  }, [channels, category])

  const catOptions = useMemo(() => [
    { id: 'all', label: 'ALL', color: P.accent },
    ...categories.map(c => ({
      id: c, label: c.toUpperCase(),
      color: c === 'news' ? '#ff6b35' : c === 'finance' ? '#f5c542' : c === 'government' ? '#4a9eff' : '#00ff87',
    })),
  ], [categories])

  if (activeChannels.length === 0) ensureSlots(gridSize)

  return (
    <div style={{ display: 'flex', minHeight: '60vh', flexWrap: 'wrap', overflow: 'hidden' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      {/* Left: TV Grid */}
      <div style={{ flex: '1 1 300px', padding: '16px 20px', borderRight: `1px solid ${P.border}`, minWidth: 0, overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>GRID</span>
            {GRID_SIZES.map(g => (
              <button key={g.id} onClick={() => handleGridChange(g.id)} style={{
                padding: '4px 10px', fontSize: '9px', fontWeight: 600,
                background: gridSize === g.id ? `${P.accent}12` : 'transparent',
                border: `1px solid ${gridSize === g.id ? P.accent + '40' : P.border}`,
                borderRadius: '3px', cursor: 'pointer', fontFamily: P.font,
                color: gridSize === g.id ? P.accent : P.dim,
              }}>{g.label}</button>
            ))}
          </div>

          <div style={{ width: '1px', height: '16px', background: P.border }} />

          {/* Save template */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name..."
              style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: '3px', padding: '3px 8px', color: P.text, fontFamily: P.font, fontSize: '9px', width: '120px', outline: 'none' }}
            />
            <button onClick={handleSaveTemplate} style={{
              padding: '3px 10px', fontSize: '9px', fontWeight: 600, background: '#3fb95015',
              border: '1px solid #3fb95040', borderRadius: '3px', cursor: 'pointer', color: '#3fb950', fontFamily: P.font,
            }}>SAVE</button>
          </div>

          {/* Manage channels via Settings */}
          <button onClick={() => onOpenSettings?.()} style={{
            padding: '3px 10px', fontSize: '9px', fontWeight: 600, background: `${P.accent}10`,
            border: `1px solid ${P.accent}30`, borderRadius: '3px', cursor: 'pointer',
            color: P.accent, fontFamily: P.font, letterSpacing: '0.08em',
          }}>⚙ MANAGE</button>

          {/* Load templates */}
          {templates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '9px', color: P.dim }}>TEMPLATES:</span>
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button onClick={() => handleLoadTemplate(t)} style={{
                    padding: '2px 8px', fontSize: '9px', background: `${P.accent}08`,
                    border: `1px solid ${P.border}`, borderRadius: '3px', cursor: 'pointer',
                    color: P.accent, fontFamily: P.font,
                  }}>{t.name} ({t.gridSize})</button>
                  <button onClick={() => handleDeleteTemplate(t.id)} style={{
                    padding: '1px 4px', fontSize: '9px', background: 'transparent',
                    border: 'none', cursor: 'pointer', color: '#ff3b5c60', fontFamily: P.font,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TV Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
          gap: '4px',
        }}>
          {Array.from({ length: totalSlots }, (_, i) => {
            const ch = activeChannels[i]
            const isDragOver = dragOverSlot === i && dragSlot !== i
            const isMuted = mutedSlots[i] !== false
            return (
              <div key={i}
                draggable={!!ch}
                onDragStart={() => { setDragSlot(i) }}
                onDragOver={(e) => { e.preventDefault(); setDragOverSlot(i) }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => { e.preventDefault(); handleSwapSlots(dragSlot!, i); setDragSlot(null); setDragOverSlot(null) }}
                onDragEnd={() => { setDragSlot(null); setDragOverSlot(null) }}
                onContextMenu={(e) => { e.preventDefault(); if (ch) { setContextMenu({ x: e.clientX, y: e.clientY, slot: i }) } }}
                style={{
                  aspectRatio: '16/9',
                  background: '#000',
                  border: `1px solid ${isDragOver ? P.accent : dragSlot === i ? '#ff6b35' : P.border}`,
                  borderRadius: '4px',
                  overflow: 'hidden', position: 'relative',
                  cursor: ch ? 'grab' : 'pointer',
                  transition: 'border-color 0.15s',
                  boxShadow: isDragOver ? `0 0 12px ${P.accent}40` : 'none',
                }}>
                {ch ? (() => {
                  const embedUrl = getEmbedUrl(ch, isMuted)
                  const resolved = isYouTubeChannelId(ch.url) ? resolvedIds[ch.url] : null
                  const isLoading = resolved?.loading ?? (isYouTubeChannelId(ch.url) && !resolved)
                  const noStream = resolved && !resolved.loading && !resolved.videoId
                  const useHls = embedUrl ? isHlsStream(embedUrl) : false
                  // Status indicator color
                  const statusColor = isLoading ? '#f5c542' : noStream ? '#ff3b5c' : '#3fb950'
                  return (
                    <>
                      <div style={{ width: '100%', height: 'calc(100% - 26px)', background: '#000' }}>
                        {isLoading ? (
                          /* Loading spinner */
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{ width: '20px', height: '20px', border: '2px solid #333', borderTop: `2px solid ${P.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>Resolving live stream...</span>
                          </div>
                        ) : noStream ? (
                          /* No live stream */
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>📡</span>
                            <span style={{ fontSize: '9px', color: '#ff6b7a', fontFamily: P.font }}>No live stream available</span>
                            <button onClick={(e) => { e.stopPropagation(); setResolvedIds(prev => { const n = { ...prev }; delete n[ch.url]; return n }) }}
                              style={{ fontSize: '9px', color: '#f5c542', background: 'none', border: `1px solid #f5c54240`, borderRadius: '3px', padding: '3px 10px', cursor: 'pointer', fontFamily: P.font, marginTop: '4px' }}>
                              ↻ RETRY
                            </button>
                          </div>
                        ) : useHls && embedUrl ? (
                          /* HLS Player for m3u8 streams */
                          <HLSPlayer
                            src={embedUrl}
                            channelName={ch.name}
                            muted={isMuted}
                            volume={volumeLevels[i] ?? 50}
                            visible={true}
                            loading={false}
                            error={null}
                          />
                        ) : embedUrl ? (
                          /* YouTube/Twitch iframe embed */
                          <iframe
                            ref={el => { iframeRefs.current[i] = el }}
                            src={embedUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      {/* Bottom control bar */}
                      <div style={{
                        height: '26px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '0 6px',
                        background: '#0a0e17', borderTop: `1px solid ${P.border}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '9px', color: '#ccc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                          <button onClick={(e) => { e.stopPropagation(); toggleMute(i) }}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '0 3px', color: isMuted ? P.dim : '#00d4ff' }}>
                            {isMuted ? '🔇' : '🔊'}
                          </button>
                          <input type="range" min="0" max="100" value={volumeLevels[i] ?? 50}
                            title={`Volume: ${volumeLevels[i] ?? 50}%`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); handleVolumeChange(i, Number(e.target.value)) }}
                            style={{ width: '48px', height: '3px', cursor: 'pointer', accentColor: '#00d4ff', opacity: isMuted ? 0.3 : 1 }}
                          />
                          <button onClick={(e) => { e.stopPropagation(); setChannelPicker(i) }}
                            title="Switch channel"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '0 3px', color: P.dim }}>
                            ⇄
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); const next = [...activeChannels]; next[i] = null; setActiveChannels(next) }}
                            title="Remove"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '0 3px', color: '#ff3b5c80' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </>
                  )
                })() : (
                  <button onClick={() => setChannelPicker(i)} style={{
                    width: '100%', height: '100%', background: P.card, border: 'none',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '4px',
                    color: P.dim, fontFamily: P.font,
                  }}>
                    <span style={{ fontSize: '20px' }}>+</span>
                    <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>ADD CHANNEL</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setContextMenu(null)} />
            <div style={{
              position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 200,
              background: '#0d1220', border: `1px solid ${P.border}`, borderRadius: '6px',
              padding: '4px 0', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              fontFamily: P.font,
            }}>
              {[
                { label: mutedSlots[contextMenu.slot] !== false ? '🔊 Unmute' : '🔇 Mute', action: () => toggleMute(contextMenu.slot) },
                { label: '⇄ Switch Channel', action: () => setChannelPicker(contextMenu.slot) },
                { label: '✕ Remove', action: () => { const next = [...activeChannels]; next[contextMenu.slot] = null; setActiveChannels(next) }, color: '#ff6b7a' },
              ].map((item, idx) => (
                <button key={idx} onClick={() => { item.action(); setContextMenu(null) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: item.color || P.text, fontSize: '10px', fontFamily: P.font,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#141c2e'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{item.label}</button>
              ))}
            </div>
          </>
        )}

        {/* Channel picker modal */}
        {channelPicker !== null && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setChannelPicker(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '500px', maxHeight: '70vh', background: P.bg,
              border: `1px solid ${P.border}`, borderRadius: '8px',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              fontFamily: P.font,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', color: P.text, fontWeight: 700, letterSpacing: '0.15em' }}>SELECT CHANNEL</span>
                <button onClick={() => setChannelPicker(null)} style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
              <div style={{ padding: '8px 16px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {catOptions.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} style={{
                    padding: '3px 8px', fontSize: '9px', fontWeight: 600,
                    background: category === c.id ? `${c.color}15` : 'transparent',
                    border: `1px solid ${category === c.id ? c.color + '40' : P.border}`,
                    borderRadius: '3px', cursor: 'pointer', color: category === c.id ? c.color : P.dim, fontFamily: P.font,
                  }}>{c.label}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
                {filteredChannels.map(ch => (
                  <button key={ch.id} onClick={() => handleSelectChannel(channelPicker, ch)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '8px 10px', textAlign: 'left', background: 'transparent',
                    border: `1px solid ${P.border}`, borderRadius: '4px', cursor: 'pointer',
                    fontFamily: P.font, marginBottom: '4px', transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.card; e.currentTarget.style.borderColor = P.accent + '30' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = P.border }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3fb950', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: P.text }}>{ch.name}</div>
                      <div style={{ fontSize: '9px', color: P.dim }}>{ch.country} · {ch.language.toUpperCase()}</div>
                    </div>
                    <span style={{ fontSize: '9px', color: P.dim, padding: '2px 5px', background: P.card, borderRadius: '3px' }}>{ch.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Tweets + Telegram sidebar */}
      <div style={{ flex: '0 1 340px', minWidth: '260px', maxWidth: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '0 0 auto', maxHeight: '45%', overflow: 'hidden' }}>
          <DashboardTweets />
        </div>
        <div style={{ flex: 1, minHeight: 0, borderTop: `1px solid ${P.border}`, overflow: 'hidden' }}>
          <TelegramMonitor />
        </div>
      </div>
    </div>
  )
}
