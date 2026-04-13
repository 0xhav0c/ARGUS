/**
 * Fake Data Removal Tests — Round 2
 *
 * Kalan tüm fake/hardcoded fallback verilerinin kaldırıldığını doğrular.
 * Drone, Nuclear, SIGINT, DarkWeb, SpaceWeather, InternetInfra, IoC,
 * Telegram, Pandemic servislerini kapsar.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

/** Dosyayı oku ama yorum satırlarını çıkar (// ile başlayanlar) */
function readSrcCode(rel: string): string {
  const src = readSrc(rel)
  return src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
}

// ─── CRITICAL: Drone Service ─────────────────────────────────────────────────
describe('Drone Service — 100% fake data kaldırıldı', () => {
  const src = readSrcCode('main/services/drone-service.ts')

  it('KNOWN_ACTIVITIES yok (kodda)', () => {
    expect(src).not.toContain('KNOWN_ACTIVITIES')
  })

  it('Math.random yok (kodda)', () => {
    expect(src).not.toContain('Math.random')
  })

  it('hardcoded drone isimleri yok (kodda)', () => {
    expect(src).not.toContain('MQ-9 Reaper')
    expect(src).not.toContain('Bayraktar TB2')
    expect(src).not.toContain('Shahed-136')
    expect(src).not.toContain('Global Hawk')
  })

  it('boş array dönüyor', () => {
    expect(readSrc('main/services/drone-service.ts')).toContain('return []')
  })

  it('dosya 15 satırdan az', () => {
    expect(readSrc('main/services/drone-service.ts').split('\n').length).toBeLessThan(15)
  })
})

// ─── CRITICAL: Nuclear Service ───────────────────────────────────────────────
describe('Nuclear Service — fake missile events kaldırıldı', () => {
  const src = readSrcCode('main/services/nuclear-service.ts')

  it('MISSILE_EVENTS yok (kodda)', () => {
    expect(src).not.toContain('MISSILE_EVENTS')
  })

  it('Hwasong-18 yok (kodda)', () => {
    expect(src).not.toContain('Hwasong-18')
  })

  it('Fattah-2 yok (kodda)', () => {
    expect(src).not.toContain('Fattah-2')
  })

  it('RS-28 Sarmat yok (kodda)', () => {
    expect(src).not.toContain('Sarmat')
  })

  it('new Date().toISOString() yok (timestamp aldatması)', () => {
    expect(src).not.toContain('new Date().toISOString()')
    expect(src).not.toContain('Date.now() -')
  })

  it('referans veriler "(reference)" source etiketli', () => {
    expect(src).toContain('(reference)')
  })

  it('referans veriler sabit tarihli (fake güncel timestamp yok)', () => {
    // Tüm detectedAt alanları sabit tarih olmalı
    expect(src).toContain("detectedAt: '2022-")
  })
})

// ─── CRITICAL: SIGINT Service ────────────────────────────────────────────────
describe('SIGINT Service — fake jamming zones kaldırıldı', () => {
  const src = readSrcCode('main/services/sigint-service.ts')

  it('KNOWN_JAMMING_ZONES yok (kodda)', () => {
    expect(src).not.toContain('KNOWN_JAMMING_ZONES')
  })

  it('Math.random timestamp manipülasyonu yok (kodda)', () => {
    expect(src).not.toContain('Math.random')
  })

  it('hardcoded konumlar yok (kodda)', () => {
    expect(src).not.toContain('Latakia')
    expect(src).not.toContain('Kremlin')
    expect(src).not.toContain('Bab el-Mandeb')
    expect(src).not.toContain('Gaza border')
  })

  it('sadece live API verisi dönüyor', () => {
    expect(src).toContain('cached = live')
    expect(src).not.toContain('...KNOWN_JAMMING_ZONES')
  })
})

// ─── HIGH: DarkWeb Service ───────────────────────────────────────────────────
describe('DarkWeb Service — fake fallback alerts kaldırıldı', () => {
  const src = readSrcCode('main/services/darkweb-service.ts')

  it('fake alert ID\'leri yok (kodda)', () => {
    expect(src).not.toContain("id: 'dw-1'")
    expect(src).not.toContain("id: 'dw-2'")
    expect(src).not.toContain("id: 'dw-3'")
  })

  it('fake organizasyon isimleri yok (kodda)', () => {
    expect(src).not.toContain('Financial Corp')
    expect(src).not.toContain('Zero-Day Exploit for Sale')
    expect(src).not.toContain('APT-New')
  })
})

