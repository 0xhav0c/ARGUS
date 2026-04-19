/**
 * Renderer Data Quality Tests
 *
 * fearGreed fallback, LIVE label, trend label, timestamp, source attribution kontrolü
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

// ─── FinanceDeepPanel ────────────────────────────────────────────────────────
describe('FinanceDeepPanel — data quality fixes', () => {
  const src = readSrc('renderer/components/panels/FinanceDeepPanel.tsx')

  it('EMPTY_SENTIMENT fearGreed value=0 (eskisi 50 değil)', () => {
    expect(src).not.toMatch(/fearGreed:\s*\{[^}]*value:\s*50/)
    // 0 olmalı
    expect(src).toMatch(/fearGreed:\s*\{[^}]*value:\s*0/)
  })

  it('fearGreed label N/A (eskisi Neutral değil)', () => {
    expect(src).not.toMatch(/fearGreed:\s*\{[^}]*label:\s*'Neutral'/)
  })

  it('"Real-time financial" ifadesi kaldırıldı', () => {
    expect(src).not.toContain('Real-time financial market dashboard')
  })

  it('gecikme uyarısı InfoTip\'te var', () => {
    expect(src).toContain('delayed 1-5 minutes')
  })
})

// ─── DashboardFeed ───────────────────────────────────────────────────────────
describe('DashboardFeed — LIVE label düzeltildi', () => {
  const src = readSrc('renderer/components/dashboard/DashboardFeed.tsx')

  it('"LIVE FEED" yerine i18n incident feed key kullanıyor', () => {
    expect(src).not.toContain('LIVE FEED')
    // Now uses i18n key: t('feed.incidentFeed')
    expect(src).toContain("t('feed.incidentFeed')")
  })

  it('"Real-time incident feed" InfoTip düzeltildi', () => {
    expect(src).not.toContain('Real-time incident feed')
  })
})

// ─── TopBar ──────────────────────────────────────────────────────────────────
describe('TopBar — LIVE indicator düzeltildi', () => {
  const src = readSrc('renderer/components/layout/TopBar.tsx')

  it('i18n ile online/offline durumu gösteriyor', () => {
    // "LIVE" / "ACTIVE" raw metin yerine i18n kullanılıyor
    expect(src).toContain("t('topbar.online')")
    expect(src).toContain("t('topbar.offline'")
  })
})

// ─── DashboardStats ──────────────────────────────────────────────────────────
describe('DashboardStats — timestamps ve label fixes', () => {
  const src = readSrc('renderer/components/dashboard/DashboardStats.tsx')

  it('"Real-time overview" kaldırıldı', () => {
    expect(src).not.toContain('Real-time overview')
  })

  it('lastRefreshed timestamp gösterimi var', () => {
    expect(src).toContain('lastRefreshed')
    expect(src).toContain('Updated')
  })
})

// ─── DashboardThreatScore ────────────────────────────────────────────────────
describe('DashboardThreatScore — source attribution eklendi', () => {
  const src = readSrc('renderer/components/dashboard/DashboardThreatScore.tsx')

  it('incidents.length kaynak sayısı gösterimi var', () => {
    expect(src).toContain('incidents.length')
    expect(src).toContain('sources')
  })

  it('heuristic uyarısı var', () => {
    expect(src).toMatch(/heuristic/i)
  })
})

// ─── AppShell RiskIndex ──────────────────────────────────────────────────────
describe('AppShell — RiskIndex trend → activity level', () => {
  const src = readSrc('renderer/components/layout/AppShell.tsx')

  it('trend: "rising" / "falling" raw etiketleri yok', () => {
    // Eski rising/falling etiketi yerine AnomalyRiskPanel trend sistemi kullanılıyor
    expect(src).not.toMatch(/trend:\s*['"]rising['"]/)
    expect(src).not.toMatch(/trend:\s*['"]falling['"]/)
  })
})

// ─── AnomalyRiskPanel ────────────────────────────────────────────────────────
describe('AnomalyRiskPanel — PREDICTIVE RISK → RISK ASSESSMENT', () => {
  const src = readSrc('renderer/components/panels/AnomalyRiskPanel.tsx')

  it('"PREDICTIVE RISK" yerine "RISK ASSESSMENT"', () => {
    expect(src).not.toContain('PREDICTIVE RISK')
    expect(src).toContain('RISK ASSESSMENT')
  })

  it('risk assessment heuristic yaklaşım kullanıyor', () => {
    // Heuristic-based assessment — trend, riskScore, factors kullanılıyor
    expect(src).toMatch(/riskScore/i)
    expect(src).toMatch(/trend/i)
  })
})

// ─── SecurityIntelPage ───────────────────────────────────────────────────────
describe('SecurityIntelPage — lastFetched timestamp', () => {
  const src = readSrc('renderer/components/pages/SecurityIntelPage.tsx')

  it('lastFetched state var', () => {
    expect(src).toContain('lastFetched')
  })

  it('"Data fetched at" gösterimi var', () => {
    expect(src).toContain('Data fetched at')
  })
})
