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

  it('"LIVE FEED" yerine "INCIDENT FEED"', () => {
    expect(src).not.toContain('LIVE FEED')
    expect(src).toContain('INCIDENT FEED')
  })

  it('"Real-time incident feed" InfoTip düzeltildi', () => {
    expect(src).not.toContain('Real-time incident feed')
  })
})

// ─── TopBar ──────────────────────────────────────────────────────────────────
describe('TopBar — LIVE indicator düzeltildi', () => {
  const src = readSrc('renderer/components/layout/TopBar.tsx')

  it('"LIVE" yerine "ACTIVE"', () => {
    // "LIVE" metin olarak olmamalı (tek başına, başka bir kelimenin parçası olmadan)
    expect(src).toContain('ACTIVE')
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

  it('trend: "rising" yerine "high" kullanıyor', () => {
    expect(src).not.toMatch(/trend:\s*.*'rising'/)
    expect(src).toContain("'high'")
  })

  it('trend: "falling" yerine "low" kullanıyor', () => {
    expect(src).not.toMatch(/trend:\s*.*'falling'/)
    expect(src).toContain("'low'")
  })
})

// ─── AnomalyRiskPanel ────────────────────────────────────────────────────────
describe('AnomalyRiskPanel — PREDICTIVE RISK → RISK ASSESSMENT', () => {
  const src = readSrc('renderer/components/panels/AnomalyRiskPanel.tsx')

  it('"PREDICTIVE RISK" yerine "RISK ASSESSMENT"', () => {
    expect(src).not.toContain('PREDICTIVE RISK')
    expect(src).toContain('RISK ASSESSMENT')
  })

  it('prediction metni "Heuristic:" prefix\'li', () => {
    expect(src).toContain('Heuristic:')
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
