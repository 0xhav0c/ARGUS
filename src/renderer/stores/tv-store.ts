import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface UserTVChannel {
  id: string
  name: string
  url: string
  country: string
  countryCode: string
  language: string
  category: string
  isCustom: boolean
}

const DEFAULT_TV_CATEGORIES = ['news', 'finance', 'government', 'military', 'custom'] as const

const DEFAULT_TV_CHANNELS: UserTVChannel[] = [
  { id: 'cnn', name: 'CNN', country: 'United States', countryCode: 'US', language: 'en', category: 'news', url: 'UCupvZG-5ko_eiXAupbDfxWw', isCustom: false },
  { id: 'foxnews', name: 'Fox News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', url: 'UCXIJgqnII2ZOINSWNOGFThA', isCustom: false },
  { id: 'msnbc', name: 'MSNBC', country: 'United States', countryCode: 'US', language: 'en', category: 'news', url: 'UCaXkIU1QidjPwiAYu6GcHjg', isCustom: false },
  { id: 'abc-news', name: 'ABC News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', url: 'UCBi2mrWuNuyYy4gbM6fU18Q', isCustom: false },
  { id: 'nbc-news', name: 'NBC News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', url: 'UCeY0bbntWzzVIaj2z3QigXg', isCustom: false },
  { id: 'cbs-news', name: 'CBS News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', url: 'UC8p1vwvWtl6T73JiExfWs1g', isCustom: false },
  { id: 'bbc-news', name: 'BBC News', country: 'United Kingdom', countryCode: 'GB', language: 'en', category: 'news', url: 'UC16niRr50-MSBwiO3YDb3RA', isCustom: false },
  { id: 'sky-news', name: 'Sky News', country: 'United Kingdom', countryCode: 'GB', language: 'en', category: 'news', url: 'UCoMdktPbSTixAyNGwb-UYkQ', isCustom: false },
  { id: 'aljazeera', name: 'Al Jazeera English', country: 'Qatar', countryCode: 'QA', language: 'en', category: 'news', url: 'UCNye-wNBqNL5ZzHSJj3l8Bg', isCustom: false },
  { id: 'aljazeera-ar', name: 'Al Jazeera Arabic', country: 'Qatar', countryCode: 'QA', language: 'ar', category: 'news', url: 'UCawyVmwMVrUbAASwD6mqPgQ', isCustom: false },
  { id: 'trt-world', name: 'TRT World', country: 'Türkiye', countryCode: 'TR', language: 'en', category: 'news', url: 'UC7fWeaHhqgM4Lba0JzMEPzQ', isCustom: false },
  { id: 'trt-haber', name: 'TRT Haber', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCFDAzih78MBh4VYMEqGkz8Q', isCustom: false },
  { id: 'haberturk', name: 'Habertürk TV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCn6dNfiRE_Xunu7iMyvD7AA', isCustom: false },
  { id: 'ntv', name: 'NTV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCyR7iLc73OW1kuW3qnvGVBQ', isCustom: false },
  { id: 'cnn-turk', name: 'CNN Türk', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCV6zcRug6Hqp1UX_FdyUeBg', isCustom: false },
  { id: 'a-haber', name: 'A Haber', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCKQhfw-lzz0uKnE1fY1PsAA', isCustom: false },
  { id: 'haber-global', name: 'Haber Global', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCtc-a9ZUIg0_5HpsPxEO7Qg', isCustom: false },
  { id: 'halk-tv', name: 'Halk TV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCf_ResXZzE-o18zACUEmyvQ', isCustom: false },
  { id: 'tele1', name: 'TELE1', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCoHnRpOS5rL62jTmSDO5Npw', isCustom: false },
  { id: 'sozcu-tv', name: 'Sözcü TV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCOulx_rep5O4i9y6AyDqVvw', isCustom: false },
  { id: 'tv100', name: 'tv100', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCndsdUW_oPLqpQJY9J8oIRg', isCustom: false },
  { id: 'tgrt-haber', name: 'TGRT Haber', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UCzgrZ-CndOoylh2_e72nSBQ', isCustom: false },
  { id: 'bloomberg-ht', name: 'Bloomberg HT', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'finance', url: 'UCApLxl6oYQafxvykuoC2uxQ', isCustom: false },
  { id: 'bengu-turk', name: 'Bengü Türk', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', url: 'UC-JrUgI8EY6-vDcFJn3ROww', isCustom: false },
  { id: 'i24news', name: 'i24NEWS', country: 'Israel', countryCode: 'IL', language: 'en', category: 'news', url: 'UCJgjBHZLC0GzqFvqtRKeDkA', isCustom: false },
  { id: 'france24-en', name: 'France 24 English', country: 'France', countryCode: 'FR', language: 'en', category: 'news', url: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', isCustom: false },
  { id: 'france24-fr', name: 'France 24 Français', country: 'France', countryCode: 'FR', language: 'fr', category: 'news', url: 'UCCCPCZNChQdGa9EkATeye4g', isCustom: false },
  { id: 'dw-news', name: 'DW News', country: 'Germany', countryCode: 'DE', language: 'en', category: 'news', url: 'UCknLrEdhRCp1aegoMqRaCZg', isCustom: false },
  { id: 'euronews', name: 'Euronews', country: 'France', countryCode: 'FR', language: 'en', category: 'news', url: 'UCW2QcKZiU8aUGg4yxCIditg', isCustom: false },
  { id: 'rt', name: 'RT', country: 'Russia', countryCode: 'RU', language: 'en', category: 'news', url: 'UCpwvZwUam-URkxB7g4USKpg', isCustom: false },
  { id: 'ndtv', name: 'NDTV', country: 'India', countryCode: 'IN', language: 'en', category: 'news', url: 'UCHMm3_5DMKQP7t43-b5IEmQ', isCustom: false },
  { id: 'nhk-world', name: 'NHK World', country: 'Japan', countryCode: 'JP', language: 'en', category: 'news', url: 'UCY04GY2k8PU9K2CG-1p_QpQ', isCustom: false },
  { id: 'cgtn', name: 'CGTN', country: 'China', countryCode: 'CN', language: 'en', category: 'news', url: 'UCgrNz-aDmcr2uuto8_DL2jg', isCustom: false },
  { id: 'arirang', name: 'Arirang TV', country: 'South Korea', countryCode: 'KR', language: 'en', category: 'news', url: 'UCL_UMfDOCkneJjHGpDOY4Mw', isCustom: false },
  { id: 'cna', name: 'CNA', country: 'Singapore', countryCode: 'SG', language: 'en', category: 'news', url: 'UCo8bcnLyZH8tBIH9V1mLgqQ', isCustom: false },
  { id: 'telesur', name: 'teleSUR English', country: 'Venezuela', countryCode: 'VE', language: 'en', category: 'news', url: 'UCjFS94VmhkMdigIKD1qqXEQ', isCustom: false },
  { id: 'africanews', name: 'Africanews', country: 'Republic of Congo', countryCode: 'CG', language: 'en', category: 'news', url: 'UC1_E8NezhDoCf7p3Cuj03MQ', isCustom: false },
  { id: 'cnbc', name: 'CNBC', country: 'United States', countryCode: 'US', language: 'en', category: 'finance', url: 'UCvJJ_dzjViJCoLf5uKUTwoA', isCustom: false },
  { id: 'bloomberg', name: 'Bloomberg TV', country: 'United States', countryCode: 'US', language: 'en', category: 'finance', url: 'UCIALMKvObZNtJ6AmdCLP7Lg', isCustom: false },
  { id: 'cspan', name: 'C-SPAN', country: 'United States', countryCode: 'US', language: 'en', category: 'government', url: 'UCb--64Gl51jIEVE-GLDAVTiQ', isCustom: false },
  { id: 'un-tv', name: 'United Nations', country: 'International', countryCode: 'INT', language: 'en', category: 'government', url: 'UCXs5JwXboPwOPPuDYDu52Ag', isCustom: false },
]

function cloneDefaults(): { channels: UserTVChannel[]; categories: string[] } {
  return {
    channels: DEFAULT_TV_CHANNELS.map((c) => ({ ...c })),
    categories: [...DEFAULT_TV_CATEGORIES],
  }
}

interface TVStoreState {
  channels: UserTVChannel[]
  categories: string[]
  addChannel: (channel: Omit<UserTVChannel, 'id'>) => void
  removeChannel: (id: string) => void
  updateChannel: (id: string, updates: Partial<UserTVChannel>) => void
  addCategory: (name: string) => void
  removeCategory: (name: string) => void
  resetToDefaults: () => void
}

export const useTVStore = create<TVStoreState>()(
  persist(
    (set) => ({
      ...cloneDefaults(),

      addChannel: (channel) =>
        set((s) => ({
          channels: [...s.channels, { ...channel, id: uuidv4() }],
        })),

      removeChannel: (id) =>
        set((s) => ({
          channels: s.channels.filter((c) => c.id !== id),
        })),

      updateChannel: (id, updates) =>
        set((s) => ({
          channels: s.channels.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      addCategory: (name) =>
        set((s) => {
          const t = name.trim()
          if (!t || s.categories.includes(t)) return {}
          return { categories: [...s.categories, t] }
        }),

      removeCategory: (name) =>
        set((s) => ({
          channels: s.channels.map((ch) =>
            ch.category === name ? { ...ch, category: 'custom' } : ch
          ),
          categories: s.categories.filter((c) => c !== name),
        })),

      resetToDefaults: () => set(cloneDefaults()),
    }),
    {
      name: 'argus-tv-channels',
      partialize: (s) => ({ channels: s.channels, categories: s.categories }),
    }
  )
)
