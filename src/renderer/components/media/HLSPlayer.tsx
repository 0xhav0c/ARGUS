import { useEffect, useRef, useCallback, memo } from 'react'
import Hls from 'hls.js'

interface HLSPlayerProps {
  /** HLS m3u8 URL or null (shows placeholder) */
  src: string | null
  /** Channel name for overlay */
  channelName: string
  /** Muted state (default true) */
  muted?: boolean
  /** Volume 0-100 */
  volume?: number
  /** Whether this player is visible on screen */
  visible?: boolean
  /** Loading state — show spinner */
  loading?: boolean
  /** Error message to display */
  error?: string | null
  /** Callback when user clicks the player */
  onClick?: () => void
  onMuteToggle?: () => void
  onVolumeChange?: (vol: number) => void
}

/** Maximum initial quality — cap at 480p to save resources */
const MAX_HEIGHT = 480

const P = {
  bg: '#0a0e17',
  border: '#141c2e',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

export const HLSPlayer = memo(function HLSPlayer({
  src,
  channelName,
  muted = true,
  volume = 50,
  visible = true,
  loading = false,
  error = null,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Attach / detach HLS
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // If native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.play().catch(() => {})
      return
    }

    if (!Hls.isSupported()) return

    const hls = new Hls({
      maxBufferLength: 10,          // 10s buffer — low memory
      maxMaxBufferLength: 30,       // never exceed 30s
      maxBufferSize: 5 * 1024 * 1024, // 5MB max buffer
      startLevel: -1,               // auto pick
      capLevelToPlayerSize: true,    // cap quality to player element size
      enableWorker: true,
      lowLatencyMode: true,
    })

    hlsRef.current = hls
    hls.loadSource(src)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      // Cap quality to MAX_HEIGHT (480p)
      const levels = data.levels
      const cappedIndex = levels.findIndex(l => l.height <= MAX_HEIGHT)
      if (cappedIndex >= 0) {
        hls.currentLevel = cappedIndex
        hls.autoLevelCapping = cappedIndex
      } else if (levels.length > 0) {
        // All levels above MAX_HEIGHT — use the lowest quality
        const lowestIdx = levels.reduce((min, l, i) => l.height < levels[min].height ? i : min, 0)
        hls.currentLevel = lowestIdx
        hls.autoLevelCapping = lowestIdx
      }
      video.play().catch(() => {})
    })

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          console.warn(`[HLS] ${channelName}: network error, retrying...`)
          setTimeout(() => hls.startLoad(), 3000)
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.warn(`[HLS] ${channelName}: media error, recovering...`)
          hls.recoverMediaError()
        } else {
          console.error(`[HLS] ${channelName}: fatal error`, data)
          hls.destroy()
        }
      }
    })

    return () => {
      hls.destroy()
      hlsRef.current = null
    }
  }, [src, channelName])

  // Pause / resume based on visibility
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (visible) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [visible])

  // Update muted
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Update volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, volume / 100))
  }, [volume])

  // Retry on double-click
  const handleRetry = useCallback(() => {
    if (hlsRef.current && src) {
      hlsRef.current.stopLoad()
      hlsRef.current.startLoad()
    }
  }, [src])

  // Show loading state
  if (loading) {
    return (
      <div ref={containerRef} style={{
        width: '100%', height: '100%', background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '8px',
      }}>
        <div style={{
          width: '20px', height: '20px', border: '2px solid #333',
          borderTop: `2px solid ${P.accent}`, borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <span style={{ fontSize: '9px', color: P.dim, fontFamily: P.font }}>
          Resolving stream...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Show error / no stream state
  if (error || !src) {
    return (
      <div ref={containerRef} style={{
        width: '100%', height: '100%', background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '6px',
      }}>
        <span style={{ fontSize: '14px' }}>📡</span>
        <span style={{ fontSize: '9px', color: '#ff6b7a', fontFamily: P.font, textAlign: 'center', padding: '0 12px' }}>
          {error || 'No live stream available'}
        </span>
        <span style={{ fontSize: '7px', color: P.dim, fontFamily: P.font }}>
          {channelName}
        </span>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%', background: '#000', position: 'relative',
    }}>
      <video
        ref={videoRef}
        muted={muted}
        autoPlay
        playsInline
        onDoubleClick={handleRetry}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#000',
        }}
      />
    </div>
  )
})
