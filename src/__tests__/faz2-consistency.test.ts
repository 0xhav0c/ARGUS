/**
 * FAZ 2 — Tutarsız Veri ve Yanıltıcı Etiket Testleri
 *
 * Severity weight'lerinin senkronize olduğunu, yanıltıcı etiketlerin
 * düzeltildiğini, exchange rate fallback uyarısını doğrular.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

// ─── Severity Weights Senkronizasyonu ────────────────────────────────────────
describe('FAZ2: Severity weight senkronizasyonu', () => {
  const dashboardThreatScore = readSrc('renderer/components/dashboard/DashboardThreatScore.tsx')
  const appShell = readSrc('renderer/components/layout/AppShell.tsx')

  it('DashboardThreatScore: CRITICAL=5, HIGH=4, MEDIUM=3, LOW=2, INFO=1', () => {
    expect(dashboardThreatScore).toContain('CRITICAL: 5')
    expect(dashboardThreatScore).toContain('HIGH: 4')
    expect(dashboardThreatScore).toContain('MEDIUM: 3')
    expect(dashboardThreatScore).toContain('LOW: 2')
    expect(dashboardThreatScore).toContain('INFO: 1')
  })

  it('AppShell RiskIndex: aynı ağırlıklar (HIGH=4, CRITICAL=5)', () => {
    // AppShell'de de HIGH=4 olmalı (eskisi HIGH=3 idi)
    expect(appShell).toContain('CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1')
  })

  it('InfoTip metni doğru weight gösteriyor', () => {
    expect(dashboardThreatScore).toContain('High=4')
    expect(dashboardThreatScore).not.toContain('High=3')
    // Info=1 de görünmeli
    expect(dashboardThreatScore).toContain('Info=1')
  })
})

// ─── Yanıltıcı Etiketler ────────────────────────────────────────────────────
describe('FAZ2: Yanıltıcı etiketler düzeltildi', () => {
  const entityTracker = readSrc('renderer/components/dashboard/DashboardEntityTracker.tsx')
  const opsPage = readSrc('renderer/components/pages/OperationsPage.tsx')

  it('Entity Tracker: "24h" etiketi yerine "Total" veya "Matches"', () => {
    // Eski yanıltıcı "24h" count etiketi kaldırıldı
    expect(entityTracker).not.toContain("'24h:")
    expect(entityTracker).not.toContain("'24H TIMELINE'")
    // Yeni doğru etiket
    expect(entityTracker).toMatch(/Total:|MATCHES/)
  })

  it('Predictions tab: TREND HEURISTICS olarak yeniden adlandırıldı', () => {
    expect(opsPage).not.toContain("label: 'PREDICTIONS'")
    expect(opsPage).toContain('TREND HEURISTICS')
  })
})

// ─── TimelineCompare Domain Genişlemesi ──────────────────────────────────────
describe('FAZ2: TimelineCompare MILITARY/ENVIRONMENT domain desteği', () => {
  const timeline = readSrc('renderer/components/panels/TimelineCompare.tsx')

  it('DOMAIN_COLORS MILITARY içeriyor', () => {
    expect(timeline).toContain('MILITARY:')
  })

  it('DOMAIN_COLORS ENVIRONMENT içeriyor', () => {
    expect(timeline).toContain('ENVIRONMENT:')
  })

  it('domainBreakdown MILITARY+ENVIRONMENT sayıyor', () => {
    expect(timeline).toContain('MILITARY: 0')
    expect(timeline).toContain('ENVIRONMENT: 0')
  })

  it('sevBreakdown INFO seviyesini sayıyor', () => {
    expect(timeline).toContain('INFO: 0')
  })
})

// ─── Exchange Rate Fallback Uyarısı ──────────────────────────────────────────
describe('FAZ2: Exchange rate fallback uyarısı', () => {
  const financePanel = readSrc('renderer/components/panels/FinanceDeepPanel.tsx')

  it('ratesFallback state değişkeni var', () => {
    expect(financePanel).toContain('ratesFallback')
  })

  it('API fail olunca setRatesFallback(true) çağrılıyor', () => {
    expect(financePanel).toContain('setRatesFallback(true)')
  })

  it('API başarılı olunca setRatesFallback(false) çağrılıyor', () => {
    expect(financePanel).toContain('setRatesFallback(false)')
  })

  it('fallback uyarı banner metni var', () => {
    expect(financePanel).toContain('Exchange rate API unreachable')
    expect(financePanel).toContain('approximate fallback rates')
  })
})

// ─── Commodity High/Low Currency Fix ─────────────────────────────────────────
describe('FAZ2: Commodity high/low currency-converted gösterimi', () => {
  const financePanel = readSrc('renderer/components/panels/FinanceDeepPanel.tsx')

  it('high24h fmtP() ile formatlanıyor (ham sayı yerine)', () => {
    // Eski: {sym}{c.high24h} → dönüştürme yok
    expect(financePanel).not.toMatch(/\{sym\}\{c\.high24h\}/)
    // Yeni: fmtP(c.high24h, 2)
    expect(financePanel).toContain('fmtP(c.high24h')
  })

  it('low24h fmtP() ile formatlanıyor', () => {
    expect(financePanel).not.toMatch(/\{sym\}\{c\.low24h\}/)
    expect(financePanel).toContain('fmtP(c.low24h')
  })
})
