import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from 'react'
import { useTwitterStore } from '@/stores/twitter-store'
import type { VIPTweet } from '../../../shared/types'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '\uD83C\uDDFA\uD83C\uDDF8', GB: '\uD83C\uDDEC\uD83C\uDDE7', FR: '\uD83C\uDDEB\uD83C\uDDF7',
  DE: '\uD83C\uDDE9\uD83C\uDDEA', TR: '\uD83C\uDDF9\uD83C\uDDF7', UA: '\uD83C\uDDFA\uD83C\uDDE6',
  RU: '\uD83C\uDDF7\uD83C\uDDFA', CN: '\uD83C\uDDE8\uD83C\uDDF3', IN: '\uD83C\uDDEE\uD83C\uDDF3',
  IL: '\uD83C\uDDEE\uD83C\uDDF1', INT: '\uD83C\uDF10', EU: '\uD83C\uDDEA\uD83C\uDDFA',
  SA: '\uD83C\uDDF8\uD83C\uDDE6', IR: '\uD83C\uDDEE\uD83C\uDDF7', JP: '\uD83C\uDDEF\uD83C\uDDF5',
  KR: '\uD83C\uDDF0\uD83C\uDDF7', BR: '\uD83C\uDDE7\uD83C\uDDF7', AU: '\uD83C\uDDE6\uD83C\uDDFA',
}

const mgLabel: CSSProperties = { fontSize: '9px', color: P.dim, marginBottom: '3px', letterSpacing: '0.06em' }
const mgInput: CSSProperties = {
  background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px',
  color: P.text, fontFamily: P.font, fontSize: '10px', padding: '5px 8px',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

function cleanTweetText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\b(?:class|dir|style|id)="[^"]*"/gi, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/^\s*>\s*/, '')
    .replace(/\s+/g, ' ').trim()
}

