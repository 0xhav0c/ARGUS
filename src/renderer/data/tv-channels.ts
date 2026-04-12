import type { TVChannel } from '../../shared/types'

export const TV_CHANNELS: TVChannel[] = [
  // === NEWS CHANNELS ===
  // US
  { id: 'cnn', name: 'CNN', country: 'United States', countryCode: 'US', language: 'en', category: 'news', youtubeId: 'UCupvZG-5ko_eiXAupbDfxWw', isLive: true },
  { id: 'foxnews', name: 'Fox News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', youtubeId: 'UCXIJgqnII2ZOINSWNOGFThA', isLive: true },
  { id: 'msnbc', name: 'MSNBC', country: 'United States', countryCode: 'US', language: 'en', category: 'news', youtubeId: 'UCaXkIU1QidjPwiAYu6GcHjg', isLive: true },
  { id: 'abc-news', name: 'ABC News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', youtubeId: 'UCBi2mrWuNuyYy4gbM6fU18Q', isLive: true },
  { id: 'nbc-news', name: 'NBC News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', youtubeId: 'UCeY0bbntWzzVIaj2z3QigXg', isLive: true },
  { id: 'cbs-news', name: 'CBS News', country: 'United States', countryCode: 'US', language: 'en', category: 'news', youtubeId: 'UC8p1vwvWtl6T73JiExfWs1g', isLive: true },

  // UK
  { id: 'bbc-news', name: 'BBC News', country: 'United Kingdom', countryCode: 'GB', language: 'en', category: 'news', youtubeId: 'UC16niRr50-MSBwiO3YDb3RA', isLive: true },
  { id: 'sky-news', name: 'Sky News', country: 'United Kingdom', countryCode: 'GB', language: 'en', category: 'news', youtubeId: 'UCoMdktPbSTixAyNGwb-UYkQ', isLive: true },

  // Middle East
  { id: 'aljazeera', name: 'Al Jazeera English', country: 'Qatar', countryCode: 'QA', language: 'en', category: 'news', youtubeId: 'UCNye-wNBqNL5ZzHSJj3l8Bg', isLive: true },
  { id: 'aljazeera-ar', name: 'Al Jazeera Arabic', country: 'Qatar', countryCode: 'QA', language: 'ar', category: 'news', youtubeId: 'UCawyVmwMVrUbAASwD6mqPgQ', isLive: true },
  { id: 'trt-world', name: 'TRT World', country: 'Türkiye', countryCode: 'TR', language: 'en', category: 'news', youtubeId: 'UC7fWeaHhqgM4Lba0JzMEPzQ', isLive: true },
  { id: 'trt-haber', name: 'TRT Haber', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCFDAzih78MBh4VYMEqGkz8Q', isLive: true },
  { id: 'haberturk', name: 'Habertürk TV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCn6dNfiRE_Xunu7iMyvD7AA', isLive: true },
  { id: 'ntv', name: 'NTV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCyR7iLc73OW1kuW3qnvGVBQ', isLive: true },
  { id: 'cnn-turk', name: 'CNN Türk', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCV6zcRug6Hqp1UX_FdyUeBg', isLive: true },
  { id: 'a-haber', name: 'A Haber', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCKQhfw-lzz0uKnE1fY1PsAA', isLive: true },
  { id: 'haber-global', name: 'Haber Global', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCtc-a9ZUIg0_5HpsPxEO7Qg', isLive: true },
  { id: 'halk-tv', name: 'Halk TV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCf_ResXZzE-o18zACUEmyvQ', isLive: true },
  { id: 'tele1', name: 'TELE1', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCoHnRpOS5rL62jTmSDO5Npw', isLive: true },
  { id: 'sozcu-tv', name: 'Sözcü TV', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCOulx_rep5O4i9y6AyDqVvw', isLive: true },
  { id: 'tv100', name: 'tv100', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCndsdUW_oPLqpQJY9J8oIRg', isLive: true },
  { id: 'tgrt-haber', name: 'TGRT Haber', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UCzgrZ-CndOoylh2_e72nSBQ', isLive: true },
  { id: 'bloomberg-ht', name: 'Bloomberg HT', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'finance', youtubeId: 'UCApLxl6oYQafxvykuoC2uxQ', isLive: true },
  { id: 'bengu-turk', name: 'Bengü Türk', country: 'Türkiye', countryCode: 'TR', language: 'tr', category: 'news', youtubeId: 'UC-JrUgI8EY6-vDcFJn3ROww', isLive: true },
  { id: 'i24news', name: 'i24NEWS', country: 'Israel', countryCode: 'IL', language: 'en', category: 'news', youtubeId: 'UCJgjBHZLC0GzqFvqtRKeDkA', isLive: true },

  // Europe
  { id: 'france24-en', name: 'France 24 English', country: 'France', countryCode: 'FR', language: 'en', category: 'news', youtubeId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', isLive: true },
  { id: 'france24-fr', name: 'France 24 Français', country: 'France', countryCode: 'FR', language: 'fr', category: 'news', youtubeId: 'UCCCPCZNChQdGa9EkATeye4g', isLive: true },
  { id: 'dw-news', name: 'DW News', country: 'Germany', countryCode: 'DE', language: 'en', category: 'news', youtubeId: 'UCknLrEdhRCp1aegoMqRaCZg', isLive: true },
  { id: 'dw-deutsch', name: 'DW Deutsch', country: 'Germany', countryCode: 'DE', language: 'de', category: 'news', youtubeId: 'UCMIgOXM2JEQ2Pv2d0_PVfcg', isLive: true },
  { id: 'euronews', name: 'Euronews', country: 'France', countryCode: 'FR', language: 'en', category: 'news', youtubeId: 'UCW2QcKZiU8aUGg4yxCIditg', isLive: true },

  // Russia — may not embed/play where YouTube blocks this channel (UCpwvZwUam-URkxB7g4USKpg)
  { id: 'rt', name: 'RT', country: 'Russia', countryCode: 'RU', language: 'en', category: 'news', youtubeId: 'UCpwvZwUam-URkxB7g4USKpg', isLive: true },

  // Asia / Pacific
  { id: 'ndtv', name: 'NDTV 24x7', country: 'India', countryCode: 'IN', language: 'en', category: 'news', youtubeId: 'UCHMm3_5DMKQP7t43-b5IEmQ', isLive: true },
  { id: 'wion', name: 'WION', country: 'India', countryCode: 'IN', language: 'en', category: 'news', youtubeId: 'UC_gUM8rL-Lrg6O3adPW9K1g', isLive: true },
  { id: 'times-now', name: 'Times Now', country: 'India', countryCode: 'IN', language: 'en', category: 'news', youtubeId: 'UCz2kgo-HSWn2F5ymNSwFGCQ', isLive: true },
  { id: 'nhk-world', name: 'NHK World', country: 'Japan', countryCode: 'JP', language: 'en', category: 'news', youtubeId: 'UCY04GY2k8PU9K2CG-1p_QpQ', isLive: true },
  { id: 'cgtn', name: 'CGTN', country: 'China', countryCode: 'CN', language: 'en', category: 'news', youtubeId: 'UCgrNz-aDmcr2uuto8_DL2jg', isLive: true },
  { id: 'arirang', name: 'Arirang TV', country: 'South Korea', countryCode: 'KR', language: 'en', category: 'news', youtubeId: 'UCL_UMfDOCkneJjHGpDOY4Mw', isLive: true },
  { id: 'cna', name: 'CNA', country: 'Singapore', countryCode: 'SG', language: 'en', category: 'news', youtubeId: 'UCo8bcnLyZH8tBIH9V1mLgqQ', isLive: true },
  { id: 'abc-au', name: 'ABC News Australia', country: 'Australia', countryCode: 'AU', language: 'en', category: 'news', youtubeId: 'UCVgO39Bk5sMo66-6o6Spn6Q', isLive: true },

  // Americas
  { id: 'cbc-news', name: 'CBC News', country: 'Canada', countryCode: 'CA', language: 'en', category: 'news', youtubeId: 'UCuFFtHWoLl5fauMMD5Ww2jA', isLive: true },
  { id: 'telesur', name: 'teleSUR English', country: 'Venezuela', countryCode: 'VE', language: 'en', category: 'news', youtubeId: 'UCjFS94VmhkMdigIKD1qqXEQ', isLive: true },

  // Africa
  { id: 'africanews', name: 'Africanews', country: 'Republic of Congo', countryCode: 'CG', language: 'en', category: 'news', youtubeId: 'UC1_E8NezhDoCf7p3Cuj03MQ', isLive: true },

  // === FINANCE ===
  { id: 'cnbc', name: 'CNBC', country: 'United States', countryCode: 'US', language: 'en', category: 'finance', youtubeId: 'UCvJJ_dzjViJCoLf5uKUTwoA', isLive: true },
  { id: 'bloomberg', name: 'Bloomberg TV', country: 'United States', countryCode: 'US', language: 'en', category: 'finance', youtubeId: 'UCIALMKvObZNtJ6AmdCLP7Lg', isLive: true },
  { id: 'yahoo-fin-tv', name: 'Yahoo Finance', country: 'United States', countryCode: 'US', language: 'en', category: 'finance', youtubeId: 'UCEAZeUIeJs992IY3BOSQJeA', isLive: true },

  // === GOVERNMENT / INSTITUTIONAL ===
  { id: 'cspan', name: 'C-SPAN', country: 'United States', countryCode: 'US', language: 'en', category: 'government', youtubeId: 'UCb--64Gl51jIEVE-GLDAVTiQ', isLive: true },
  { id: 'un-tv', name: 'United Nations', country: 'International', countryCode: 'INT', language: 'en', category: 'government', youtubeId: 'UCXs5JwXboPwOPPuDYDu52Ag', isLive: true },
]

export function getChannelsByCategory(category?: string): TVChannel[] {
  if (!category || category === 'all') return TV_CHANNELS
  return TV_CHANNELS.filter(c => c.category === category)
}

export function getChannelsByCountry(countryCode: string): TVChannel[] {
  return TV_CHANNELS.filter(c => c.countryCode === countryCode)
}
