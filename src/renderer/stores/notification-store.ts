import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useTTSStore } from './tts-store'

export type NotificationType = 'incident' | 'tweet' | 'earthquake' | 'disaster'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  subtitle: string
  timestamp: number
  read: boolean
  latitude?: number
  longitude?: number
  incidentId?: string
  severity?: string
  domain?: string
  tweetUrl?: string
  tweetHandle?: string
  magnitude?: number
  disasterType?: string
}

interface NotificationState {
  notifications: AppNotification[]
  maxNotifications: number
  soundEnabled: boolean

  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  dismissNotification: (id: string) => void
  dismissAll: () => void
  markRead: (id: string) => void
  markAllRead: () => void
  toggleSound: () => void
  getUnreadCount: () => number
}

/* ─── Deduplication Ring Buffer ─── */
const DEDUP_WINDOW_MS = 300_000 // 5 minutes — same title within this window is suppressed
const DEDUP_MAX = 500
const _recentKeys: { key: string; ts: number }[] = []

function isDuplicate(title: string, incidentId?: string): boolean {
  const now = Date.now()
  // Prune old entries
  while (_recentKeys.length > 0 && now - _recentKeys[0].ts > DEDUP_WINDOW_MS) {
    _recentKeys.shift()
  }
  const key = incidentId || title.toLowerCase().trim()
  if (_recentKeys.some(r => r.key === key)) return true
  _recentKeys.push({ key, ts: now })
  if (_recentKeys.length > DEDUP_MAX) _recentKeys.shift()
  return false
}

/* ─── Audio Throttle ─── */
let _lastSoundTs = 0
const SOUND_COOLDOWN_MS = 3000 // min 3s between alert sounds

/* ─── TTS Throttle ─── */
let _lastTTSTs = 0
const TTS_COOLDOWN_MS = 10_000 // min 10s between TTS

/* ─── Audio ─── */
let sharedAudioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContext()
  }
  if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume()
  return sharedAudioCtx
}

function playAlertForNotification(n: AppNotification) {
  const now = Date.now()
  if (now - _lastSoundTs < SOUND_COOLDOWN_MS) return
  _lastSoundTs = now

  try {
    const ctx = getAudioCtx()
    const t = ctx.currentTime

    const beep = (freq: number, start: number, duration: number, peak = 0.12) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(freq, t + start)
      gain.gain.setValueAtTime(peak, t + start)
      gain.gain.exponentialRampToValueAtTime(0.01, t + start + duration)
      osc.start(t + start)
      osc.stop(t + start + duration)
    }

    if (n.type === 'incident') {
      if (n.severity === 'CRITICAL') {
        beep(880, 0, 0.07, 0.14)
        beep(880, 0.1, 0.07, 0.14)
        beep(880, 0.2, 0.08, 0.12)
      } else if (n.severity === 'HIGH') {
        beep(660, 0, 0.18, 0.12)
      } else {
        beep(520, 0, 0.2, 0.08)
      }
    } else if (n.type === 'earthquake' && (n.magnitude ?? 0) >= 5) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(220, t)
      osc.frequency.linearRampToValueAtTime(180, t + 0.35)
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.55)
    } else if (n.type === 'tweet') {
      beep(1000, 0, 0.06, 0.1)
    } else if (n.type === 'disaster') {
      beep(440, 0, 0.28, 0.11)
    } else {
      beep(520, 0, 0.2, 0.08)
    }
  } catch {
    /* ignore */
  }
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      maxNotifications: 200,
      soundEnabled: true,

      addNotification: (notif) => {
        // Deduplication — suppress same title/incidentId within 5 min window
        if (isDuplicate(notif.title, notif.incidentId)) return

        const id = crypto.randomUUID()
        const timestamp = Date.now()
        const full: AppNotification = { ...notif, id, timestamp, read: false }
        set((state) => ({
          notifications: [full, ...state.notifications].slice(0, state.maxNotifications),
        }))
        if (get().soundEnabled) playAlertForNotification(full)
        // TTS with cooldown
        const now = Date.now()
        if (now - _lastTTSTs >= TTS_COOLDOWN_MS) {
          _lastTTSTs = now
          try { useTTSStore.getState().speak(full.title, full.severity, full.domain) } catch { /* ignore */ }
        }
      },

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      dismissAll: () => set({ notifications: [] }),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'argus-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 200),
        soundEnabled: state.soundEnabled,
      }),
    }
  )
)