// ─── HIGH: Space Weather Service ─────────────────────────────────────────────
describe('SpaceWeather Service — FALLBACK kaldırıldı', () => {
  const src = readSrc('main/services/space-weather-service.ts')

  it('FALLBACK array yok (yorum hariç)', () => {
    const nonComment = src.split('\n').filter(l => !l.trim().startsWith('//'))
    const codeOnly = nonComment.join('\n')
    expect(codeOnly).not.toMatch(/const\s+FALLBACK/)
  })

  it('fake asteroid (2024 PT5) yok (kodda)', () => {
    const code = readSrcCode('main/services/space-weather-service.ts')
    expect(code).not.toContain('2024 PT5')
  })

  it('results.push(...FALLBACK) yok', () => {
    expect(src).not.toContain('...FALLBACK')
  })
})

// ─── HIGH: Internet Infra Service ────────────────────────────────────────────
describe('InternetInfra Service — FALLBACK_OUTAGES kaldırıldı', () => {
  const src = readSrc('main/services/internet-infra-service.ts')

  it('FALLBACK_OUTAGES yok (yorum hariç)', () => {
    const nonComment = src.split('\n').filter(l => !l.trim().startsWith('//'))
    const codeOnly = nonComment.join('\n')
    expect(codeOnly).not.toContain('FALLBACK_OUTAGES')
  })

  it('fake outage açıklamaları yok', () => {
    expect(src).not.toContain('Government-imposed internet throttling')
    expect(src).not.toContain('Prolonged shutdowns')
    expect(src).not.toContain('Infrastructure damage from civil war')
  })
})

// ─── HIGH: IoC Service ───────────────────────────────────────────────────────
describe('IoC Service — fake IoC fallback kaldırıldı', () => {
  const src = readSrc('main/services/ioc-service.ts')

  it('fake IP adresleri yok (kodda)', () => {
    const code = readSrcCode('main/services/ioc-service.ts')
    expect(code).not.toContain('185.220.101.1')
    expect(code).not.toContain('45.133.1.23')
  })

  it('fake domain isimleri yok (kodda)', () => {
    const code = readSrcCode('main/services/ioc-service.ts')
    expect(code).not.toContain('evil-update.com')
    expect(code).not.toContain('fake-microsoft-login.com')
    expect(code).not.toContain('malicious-cdn.xyz')
  })

  it('fake hash değerleri yok (kodda)', () => {
    const code = readSrcCode('main/services/ioc-service.ts')
    expect(code).not.toContain('a1b2c3d4e5f6')
    expect(code).not.toContain('b4d3f00d')
    expect(code).not.toContain('deadbeef')
    expect(code).not.toContain('cafebabe')
  })
})

// ─── HIGH: Telegram Service ──────────────────────────────────────────────────
describe('Telegram Service — fake message fallback kaldırıldı', () => {
  const src = readSrcCode('main/services/telegram-service.ts')

  it('fake message ID\'leri yok (kodda)', () => {
    expect(src).not.toContain("id: 'tg-f1'")
    expect(src).not.toContain("id: 'tg-f2'")
    expect(src).not.toContain("id: 'tg-f3'")
  })

  it('fake message içerikleri yok (kodda)', () => {
    expect(src).not.toContain('Major military operation reported in eastern sector')
    expect(src).not.toContain('Front line changes in Zaporizhzhia direction')
  })

  it('fake view counts yok (kodda)', () => {
    expect(src).not.toContain('views: 45000')
    expect(src).not.toContain('views: 32000')
  })
})

// ─── MODERATE: Pandemic Service ──────────────────────────────────────────────
describe('Pandemic Service — frozen case counts etiketlendi', () => {
  const src = readSrc('main/services/pandemic-service.ts')

  it('source (reference) etiketli', () => {
    expect(src).toContain('(reference)')
  })

  it('new Date().toISOString() timestamp aldatması yok', () => {
    // getKnownOutbreaks içinde artık sabit tarih olmalı
    expect(src).not.toMatch(/reportedAt:\s*new Date\(\)\.toISOString\(\)/)
  })

  it('description "reference estimates" uyarısı içeriyor', () => {
    expect(src).toContain('reference estimates')
  })

  it('tarihler sabit (2024-12-01)', () => {
    expect(src).toContain("reportedAt: '2024-12-01")
  })
})
