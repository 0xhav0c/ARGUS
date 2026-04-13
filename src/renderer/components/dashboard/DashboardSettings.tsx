import { useEffect, useMemo, useState, useCallback, useRef, type CSSProperties } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { useNotificationStore } from '@/stores/notification-store'
import { useTTSStore } from '@/stores/tts-store'
import { useIncidentStore } from '@/stores/incident-store'
import { useTVStore, type UserTVChannel } from '@/stores/tv-store'
import type { Incident, FeedSource, AppSettings, FeatureFlags } from '../../../shared/types'
import { DEFAULT_FEATURES } from '@/stores/settings-store'

const P = {
  bg: '#0a0e17',
  card: '#0d1220',
  border: '#141c2e',
  text: '#c8d6e5',
  dim: '#4a5568',
  accent: '#00d4ff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

const selectStyle: CSSProperties = {
  background: P.bg, border: `1px solid ${P.border}`, borderRadius: '4px',
  color: P.text, fontFamily: P.font, fontSize: '10px', padding: '6px 8px',
  outline: 'none', maxWidth: '200px', cursor: 'pointer',
}
const rowLabel: CSSProperties = { fontSize: '9px', color: P.dim, marginBottom: '3px', letterSpacing: '0.06em' }
const inputStyle: CSSProperties = {
  width: '100%', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '3px',
  padding: '6px 8px', color: P.text, fontFamily: P.font, fontSize: '10px', outline: 'none',
  marginTop: '3px', boxSizing: 'border-box' as const,
}

function SectionTitle({ text, color = P.accent }: { text: string; color?: string }) {
  return <div style={{ fontSize: '9px', fontWeight: 700, color, letterSpacing: '0.12em', marginBottom: '12px', borderBottom: `1px solid ${P.border}`, paddingBottom: '6px' }}>{text}</div>
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <div onClick={onChange} style={{
        width: '34px', height: '18px', borderRadius: '9px', position: 'relative',
        background: checked ? P.accent + '40' : P.border, transition: 'background 0.2s', cursor: 'pointer',
      }}>
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%', position: 'absolute', top: '2px',
          left: checked ? '18px' : '2px', background: checked ? P.accent : P.dim,
          transition: 'all 0.2s', boxShadow: checked ? `0 0 6px ${P.accent}60` : 'none',
        }} />
      </div>
      <span style={{ fontSize: '11px', color: P.text }}>{label}</span>
    </label>
  )
}

interface SettingsModalProps { open: boolean; onClose: () => void; incidents: Incident[]; initialTab?: 'general' | 'audio' | 'feeds' | 'tv' | 'data' | 'companion' | 'apikeys' | 'ai' | 'performance' | 'features' }
interface CompanionInfo { ip: string; port: number; running: boolean; clients: number; token?: string }

type DraftSettings = Omit<AppSettings, never>

