import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

interface InfoTipProps {
  text: string
  maxWidth?: number
  size?: number
  color?: string
  style?: CSSProperties
}

export function InfoTip({ text, maxWidth = 280, size = 13, color = P.dim, style }: InfoTipProps) {
  const [show, setShow] = useState(false)
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLSpanElement>(null)

  const computePosition = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = rect.left + rect.width / 2
    const cy = rect.bottom + 6

    let top = cy
    let left = cx - maxWidth / 2

    if (left < 8) left = 8
    if (left + maxWidth > vw - 8) left = vw - maxWidth - 8

    const estimatedHeight = Math.min(200, text.length * 0.8 + 40)
    if (top + estimatedHeight > vh - 8) {
      top = rect.top - estimatedHeight - 6
    }
    if (top < 8) top = 8

    setTipPos({ top, left })
  }, [maxWidth, text])

  useEffect(() => {
    if (show) computePosition()
    else setTipPos(null)
  }, [show, computePosition])

  const tipStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
    background: '#151d2e',
    border: `1px solid ${P.accent}30`,
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '10px',
    lineHeight: '1.6',
    color: P.text,
    fontFamily: P.font,
    fontWeight: 400,
    letterSpacing: '0.01em',
    maxWidth: `${maxWidth}px`,
    width: 'max-content',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    whiteSpace: 'pre-line',
    top: tipPos?.top ?? 0,
    left: tipPos?.left ?? 0,
  }

  return (
    <span
      ref={btnRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `1px solid ${color}50`,
        color,
        fontSize: `${Math.max(8, size - 4)}px`,
        fontWeight: 700,
        fontFamily: P.font,
        cursor: 'help',
        userSelect: 'none',
        position: 'relative',
        flexShrink: 0,
        lineHeight: 1,
        transition: 'border-color 0.15s, color 0.15s',
        ...(show ? { borderColor: P.accent, color: P.accent } : {}),
        ...style,
      }}
    >
      i
      {show && tipPos && createPortal(
        <div style={tipStyle}>{text}</div>,
        document.body,
      )}
    </span>
  )
}
