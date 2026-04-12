import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AlertSoundProfile {
  id: string
  name: string
  enabled: boolean
  ttsEnabled: boolean
  ttsVoice: string
  ttsRate: number
  domains: string[]
  severities: string[]
  customSound?: 'beep' | 'alarm' | 'chime' | 'alert'
}

interface TTSState {
  profiles: AlertSoundProfile[]
  globalTTS: boolean
  globalVolume: number
  addProfile: (p: Omit<AlertSoundProfile, 'id'>) => void
  removeProfile: (id: string) => void
  toggleProfile: (id: string) => void
  setGlobalTTS: (on: boolean) => void
  setGlobalVolume: (v: number) => void
  speak: (text: string, severity?: string, domain?: string) => void
}

function matchesProfile(
  p: AlertSoundProfile,
  severity?: string,
  domain?: string
): boolean {
  if (!p.enabled) return false

  const domainOk =
    p.domains.length === 0 ||
    p.domains.includes('*') ||
    (domain !== undefined && p.domains.includes(domain))

  const severityOk =
    p.severities.length === 0 ||
    (severity !== undefined && p.severities.includes(severity))

  return domainOk && severityOk
}

function findMatchingProfile(
  profiles: AlertSoundProfile[],
  severity?: string,
  domain?: string
): AlertSoundProfile | undefined {
  return profiles.find((p) => matchesProfile(p, severity, domain))
}

let sharedSoundCtx: AudioContext | null = null
function getSoundCtx(): AudioContext {
  if (!sharedSoundCtx || sharedSoundCtx.state === 'closed') {
    sharedSoundCtx = new AudioContext()
  }
  if (sharedSoundCtx.state === 'suspended') sharedSoundCtx.resume()
  return sharedSoundCtx
}

function playCustomSound(
  kind: NonNullable<AlertSoundProfile['customSound']>,
  volume: number
): void {
  try {
    const ctx = getSoundCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const v = Math.min(1, Math.max(0, volume)) * 0.35
    gain.gain.setValueAtTime(v, ctx.currentTime)

    const profiles: Record<
      typeof kind,
      { type: OscillatorType; freq: number; duration: number; sweep?: number }
    > = {
      beep: { type: 'sine', freq: 880, duration: 0.08 },
      alarm: { type: 'square', freq: 1200, duration: 0.25, sweep: -400 },
      chime: { type: 'triangle', freq: 523.25, duration: 0.2 },
      alert: { type: 'sawtooth', freq: 440, duration: 0.15 },
    }
    const cfg = profiles[kind]
    osc.type = cfg.type
    osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
    if (cfg.sweep !== undefined) {
      osc.frequency.linearRampToValueAtTime(
        cfg.freq + cfg.sweep,
        ctx.currentTime + cfg.duration
      )
    }
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + cfg.duration + 0.02)
  } catch {
    /* no audio context */
  }
}

const DEFAULT_PROFILES: AlertSoundProfile[] = [
  {
    id: 'tts-profile-critical',
    name: 'Critical Alerts',
    enabled: true,
    ttsEnabled: true,
    ttsVoice: '',
    ttsRate: 1,
    domains: [],
    severities: ['CRITICAL'],
  },
  {
    id: 'tts-profile-conflict',
    name: 'Conflict Updates',
    enabled: true,
    ttsEnabled: true,
    ttsVoice: '',
    ttsRate: 1.05,
    domains: ['CONFLICT'],
    severities: ['HIGH', 'CRITICAL'],
    customSound: 'alert',
  },
  {
    id: 'tts-profile-cyber',
    name: 'Cyber Threats',
    enabled: true,
    ttsEnabled: false,
    ttsVoice: '',
    ttsRate: 1,
    domains: ['CYBER'],
    severities: [],
    customSound: 'beep',
  },
]

function cloneDefaultProfiles(): AlertSoundProfile[] {
  return DEFAULT_PROFILES.map((p) => ({ ...p }))
}

export const useTTSStore = create<TTSState>()(
  persist(
    (set, get) => ({
      profiles: cloneDefaultProfiles(),
      globalTTS: true,
      globalVolume: 0.9,

      addProfile: (p) =>
        set((s) => ({
          profiles: [...s.profiles, { ...p, id: crypto.randomUUID() }],
        })),

      removeProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((x) => x.id !== id) })),

      toggleProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x
          ),
        })),

      setGlobalTTS: (on) => set({ globalTTS: on }),

      setGlobalVolume: (v) =>
        set({ globalVolume: Math.min(1, Math.max(0, v)) }),

      speak: (text, severity, domain) => {
        const { globalTTS, globalVolume, profiles } = get()
        if (!globalTTS) return

        const ordered = [...profiles].sort((a, b) => {
          const spec = (p: AlertSoundProfile) =>
            (p.domains.length > 0 ? 2 : 0) + (p.severities.length > 0 ? 1 : 0)
          return spec(b) - spec(a)
        })

        const profile = findMatchingProfile(ordered, severity, domain)
        if (!profile) return

        const sev = severity ?? 'UNKNOWN'
        const dom = domain ?? 'GENERAL'
        const formatted = `[${sev}] [${dom}]: ${text}`

        if (profile.ttsEnabled && typeof speechSynthesis !== 'undefined') {
          speechSynthesis.cancel()
          const u = new SpeechSynthesisUtterance(formatted)
          u.rate = Math.min(2, Math.max(0.5, profile.ttsRate))
          u.volume = Math.min(1, Math.max(0, globalVolume))

          const applyVoice = () => {
            if (!profile.ttsVoice) return
            const voices = speechSynthesis.getVoices()
            const match = voices.find((v) => v.name === profile.ttsVoice)
            if (match) u.voice = match
          }
          applyVoice()
          if (
            speechSynthesis.getVoices().length === 0 &&
            typeof speechSynthesis.addEventListener === 'function'
          ) {
            speechSynthesis.addEventListener('voiceschanged', applyVoice, {
              once: true,
            })
          }

          speechSynthesis.speak(u)
        } else {
          playCustomSound(profile.customSound ?? 'beep', globalVolume)
        }
      },
    }),
    {
      name: 'argus-tts-profiles',
      partialize: (s) => ({
        profiles: s.profiles,
        globalTTS: s.globalTTS,
        globalVolume: s.globalVolume,
      }),
    }
  )
)
