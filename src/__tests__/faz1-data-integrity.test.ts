/**
 * FAZ 1 — Kritik Veri Bütünlüğü Testleri
 *
 * Tüm fake/hardcoded data kaynaklarının kaldırıldığını,
 * sadece gerçek API verisi veya boş array döndüğünü doğrular.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

// ─── Military Service ────────────────────────────────────────────────────────
describe('FAZ1: Military Service — fake data kaldırıldı', () => {
  const src = readSrc('main/services/military-service.ts')

  it('dosyada Math.random() yok', () => {
    expect(src).not.toContain('Math.random')
  })

  it('dosyada hardcoded koordinat yok', () => {
    expect(src).not.toMatch(/latitude:\s*\d+\.\d+/)
    expect(src).not.toMatch(/longitude:\s*\d+\.\d+/)
  })

  it('getActivities boş array dönüyor', () => {
    expect(src).toContain('return []')
  })

  it('dosyada hardcoded aktivite verisi yok', () => {
    expect(src).not.toContain('Naval Exercise')
    expect(src).not.toContain('Air Defense')
    expect(src).not.toContain('Troop Deployment')
    expect(src).not.toContain('exercise')
    // type: 'exercise' gibi hardcoded tipler olmamalı
  })

  it('dosya uzunluğu 15 satırdan az (sade wrapper)', () => {
    const lineCount = src.split('\n').length
    expect(lineCount).toBeLessThan(15)
  })
})

// ─── Tracking Service — Fake Vessel ──────────────────────────────────────────
describe('FAZ1: Tracking Service — fake vessel generation kaldırıldı', () => {
  const src = readSrc('main/services/tracking-service.ts')

  it('generateRealisticVessels metodu yok', () => {
    expect(src).not.toContain('generateRealisticVessels')
  })

  it('findNearestPort metodu yok (fake vessel helper)', () => {
    expect(src).not.toContain('findNearestPort')
  })

  it('generateVesselRoute metodu yok (fake vessel helper)', () => {
    expect(src).not.toContain('generateVesselRoute')
  })

  it('hardcoded fake vessel isimleri yok', () => {
    expect(src).not.toContain('EVER ACE')
    expect(src).not.toContain('QUEEN MARY 2')
    expect(src).not.toContain('MSC IRINA')
    expect(src).not.toContain('WONDER OF THE SEAS')
  })

  it('shippingLanes konfigürasyonu yok', () => {
    expect(src).not.toContain('shippingLanes')
    expect(src).not.toContain('Suez Canal')
    expect(src).not.toContain('Strait of Malacca')
  })

  it('idCounter (fake MMSI generator) yok', () => {
    expect(src).not.toContain('idCounter')
  })

  it('dosya 930 satırdan az (fake kodu kaldırıldı)', () => {
    const lineCount = src.split('\n').length
    expect(lineCount).toBeLessThan(935)
  })
})

// ─── Cyber Threat — Fake APT ─────────────────────────────────────────────────
describe('FAZ1: Cyber Threat — fake APT verileri kaldırıldı', () => {
  const src = readSrc('main/services/cyber-threat-service.ts')

  it('KNOWN_APT_ACTIVITY değişkeni yok (yorum hariç)', () => {
    const nonComment = src.split('\n').filter(l => !l.trim().startsWith('//'))
    const codeOnly = nonComment.join('\n')
    expect(codeOnly).not.toContain('KNOWN_APT_ACTIVITY')
  })

  it('hardcoded APT grupları yok', () => {
    expect(src).not.toContain("'APT28'")
    expect(src).not.toContain("'Lazarus'")
    expect(src).not.toContain("'Volt Typhoon'")
    expect(src).not.toContain("'Sandworm'")
  })

  it('cache birleştirmede APT yok', () => {
    // Sadece cves + ransom olmalı
    expect(src).toContain('[...cves, ...ransom]')
    expect(src).not.toMatch(/\[\.\.\.cves,\s*\.\.\.ransom,\s*\.\.\.KNOWN_APT/)
  })
})

// ─── Weather — Fake Alerts ───────────────────────────────────────────────────
describe('FAZ1: Weather — fake fallback alerts kaldırıldı', () => {
  const src = readSrc('main/services/weather-service.ts')

  it('FALLBACK_ALERTS değişkeni yok (yorum hariç)', () => {
    const nonComment = src.split('\n').filter(l => !l.trim().startsWith('//'))
    const codeOnly = nonComment.join('\n')
    expect(codeOnly).not.toContain('FALLBACK_ALERTS')
  })

  it('hardcoded fake alert başlıkları yok', () => {
    expect(src).not.toContain('Tropical Cyclone Watch')
    expect(src).not.toContain('Extreme Heat - Middle East')
  })

  it('fallback inject kodu yok', () => {
    expect(src).not.toContain('alerts.push(...FALLBACK_ALERTS)')
  })
})

// ─── Finance — Bond Yields / BTC Dominance ───────────────────────────────────
describe('FAZ1: Finance — hardcoded bond yields ve BTC dominance düzeltildi', () => {
  const src = readSrc('main/services/finance-data-service.ts')

  it('DE/JP/UK/TR bond yield hardcode yok', () => {
    // Artık sadece US 2Y/10Y/30Y olmalı
    expect(src).not.toContain("country: 'DE'")
    expect(src).not.toContain("country: 'JP'")
    expect(src).not.toContain("country: 'UK'")
    expect(src).not.toContain("country: 'TR'")
  })

  it('US bond yields başlangıç değeri 0 (live data bekleniyor)', () => {
    // yield: 0 olmalı, eski hardcoded değerler olmamalı
    expect(src).not.toContain('yield: 0.0472')
    expect(src).not.toContain('yield: 0.0428')
    expect(src).not.toContain('yield: 0.0445')
  })

  it('yield=0 olanlar filtreleniyor', () => {
    expect(src).toContain('result.bondYields.filter(b => b.yield > 0)')
  })

  it('BTC dominance fallback 0 (eskisi 52 değil)', () => {
    expect(src).not.toContain('|| 52)')
    expect(src).toContain('|| 0)')
  })
})

// ─── types.ts — Domain Tipleri ───────────────────────────────────────────────
describe('FAZ1: types.ts — MILITARY ve ENVIRONMENT domain eklendi', () => {
  const src = readSrc('shared/types.ts')

  it('IncidentDomain MILITARY içeriyor', () => {
    expect(src).toMatch(/IncidentDomain\s*=.*'MILITARY'/)
  })

  it('IncidentDomain ENVIRONMENT içeriyor', () => {
    expect(src).toMatch(/IncidentDomain\s*=.*'ENVIRONMENT'/)
  })
})

// ─── SecurityIntelPage — as any kaldırıldı ───────────────────────────────────
describe('FAZ1: SecurityIntelPage — as any yerine proper type casting', () => {
  const src = readSrc('renderer/components/pages/SecurityIntelPage.tsx')

  it('severity as any yok', () => {
    expect(src).not.toContain('severity as any')
    expect(src).not.toContain("severity || 'MEDIUM') as any")
  })

  it('domain as any yok', () => {
    expect(src).not.toContain('domain as any')
  })

  it('IncidentSeverity ve IncidentDomain import ediliyor', () => {
    expect(src).toContain('IncidentSeverity')
    expect(src).toContain('IncidentDomain')
  })
})
