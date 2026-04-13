/**
 * Canlı Servis Testleri — Gerçek API'lere bağlanarak veri bütünlüğünü doğrular
 *
 * Bu testler:
 * - Military service'in boş array döndüğünü doğrular (artık fake data yok)
 * - Tracking service'in fake vessel üretmediğini doğrular
 * - Cyber Threat service'in fake APT enjekte etmediğini doğrular
 * - Finance service'in hardcoded bond yield döndürmediğini doğrular
 * - Weather service'in fake alert döndürmediğini doğrular
 *
 * NOT: Bu testler gerçek network çağrısı yapar, CI'da skip edilebilir.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

// Mock api-key-manager before any service imports
vi.mock('../main/services/api-key-manager', () => ({
  getApiKeyManager: () => ({
    get: () => undefined,
    set: vi.fn(),
    getAll: () => ({}),
  }),
}))

// ─── Military Service ────────────────────────────────────────────────────────
describe('Live: Military Service', () => {
  it('getActivities() boş array döndürüyor (fake data yok)', async () => {
    const { MilitaryService } = await import('../main/services/military-service')
    const service = new MilitaryService()
    const result = await service.getActivities()

    expect(result).toEqual([])
    expect(result.length).toBe(0)
  })
})

// ─── Tracking Service ────────────────────────────────────────────────────────
describe('Live: Tracking Service — no fake vessels', () => {
  it('getVessels sonucunda fake MMSI pattern yok', async () => {
    const { TrackingService } = await import('../main/services/tracking-service')
    const service = new TrackingService()

    const vessels = await service.getVessels()

    // Fake MMSI pattern (100000000+) olmamalı
    const fakeMMSI = vessels.filter(v => v.mmsi.startsWith('10000000'))
    expect(fakeMMSI.length).toBe(0)

    // Fake vessel isimleri olmamalı (bu isimlerle gerçek gemiler de olabilir,
    // ama fake MMSI ile birlikte olmamalı)
    const fakeNames = ['EVER ACE', 'MSC IRINA', 'QUEEN MARY 2', 'WONDER OF THE SEAS']
    for (const name of fakeNames) {
      const found = vessels.find(v => v.name === name && v.mmsi.startsWith('10000000'))
      expect(found).toBeUndefined()
    }

    console.log(`[Test] ${vessels.length} gerçek vessel döndü (0 = API offline, normal)`)
  }, 30000)
})

// ─── Cyber Threat Service ────────────────────────────────────────────────────
describe('Live: Cyber Threat Service — no fake APT', () => {
  it('getThreats sonucunda hardcoded APT ID\'leri yok', async () => {
    const { CyberThreatService } = await import('../main/services/cyber-threat-service')
    const service = new CyberThreatService()
    const threats = await service.getThreats()

    // Fake APT ID'leri olmamalı
    const fakeIds = ['apt-1', 'apt-2', 'apt-3', 'apt-4']
    for (const fakeId of fakeIds) {
      expect(threats.find(t => t.id === fakeId)).toBeUndefined()
    }

    console.log(`[Test] ${threats.length} gerçek cyber threat döndü`)
  }, 30000)
})

// ─── Finance Service ─────────────────────────────────────────────────────────
describe('Live: Finance Service — no hardcoded bond yields', () => {
  it('getSentiment bond yields: sadece US, sadece live data', async () => {
    const { FinanceDataService } = await import('../main/services/finance-data-service')
    const service = new FinanceDataService()
    const sentiment = await service.getSentiment()

    // yield=0 olanlar filtrelenmeli — her bond'un yield > 0 olmalı
    for (const bond of sentiment.bondYields) {
      expect(bond.yield).toBeGreaterThan(0)
    }

    // Sadece US olmalı (DE/JP/UK/TR kaldırıldı)
    for (const bond of sentiment.bondYields) {
      expect(bond.country).toBe('US')
    }

    // Eski hardcoded değerler olmamalı
    const hardcodedValues = [0.0472, 0.0428, 0.0445, 0.0235, 0.0088, 0.0415, 0.265]
    for (const bond of sentiment.bondYields) {
      for (const hv of hardcodedValues) {
        expect(bond.yield).not.toBe(hv)
      }
    }

    console.log(`[Test] ${sentiment.bondYields.length} bond yield (sadece US, live)`)
  }, 30000)

  it('btcDominance: 0 veya gerçek değer, hardcoded 52 değil', async () => {
    const { FinanceDataService } = await import('../main/services/finance-data-service')
    const service = new FinanceDataService()
    const sentiment = await service.getSentiment()

    expect(sentiment.btcDominance).not.toBe(52)
    if (sentiment.btcDominance > 0) {
      expect(sentiment.btcDominance).toBeGreaterThan(20)
      expect(sentiment.btcDominance).toBeLessThan(80)
    }

    console.log(`[Test] BTC Dominance: ${sentiment.btcDominance}%`)
  }, 30000)
})

// ─── Weather Service ─────────────────────────────────────────────────────────
describe('Live: Weather Service — no fake alerts', () => {
  it('getAlerts sonucunda fake alert ID ve başlıkları yok', async () => {
    const { WeatherService } = await import('../main/services/weather-service')
    const service = new WeatherService()
    const alerts = await service.getAlerts()

    // Fake alert ID'leri olmamalı
    expect(alerts.find(a => a.id === 'wx-1')).toBeUndefined()
    expect(alerts.find(a => a.id === 'wx-2')).toBeUndefined()

    // Fake alert başlıkları olmamalı
    for (const alert of alerts) {
      expect(alert.title).not.toContain('Tropical Cyclone Watch - Western Pacific')
      expect(alert.title).not.toContain('Extreme Heat - Middle East')
    }

    // Tüm alert'ler NWS kaynağından olmalı
    for (const alert of alerts) {
      expect(alert.source).toBe('NWS')
    }

    console.log(`[Test] ${alerts.length} gerçek weather alert döndü`)
  }, 30000)
})
