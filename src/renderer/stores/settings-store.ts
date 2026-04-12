import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, FeatureFlags } from '../../shared/types'

export const DEFAULT_FEATURES: FeatureFlags = {
  tabIntelligence: true,
  tabAnalysis: true,
  tabSecurity: true,
  tabFinance: true,
  tabEntities: true,
  tabCompare: true,
  tabOperations: true,
  tabMedia: true,
  tabLiveFeed: true,
  tabLogs: true,
  analysisBriefing: true,
  analysisRiskIndex: true,
  analysisThreats: true,
  analysisClusters: true,
  secBriefing: true,
  secCyber: true,
  secAnomaly: true,
  secPandemic: true,
  secNuclear: true,
  secMilitary: true,
  secWeather: true,
  secInternet: true,
  secSanctions: true,
  secDarkweb: true,
  secSpace: true,
  secDrones: true,
  opsQuery: true,
  opsBookmarks: true,
  opsThreads: true,
  opsProfiles: true,
  opsAnnotations: true,
  opsPlugins: true,
  opsHotspots: true,
  opsReports: true,
  opsReliability: true,
  opsAlertRules: true,
  opsPredictions: true,
  opsExport: true,
  opsTimeMachine: true,
  trackFlights: true,
  trackVessels: true,
  trackSatellites: true,
  trackEarthquakes: true,
  trackDisasters: true,
  featureAIPanel: true,
  featureCommandPalette: true,
  featureVoiceControl: true,
  featureCompanion: true,
  featureSplitView: true,
  featureNotifications: true,
  featureTTS: true,
}

interface SettingsState extends AppSettings {
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  loadSettings: (settings: Partial<AppSettings>) => void
  isFeatureEnabled: (key: keyof FeatureFlags) => boolean
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'en',
      theme: 'military',
      autoRefresh: true,
      refreshInterval: 300,
      globeQuality: 'medium',
      showAnimations: true,
      notificationsEnabled: true,
      uiScale: 1.15,
      soundEnabled: true,
      ttsEnabled: true,
      ttsRate: 1.0,
      ttsVolume: 0.9,
      maxNotifications: 200,
      autoRotateGlobe: true,
      mapLabels: false,
      dateFormat: '24h',
      startupTab: 'feed',
      layoutMode: 'stacked',
      panelWidthPct: 45,
      features: { ...DEFAULT_FEATURES },

      updateSetting: (key, value) => set({ [key]: value }),
      loadSettings: (settings) => set(settings),
      isFeatureEnabled: (key) => {
        const f = get().features
        return f ? (f[key] ?? true) : true
      },
    }),
    {
      name: 'argus-settings',
      merge: (persisted, current) => {
        const p = persisted as any
        return {
          ...current,
          ...p,
          features: { ...DEFAULT_FEATURES, ...(p?.features || {}) },
        }
      },
    }
  )
)
