import { useState, useCallback, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'

interface DragState {
  x: number
  y: number
}

export function useDraggable(_initialPos?: { x: number; y: number }) {
  const [pos, setPos] = useState<DragState>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const elRef = useRef<HTMLDivElement | null>(null)
  const posRef = useRef<DragState>({ x: 0, y: 0 })
  const initializedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const rafRef = useRef<number | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const handle = target.closest('[data-drag-handle]')
    if (!handle) return

    e.preventDefault()
    e.stopPropagation()

    const el = elRef.current
    if (!el) return

    cleanupRef.current?.()

    // offsetLeft/Top are relative to offsetParent — matches CSS left/top
    const startLeft = el.offsetLeft
    const startTop = el.offsetTop
    const startMouseX = e.clientX
    const startMouseY = e.clientY

    if (!initializedRef.current) {
      const initPos = { x: startLeft, y: startTop }
      posRef.current = initPos
      initializedRef.current = true
      flushSync(() => {
        setInitialized(true)
        setPos(initPos)
        setIsDragging(true)
      })
    } else {
      posRef.current = { x: startLeft, y: startTop }
      setIsDragging(true)
    }

    const onMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startMouseX
      const deltaY = ev.clientY - startMouseY
      const newX = Math.max(0, startLeft + deltaX)
      const newY = Math.max(0, startTop + deltaY)
      posRef.current = { x: newX, y: newY }

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setPos({ x: newX, y: newY })
        rafRef.current = null
      })
    }

    const cleanup = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      cleanupRef.current = null
    }

    const onUp = () => {
      setPos(posRef.current)
      setIsDragging(false)
      cleanup()
    }

    cleanupRef.current = cleanup
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    return () => { cleanupRef.current?.() }
  }, [])

  return { pos, isDragging, onMouseDown, elRef, initialized }
}
