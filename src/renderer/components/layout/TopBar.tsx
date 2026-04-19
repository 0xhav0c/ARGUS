import { useState, useEffect, memo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFilterStore } from '@/stores/filter-store'
import { useNotificationStore } from '@/stores/notification-store'
import { GlobalSearchDropdown } from '@/components/panels/GlobalSearchDropdown'
import type { Incident } from '../../../shared/types'

const platform = (typeof navigator !== 'undefined' && /Mac|darwin/i.test(navigator.userAgent)) ? 'darwin'
  : (typeof navigator !== 'undefined' && /Linux/i.test(navigator.userAgent)) ? 'linux' : 'win32'

const P = {
  bg: 'rgba(10,14,23,0.97)',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  warning: '#ffb000',
  danger: '#ff3b5c',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

interface TopBarProps {
  onToggleAlerts?: () => void
  onOpenSettings?: () => void
  onToggleTrackingSearch?: () => void
  trackingSearchOpen?: boolean
  onLocate?: (lat: number, lng: number, title: string) => void
  onSelectIncident?: (incident: Incident) => void
  onTrackingClick?: (info: any) => void
  setActiveTab?: (tab: any) => void
}

function WinBtn({ onClick, children, hoverColor, title }: {
  onClick: () => void; children: React.ReactNode; hoverColor: string; title: string
}) {
  return (
    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }} title={title} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '46px', height: '100%', minHeight: '32px', border: 'none', background: 'transparent',
      color: P.dim, cursor: 'pointer', fontSize: '11px', fontFamily: P.font,
      transition: 'all 0.15s',
      ...({ WebkitAppRegion: 'no-drag' } as any),
    }}
    onMouseEnter={e => { e.currentTarget.style.background = hoverColor; e.currentTarget.style.color = '#fff' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = P.dim }}
    >{children}</button>
  )
}

