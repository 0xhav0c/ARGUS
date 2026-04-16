import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import ReactDOM from 'react-dom'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const INLINE_LIMIT = 10
const POPUP_PAGE_SIZE = 20

const ANIM_MS = 450
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

const CENTERED_W = 720
const DOCKED_W = 460
const DOCKED_X = 24
const DOCKED_Y = 60

export interface FilterDef {
  id: string
  label: string
  options: string[]
}

interface ExpandableListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  title: string
  icon?: string
  color?: string
  emptyMessage?: string
  searchable?: boolean
  searchFn?: (item: T, query: string) => boolean
  filters?: FilterDef[]
  filterFn?: (item: T, filters: Record<string, string>) => boolean
}

export function ExpandableList<T>({ items, renderItem, title, icon, color = P.accent, emptyMessage, searchable, searchFn, filters, filterFn }: ExpandableListProps<T>) {
  const [popupOpen, setPopupOpen] = useState(false)
  const inlineItems = useMemo(() => items.slice(0, INLINE_LIMIT), [items])
  const hasMore = items.length > INLINE_LIMIT

  if (items.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: P.dim, fontSize: '11px', fontFamily: P.font }}>
        {emptyMessage || 'No data available'}
      </div>
    )
  }

  return (
    <>
      <div>
        {inlineItems.map((item, i) => renderItem(item, i))}
        {hasMore && (
          <button
            onClick={() => setPopupOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '10px', marginTop: '4px',
              background: `${color}08`, border: `1px solid ${color}30`,
              borderRadius: '6px', cursor: 'pointer', fontFamily: P.font,
              fontSize: '10px', fontWeight: 700, color, letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.borderColor = `${color}60` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}30` }}
          >
            VIEW ALL {items.length} {title.toUpperCase()} →
          </button>
        )}
      </div>
      {popupOpen && (
        <ExpandableListPopup
          items={items} renderItem={renderItem} title={title} icon={icon} color={color}
          onClose={() => setPopupOpen(false)}
          searchable={searchable} searchFn={searchFn} filters={filters} filterFn={filterFn}
        />
      )}
    </>
  )
}

type PopupMode = 'centered' | 'docked'

interface PopupProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  title: string
  icon?: string
  color: string
  onClose: () => void
  searchable?: boolean
  searchFn?: (item: T, query: string) => boolean
  filters?: FilterDef[]
  filterFn?: (item: T, filters: Record<string, string>) => boolean
}

export function ExpandableListPopup<T>({ items, renderItem, title, icon, color, onClose, searchable, searchFn, filters, filterFn }: PopupProps<T>) {
  const [page, setPage] = useState(0)
  const [mode, setMode] = useState<PopupMode>('centered')
  const [pos, setPos] = useState({ x: DOCKED_X, y: DOCKED_Y })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const contentRef = useRef<HTMLDivElement>(null)
  const animating = useRef(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const isDocked = mode === 'docked'
  const hasToolbar = searchable || (filters && filters.length > 0)

  const filteredItems = useMemo(() => {
    let result = items
    const q = searchQuery.trim().toLowerCase()
    if (q && searchFn) {
      result = result.filter(item => searchFn(item, q))
    }
    const hasActiveFilters = Object.values(activeFilters).some(v => v !== '')
    if (hasActiveFilters && filterFn) {
      result = result.filter(item => filterFn(item, activeFilters))
    }
    return result
  }, [items, searchQuery, searchFn, activeFilters, filterFn])

  const totalPages = Math.ceil(filteredItems.length / POPUP_PAGE_SIZE)
  const pageItems = useMemo(() => filteredItems.slice(page * POPUP_PAGE_SIZE, (page + 1) * POPUP_PAGE_SIZE), [filteredItems, page])

  useEffect(() => { setPage(0) }, [searchQuery, activeFilters])

  const getCenteredPos = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(CENTERED_W, vw * 0.9)
    const h = Math.min(vh * 0.85, vh - 40)
    return { x: (vw - w) / 2, y: (vh - h) / 2 }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (isDocked || animating.current) return
    const target = e.target as HTMLElement
    let el: HTMLElement | null = target
    while (el && el !== contentRef.current) {
      const cursor = window.getComputedStyle(el).cursor
      if (cursor === 'pointer' && !el.closest('[data-popup-controls]')) {
        animating.current = true
        setMode('docked')
        setTimeout(() => { animating.current = false }, ANIM_MS)
        return
      }
      el = el.parentElement
    }
  }, [isDocked])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDocked || animating.current) return
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [isDocked, pos])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    const onMouseUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!isDocked && e.target === e.currentTarget) onClose()
  }, [isDocked, onClose])

  const switchToCentered = useCallback(() => {
    animating.current = true
    const c = getCenteredPos()
    setPos(c)
    setMode('centered')
    setTimeout(() => { animating.current = false }, ANIM_MS)
  }, [getCenteredPos])

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setActiveFilters({})
  }, [])

  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + Object.values(activeFilters).filter(v => v !== '').length

  const centeredPos = getCenteredPos()
  const panelX = isDocked ? pos.x : centeredPos.x
  const panelY = isDocked ? pos.y : centeredPos.y
  const panelW = isDocked ? DOCKED_W : Math.min(CENTERED_W, window.innerWidth * 0.9)
  const isBeingDragged = dragging.current

  const transition = isBeingDragged ? 'none' : `left ${ANIM_MS}ms ${EASE}, top ${ANIM_MS}ms ${EASE}, width ${ANIM_MS}ms ${EASE}, box-shadow ${ANIM_MS}ms ${EASE}`

  const selectStyle = {
    padding: '5px 8px', fontSize: '9px', fontFamily: P.font,
    background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px',
    color: P.text, cursor: 'pointer', outline: 'none', maxWidth: '140px',
  }

  return ReactDOM.createPortal(
    <>
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: isDocked ? 'transparent' : 'rgba(0,0,0,0.7)',
          backdropFilter: isDocked ? 'none' : 'blur(6px)',
          pointerEvents: isDocked ? 'none' : 'auto',
          transition: `background ${ANIM_MS}ms ${EASE}, backdrop-filter ${ANIM_MS}ms ${EASE}`,
        }}
      />

      <div
        style={{
          position: 'fixed', left: panelX, top: panelY, width: panelW,
          zIndex: 9999,
          maxHeight: isDocked ? 'calc(100vh - 80px)' : '85vh',
          background: isDocked ? `${P.bg}f2` : P.bg,
          border: `1px solid ${color}${isDocked ? '40' : '30'}`,
          borderRadius: '12px',
          display: 'flex', flexDirection: 'column',
          boxShadow: isDocked
            ? `0 16px 50px rgba(0,0,0,0.6), 0 0 1px ${color}40`
            : `0 20px 60px rgba(0,0,0,0.5), 0 0 1px ${color}40`,
          overflow: 'hidden', fontFamily: P.font, transition,
        }}
      >
        {/* Header */}
        <div
          onMouseDown={onMouseDown}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0,
            cursor: isDocked ? 'grab' : 'default', userSelect: 'none',
            background: isDocked ? `${P.card}e0` : 'transparent',
            transition: `background ${ANIM_MS}ms ${EASE}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span style={{
              fontSize: '10px', color: P.dim, cursor: 'grab',
              width: isDocked ? '14px' : '0px', overflow: 'hidden',
              opacity: isDocked ? 1 : 0,
              transition: `width ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS}ms ${EASE}`,
              flexShrink: 0,
            }}>⠿</span>
            {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
            <span style={{ fontSize: '11px', fontWeight: 700, color: P.text, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              {title.toUpperCase()}
            </span>
            <span style={{ fontSize: '9px', color: P.dim, padding: '2px 8px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', whiteSpace: 'nowrap' }}>
              {filteredItems.length === items.length ? `${items.length} TOTAL` : `${filteredItems.length} / ${items.length}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} data-popup-controls>
            <button
              onClick={switchToCentered}
              title="Center popup"
              style={{
                background: 'transparent', border: `1px solid ${P.border}`, borderRadius: '4px',
                color: P.dim, cursor: 'pointer', fontSize: '10px', padding: '3px 8px',
                fontFamily: P.font, transition: 'all 0.15s', lineHeight: 1,
                width: isDocked ? 'auto' : '0px', overflow: 'hidden',
                opacity: isDocked ? 1 : 0, pointerEvents: isDocked ? 'auto' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.color = P.accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim }}
            >◻</button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: `1px solid ${P.border}`, borderRadius: '4px',
                color: P.dim, cursor: 'pointer', fontSize: '12px', padding: '3px 8px',
                fontFamily: P.font, transition: 'all 0.15s', lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff3b5c'; e.currentTarget.style.color = '#ff3b5c' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.dim }}
            >✕</button>
          </div>
        </div>

        {/* Search & Filters Toolbar */}
        {hasToolbar && (
          <div data-popup-controls style={{
            padding: '10px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0,
            display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
            background: isDocked ? `${P.card}80` : `${P.card}40`,
            transition: `background ${ANIM_MS}ms ${EASE}`,
          }}>
            {searchable && (
              <input
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: '1 1 180px', minWidth: '140px', padding: '6px 10px',
                  fontSize: '10px', fontFamily: P.font, color: P.text,
                  background: P.bg, border: `1px solid ${searchQuery ? color + '40' : P.border}`,
                  borderRadius: '5px', outline: 'none', transition: 'border 0.2s',
                }}
              />
            )}
            {filters?.map(f => (
              <select
                key={f.id}
                value={activeFilters[f.id] || ''}
                onChange={e => setActiveFilters(prev => ({ ...prev, [f.id]: e.target.value }))}
                style={selectStyle}
              >
                <option value="">{f.label}: All</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                data-popup-controls
                style={{
                  padding: '4px 10px', fontSize: '9px', fontWeight: 600, fontFamily: P.font,
                  background: `${color}10`, border: `1px solid ${color}30`,
                  borderRadius: '4px', cursor: 'pointer', color, letterSpacing: '0.06em',
                }}
              >CLEAR ({activeFilterCount})</button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          onClick={handleContentClick}
          style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}
        >
          {pageItems.length > 0
            ? pageItems.map((item, i) => renderItem(item, page * POPUP_PAGE_SIZE + i))
            : (
              <div style={{ padding: '30px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>
                {activeFilterCount > 0 ? 'No items match your search/filters.' : 'No items available.'}
              </div>
            )
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationBar page={page} totalPages={totalPages} color={color} isDocked={isDocked} onPageChange={setPage} />
        )}
      </div>
    </>,
    document.body
  )
}

function PaginationBar({ page, totalPages, color, isDocked, onPageChange }: {
  page: number; totalPages: number; color: string; isDocked: boolean; onPageChange: (p: number) => void
}) {
  const pageNums = useMemo(() => {
    if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i)
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = []
    pages.push(0)
    const rangeStart = Math.max(1, page - 2)
    const rangeEnd = Math.min(totalPages - 2, page + 2)
    if (rangeStart > 1) pages.push('ellipsis-start')
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
    if (rangeEnd < totalPages - 2) pages.push('ellipsis-end')
    pages.push(totalPages - 1)
    return pages
  }, [page, totalPages])

  const btnStyle = (active: boolean, disabled?: boolean) => ({
    minWidth: '28px', height: '28px', fontSize: '9px', fontWeight: 700 as const, fontFamily: P.font,
    borderRadius: '4px', cursor: disabled ? 'default' as const : 'pointer' as const,
    background: active ? `${color}20` : 'transparent',
    border: `1px solid ${active ? color + '60' : P.border}`,
    color: active ? color : disabled ? `${P.dim}60` : P.dim,
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s', padding: '0 6px', display: 'inline-flex' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  })

  return (
    <div data-popup-controls style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
      padding: '10px 16px', borderTop: `1px solid ${P.border}`, flexShrink: 0,
      background: isDocked ? `${P.card}e0` : 'transparent',
      transition: `background ${ANIM_MS}ms ${EASE}`,
      flexWrap: 'wrap',
    }}>
      <button onClick={() => onPageChange(0)} disabled={page === 0} style={{ ...btnStyle(false, page === 0), padding: '0 8px' }} title="First page">⏮</button>
      <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} style={{ ...btnStyle(false, page === 0), padding: '0 8px' }}>◀</button>

      {pageNums.map((p, idx) => {
        if (p === 'ellipsis-start' || p === 'ellipsis-end') {
          return <span key={p} style={{ fontSize: '9px', color: P.dim, padding: '0 4px', userSelect: 'none' }}>···</span>
        }
        return (
          <button key={idx} onClick={() => onPageChange(p)} style={btnStyle(p === page)}>
            {p + 1}
          </button>
        )
      })}

      <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} style={{ ...btnStyle(false, page === totalPages - 1), padding: '0 8px' }}>▶</button>
      <button onClick={() => onPageChange(totalPages - 1)} disabled={page === totalPages - 1} style={{ ...btnStyle(false, page === totalPages - 1), padding: '0 8px' }} title="Last page">⏭</button>

      <span style={{ fontSize: '9px', color: P.dim, marginLeft: '8px', whiteSpace: 'nowrap' }}>
        {page + 1} / {totalPages}
      </span>
    </div>
  )
}
