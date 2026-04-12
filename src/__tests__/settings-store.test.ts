import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '@/stores/settings-store'

describe('SettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      uiScale: 1,
      language: 'en',
      refreshInterval: 120,
      layoutMode: 'stacked',
      panelWidthPct: 40,
      soundEnabled: true,
      ttsEnabled: false,
    })
  })

  it('updateSetting updates a single setting', () => {
    useSettingsStore.getState().updateSetting('uiScale', 1.5)
    expect(useSettingsStore.getState().uiScale).toBe(1.5)
  })

  it('updateSetting for layoutMode', () => {
    useSettingsStore.getState().updateSetting('layoutMode', 'globe-left')
    expect(useSettingsStore.getState().layoutMode).toBe('globe-left')
  })

  it('updateSetting for panelWidthPct clamps values', () => {
    useSettingsStore.getState().updateSetting('panelWidthPct', 50)
    expect(useSettingsStore.getState().panelWidthPct).toBe(50)
  })

  it('updateSetting preserves other settings', () => {
    useSettingsStore.getState().updateSetting('uiScale', 2)
    expect(useSettingsStore.getState().language).toBe('en')
    expect(useSettingsStore.getState().refreshInterval).toBe(120)
  })
})