export const TopBar = memo(function TopBar({ onToggleAlerts, onOpenSettings, onToggleTrackingSearch, trackingSearchOpen, onLocate, onSelectIncident, onTrackingClick, setActiveTab }: TopBarProps) {
  const { t } = useTranslation()
  const [time, setTime] = useState(new Date())
  const [isMaximized, setIsMaximized] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const unreadCount = useNotificationStore(s => {
    let count = 0
    for (const n of s.notifications) { if (!n.read) count++ }
    return count
  })
  const setSearchQuery = useFilterStore(s => s.setSearchQuery)
  const searchQuery = useFilterStore(s => s.searchQuery)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const updateAnchor = useCallback(() => {
    if (searchWrapRef.current) setAnchorRect(searchWrapRef.current.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    updateAnchor()
    window.addEventListener('resize', updateAnchor)
    return () => window.removeEventListener('resize', updateAnchor)
  }, [searchOpen, updateAnchor])

  // "/" focuses the global search input (only when not already typing in a field).
  // Note: Cmd/Ctrl+F is intentionally left to the browser/DevTools — overriding it
  // would conflict with the OS-level developer tools shortcut on macOS.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const editing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === '/' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        inputRef.current?.focus()
        setSearchOpen(true)
        updateAnchor()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [updateAnchor])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  useEffect(() => {
    if (!window.argus) return
    window.argus.windowIsMaximized().then(setIsMaximized)
    const dispose = window.argus.onWindowStateChanged((data) => {
      if (data.maximized !== undefined) setIsMaximized(data.maximized)
      if (data.fullscreen !== undefined) setIsFullscreen(data.fullscreen)
    })
    return () => dispose()
  }, [])

  const utcTime = time.toISOString().replace('T', ' ').substring(0, 19)

  return (
    <header style={{
      position: 'relative', zIndex: 50,
      display: 'flex', alignItems: 'center',
      height: '42px', padding: platform === 'darwin' ? '0 0 0 78px' : '0 0 0 14px',
      background: P.bg,
      borderBottom: `1px solid ${P.border}`,
      fontFamily: P.font,
      userSelect: 'none',
      ...({ WebkitAppRegion: 'drag' } as any),
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: P.accent,
          boxShadow: `0 0 8px ${P.accent}60`,
        }} />
        <span style={{
          fontSize: '14px', fontWeight: 700, letterSpacing: '0.35em', color: P.accent,
        }}>ARGUS</span>
        <span style={{ width: '1px', height: '18px', background: P.border }} />
        <span style={{ fontSize: '11px', color: P.dim, letterSpacing: '0.15em' }}>
          {t('app.subtitle').toUpperCase()}
        </span>
      </div>

      {/* Search bar */}
      <div ref={searchWrapRef} style={{
        display: 'flex', alignItems: 'center', flex: 1, maxWidth: '500px', gap: '6px',
        ...({ WebkitAppRegion: 'no-drag' } as any),
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          flex: 1, height: '28px',
          background: '#0d1220', border: `1px solid ${searchOpen ? P.accent + '40' : P.border}`,
          borderRadius: '4px', padding: '0 10px',
          transition: 'border-color 0.2s',
        }}>
          <span style={{ fontSize: '12px', color: searchOpen ? P.accent : P.dim }}>⌕</span>
          <input
            ref={inputRef}
            type="text"
            placeholder={t('topbar.search')}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (!searchOpen) { setSearchOpen(true); updateAnchor() } }}
            onFocus={() => { setSearchOpen(true); updateAnchor() }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: P.text, fontSize: '12px', fontFamily: P.font,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: P.dim, cursor: 'pointer', fontSize: '9px', fontFamily: P.font }}
            >✕</button>
          )}
          <span style={{
            fontSize: '8px', color: P.dim, padding: '1px 4px',
            border: `1px solid ${P.border}`, borderRadius: '2px',
            letterSpacing: '0.06em',
          }} title="Press / to focus search">/</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Status indicators */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        marginRight: '12px',
        ...({ WebkitAppRegion: 'no-drag' } as any),
      }}>
        {/* Alerts */}
        <button onClick={onToggleAlerts} style={{
          position: 'relative', background: 'transparent', border: 'none',
          color: unreadCount > 0 ? P.warning : P.dim, cursor: 'pointer',
          fontSize: '14px', fontFamily: P.font, padding: '2px 6px',
        }}>
          ⚠
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-4px',
              background: P.danger, color: '#fff', fontSize: '9px', fontWeight: 700,
              width: '14px', height: '14px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        <span style={{ width: '1px', height: '14px', background: P.border }} />

        {/* UTC time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: P.dim }}>UTC</span>
          <span style={{ fontSize: '12px', color: P.warning, fontVariantNumeric: 'tabular-nums' }}>
            {utcTime}
          </span>
        </div>

        <span style={{ width: '1px', height: '14px', background: P.border }} />

        <button onClick={onOpenSettings} title="Settings" style={{
          background: '#0d1220', border: `1px solid ${P.border}`, borderRadius: '3px',
          padding: '4px 8px', cursor: 'pointer', fontFamily: P.font,
          fontSize: '14px', color: P.dim, transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent + '60'; e.currentTarget.style.color = P.accent }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim }}
        >{'\u2699'}</button>

        <span style={{ width: '1px', height: '14px', background: P.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOnline ? '#3fb950' : P.danger }} />
          <span style={{ fontSize: '10px', color: isOnline ? P.dim : P.danger }}>{isOnline ? t('topbar.online').toUpperCase() : t('topbar.offline', 'OFFLINE').toUpperCase()}</span>
        </div>
      </div>

      {/* Window controls — hidden on macOS (native traffic lights), shown on Windows & Linux */}
      {!isFullscreen && platform !== 'darwin' && (
        <div style={{
          display: 'flex', alignItems: 'center', height: '100%',
          borderLeft: `1px solid ${P.border}`,
          ...({ WebkitAppRegion: 'no-drag' } as any),
        }}>
          <WinBtn onClick={() => window.argus?.windowMinimize()} hoverColor="#1a2235" title={t('topbar.minimize')}>─</WinBtn>
          <WinBtn onClick={() => window.argus?.windowMaximize()} hoverColor="#1a2235" title={isMaximized ? t('topbar.restore') : t('topbar.maximize')}>
            {isMaximized ? '❐' : '□'}
          </WinBtn>
          <WinBtn onClick={() => { window.argus?.windowClose(); setTimeout(() => window.close(), 200) }} hoverColor="#c42b1c" title={t('topbar.close')}>✕</WinBtn>
        </div>
      )}

      <GlobalSearchDropdown
        isOpen={searchOpen}
        query={searchQuery}
        setQuery={setSearchQuery}
        anchorRect={anchorRect}
        onClose={() => setSearchOpen(false)}
        onLocate={(lat, lng, title) => onLocate?.(lat, lng, title)}
        onSelectIncident={(inc) => onSelectIncident?.(inc)}
        onTrackingClick={(info) => onTrackingClick?.(info)}
        setActiveTab={setActiveTab}
      />
    </header>
  )
})
