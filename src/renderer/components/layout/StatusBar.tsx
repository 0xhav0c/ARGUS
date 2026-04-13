import { useState, useEffect, useMemo, memo } from 'react'
import type { Incident } from '../../../shared/types'

const P = {
  bg: 'rgba(10,14,23,0.97)',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  warning: '#ffb000',
  success: '#3fb950',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

interface StatusBarProps {
  incidents?: Incident[]
  sceneMode?: '3d' | '2d' | 'columbus'
  onSceneModeChange?: (mode: '3d' | '2d' | 'columbus') => void
}

export const StatusBar = memo(function StatusBar({ incidents = [], sceneMode = '3d', onSceneModeChange }: StatusBarProps) {
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setUptime(prev => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatUptime = (s: number): string => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${ss}`
  }

  const stats = useMemo(() => {
    const critical = incidents.filter(i => i.severity === 'CRITICAL').length
    return { total: incidents.length, critical }
  }, [incidents])

  const ModeBtn = ({ mode, label }: { mode: '3d' | '2d' | 'columbus'; label: string }) => (
    <button onClick={() => onSceneModeChange?.(mode)} style={{
      padding: '1px 6px', fontSize: '9px', fontFamily: P.font,
      background: sceneMode === mode ? P.accent + '20' : 'transparent',
      border: `1px solid ${sceneMode === mode ? P.accent + '60' : P.border}`,
      borderRadius: '2px', cursor: 'pointer',
      color: sceneMode === mode ? P.accent : P.dim,
      transition: 'all 0.15s', letterSpacing: '0.05em',
    }}>{label}</button>
  )

  return (
    <footer style={{
      position: 'relative', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '22px', padding: '0 10px',
      background: P.bg,
      borderTop: `1px solid ${P.border}`,
      fontSize: '9px', color: P.dim,
      fontFamily: P.font,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: P.success,
            boxShadow: `0 0 4px ${P.success}60`,
          }} />
          <span>SYS OK</span>
        </div>
        <span style={{ color: P.border }}>│</span>
        <span>↑ {formatUptime(uptime)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>Events: <span style={{ color: P.accent }}>{stats.total}</span></span>
        {stats.critical > 0 && (
          <>
            <span style={{ color: P.border }}>│</span>
            <span>Critical: <span style={{ color: '#ff3b5c' }}>{stats.critical}</span></span>
          </>
        )}
        <span style={{ color: P.border }}>│</span>

        {/* Scene mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <ModeBtn mode="3d" label="3D" />
          <ModeBtn mode="2d" label="2D" />
          <ModeBtn mode="columbus" label="CV" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>v1.0.2</span>
      </div>
    </footer>
  )
})