export function SettingsModal({ open, onClose, incidents, initialTab }: SettingsModalProps) {
  const storeSettings = useSettingsStore()
  const updateSetting = useSettingsStore(s => s.updateSetting)
  const notifSound = useNotificationStore(s => s.soundEnabled)
  const toggleNotifSound = useNotificationStore(s => s.toggleSound)
  const globalTTS = useTTSStore(s => s.globalTTS)
  const setGlobalTTS = useTTSStore(s => s.setGlobalTTS)
  const globalVolume = useTTSStore(s => s.globalVolume)
  const setGlobalVolume = useTTSStore(s => s.setGlobalVolume)
  const tvChannels = useTVStore(s => s.channels)
  const tvCategories = useTVStore(s => s.categories)
  const updateChannel = useTVStore(s => s.updateChannel)
  const removeChannel = useTVStore(s => s.removeChannel)
  const addChannel = useTVStore(s => s.addChannel)
  const addCategory = useTVStore(s => s.addCategory)
  const removeCategory = useTVStore(s => s.removeCategory)

  const [tab, setTab] = useState<'general' | 'audio' | 'feeds' | 'tv' | 'data' | 'companion' | 'apikeys' | 'ai' | 'performance' | 'features'>(initialTab || 'general')

  // Sync initialTab when modal opens
  useEffect(() => {
    if (open && initialTab) setTab(initialTab)
  }, [open, initialTab])

  // --- Draft state for General settings ---
  const extractSettings = useCallback((): DraftSettings => ({
    language: storeSettings.language,
    theme: storeSettings.theme,
    autoRefresh: storeSettings.autoRefresh,
    refreshInterval: storeSettings.refreshInterval,
    globeQuality: storeSettings.globeQuality,
    showAnimations: storeSettings.showAnimations,
    notificationsEnabled: storeSettings.notificationsEnabled,
    uiScale: storeSettings.uiScale,
    soundEnabled: storeSettings.soundEnabled,
    ttsEnabled: storeSettings.ttsEnabled,
    ttsRate: storeSettings.ttsRate,
    ttsVolume: storeSettings.ttsVolume,
    maxNotifications: storeSettings.maxNotifications,
    autoRotateGlobe: storeSettings.autoRotateGlobe,
    mapLabels: storeSettings.mapLabels,
    dateFormat: storeSettings.dateFormat,
    startupTab: storeSettings.startupTab,
    layoutMode: storeSettings.layoutMode,
    panelWidthPct: storeSettings.panelWidthPct,
  }), [storeSettings])

  const [draft, setDraft] = useState<DraftSettings>(extractSettings)
  const [dirty, setDirty] = useState(false)
  const draftInitRef = useRef(false)

  useEffect(() => {
    if (open && !draftInitRef.current) {
      setDraft(extractSettings())
      setDirty(false)
      draftInitRef.current = true
    }
    if (!open) draftInitRef.current = false
  }, [open, extractSettings])

  const setField = useCallback(<K extends keyof DraftSettings>(key: K, value: DraftSettings[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  // --- Draft state for Audio ---
  const [draftSound, setDraftSound] = useState(true)
  const [draftTTS, setDraftTTS] = useState(true)
  const [draftVolume, setDraftVolume] = useState(0.9)
  const [audioDirty, setAudioDirty] = useState(false)

  const audioInitRef = useRef(false)
  useEffect(() => {
    if (open && !audioInitRef.current) {
      setDraftSound(notifSound)
      setDraftTTS(globalTTS)
      setDraftVolume(globalVolume)
      setAudioDirty(false)
      audioInitRef.current = true
    }
    if (!open) audioInitRef.current = false
  }, [open, notifSound, globalTTS, globalVolume])

  // --- Other state ---
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [confirmMode, setConfirmMode] = useState<'days' | 'all' | null>(null)
  const [purgeDays, setPurgeDays] = useState(7)
  const [toast, setToast] = useState<string | null>(null)
  const setIncidents = useIncidentStore(s => s.setIncidents)
  const lastUpdated = useIncidentStore(s => s.lastUpdated)
  const [companionInfo, setCompanionInfo] = useState<CompanionInfo | null>(null)
  const [starting, setStarting] = useState(false)
  const [companionError, setCompanionError] = useState<string | null>(null)
  const [tvAddForm, setTvAddForm] = useState({ name: '', url: '', country: '', category: 'news' })
  const [tvNewCat, setTvNewCat] = useState('')
  const [feeds, setFeeds] = useState<FeedSource[]>([])
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedName, setNewFeedName] = useState('')
  const [editingTv, setEditingTv] = useState<string | null>(null)
  const [tvEditForm, setTvEditForm] = useState<Partial<UserTVChannel>>({})
  const [editingFeed, setEditingFeed] = useState<string | null>(null)
  const [feedEditForm, setFeedEditForm] = useState<{ name: string; url: string; category: string }>({ name: '', url: '', category: '' })
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; label: string; category: string; description: string; docsUrl: string; configured: boolean; maskedValue: string; placeholder?: string; isPassword?: boolean }>>([])
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({})
  const [apiKeyTesting, setApiKeyTesting] = useState<string | null>(null)
  const [apiKeyResults, setApiKeyResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({})

  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) }, [toast])

  useEffect(() => { if (!open) return; window.argus?.getFeeds?.().then(setFeeds).catch(() => {}) }, [open])
  useEffect(() => {
    if (!open || (tab !== 'apikeys' && tab !== 'performance')) return
    window.argus?.getApiKeys?.().then(keys => { setApiKeys(keys); if (tab === 'apikeys') { setApiKeyInputs({}); setApiKeyResults({}) } }).catch(() => {})
  }, [open, tab])

  const apiRef = useRef((window as any).argus)
  const api = apiRef.current

  const refreshCompanion = useCallback(async () => { const a = (window as any).argus; if (!a?.companionInfo) return; try { setCompanionInfo(await a.companionInfo()) } catch {} }, [])
  useEffect(() => { if (!open) return; refreshCompanion(); const iv = setInterval(refreshCompanion, 5000); return () => clearInterval(iv) }, [open, refreshCompanion])

  const archiveStats = useMemo(() => {
    const n = incidents.length; let oldest: string | null = null, newest: string | null = null
    if (n > 0) { const times = incidents.map(i => new Date(i.timestamp).getTime()).filter(t => !Number.isNaN(t)); if (times.length) { oldest = new Date(Math.min(...times)).toISOString(); newest = new Date(Math.max(...times)).toISOString() } }
    const bytes = new TextEncoder().encode(JSON.stringify(incidents)).length
    return { total: n, oldest, newest, bytes, sourcesActive: new Set(incidents.map(i => i.source).filter(Boolean)).size }
  }, [incidents])

  const deletePreview = useMemo(() => {
    if (confirmMode === 'all') return incidents.length
    if (confirmMode === 'days') { const cutoff = Date.now() - purgeDays * 86400000; return incidents.filter(i => new Date(i.timestamp).getTime() < cutoff).length }
    return 0
  }, [confirmMode, purgeDays, incidents])

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(2)} MB`

  // --- Save handlers ---
  const handleSaveGeneral = useCallback(() => {
    const keys = Object.keys(draft) as (keyof DraftSettings)[]
    for (const k of keys) { updateSetting(k, draft[k] as any) }
    setDirty(false)
    setToast('Settings saved ✓')
  }, [draft, updateSetting])

  const handleSaveAudio = useCallback(() => {
    if (draftSound !== notifSound) toggleNotifSound()
    if (draftTTS !== globalTTS) setGlobalTTS(draftTTS)
    if (draftVolume !== globalVolume) setGlobalVolume(draftVolume)
    setAudioDirty(false)
    setToast('Audio settings saved ✓')
  }, [draftSound, draftTTS, draftVolume, notifSound, globalTTS, globalVolume, toggleNotifSound, setGlobalTTS, setGlobalVolume])

  const exportArchive = useCallback(() => {
    const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `argus-archive-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click(); URL.revokeObjectURL(url)
    setToast('Archive exported successfully')
  }, [incidents])

  const executeClear = useCallback(async () => {
    if (!api?.clearOldIncidents) { setToast('Clear function not available'); setConfirmMode(null); return }
    try {
      const days = confirmMode === 'all' ? 0 : purgeDays
      const result = await api.clearOldIncidents(days)
      setIncidents(result?.remaining ?? [])
      setToast(`Deleted ${result?.deleted ?? 0} incidents. ${(result?.remaining ?? []).length} remaining.`)
    } catch (err: any) { setToast(`Error: ${err?.message || 'Clear failed'}`) }
    setConfirmMode(null)
  }, [confirmMode, purgeDays, setIncidents, api])

  const handleCompanionStart = async () => {
    setStarting(true); setCompanionError(null)
    try { const r = await api.companionStart(); if (r.success) setCompanionInfo({ ip: r.ip, port: r.port, running: true, clients: 0 }); else setCompanionError(r.error || 'Failed') } catch (e: any) { setCompanionError(e.message) }
    setStarting(false)
  }
  const handleCompanionStop = async () => { try { await api.companionStop(); setCompanionInfo(p => p ? { ...p, running: false, clients: 0 } : null) } catch {} }

  // --- Feed handlers ---
  const handleAddFeed = useCallback(async () => {
    if (!newFeedUrl.trim()) return
    try {
      await api.addFeed?.({ url: newFeedUrl.trim(), name: newFeedName.trim() || newFeedUrl.trim() })
      setToast('Feed added'); setNewFeedUrl(''); setNewFeedName('')
      const updated = await api.getFeeds?.(); if (updated) setFeeds(updated)
    } catch (e: any) { setToast(`Error: ${e?.message || 'Failed'}`) }
  }, [newFeedUrl, newFeedName, api])

  const handleRemoveFeed = useCallback(async (feedId: string) => {
    try { await api.removeFeed?.(feedId); setFeeds(prev => prev.filter(f => f.id !== feedId)); setToast('Feed removed') } catch (e: any) { setToast(`Error: ${e?.message || 'Failed'}`) }
  }, [api])

  const handleSaveFeedEdit = useCallback(async (feedId: string) => {
    try {
      await api.updateFeed?.(feedId, feedEditForm)
      setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, name: feedEditForm.name || f.name, url: feedEditForm.url || f.url } : f))
      setEditingFeed(null); setFeedEditForm({ name: '', url: '', category: '' })
      setToast('Feed updated')
    } catch (e: any) { setToast(`Error: ${e?.message || 'Failed'}`) }
  }, [feedEditForm, api])

  // --- TV handlers ---
  const handleSaveTvEdit = useCallback((id: string) => {
    updateChannel(id, tvEditForm); setEditingTv(null); setTvEditForm({}); setToast('Channel updated')
  }, [tvEditForm, updateChannel])

  const handleSaveApiKey = useCallback(async (keyId: string) => {
    const value = apiKeyInputs[keyId]
    if (value === undefined || value === '') return
    try {
      const updated = await window.argus?.setApiKey?.(keyId, value)
      if (updated) setApiKeys(updated)
      setApiKeyInputs(prev => { const n = { ...prev }; delete n[keyId]; return n })
      setToast('API key saved')
    } catch (e: any) { setToast(`Error: ${e?.message || 'Save failed'}`) }
  }, [apiKeyInputs])

  const handleDeleteApiKey = useCallback(async (keyId: string) => {
    try {
      const updated = await window.argus?.deleteApiKey?.(keyId)
      if (updated) setApiKeys(updated)
      setApiKeyInputs(prev => { const n = { ...prev }; delete n[keyId]; return n })
      setApiKeyResults(prev => { const n = { ...prev }; delete n[keyId]; return n })
      setToast('API key removed')
    } catch (e: any) { setToast(`Error: ${e?.message || 'Delete failed'}`) }
  }, [])

  const handleTestApiKey = useCallback(async (keyId: string) => {
    setApiKeyTesting(keyId)
    setApiKeyResults(prev => { const n = { ...prev }; delete n[keyId]; return n })
    try {
      const result = await window.argus?.testApiKey?.(keyId)
      if (result) setApiKeyResults(prev => ({ ...prev, [keyId]: result }))
    } catch (e: any) { setApiKeyResults(prev => ({ ...prev, [keyId]: { success: false, message: e?.message || 'Test failed' } })) }
    setApiKeyTesting(null)
  }, [])

  // --- AI Config state ---
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai' | 'custom'>('ollama')
  const [aiOllamaUrl, setAiOllamaUrl] = useState('http://localhost:11434')
  const [aiOllamaModel, setAiOllamaModel] = useState('llama3.2')
  const [aiOpenaiModel, setAiOpenaiModel] = useState('gpt-4o-mini')
  const [aiCustomUrl, setAiCustomUrl] = useState('')
  const [aiCustomModel, setAiCustomModel] = useState('')
  const [aiCustomKey, setAiCustomKey] = useState('')
  const [aiStatus, setAiStatus] = useState<null | { ollama: boolean; openai: boolean; custom: boolean }>(null)
  const [aiTesting, setAiTesting] = useState(false)
  const [aiOllamaModels, setAiOllamaModels] = useState<string[]>([])
  const [aiDirty, setAiDirty] = useState(false)

  useEffect(() => {
    if (open && (tab === 'ai' || tab === 'performance')) {
      window.argus?.aiConfigGet?.().then((cfg: any) => {
        if (cfg) {
          setAiProvider(cfg.provider || 'ollama')
          setAiOllamaUrl(cfg.ollamaUrl || 'http://localhost:11434')
          setAiOllamaModel(cfg.ollamaModel || 'llama3.2')
          setAiOpenaiModel(cfg.openaiModel || 'gpt-4o-mini')
          setAiCustomUrl(cfg.customUrl || '')
          setAiCustomModel(cfg.customModel || '')
          setAiCustomKey(cfg.customKey || '')
        }
      }).catch(() => {})
      window.argus?.aiCheck?.().then((s: any) => { if (s) setAiStatus(s) }).catch(() => {})
    }
  }, [open, tab])

  useEffect(() => {
    if (open && tab === 'ai' && aiProvider === 'ollama') {
      fetch(`${aiOllamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data?.models)) setAiOllamaModels(data.models.map((m: any) => m.name || m.model).filter(Boolean))
        })
        .catch(() => setAiOllamaModels([]))
    }
  }, [open, tab, aiProvider, aiOllamaUrl])

  const handleSaveAiConfig = useCallback(async () => {
    try {
      await window.argus?.aiConfigSet?.({
        provider: aiProvider,
        ollamaUrl: aiOllamaUrl,
        ollamaModel: aiOllamaModel,
        openaiModel: aiOpenaiModel,
        customUrl: aiCustomUrl,
        customModel: aiCustomModel,
        customKey: aiCustomKey,
      })
      setToast('AI configuration saved')
      setAiDirty(false)
      const s = await window.argus?.aiCheck?.()
      if (s) setAiStatus(s)
    } catch (e: any) { setToast(`Error: ${e?.message || 'Save failed'}`) }
  }, [aiProvider, aiOllamaUrl, aiOllamaModel, aiOpenaiModel, aiCustomUrl, aiCustomModel, aiCustomKey])

  const handleTestAi = useCallback(async () => {
    setAiTesting(true)
    setAiStatus(null)
    try {
      if (aiDirty) {
        await window.argus?.aiConfigSet?.({
          provider: aiProvider, ollamaUrl: aiOllamaUrl, ollamaModel: aiOllamaModel,
          openaiModel: aiOpenaiModel, customUrl: aiCustomUrl, customModel: aiCustomModel, customKey: aiCustomKey,
        })
        setAiDirty(false)
      }
      const s = await window.argus?.aiCheck?.()
      if (s) {
        setAiStatus(s)
        const isOk = (aiProvider === 'ollama' && s.ollama) || (aiProvider === 'openai' && s.openai) || (aiProvider === 'custom' && s.custom)
        setToast(isOk ? 'Connection successful!' : 'Connection failed — check your URL and API key')
      } else {
        setToast('No response from connection test')
      }
    } catch (e: any) {
      setAiStatus({ ollama: false, openai: false, custom: false })
      setToast(`Connection test failed: ${e?.message || 'Unknown error'}`)
    }
    setAiTesting(false)
  }, [aiProvider, aiDirty, aiOllamaUrl, aiOllamaModel, aiOpenaiModel, aiCustomUrl, aiCustomModel, aiCustomKey])

  // --- Performance state ---
  const [cacheStats, setCacheStats] = useState<{ sizeBytes: number; tileCount: number; dir: string } | null>(null)
  const [clearing, setClearing] = useState(false)
  const [uptime] = useState(() => Date.now())

  useEffect(() => {
    if (open && tab === 'performance') {
      window.argus?.getCacheStats?.().then(s => setCacheStats(s)).catch(() => {})
    }
  }, [open, tab])

  const handleClearCache = useCallback(async () => {
    setClearing(true)
    try {
      await window.argus?.clearTileCache?.()
      const s = await window.argus?.getCacheStats?.()
      if (s) setCacheStats(s)
      setToast('Tile cache cleared')
    } catch { setToast('Failed to clear cache') }
    setClearing(false)
  }, [])

  const features = useSettingsStore(s => s.features) || DEFAULT_FEATURES

  const allSettingsTabs: { id: typeof tab; label: string; color: string; featureKey?: keyof FeatureFlags }[] = [
    { id: 'general', label: 'GENERAL', color: P.accent },
    { id: 'audio', label: 'AUDIO & TTS', color: '#a78bfa', featureKey: 'featureTTS' },
    { id: 'feeds', label: 'RSS FEEDS', color: '#ff6b35' },
    { id: 'tv', label: 'TV CHANNELS', color: '#3fb950', featureKey: 'tabMedia' },
    { id: 'data', label: 'DATA', color: '#6bcf7f' },
    { id: 'companion', label: 'COMPANION', color: '#a855f7', featureKey: 'featureCompanion' },
    { id: 'apikeys', label: 'API KEYS', color: '#f5c542' },
    { id: 'ai', label: 'AI CONFIG', color: '#a855f7', featureKey: 'featureAIPanel' },
    { id: 'performance', label: 'PERFORMANCE', color: '#3fb950' },
    { id: 'features', label: '⚡ FEATURES', color: '#f97316' },
  ]
  const tabs = allSettingsTabs.filter(t => !t.featureKey || features[t.featureKey])

  useEffect(() => {
    const visibleIds = allSettingsTabs.filter(t => !t.featureKey || features[t.featureKey]).map(t => t.id)
    if (!visibleIds.includes(tab)) setTab('general')
  }, [features, tab])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const SaveButton = ({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label?: string }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 28px', fontSize: '11px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.1em',
      background: disabled ? P.card : P.accent, border: disabled ? `1px solid ${P.border}` : 'none',
      borderRadius: '6px', cursor: disabled ? 'default' : 'pointer',
      color: disabled ? P.dim : '#000', transition: 'all 0.2s',
      boxShadow: disabled ? 'none' : `0 0 16px ${P.accent}40`,
    }}>{label || 'SAVE SETTINGS'}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', boxSizing: 'border-box' as const }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '860px', maxWidth: '100%', maxHeight: '100%', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: P.dim }}>⚙</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: P.text, letterSpacing: '0.15em', fontFamily: P.font }}>SETTINGS</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: '#ff3b5c20', border: '1px solid #ff3b5c40', borderRadius: '4px', color: '#ff3b5c', cursor: 'pointer', fontSize: '12px', fontFamily: P.font, fontWeight: 700, padding: '4px 12px', lineHeight: 1 }}>X</button>
        </div>

        {/* Body: Sidebar + Content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

          {/* Sidebar Nav */}
          <div style={{ width: '140px', minWidth: '110px', flexShrink: 0, borderRight: `1px solid ${P.border}`, background: P.card, overflowY: 'auto', padding: '6px 0' }}>
            {tabs.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  padding: '9px 16px', fontSize: '9px', fontWeight: 600, fontFamily: P.font,
                  letterSpacing: '0.06em', whiteSpace: 'nowrap', textAlign: 'left',
                  background: active ? `${t.color}10` : 'transparent',
                  border: 'none', borderLeft: active ? `2px solid ${t.color}` : '2px solid transparent',
                  color: active ? t.color : P.dim, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: active ? t.color : 'transparent', flexShrink: 0, boxShadow: active ? `0 0 6px ${t.color}50` : 'none' }} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px' }}>

          {/* ===== GENERAL ===== */}
          {tab === 'general' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <SectionTitle text="DISPLAY" />
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>LANGUAGE</span>
                <select value={draft.language} onChange={e => setField('language', e.target.value as any)} style={selectStyle}>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>UI SCALE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="range" min="0.85" max="1.5" step="0.05" value={draft.uiScale}
                    onChange={e => setField('uiScale', Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer', accentColor: P.accent }} />
                  <span style={{ fontSize: '12px', color: P.accent, fontWeight: 700, minWidth: '40px', textAlign: 'right' }}>{Math.round(draft.uiScale * 100)}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[{ label: 'Small', value: 0.9 }, { label: 'Default', value: 1.15 }, { label: 'Large', value: 1.3 }, { label: 'XL', value: 1.5 }].map(p => (
                  <button key={p.label} onClick={() => setField('uiScale', p.value)} style={{
                    padding: '5px 12px', fontSize: '9px', fontFamily: P.font, fontWeight: 600,
                    background: Math.abs(draft.uiScale - p.value) < 0.03 ? `${P.accent}15` : P.card,
                    border: `1px solid ${Math.abs(draft.uiScale - p.value) < 0.03 ? P.accent + '40' : P.border}`,
                    borderRadius: '4px', color: Math.abs(draft.uiScale - p.value) < 0.03 ? P.accent : P.dim, cursor: 'pointer',
                  }}>{p.label}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>DATE FORMAT</span>
                <select value={draft.dateFormat} onChange={e => setField('dateFormat', e.target.value as any)} style={selectStyle}>
                  <option value="24h">24-hour</option>
                  <option value="12h">12-hour (AM/PM)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>STARTUP TAB</span>
                <select value={draft.startupTab} onChange={e => setField('startupTab', e.target.value as any)} style={selectStyle}>
                  <option value="feed">Live Feed</option>
                  <option value="intelligence">Intelligence</option>
                  <option value="security">Security</option>
                  <option value="operations">Operations</option>
                  <option value="media">Media</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>LAYOUT MODE</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {([
                    { value: 'stacked' as const, label: 'Stacked ▬', desc: 'Globe top, panels below' },
                    { value: 'globe-left' as const, label: 'Globe Left ◧', desc: 'Globe left, panels right' },
                    { value: 'globe-right' as const, label: 'Globe Right ◨', desc: 'Panels left, globe right' },
                  ]).map(l => (
                    <button key={l.value} onClick={() => setField('layoutMode', l.value)} title={l.desc} style={{
                      padding: '5px 12px', fontSize: '9px', fontFamily: P.font, fontWeight: 600,
                      background: draft.layoutMode === l.value ? `${P.accent}15` : P.card,
                      border: `1px solid ${draft.layoutMode === l.value ? P.accent + '40' : P.border}`,
                      borderRadius: '4px', color: draft.layoutMode === l.value ? P.accent : P.dim, cursor: 'pointer',
                    }}>{l.label}</button>
                  ))}
                </div>
              </div>
              {(draft.layoutMode === 'globe-left' || draft.layoutMode === 'globe-right') && (
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                  <span style={rowLabel}>PANEL WIDTH</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="25" max="70" step="5" value={draft.panelWidthPct}
                      onChange={e => setField('panelWidthPct', Number(e.target.value))}
                      style={{ flex: 1, cursor: 'pointer', accentColor: P.accent }} />
                    <span style={{ fontSize: '12px', color: P.accent, fontWeight: 700, minWidth: '40px', textAlign: 'right' }}>{draft.panelWidthPct}%</span>
                  </div>
                </div>
              )}

              <SectionTitle text="GLOBE" color="#a78bfa" />
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>GLOBE QUALITY</span>
                <select value={draft.globeQuality} onChange={e => setField('globeQuality', e.target.value as any)} style={selectStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Toggle checked={draft.showAnimations} onChange={() => setField('showAnimations', !draft.showAnimations)} label="Show animations" />
              <Toggle checked={draft.autoRotateGlobe} onChange={() => setField('autoRotateGlobe', !draft.autoRotateGlobe)} label="Auto-rotate globe" />
              <Toggle checked={draft.mapLabels} onChange={() => setField('mapLabels', !draft.mapLabels)} label="Show map labels" />

              <SectionTitle text="DATA REFRESH" color="#6bcf7f" />
              <Toggle checked={draft.autoRefresh} onChange={() => setField('autoRefresh', !draft.autoRefresh)} label="Auto-refresh feeds" />
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>REFRESH INTERVAL</span>
                <select value={String(draft.refreshInterval)} onChange={e => setField('refreshInterval', Number(e.target.value))} style={selectStyle}>
                  <option value="60">1 min</option>
                  <option value="120">2 min</option>
                  <option value="300">5 min</option>
                  <option value="600">10 min</option>
                  <option value="900">15 min</option>
                </select>
              </div>

              <SectionTitle text="NOTIFICATIONS" color="#ff6b35" />
              <Toggle checked={draft.notificationsEnabled} onChange={() => setField('notificationsEnabled', !draft.notificationsEnabled)} label="Enable notifications" />
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>MAX NOTIFICATIONS</span>
                <select value={String(draft.maxNotifications)} onChange={e => setField('maxNotifications', Number(e.target.value))} style={selectStyle}>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                </select>
              </div>

              {/* SAVE */}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                {dirty && <span style={{ fontSize: '9px', color: '#f5c542', fontWeight: 600 }}>Unsaved changes</span>}
                <SaveButton onClick={handleSaveGeneral} disabled={!dirty} />
              </div>
            </div>
          )}

          {/* ===== AUDIO ===== */}
          {tab === 'audio' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <SectionTitle text="NOTIFICATION SOUNDS" />
              <Toggle checked={draftSound} onChange={() => { setDraftSound(!draftSound); setAudioDirty(true) }} label="Enable notification sounds" />

              <SectionTitle text="TEXT-TO-SPEECH (TTS)" color="#a78bfa" />
              <Toggle checked={draftTTS} onChange={() => { setDraftTTS(!draftTTS); setAudioDirty(true) }} label="Enable text-to-speech" />
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={rowLabel}>TTS VOLUME</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="range" min="0" max="1" step="0.05" value={draftVolume}
                    onChange={e => { setDraftVolume(Number(e.target.value)); setAudioDirty(true) }}
                    style={{ flex: 1, cursor: 'pointer', accentColor: '#a78bfa' }} />
                  <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, minWidth: '40px', textAlign: 'right' }}>{Math.round(draftVolume * 100)}%</span>
                </div>
              </div>
              <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', color: P.dim, marginBottom: '8px' }}>TTS reads out critical alerts using your system's speech synthesis. You can fine-tune per-domain and per-severity profiles in the Operations tab.</div>
                <button onClick={() => {
                  if (typeof speechSynthesis !== 'undefined') {
                    speechSynthesis.cancel()
                    const u = new SpeechSynthesisUtterance('Argus text-to-speech test. All systems nominal.')
                    u.rate = 1; u.volume = draftVolume; speechSynthesis.speak(u)
                  }
                }} style={{
                  padding: '6px 14px', fontSize: '9px', fontWeight: 600, background: '#a78bfa15',
                  border: '1px solid #a78bfa40', borderRadius: '4px', cursor: 'pointer', color: '#a78bfa', fontFamily: P.font,
                }}>TEST TTS</button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                {audioDirty && <span style={{ fontSize: '9px', color: '#f5c542', fontWeight: 600 }}>Unsaved changes</span>}
                <SaveButton onClick={handleSaveAudio} disabled={!audioDirty} label="SAVE AUDIO" />
              </div>
            </div>
          )}

          {/* ===== FEEDS ===== */}
          {tab === 'feeds' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <SectionTitle text="ADD RSS FEED" />
              <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>FEED NAME</label>
                    <input value={newFeedName} onChange={e => setNewFeedName(e.target.value)} placeholder="e.g. Reuters World" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <button onClick={handleAddFeed} style={{
                      padding: '6px 18px', fontSize: '9px', fontWeight: 700, background: P.accent, border: 'none',
                      borderRadius: '4px', cursor: 'pointer', color: P.bg, fontFamily: P.font, whiteSpace: 'nowrap',
                    }}>ADD FEED</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>FEED URL</label>
                  <input value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} placeholder="https://feeds.reuters.com/reuters/worldNews" style={inputStyle}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddFeed() }} />
                </div>
              </div>

              <SectionTitle text={`ACTIVE FEEDS (${feeds.length})`} color="#ff6b35" />
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {feeds.map(f => (
                  <div key={f.id} style={{ padding: '8px 10px', borderBottom: `1px solid ${P.border}08`, marginBottom: '2px' }}>
                    {editingFeed === f.id ? (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ fontSize: '9px', color: P.dim }}>NAME</label>
                            <input value={feedEditForm.name} onChange={e => setFeedEditForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, border: `1px solid ${P.accent}30` }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '9px', color: P.dim }}>CATEGORY</label>
                            <input value={feedEditForm.category} onChange={e => setFeedEditForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. news" style={{ ...inputStyle, border: `1px solid ${P.accent}30` }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '9px', color: P.dim }}>URL</label>
                          <input value={feedEditForm.url} onChange={e => setFeedEditForm(p => ({ ...p, url: e.target.value }))} style={{ ...inputStyle, border: `1px solid ${P.accent}30` }} />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleSaveFeedEdit(f.id)} style={{
                            padding: '4px 14px', fontSize: '9px', fontWeight: 700, background: '#3fb950',
                            border: 'none', borderRadius: '3px', cursor: 'pointer', color: '#000', fontFamily: P.font,
                          }}>SAVE</button>
                          <button onClick={() => { setEditingFeed(null); setFeedEditForm({ name: '', url: '', category: '' }) }} style={{
                            padding: '4px 12px', fontSize: '9px', fontWeight: 600, background: 'transparent',
                            border: `1px solid ${P.border}`, borderRadius: '3px', cursor: 'pointer', color: P.dim, fontFamily: P.font,
                          }}>CANCEL</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: f.enabled ? '#3fb950' : P.dim, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          <div style={{ fontSize: '9px', color: P.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</div>
                        </div>
                        <span style={{ fontSize: '9px', color: P.dim, padding: '2px 6px', background: P.card, borderRadius: '3px', flexShrink: 0 }}>{(f as any).category || f.domain || 'general'}</span>
                        <button onClick={() => { setEditingFeed(f.id); setFeedEditForm({ name: f.name, url: f.url, category: (f as any).category || '' }) }} style={{
                          background: `${P.accent}10`, border: `1px solid ${P.accent}30`, color: P.accent,
                          cursor: 'pointer', fontSize: '9px', fontWeight: 600, borderRadius: '3px', padding: '3px 8px', fontFamily: P.font,
                        }}>EDIT</button>
                        <button onClick={() => handleRemoveFeed(f.id)} style={{
                          background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)',
                          color: '#ff6b7a', cursor: 'pointer', fontSize: '9px', fontWeight: 600,
                          borderRadius: '3px', padding: '3px 8px', fontFamily: P.font,
                        }}>DEL</button>
                      </div>
                    )}
                  </div>
                ))}
                {feeds.length === 0 && <div style={{ fontSize: '10px', color: P.dim, textAlign: 'center', padding: '20px' }}>No feeds loaded</div>}
              </div>
            </div>
          )}

          {/* ===== TV CHANNELS ===== */}
          {tab === 'tv' && (
            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Categories management */}
              <SectionTitle text="CATEGORIES" color="#3fb950" />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                {tvCategories.map(c => (
                  <div key={c} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '9px', color: P.text }}>{c}</span>
                    {!['news', 'finance', 'government'].includes(c) && (
                      <button onClick={() => removeCategory(c)} style={{
                        background: 'none', border: 'none', color: '#ff3b5c80', cursor: 'pointer',
                        fontSize: '10px', padding: '0 2px', fontFamily: P.font, lineHeight: 1,
                      }}>×</button>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input value={tvNewCat} onChange={e => setTvNewCat(e.target.value)} placeholder="New category..."
                    style={{ ...inputStyle, width: '120px', marginTop: 0, padding: '3px 8px' }}
                    onKeyDown={e => { if (e.key === 'Enter' && tvNewCat.trim()) { addCategory(tvNewCat.trim()); setTvNewCat('') } }}
                  />
                  <button onClick={() => { if (tvNewCat.trim()) { addCategory(tvNewCat.trim()); setTvNewCat(''); setToast('Category added') } }} style={{
                    padding: '3px 10px', fontSize: '9px', fontWeight: 600, background: '#3fb95015',
                    border: '1px solid #3fb95040', borderRadius: '3px', cursor: 'pointer', color: '#3fb950', fontFamily: P.font,
                  }}>ADD</button>
                </div>
              </div>

              {/* Add channel form */}
              <SectionTitle text="ADD CHANNEL" color="#f5c542" />
              <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>NAME</label>
                    <input value={tvAddForm.name} onChange={e => setTvAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Channel name" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>COUNTRY</label>
                    <input value={tvAddForm.country} onChange={e => setTvAddForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Turkey" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em' }}>STREAM URL</label>
                  <input value={tvAddForm.url} onChange={e => setTvAddForm(f => ({ ...f, url: e.target.value }))} placeholder="YouTube live URL, embed URL, or stream link" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={tvAddForm.category} onChange={e => setTvAddForm(f => ({ ...f, category: e.target.value }))} style={selectStyle}>
                    {tvCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => {
                    if (!tvAddForm.name.trim() || !tvAddForm.url.trim()) { setToast('Name and URL are required'); return }
                    addChannel({
                      name: tvAddForm.name.trim(), url: tvAddForm.url.trim(),
                      country: tvAddForm.country.trim() || 'Unknown', countryCode: '',
                      language: 'en', category: tvAddForm.category, isCustom: true,
                    })
                    setTvAddForm({ name: '', url: '', country: '', category: 'news' })
                    setToast('Channel added')
                  }} style={{
                    padding: '6px 18px', fontSize: '9px', fontWeight: 700,
                    background: P.accent, border: 'none', borderRadius: '4px',
                    cursor: 'pointer', color: P.bg, fontFamily: P.font,
                  }}>ADD CHANNEL</button>
                </div>
              </div>

              {/* Channel list */}
              <SectionTitle text={`ALL CHANNELS (${tvChannels.length})`} color="#3fb950" />
              <div style={{ fontSize: '9px', color: P.dim, marginTop: '-10px' }}>Click EDIT to change channel details. Click DEL to remove custom channels.</div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {tvChannels.map(ch => (
                  <div key={ch.id} style={{ padding: '6px 10px', borderBottom: `1px solid ${P.border}08`, marginBottom: '1px' }}>
                    {editingTv === ch.id ? (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input value={tvEditForm.name ?? ch.name} onChange={e => setTvEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name"
                            style={{ ...inputStyle, border: `1px solid ${P.accent}30` }} />
                          <input value={tvEditForm.country ?? ch.country} onChange={e => setTvEditForm(f => ({ ...f, country: e.target.value }))} placeholder="Country"
                            style={{ ...inputStyle, border: `1px solid ${P.accent}30` }} />
                        </div>
                        <input value={tvEditForm.url ?? ch.url} onChange={e => setTvEditForm(f => ({ ...f, url: e.target.value }))} placeholder="Stream URL"
                          style={{ ...inputStyle, border: `1px solid ${P.accent}30` }} />
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select value={tvEditForm.category ?? ch.category} onChange={e => setTvEditForm(f => ({ ...f, category: e.target.value }))}
                            style={{ ...selectStyle, maxWidth: 'none' }}>
                            {tvCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div style={{ flex: 1 }} />
                          <button onClick={() => handleSaveTvEdit(ch.id)} style={{
                            padding: '4px 14px', fontSize: '9px', fontWeight: 700, background: '#3fb950',
                            border: 'none', borderRadius: '3px', cursor: 'pointer', color: '#000', fontFamily: P.font,
                          }}>SAVE</button>
                          <button onClick={() => { setEditingTv(null); setTvEditForm({}) }} style={{
                            padding: '4px 12px', fontSize: '9px', fontWeight: 600, background: 'transparent',
                            border: `1px solid ${P.border}`, borderRadius: '3px', cursor: 'pointer', color: P.dim, fontFamily: P.font,
                          }}>CANCEL</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: ch.isCustom ? '#f5c542' : '#3fb950', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '10px', color: P.text, fontWeight: 600 }}>{ch.name}</span>
                          <span style={{ fontSize: '9px', color: P.dim, marginLeft: '8px' }}>{ch.country}</span>
                        </div>
                        <span style={{ fontSize: '9px', color: P.dim, padding: '2px 5px', background: P.card, borderRadius: '3px' }}>{ch.category}</span>
                        <button onClick={() => { setEditingTv(ch.id); setTvEditForm({ name: ch.name, url: ch.url, country: ch.country, category: ch.category }) }} style={{
                          background: `${P.accent}10`, border: `1px solid ${P.accent}30`, color: P.accent,
                          cursor: 'pointer', fontSize: '9px', fontWeight: 600, borderRadius: '3px', padding: '3px 8px', fontFamily: P.font,
                        }}>EDIT</button>
                        <button onClick={() => removeChannel(ch.id)} style={{
                          background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)',
                          color: '#ff6b7a', cursor: 'pointer', fontSize: '9px', fontWeight: 600,
                          borderRadius: '3px', padding: '3px 8px', fontFamily: P.font,
                        }}>DEL</button>
                      </div>
                    )}
                  </div>
                ))}
                {tvChannels.length === 0 && <div style={{ fontSize: '10px', color: P.dim, textAlign: 'center', padding: '20px' }}>No channels loaded</div>}
              </div>
            </div>
          )}

          {/* ===== DATA ===== */}
          {tab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionTitle text="DATA ARCHIVE" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: P.text, letterSpacing: '0.1em' }}>INCIDENT CACHE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: online ? '#00ff87' : '#ff3b5c', boxShadow: online ? '0 0 8px #00ff8788' : '0 0 8px #ff3b5c88' }} />
                  <span style={{ fontSize: '10px', color: online ? '#00ff87' : '#ff3b5c', fontWeight: 600 }}>{online ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                {[
                  { label: 'TOTAL CACHED', value: String(archiveStats.total), color: P.accent },
                  { label: 'SOURCES ACTIVE', value: String(archiveStats.sourcesActive), color: '#00ff87' },
                  { label: 'LAST SYNC', value: lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '\u2014', color: P.text, small: true },
                  { label: 'STORAGE EST.', value: formatBytes(archiveStats.bytes), color: P.text },
                ].map(s => (
                  <div key={s.label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: s.small ? '10px' : '16px', fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '10px 12px', fontSize: '9px', color: P.dim }}>
                <div>Oldest: {archiveStats.oldest ? new Date(archiveStats.oldest).toLocaleString() : '\u2014'}</div>
                <div style={{ marginTop: '2px' }}>Newest: {archiveStats.newest ? new Date(archiveStats.newest).toLocaleString() : '\u2014'}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button onClick={exportArchive} style={{ background: `${P.accent}18`, border: `1px solid ${P.accent}55`, color: P.accent, cursor: 'pointer', fontFamily: P.font, fontSize: '9px', letterSpacing: '0.08em', fontWeight: 600, padding: '8px 14px', borderRadius: '6px' }}>EXPORT ARCHIVE</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '9px', color: P.dim }}>Clear older than</span>
                  <select value={purgeDays} onChange={e => setPurgeDays(Number(e.target.value))} style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.text, fontFamily: P.font, fontSize: '10px', padding: '5px 8px', borderRadius: '4px' }}>
                    {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                  </select>
                  <button onClick={() => setConfirmMode('days')} style={{ background: P.card, border: '1px solid #ff3b5c55', color: '#ff3b5c', cursor: 'pointer', fontFamily: P.font, fontSize: '9px', fontWeight: 600, padding: '7px 12px', borderRadius: '6px' }}>CLEAR OLD</button>
                </div>
                <button onClick={() => setConfirmMode('all')} style={{ background: '#ff3b5c15', border: '1px solid #ff3b5c55', color: '#ff3b5c', cursor: 'pointer', fontFamily: P.font, fontSize: '9px', fontWeight: 700, padding: '7px 14px', borderRadius: '6px' }}>CLEAR ALL DATA</button>
              </div>
              {confirmMode && (
                <div style={{ padding: '14px', background: P.card, border: '1px solid #ff3b5c44', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: P.text, marginBottom: '6px', fontWeight: 600 }}>
                    {confirmMode === 'all' ? `Delete ALL ${incidents.length} incidents?` : `Delete incidents older than ${purgeDays} day${purgeDays > 1 ? 's' : ''}?`}
                  </div>
                  <div style={{ fontSize: '10px', color: deletePreview > 0 ? '#ff3b5c' : '#f5c542', marginBottom: '12px' }}>
                    {deletePreview > 0 ? `${deletePreview} incident${deletePreview > 1 ? 's' : ''} will be permanently deleted.` : 'No incidents match.'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={executeClear} disabled={deletePreview === 0} style={{ background: deletePreview > 0 ? '#ff3b5c' : P.card, border: 'none', color: deletePreview > 0 ? '#fff' : P.dim, cursor: deletePreview > 0 ? 'pointer' : 'default', fontFamily: P.font, fontSize: '10px', fontWeight: 700, padding: '8px 18px', borderRadius: '4px' }}>CONFIRM DELETE</button>
                    <button onClick={() => setConfirmMode(null)} style={{ background: P.card, border: `1px solid ${P.border}`, color: P.dim, cursor: 'pointer', fontFamily: P.font, fontSize: '10px', padding: '8px 18px', borderRadius: '4px' }}>CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== COMPANION ===== */}
          {tab === 'companion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionTitle text="MOBILE COMPANION" color="#a855f7" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.15em', marginBottom: '10px' }}>PUSH SERVER</div>
                  {companionInfo?.running ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950', boxShadow: '0 0 6px #3fb950' }} />
                        <span style={{ fontSize: '11px', color: '#3fb950', fontWeight: 600 }}>RUNNING</span>
                      </div>
                      <div style={{ fontSize: '10px', color: P.text, marginBottom: '4px' }}>127.0.0.1:{companionInfo.port}</div>
                      <div style={{ fontSize: '9px', color: P.dim }}>{companionInfo.clients} client{companionInfo.clients !== 1 ? 's' : ''}</div>
                      <button onClick={handleCompanionStop} style={{ marginTop: '10px', padding: '6px 14px', fontSize: '9px', background: '#ff3b5c15', border: '1px solid #ff3b5c40', borderRadius: '4px', color: '#ff3b5c', cursor: 'pointer', fontFamily: P.font, fontWeight: 600 }}>STOP SERVER</button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: P.dim }} />
                        <span style={{ fontSize: '11px', color: P.dim, fontWeight: 600 }}>STOPPED</span>
                      </div>
                      <button onClick={handleCompanionStart} disabled={starting} style={{ padding: '8px 18px', fontSize: '10px', background: starting ? P.card : `${P.accent}15`, border: `1px solid ${starting ? P.border : P.accent + '40'}`, borderRadius: '4px', color: starting ? P.dim : P.accent, cursor: starting ? 'default' : 'pointer', fontFamily: P.font, fontWeight: 600 }}>{starting ? 'STARTING...' : 'START SERVER'}</button>
                    </>
                  )}
                  {companionError && <div style={{ fontSize: '9px', color: '#ff3b5c', marginTop: '8px' }}>{companionError}</div>}
                </div>
                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.15em', marginBottom: '10px' }}>CONNECTION INFO</div>
                  {companionInfo?.running ? (
                    <>
                      <div style={{ fontSize: '10px', color: P.text, marginBottom: '8px' }}>SSE endpoint:</div>
                      <div style={{ padding: '8px 12px', background: P.bg, border: `1px solid ${P.accent}30`, borderRadius: '4px', fontSize: '10px', color: P.accent, fontWeight: 600, wordBreak: 'break-all' }}>
                        http://127.0.0.1:{companionInfo.port}/events
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(`http://127.0.0.1:${companionInfo.port}/events`)} style={{ marginTop: '10px', padding: '5px 12px', fontSize: '9px', background: 'transparent', border: `1px solid ${P.border}`, borderRadius: '3px', color: P.accent, cursor: 'pointer', fontFamily: P.font, fontWeight: 600 }}>COPY ENDPOINT URL</button>
                      <div style={{ marginTop: '6px', fontSize: '9px', color: P.dim }}>
                        Auth: Bearer header required (token: {companionInfo.tokenPreview || '••••'})
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '10px', color: P.dim, lineHeight: 1.6 }}>Start the server to enable mobile push notifications.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== API KEYS ===== */}
          {tab === 'apikeys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px 14px', background: '#f5c54210', border: '1px solid #f5c54230', borderRadius: '6px', fontSize: '9px', color: '#f5c542', lineHeight: 1.6 }}>
                Configure API keys to unlock enhanced data sources and higher rate limits. Keys are stored locally in your database and never transmitted to third parties.
              </div>

              {(['intelligence', 'finance', 'tracking', 'ai'] as const).map(category => {
                const catKeys = apiKeys.filter(k => k.category === category)
                if (catKeys.length === 0) return null
                const catColors: Record<string, string> = { intelligence: '#ff6b35', finance: '#3fb950', tracking: P.accent, ai: '#a78bfa' }
                const catLabels: Record<string, string> = { intelligence: 'INTELLIGENCE & SECURITY', finance: 'FINANCE', tracking: 'TRACKING', ai: 'AI & LLM' }
                return (
                  <div key={category}>
                    <SectionTitle text={catLabels[category] || category.toUpperCase()} color={catColors[category] || P.accent} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {catKeys.map(apiKey => {
                        const result = apiKeyResults[apiKey.id]
                        const isTesting = apiKeyTesting === apiKey.id
                        const hasInput = (apiKeyInputs[apiKey.id] ?? '').length > 0
                        return (
                          <div key={apiKey.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: apiKey.configured ? '#3fb950' : P.dim, boxShadow: apiKey.configured ? '0 0 4px #3fb95088' : 'none', flexShrink: 0 }} />
                              <span style={{ fontSize: '10px', fontWeight: 700, color: P.text, letterSpacing: '0.05em' }}>{apiKey.label}</span>
                              <span style={{ fontSize: '9px', color: P.dim, flex: 1 }}>{apiKey.description}</span>
                              <a href={apiKey.docsUrl} target="_blank" rel="noopener noreferrer" onClick={e => { e.preventDefault(); window.open(apiKey.docsUrl, '_blank') }}
                                style={{ fontSize: '9px', color: catColors[category] || P.accent, textDecoration: 'none', flexShrink: 0, padding: '2px 6px', background: `${catColors[category] || P.accent}10`, border: `1px solid ${catColors[category] || P.accent}30`, borderRadius: '3px' }}>GET KEY</a>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                  type={apiKey.isPassword ? 'password' : 'text'}
                                  value={apiKeyInputs[apiKey.id] ?? ''}
                                  onChange={e => setApiKeyInputs(prev => ({ ...prev, [apiKey.id]: e.target.value }))}
                                  placeholder={apiKey.configured ? apiKey.maskedValue : (apiKey.placeholder || 'Enter API key...')}
                                  style={{ ...inputStyle, marginTop: 0, fontSize: '9px', paddingRight: '4px' }}
                                  onKeyDown={e => { if (e.key === 'Enter' && hasInput) handleSaveApiKey(apiKey.id) }}
                                />
                              </div>
                              <button onClick={() => handleSaveApiKey(apiKey.id)} disabled={!hasInput}
                                style={{ padding: '6px 10px', fontSize: '9px', fontWeight: 700, fontFamily: P.font, background: hasInput ? '#3fb950' : P.card, border: hasInput ? 'none' : `1px solid ${P.border}`, borderRadius: '3px', color: hasInput ? '#000' : P.dim, cursor: hasInput ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>SAVE</button>
                              <button onClick={() => handleTestApiKey(apiKey.id)} disabled={isTesting}
                                style={{ padding: '6px 10px', fontSize: '9px', fontWeight: 700, fontFamily: P.font, background: `${catColors[category] || P.accent}15`, border: `1px solid ${catColors[category] || P.accent}30`, borderRadius: '3px', color: isTesting ? P.dim : (catColors[category] || P.accent), cursor: isTesting ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>{isTesting ? 'TESTING...' : 'TEST'}</button>
                              {apiKey.configured && (
                                <button onClick={() => handleDeleteApiKey(apiKey.id)}
                                  style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 600, fontFamily: P.font, background: '#ff3b5c10', border: '1px solid #ff3b5c30', borderRadius: '3px', color: '#ff6b7a', cursor: 'pointer', whiteSpace: 'nowrap' }}>DEL</button>
                              )}
                            </div>
                            {result && (
                              <div style={{ marginTop: '6px', padding: '5px 8px', background: result.success ? '#3fb95010' : '#ff3b5c10', border: `1px solid ${result.success ? '#3fb95030' : '#ff3b5c30'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '9px', color: result.success ? '#3fb950' : '#ff3b5c', fontWeight: 600 }}>{result.success ? 'OK' : 'FAIL'}</span>
                                <span style={{ fontSize: '9px', color: P.dim, flex: 1 }}>{result.message}</span>
                                {result.latencyMs != null && <span style={{ fontSize: '9px', color: P.dim }}>{result.latencyMs}ms</span>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionTitle text="CACHE & PERFORMANCE DASHBOARD" color="#3fb950" />

              {/* Tile Cache */}
              <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#3fb950', letterSpacing: '0.1em', marginBottom: '10px' }}>TILE CACHE</div>
                {cacheStats ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: P.accent }}>{(cacheStats.sizeBytes / (1024 * 1024)).toFixed(1)} MB</div>
                      <div style={{ fontSize: '9px', color: P.dim }}>Cache Size</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f5c542' }}>{cacheStats.tileCount.toLocaleString()}</div>
                      <div style={{ fontSize: '9px', color: P.dim }}>Tiles</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: P.dim, wordBreak: 'break-all', lineHeight: 1.4 }}>{cacheStats.dir}</div>
                      <div style={{ fontSize: '9px', color: P.dim }}>Directory</div>
                    </div>
                  </div>
                ) : <div style={{ fontSize: '10px', color: P.dim }}>Loading...</div>}
                <button onClick={handleClearCache} disabled={clearing} style={{
                  padding: '8px 16px', fontSize: '9px', fontWeight: 700, fontFamily: P.font,
                  background: '#ff3b5c18', border: '1px solid #ff3b5c40', borderRadius: '4px',
                  color: '#ff3b5c', cursor: clearing ? 'default' : 'pointer',
                }}>{clearing ? 'CLEARING...' : 'CLEAR TILE CACHE'}</button>
              </div>

              {/* Incident Cache */}
              <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: P.accent, letterSpacing: '0.1em', marginBottom: '10px' }}>INCIDENT STORE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: P.accent }}>{incidents.length.toLocaleString()}</div>
                    <div style={{ fontSize: '9px', color: P.dim }}>Total Incidents</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#ff6b35' }}>
                      {(() => { const s = new Set<string>(); incidents.forEach(i => s.add(i.source || 'Unknown')); return s.size })()}
                    </div>
                    <div style={{ fontSize: '9px', color: P.dim }}>Sources</div>
                  </div>
                </div>
              </div>

              {/* Memory */}
              <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em', marginBottom: '10px' }}>RUNTIME</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#a78bfa' }}>
                      {((performance as any)?.memory?.usedJSHeapSize ? ((performance as any).memory.usedJSHeapSize / (1024 * 1024)).toFixed(0) : '—')} MB
                    </div>
                    <div style={{ fontSize: '9px', color: P.dim }}>JS Heap Used</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f5c542' }}>
                      {((performance as any)?.memory?.totalJSHeapSize ? ((performance as any).memory.totalJSHeapSize / (1024 * 1024)).toFixed(0) : '—')} MB
                    </div>
                    <div style={{ fontSize: '9px', color: P.dim }}>JS Heap Total</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#3fb950' }}>
                      {(() => { const ms = Date.now() - uptime; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m` })()}
                    </div>
                    <div style={{ fontSize: '9px', color: P.dim }}>Session Uptime</div>
                  </div>
                </div>
              </div>

              {/* API Status */}
              <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#f5c542', letterSpacing: '0.1em', marginBottom: '10px' }}>API KEY STATUS</div>
                {apiKeys.length === 0 ? (
                  <div style={{ fontSize: '10px', color: P.dim }}>Loading API keys...</div>
                ) : (() => {
                  const nonAiKeys = apiKeys.filter(k => k.category !== 'ai')
                  const aiConnected = aiStatus
                    ? (aiProvider === 'openai' ? aiStatus.openai : aiProvider === 'custom' ? aiStatus.custom : aiStatus.ollama)
                    : false
                  const aiLabel = aiProvider === 'custom' ? 'Custom LLM' : aiProvider === 'openai' ? 'OpenAI' : 'Ollama'
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {nonAiKeys.map(k => (
                        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: k.configured ? '#3fb95010' : '#ff3b5c08', border: `1px solid ${k.configured ? '#3fb95030' : '#ff3b5c20'}`, borderRadius: '4px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: k.configured ? '#3fb950' : '#ff3b5c40' }} />
                          <span style={{ fontSize: '9px', color: k.configured ? P.text : P.dim }}>{k.label}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: aiConnected ? '#a855f710' : '#ff3b5c08', border: `1px solid ${aiConnected ? '#a855f730' : '#ff3b5c20'}`, borderRadius: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: aiConnected ? '#a855f7' : '#ff3b5c40', boxShadow: aiConnected ? '0 0 6px #a855f7' : 'none' }} />
                        <span style={{ fontSize: '9px', color: aiConnected ? P.text : P.dim }}>AI: {aiLabel}</span>
                        {aiStatus && <span style={{ fontSize: '9px', color: aiConnected ? '#a855f7' : '#ff3b5c80', marginLeft: '2px' }}>{aiConnected ? 'CONNECTED' : 'OFFLINE'}</span>}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Feed Health */}
              <div style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#ff6b35', letterSpacing: '0.1em', marginBottom: '10px' }}>SYSTEM INFO</div>
                <div style={{ fontSize: '10px', color: P.dim, lineHeight: 1.8 }}>
                  <div>Platform: {navigator.platform}</div>
                  <div>User Agent: {navigator.userAgent.slice(0, 80)}...</div>
                  <div>Screen: {screen.width}×{screen.height} · Device Pixel Ratio: {window.devicePixelRatio}</div>
                  <div>Language: {navigator.language}</div>
                  <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionTitle text="AI THREAT SUMMARIZER CONFIGURATION" color="#a855f7" />

              {/* Status indicator */}
              {aiStatus && (() => {
                const isOk = (aiProvider === 'ollama' && aiStatus.ollama) || (aiProvider === 'openai' && aiStatus.openai) || (aiProvider === 'custom' && aiStatus.custom)
                const msg = aiProvider === 'custom'
                  ? (aiStatus.custom ? 'Custom endpoint connected successfully' : 'Custom endpoint unreachable — check URL and API key')
                  : aiProvider === 'openai'
                  ? (aiStatus.openai ? 'OpenAI API key configured' : 'OpenAI API key not set')
                  : (aiStatus.ollama ? 'Ollama connected' : 'Ollama not reachable at ' + aiOllamaUrl)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: isOk ? '#3fb95010' : '#ff3b5c10', border: `1px solid ${isOk ? '#3fb95040' : '#ff3b5c40'}`, borderRadius: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOk ? '#3fb950' : '#ff3b5c', boxShadow: isOk ? '0 0 6px #3fb95080' : '0 0 6px #ff3b5c80' }} />
                    <span style={{ fontSize: '10px', color: isOk ? '#3fb950' : '#ff3b5c', fontWeight: 600 }}>{msg}</span>
                  </div>
                )
              })()}

              {/* Provider selection */}
              <div>
                <div style={rowLabel}>PROVIDER</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {([
                    { id: 'custom' as const, label: 'CUSTOM (API)' },
                    { id: 'openai' as const, label: 'OPENAI' },
                    { id: 'ollama' as const, label: 'OLLAMA (Local)' },
                  ]).map(p => (
                    <button key={p.id} onClick={() => { setAiProvider(p.id); setAiDirty(true) }} style={{
                      flex: 1, padding: '10px', fontSize: '9px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.08em',
                      background: aiProvider === p.id ? '#a855f718' : 'transparent',
                      border: `1px solid ${aiProvider === p.id ? '#a855f760' : P.border}`,
                      borderRadius: '6px', cursor: 'pointer', color: aiProvider === p.id ? '#a855f7' : P.dim,
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Ollama settings */}
              {aiProvider === 'ollama' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={rowLabel}>OLLAMA URL</div>
                    <input value={aiOllamaUrl} onChange={e => { setAiOllamaUrl(e.target.value); setAiDirty(true) }} style={inputStyle} placeholder="http://localhost:11434" />
                  </div>
                  <div>
                    <div style={rowLabel}>MODEL</div>
                    {aiOllamaModels.length > 0 ? (
                      <select value={aiOllamaModel} onChange={e => { setAiOllamaModel(e.target.value); setAiDirty(true) }} style={{ ...selectStyle, width: '100%', maxWidth: '100%', marginTop: '3px' }}>
                        {aiOllamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                        {!aiOllamaModels.includes(aiOllamaModel) && <option value={aiOllamaModel}>{aiOllamaModel} (custom)</option>}
                      </select>
                    ) : (
                      <input value={aiOllamaModel} onChange={e => { setAiOllamaModel(e.target.value); setAiDirty(true) }} style={inputStyle} placeholder="llama3.2" />
                    )}
                    {aiOllamaModels.length > 0 && <div style={{ fontSize: '9px', color: P.dim, marginTop: '3px' }}>{aiOllamaModels.length} model(s) detected</div>}
                  </div>
                </div>
              )}

              {/* OpenAI settings */}
              {aiProvider === 'openai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={rowLabel}>MODEL</div>
                    <select value={aiOpenaiModel} onChange={e => { setAiOpenaiModel(e.target.value); setAiDirty(true) }} style={{ ...selectStyle, width: '100%', maxWidth: '100%', marginTop: '3px' }}>
                      <option value="gpt-4o-mini">gpt-4o-mini (fast, cheap)</option>
                      <option value="gpt-4o">gpt-4o (balanced)</option>
                      <option value="gpt-4-turbo">gpt-4-turbo (powerful)</option>
                    </select>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f5c54210', border: '1px solid #f5c54230', borderRadius: '6px', fontSize: '9px', color: '#f5c542' }}>
                    OpenAI API key can be configured in the <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTab('apikeys')}>API KEYS</span> tab under "openai_key".
                  </div>
                </div>
              )}

              {/* Custom LLM / Proxy settings */}
              {aiProvider === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '8px 12px', background: '#a855f710', border: '1px solid #a855f730', borderRadius: '6px', fontSize: '9px', color: '#a855f7', lineHeight: 1.5 }}>
                    Connect to any OpenAI-compatible endpoint: OpenRouter, LiteLLM, or any /chat/completions API.
                  </div>
                  <div>
                    <div style={rowLabel}>API BASE URL</div>
                    <input value={aiCustomUrl} onChange={e => { setAiCustomUrl(e.target.value); setAiDirty(true) }} style={inputStyle} placeholder="https://your-api.com/v1" />
                    <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px' }}>/chat/completions is appended automatically if not included</div>
                  </div>
                  <div>
                    <div style={rowLabel}>MODEL NAME <span style={{ color: P.dim, fontWeight: 400 }}>(optional)</span></div>
                    <input value={aiCustomModel} onChange={e => { setAiCustomModel(e.target.value); setAiDirty(true) }} style={inputStyle} placeholder="Leave empty for auto-select" />
                  </div>
                  <div>
                    <div style={rowLabel}>API KEY</div>
                    <input type="password" value={aiCustomKey} onChange={e => { setAiCustomKey(e.target.value); setAiDirty(true) }} style={inputStyle} placeholder="Your API key" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={handleSaveAiConfig} disabled={!aiDirty} style={{
                  flex: 1, padding: '10px', fontSize: '10px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.1em',
                  background: aiDirty ? '#a855f7' : P.card, border: aiDirty ? 'none' : `1px solid ${P.border}`,
                  borderRadius: '6px', cursor: aiDirty ? 'pointer' : 'default', color: aiDirty ? '#fff' : P.dim,
                }}>SAVE CONFIG</button>
                <button onClick={handleTestAi} disabled={aiTesting} style={{
                  flex: 1, padding: '10px', fontSize: '10px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.1em',
                  background: 'transparent', border: `1px solid ${P.accent}40`,
                  borderRadius: '6px', cursor: 'pointer', color: P.accent,
                }}>{aiTesting ? 'TESTING...' : 'TEST CONNECTION'}</button>
              </div>
            </div>
          )}

          {/* ===== FEATURES ===== */}
          {tab === 'features' && <FeaturesTab />}

          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', padding: '10px 18px', background: P.card, border: `1px solid ${P.accent}40`, borderRadius: '6px', fontSize: '10px', color: P.accent, fontFamily: P.font, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 1 }}>{toast}</div>
        )}
      </div>
    </div>
  )
}

/* ─────────────── Feature Toggles Tab ─────────────── */

interface FeatureGroup {
  title: string
  color: string
  icon: string
  items: { key: keyof FeatureFlags; label: string }[]
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'MAIN TABS',
    color: '#00d4ff',
    icon: '◉',
    items: [
      { key: 'tabIntelligence', label: 'Intelligence' },
      { key: 'tabAnalysis', label: 'Analysis' },
      { key: 'tabSecurity', label: 'Security Intel' },
      { key: 'tabFinance', label: 'Finance' },
      { key: 'tabEntities', label: 'Entities Graph' },
      { key: 'tabCompare', label: 'Compare' },
      { key: 'tabOperations', label: 'Operations' },
      { key: 'tabMedia', label: 'Media' },
      { key: 'tabLiveFeed', label: 'Live Feed' },
      { key: 'tabLogs', label: 'System Logs' },
    ],
  },
  {
    title: 'ANALYSIS',
    color: '#a78bfa',
    icon: '◎',
    items: [
      { key: 'analysisBriefing', label: 'Briefing' },
      { key: 'analysisRiskIndex', label: 'Risk Index' },
      { key: 'analysisThreats', label: 'Threats' },
      { key: 'analysisClusters', label: 'AI Clusters' },
    ],
  },
  {
    title: 'SECURITY MODULES',
    color: '#ff3b5c',
    icon: '🛡',
    items: [
      { key: 'secBriefing', label: 'Daily Briefing' },
      { key: 'secCyber', label: 'Cyber Threats' },
      { key: 'secAnomaly', label: 'Anomaly & Risk' },
      { key: 'secPandemic', label: 'Pandemic' },
      { key: 'secNuclear', label: 'Nuclear / WMD' },
      { key: 'secMilitary', label: 'Military' },
      { key: 'secWeather', label: 'Weather' },
      { key: 'secInternet', label: 'Internet Outages' },
      { key: 'secSanctions', label: 'Sanctions' },
      { key: 'secDarkweb', label: 'Dark Web' },
      { key: 'secSpace', label: 'Space & NEO' },
      { key: 'secDrones', label: 'Drones / UAV' },
    ],
  },
  {
    title: 'OPERATIONS',
    color: '#00e676',
    icon: '⚙',
    items: [
      { key: 'opsQuery', label: 'Ask Argus' },
      { key: 'opsBookmarks', label: 'Bookmarks' },
      { key: 'opsThreads', label: 'Threads' },
      { key: 'opsProfiles', label: 'Alert Profiles' },
      { key: 'opsAnnotations', label: 'Map Annotations' },
      { key: 'opsPlugins', label: 'Data Sources' },
      { key: 'opsHotspots', label: 'Hotspots' },
      { key: 'opsReports', label: 'Reports' },
      { key: 'opsReliability', label: 'Source Scoring' },
      { key: 'opsAlertRules', label: 'Smart Alerts' },
      { key: 'opsPredictions', label: 'Predictions' },
      { key: 'opsExport', label: 'Export' },
      { key: 'opsTimeMachine', label: 'Time Machine' },
    ],
  },
  {
    title: 'TRACKING',
    color: '#f5c542',
    icon: '✈',
    items: [
      { key: 'trackFlights', label: 'Flights' },
      { key: 'trackVessels', label: 'Vessels' },
      { key: 'trackSatellites', label: 'Satellites' },
      { key: 'trackEarthquakes', label: 'Earthquakes' },
      { key: 'trackDisasters', label: 'Disasters' },
    ],
  },
  {
    title: 'TOOLS',
    color: '#06b6d4',
    icon: '⌘',
    items: [
      { key: 'featureAIPanel', label: 'AI Panel' },
      { key: 'featureCommandPalette', label: 'Cmd Palette' },
      { key: 'featureVoiceControl', label: 'Voice Control' },
      { key: 'featureCompanion', label: 'Companion' },
      { key: 'featureSplitView', label: 'Split View' },
      { key: 'featureNotifications', label: 'Notifications' },
      { key: 'featureTTS', label: 'TTS' },
    ],
  },
]

function FeaturesTab() {
  const features = useSettingsStore(s => s.features) || DEFAULT_FEATURES
  const updateSetting = useSettingsStore(s => s.updateSetting)

  const toggleFeature = useCallback((key: keyof FeatureFlags) => {
    updateSetting('features', { ...features, [key]: !features[key] })
  }, [features, updateSetting])

  const enabledCount = Object.values(features).filter(Boolean).length
  const totalCount = Object.keys(DEFAULT_FEATURES).length
  const pct = Math.round((enabledCount / totalCount) * 100)

  const enableAll = useCallback(() => {
    updateSetting('features', { ...DEFAULT_FEATURES })
  }, [updateSetting])

  const disableNonEssential = useCallback(() => {
    const minimal: FeatureFlags = { ...DEFAULT_FEATURES }
    for (const k of Object.keys(minimal) as (keyof FeatureFlags)[]) minimal[k] = false
    minimal.tabLiveFeed = true
    minimal.tabLogs = true
    minimal.featureNotifications = true
    updateSetting('features', minimal)
  }, [updateSetting])

  const toggleGroup = useCallback((group: FeatureGroup) => {
    const allOn = group.items.every(i => features[i.key])
    const updated = { ...features }
    for (const item of group.items) updated[item.key] = !allOn
    updateSetting('features', updated)
  }, [features, updateSetting])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px',
        background: `linear-gradient(135deg, #f9731608, #f5c54208)`,
        border: `1px solid #f9731625`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f97316', lineHeight: 1 }}>{enabledCount}<span style={{ fontSize: '11px', color: P.dim, fontWeight: 400 }}>/{totalCount}</span></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '4px' }}>ACTIVE MODULES — {pct}%</div>
          <div style={{ height: '3px', borderRadius: '2px', background: P.border, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #f97316, #f5c542)', transition: 'width 0.3s' }} />
          </div>
        </div>
        <button onClick={enableAll} style={{
          padding: '4px 10px', fontSize: '9px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.06em',
          background: '#00e67612', border: '1px solid #00e67635', borderRadius: '3px', color: '#00e676', cursor: 'pointer',
        }}>ALL ON</button>
        <button onClick={disableNonEssential} style={{
          padding: '4px 10px', fontSize: '9px', fontWeight: 700, fontFamily: P.font, letterSpacing: '0.06em',
          background: '#ff3b5c0c', border: '1px solid #ff3b5c28', borderRadius: '3px', color: '#ff3b5c', cursor: 'pointer',
        }}>MINIMAL</button>
      </div>

      {/* Feature groups as compact cards */}
      {FEATURE_GROUPS.map(group => {
        const onCount = group.items.filter(i => features[i.key]).length
        const allOn = onCount === group.items.length
        return (
          <div key={group.title} style={{
            background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px',
            overflow: 'hidden',
          }}>
            {/* Group header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              borderBottom: `1px solid ${P.border}`,
              background: `${group.color}06`,
            }}>
              <span style={{ fontSize: '10px' }}>{group.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: group.color, letterSpacing: '0.1em', flex: 1 }}>{group.title}</span>
              <span style={{ fontSize: '9px', color: P.dim }}>{onCount}/{group.items.length}</span>
              <button onClick={() => toggleGroup(group)} style={{
                padding: '2px 8px', fontSize: '9px', fontWeight: 600, fontFamily: P.font,
                background: allOn ? '#ff3b5c0a' : `${group.color}0a`,
                border: `1px solid ${allOn ? '#ff3b5c25' : group.color + '25'}`,
                borderRadius: '3px', color: allOn ? '#ff3b5c' : group.color, cursor: 'pointer',
              }}>{allOn ? 'ALL OFF' : 'ALL ON'}</button>
            </div>
            {/* Items grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: P.border }}>
              {group.items.map(item => {
                const on = features[item.key]
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleFeature(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 10px', cursor: 'pointer',
                      background: on ? `${group.color}08` : P.card,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      background: on ? group.color : P.dim,
                      boxShadow: on ? `0 0 4px ${group.color}50` : 'none',
                      transition: 'all 0.2s',
                    }} />
                    <span style={{
                      fontSize: '9px', color: on ? P.text : P.dim,
                      transition: 'color 0.15s', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div style={{ fontSize: '9px', color: P.dim, textAlign: 'center', padding: '4px 0' }}>
        Click any item to toggle · Changes apply immediately
      </div>
    </div>
  )
}