function timeAgo(ts: string): string {
  const d = Date.now() - new Date(ts).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function DashboardTweets() {
  const [tweets, setTweets] = useState<VIPTweet[]>([])
  const [loading, setLoading] = useState(true)
  const [showCount, setShowCount] = useState(15)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState<'6h' | '12h' | '24h'>('24h')
  const [_showCurated] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [addForm, setAddForm] = useState({ handle: '', name: '', title: '', country: 'US', category: 'Custom' })
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const tweetRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const newTweetIdsRef = useRef<Set<string>>(new Set())

  const accounts = useTwitterStore(s => s.accounts)
  const categories = useTwitterStore(s => s.categories)
  const addAccount = useTwitterStore(s => s.addAccount)
  const removeAccount = useTwitterStore(s => s.removeAccount)
  const resetToDefaults = useTwitterStore(s => s.resetToDefaults)

  const accountsForApi = useMemo(() =>
    accounts.map(a => ({ handle: a.handle, name: a.name, title: a.title, country: a.country })),
    [accounts]
  )

  const fetchTweets = useCallback(async () => {
    try {
      const data = await window.argus.getVIPTweets(accountsForApi)
      if (data) {
        setTweets(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          const merged = [...prev]
          for (const t of data) {
            if (!existingIds.has(t.id)) merged.push(t)
          }
          merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          return merged.slice(0, 200)
        })
      }
      setLastRefresh(Date.now())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [accountsForApi])

  useEffect(() => {
    fetchTweets()
    intervalRef.current = setInterval(fetchTweets, 60000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchTweets])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { handle?: string } | undefined
      if (!detail?.handle) return
      const normalized = detail.handle.replace(/^@/, '').toLowerCase()
      const match = tweets.find(t =>
        t.authorHandle.replace(/^@/, '').toLowerCase() === normalized
      )
      if (match) {
        setHighlightId(match.id)
        setTimeout(() => {
          const el = tweetRefs.current.get(match.id)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
        setTimeout(() => setHighlightId(null), 3000)
      } else {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    window.addEventListener('argus-scroll-to-tweet', handler)
    return () => window.removeEventListener('argus-scroll-to-tweet', handler)
  }, [tweets])

  useEffect(() => {
    const handler = (raw: unknown) => {
      const tweet = raw as VIPTweet
      newTweetIdsRef.current.add(tweet.id)
      setTimeout(() => newTweetIdsRef.current.delete(tweet.id), 30000)
      setTweets(prev => {
        if (prev.some(t => t.id === tweet.id)) return prev
        return [tweet, ...prev].slice(0, 200)
      })
      setHighlightId(tweet.id)
      setTimeout(() => {
        const el = tweetRefs.current.get(tweet.id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      setTimeout(() => setHighlightId(null), 4000)
    }
    const dispose = window.argus.onVIPTweetAlert(handler)
    return () => dispose()
  }, [])

  const filteredTweets = useMemo(() => {
    const hours = timeFilter === '6h' ? 6 : timeFilter === '12h' ? 12 : 24
    const cutoff = Date.now() - hours * 3600000
    let result = tweets.filter(t => new Date(t.timestamp).getTime() >= cutoff && !t.id.startsWith('curated-'))
    if (categoryFilter !== 'all') {
      const handlesInCategory = new Set(
        accounts.filter(a => a.category === categoryFilter).map(a => `@${a.handle}`)
      )
      result = result.filter(t => handlesInCategory.has(t.authorHandle))
    }
    return result
  }, [tweets, categoryFilter, timeFilter, accounts])

  const visible = filteredTweets.slice(0, showCount)

  const catOptions = useMemo(() => [
    { id: 'all', label: 'ALL', color: P.accent },
    ...categories.map(c => ({
      id: c,
      label: c.length > 12 ? c.slice(0, 12) + '..' : c,
      color: c.includes('Leader') ? '#ff6b35' : c.includes('Defense') ? '#00ff87' : c.includes('Economy') ? '#f5c542' : c.includes('Org') ? '#4a9eff' : c.includes('Tech') ? '#a855f7' : P.dim,
    })),
  ], [categories])

  const refreshAgo = useMemo(() => {
    const s = Math.floor((Date.now() - lastRefresh) / 1000)
    if (s < 10) return 'just now'
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
  }, [lastRefresh])

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => forceUpdate(c => c + 1), 15000)
    return () => clearInterval(iv)
  }, [])

  return (
    <section ref={sectionRef} id="dashboard-tweets" style={{ padding: '20px 24px', borderTop: `1px solid ${P.border}`, background: P.bg, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ width: '3px', height: '16px', background: '#4a9eff', borderRadius: '2px' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: P.text, letterSpacing: '0.15em' }}>VIP TWEETS</span>
        <span style={{ fontSize: '9px', color: P.dim }}>
          {filteredTweets.length} tweets \u2022 {accounts.length} accounts
        </span>
        <span style={{
          fontSize: '9px', color: P.dim, padding: '2px 6px',
          background: '#0d122080', borderRadius: '3px', border: `1px solid ${P.border}`,
        }}>
          {'\u21BB'} {refreshAgo}
        </span>

        <div style={{ display: 'flex', gap: '3px' }}>
          {(['6h', '12h', '24h'] as const).map(tf => (
            <button key={tf} onClick={() => setTimeFilter(tf)} style={{
              padding: '2px 7px', fontSize: '9px', fontWeight: 600,
              background: timeFilter === tf ? `${P.accent}15` : 'transparent',
              border: `1px solid ${timeFilter === tf ? P.accent + '40' : P.border}`,
              borderRadius: '3px', cursor: 'pointer',
              color: timeFilter === tf ? P.accent : P.dim,
              fontFamily: P.font, letterSpacing: '0.06em',
            }}>{tf.toUpperCase()}</button>
          ))}
        </div>

        <button onClick={() => fetchTweets()} title="Refresh now" style={{
          padding: '2px 7px', fontSize: '10px', fontWeight: 600,
          background: 'transparent', border: `1px solid ${P.border}`,
          borderRadius: '3px', cursor: 'pointer', color: P.dim, fontFamily: P.font,
        }}>{'\u21BB'}</button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {catOptions.map(c => (
            <button key={c.id} onClick={() => setCategoryFilter(c.id)} style={{
              padding: '3px 8px', fontSize: '9px', fontWeight: 600,
              background: categoryFilter === c.id ? `${c.color}15` : 'transparent',
              border: `1px solid ${categoryFilter === c.id ? c.color + '40' : P.border}`,
              borderRadius: '3px', cursor: 'pointer',
              color: categoryFilter === c.id ? c.color : P.dim,
              fontFamily: P.font, letterSpacing: '0.08em',
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>
          Loading VIP tweets...
        </div>
      ) : filteredTweets.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>
          <div style={{ marginBottom: '8px' }}>No live tweets available.</div>
          <div style={{ fontSize: '9px', marginBottom: '12px', lineHeight: '1.6' }}>
            Nitter/RSS sources may be temporarily unavailable.
            <br />
            Sources may be blocked due to Cloudflare bot protection.
          </div>
          <button onClick={() => { setLoading(true); fetchTweets() }} style={{
            padding: '6px 16px', fontSize: '9px', fontWeight: 600,
            background: `${P.accent}15`, border: `1px solid ${P.accent}40`,
            borderRadius: '4px', cursor: 'pointer', color: P.accent,
            fontFamily: P.font, letterSpacing: '0.08em',
          }}>RETRY</button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          gap: '10px',
        }}>
          {visible.map(tweet => {
            const isHighlighted = highlightId === tweet.id
            const isNew = newTweetIdsRef.current.has(tweet.id)
            const handle = tweet.authorHandle.replace(/^@/, '')
            const avatarUrl = `https://unavatar.io/twitter/${handle}`
            return (
            <div key={tweet.id}
              ref={el => { if (el) tweetRefs.current.set(tweet.id, el); else tweetRefs.current.delete(tweet.id) }}
              onClick={() => { if (tweet.url) window.open(tweet.url, '_blank', 'noopener,noreferrer') }}
              style={{
                background: isHighlighted ? '#0c1a30' : P.card,
                border: `1px solid ${isHighlighted ? P.accent + '60' : isNew ? '#00ff8740' : P.border}`,
                borderRadius: '8px', padding: '14px 16px',
                cursor: 'pointer', transition: 'all 0.3s',
                overflow: 'hidden', minWidth: 0,
                boxShadow: isHighlighted ? `0 0 20px ${P.accent}25` : isNew ? '0 0 12px #00ff8715' : 'none',
              }}
              onMouseEnter={e => { if (!isHighlighted) { e.currentTarget.style.borderColor = P.accent + '30'; e.currentTarget.style.background = '#101828' } }}
              onMouseLeave={e => { if (!isHighlighted) { e.currentTarget.style.borderColor = isNew ? '#00ff8740' : P.border; e.currentTarget.style.background = P.card } }}
            >
              <div style={{ display: 'flex', gap: '10px' }}>
                <img
                  src={avatarUrl}
                  alt={handle}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: `1px solid ${P.accent}20`, flexShrink: 0,
                    objectFit: 'cover', background: '#1a2332',
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: P.text }}>{tweet.author}</span>
                    <span style={{ fontSize: '9px', color: P.dim }}>{tweet.authorHandle}</span>
                    {isNew && (
                      <span style={{ fontSize: '9px', color: '#00ff87', padding: '1px 4px', background: '#00ff870d', border: '1px solid #00ff8730', borderRadius: '2px', fontWeight: 700 }}>NEW</span>
                    )}
                    <span style={{ fontSize: '9px', color: P.dim, marginLeft: 'auto', flexShrink: 0 }}>
                      {timeAgo(tweet.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: '9px', color: P.accent, marginTop: '2px' }}>
                    {tweet.authorTitle}
                  </div>
                  <div style={{
                    fontSize: '11px', color: P.text, marginTop: '8px',
                    lineHeight: '1.5', opacity: 0.9,
                    wordBreak: 'break-word', overflowWrap: 'break-word',
                    overflow: 'hidden',
                  }}>
                    {cleanTweetText(tweet.content)}
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {showCount < filteredTweets.length && (
        <button onClick={() => setShowCount(c => c + 15)} style={{
          display: 'block', margin: '14px auto 0', padding: '8px 24px',
          fontSize: '10px', color: P.accent, background: 'transparent',
          border: `1px solid ${P.accent}30`, borderRadius: '6px',
          cursor: 'pointer', fontFamily: P.font, fontWeight: 600,
          letterSpacing: '0.1em',
        }}>
          LOAD MORE ({filteredTweets.length - showCount} remaining)
        </button>
      )}

      {/* Manage Accounts toggle */}
      <div style={{ marginTop: '14px', borderTop: `1px solid ${P.border}`, paddingTop: '12px' }}>
        <button onClick={() => setManageOpen(!manageOpen)} style={{
          padding: '6px 14px', fontSize: '9px', fontWeight: 600,
          background: manageOpen ? `${P.accent}15` : 'transparent',
          border: `1px solid ${manageOpen ? P.accent + '40' : P.border}`,
          borderRadius: '4px', cursor: 'pointer', color: manageOpen ? P.accent : P.dim,
          fontFamily: P.font, letterSpacing: '0.08em',
        }}>{manageOpen ? 'CLOSE MANAGER' : 'MANAGE ACCOUNTS'}</button>
      </div>

      {manageOpen && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Add form */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '8px', padding: '12px', background: P.card,
            border: `1px solid ${P.accent}25`, borderRadius: '8px',
          }}>
            <div>
              <div style={mgLabel}>HANDLE</div>
              <input value={addForm.handle} onChange={e => setAddForm(f => ({ ...f, handle: e.target.value }))} placeholder="without @" style={mgInput} />
            </div>
            <div>
              <div style={mgLabel}>NAME</div>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} style={mgInput} />
            </div>
            <div>
              <div style={mgLabel}>TITLE</div>
              <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} style={mgInput} />
            </div>
            <div>
              <div style={mgLabel}>COUNTRY</div>
              <input value={addForm.country} onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))} style={mgInput} maxLength={4} />
            </div>
            <div>
              <div style={mgLabel}>CATEGORY</div>
              <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={{ ...mgInput, cursor: 'pointer' }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
              <button onClick={() => {
                const h = addForm.handle.trim().replace(/^@/, '')
                if (!h || !addForm.name.trim()) return
                addAccount({ handle: h, name: addForm.name.trim(), title: addForm.title.trim() || h, country: addForm.country.trim().toUpperCase(), category: addForm.category, isCustom: true })
                setAddForm({ handle: '', name: '', title: '', country: 'US', category: addForm.category })
              }} style={{
                padding: '6px 12px', fontSize: '9px', fontWeight: 600,
                background: `${P.accent}15`, border: `1px solid ${P.accent}40`,
                borderRadius: '4px', cursor: 'pointer', color: P.accent, fontFamily: P.font,
              }}>ADD</button>
              <button onClick={() => { if (confirm('Reset to default accounts?')) resetToDefaults() }} style={{
                padding: '6px 10px', fontSize: '9px', fontWeight: 600,
                background: '#ff3b5c10', border: '1px solid #ff3b5c40',
                borderRadius: '4px', cursor: 'pointer', color: '#ff6b7a', fontFamily: P.font,
              }}>RESET</button>
            </div>
          </div>

          {/* Account list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
            {accounts.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', background: P.card,
                border: `1px solid ${P.border}`, borderRadius: '6px',
              }}>
                <span style={{ fontSize: '14px' }}>{COUNTRY_FLAGS[a.country] || '\uD83C\uDF10'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: P.text }}>@{a.handle}</span>
                  <span style={{ fontSize: '9px', color: P.dim, marginLeft: '8px' }}>{a.name}</span>
                </div>
                <span style={{ fontSize: '9px', color: P.accent, padding: '2px 6px', border: `1px solid ${P.accent}30`, borderRadius: '3px' }}>{a.category}</span>
                {a.isCustom && (
                  <button onClick={() => removeAccount(a.id)} style={{
                    padding: '3px 8px', fontSize: '9px', background: '#ff3b5c10',
                    border: '1px solid #ff3b5c30', borderRadius: '3px',
                    color: '#ff6b7a', cursor: 'pointer', fontFamily: P.font, fontWeight: 600,
                  }}>DEL</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
