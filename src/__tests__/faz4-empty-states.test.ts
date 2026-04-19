/**
 * FAZ 4 — Empty States ve UX Testleri
 *
 * Boş veri durumunda uygun mesajlar gösterildiğini,
 * UX edge case'lerin düzeltildiğini doğrular.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

// ─── Entity Tracker Empty State ──────────────────────────────────────────────
describe('FAZ4: Entity Tracker boş liste mesajı', () => {
  const src = readSrc('renderer/components/dashboard/DashboardEntityTracker.tsx')

  it('entities.length === 0 kontrolü var', () => {
    expect(src).toContain('entities.length === 0')
  })

  it('boş durum mesajı mevcut', () => {
    expect(src).toMatch(/No entities tracked/)
  })
})

// ─── SecurityIntelPage Empty States ──────────────────────────────────────────
describe('FAZ4: SecurityIntelPage tab empty states', () => {
  const src = readSrc('renderer/components/pages/SecurityIntelPage.tsx')

  it('Generic Empty component boş durum mesajı var', () => {
    // SecurityIntelPage uses a shared <Empty> component for all tabs
    expect(src).toMatch(/No data available/)
  })

  it('Drones specific boş durum mesajı var', () => {
    expect(src).toMatch(/No drone activity/)
  })

  it('Cyber threats specific boş durum mesajı var', () => {
    expect(src).toMatch(/No threats in this category/)
  })
})

// ─── FinanceDeepPanel Empty States ───────────────────────────────────────────
describe('FAZ4: Finance panel empty states', () => {
  const src = readSrc('renderer/components/panels/FinanceDeepPanel.tsx')

  it('Bond Yields boş durum mesajı var', () => {
    expect(src).toMatch(/No live bond yield/)
  })

  it('Top Gainers/Losers boş durum mesajı var', () => {
    // Crypto boş olduğunda "No data" gösterimi
    expect(src).toMatch(/No data/)
  })
})

// ─── TimelineCompare Empty State ─────────────────────────────────────────────
describe('FAZ4: TimelineCompare boş incident mesajı', () => {
  const src = readSrc('renderer/components/panels/TimelineCompare.tsx')

  it('incidents.length === 0 kontrolü var', () => {
    expect(src).toContain('incidents.length === 0')
  })

  it('boş durum mesajı var', () => {
    expect(src).toMatch(/No incidents available/)
  })
})

// ─── AppShell Cluster Title Truncation ───────────────────────────────────────
describe('FAZ4: AppShell cluster title truncation düzeltmesi', () => {
  const src = readSrc('renderer/components/layout/AppShell.tsx')

  it('koşullu truncation: sadece uzun başlıklara ... eklenir', () => {
    // Eski: c.title.substring(0, 60)}... (her zaman ... ekler)
    // Yeni: title.length > 60 ? title.substring(0, 60) + '...' : title
    expect(src).toMatch(/\.length\s*>\s*60/)
  })
})

// ─── periodMs module-level ───────────────────────────────────────────────────
describe('FAZ4/5: TimelineCompare periodMs module-level constant', () => {
  const src = readSrc('renderer/components/panels/TimelineCompare.tsx')

  it('PERIOD_MS dosyanın üst kısmında tanımlanıyor (component dışında)', () => {
    // PERIOD_MS export function TimelineCompare'dan önce tanımlanmalı
    const periodMsIndex = src.indexOf('PERIOD_MS')
    const componentIndex = src.indexOf('export function TimelineCompare')
    expect(periodMsIndex).toBeLessThan(componentIndex)
    expect(periodMsIndex).toBeGreaterThan(0)
  })
})
