/**
 * FAZ 5 — Dead Code ve Performans Testleri
 *
 * Kaldırılan dead code'un tekrar eklenmediğini,
 * performans optimizasyonlarının yerinde olduğunu doğrular.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

// ─── EntityTracker Dead Code ─────────────────────────────────────────────────
describe('FAZ5: DashboardEntityTracker dead code kaldırıldı', () => {
  const src = readSrc('renderer/components/dashboard/DashboardEntityTracker.tsx')

  it('EntitySparkline fonksiyonu kaldırıldı', () => {
    expect(src).not.toMatch(/function\s+EntitySparkline/)
  })

  it('hourlyBuckets24h fonksiyonu kaldırıldı', () => {
    expect(src).not.toContain('hourlyBuckets24h')
  })

  it('updateMatchCount gereksiz destructure kaldırıldı', () => {
    // updateMatchCount useEntityStore destructure'dan alınmamalı
    // (getState().updateMatchCount kullanılıyor zaten)
    const destructureMatch = src.match(/const\s*\{[^}]*updateMatchCount[^}]*\}\s*=\s*useEntityStore/)
    expect(destructureMatch).toBeNull()
  })
})

// ─── SecurityIntelPage typeColor module-level ────────────────────────────────
describe('FAZ5: SecurityIntelPage typeColor module-level', () => {
  const src = readSrc('renderer/components/pages/SecurityIntelPage.tsx')

  it('MILITARY_TYPE_COLOR module-level const olarak tanımlanıyor', () => {
    // Module seviyesinde const olarak tanımlanmalı
    expect(src).toMatch(/^const MILITARY_TYPE_COLOR/m)
  })

  it('MILITARY_TYPE_COLOR component fonksiyonu içinde değil', () => {
    // const MILITARY_TYPE_COLOR ilk import'lardan sonra, component'ten önce olmalı
    const constIdx = src.indexOf('const MILITARY_TYPE_COLOR')
    const componentIdx = src.indexOf('export default function')
    if (componentIdx < 0) {
      // export function veya function kullanılmış olabilir
      const fnIdx = src.indexOf('function SecurityIntelPage')
      if (fnIdx > 0) {
        expect(constIdx).toBeLessThan(fnIdx)
      }
    } else {
      expect(constIdx).toBeLessThan(componentIdx)
    }
  })
})

// ─── AppShell SC Duplikasyonu ────────────────────────────────────────────────
describe('FAZ5: AppShell SC severity color duplikasyonu kaldırıldı', () => {
  const src = readSrc('renderer/components/layout/AppShell.tsx')

  it('const SC tanımlaması kaldırıldı', () => {
    expect(src).not.toMatch(/const\s+SC\s*[:=]/)
  })

  it('SC[inc.severity] kullanımı kaldırıldı', () => {
    expect(src).not.toContain('SC[inc.severity]')
    expect(src).not.toContain('SC[')
  })
})

// ─── MediaPage @keyframes spin ───────────────────────────────────────────────
describe('FAZ5: MediaPage @keyframes spin tek sefer inject', () => {
  const src = readSrc('renderer/components/pages/MediaPage.tsx')

  it('@keyframes spin sadece 1 kez tanımlanıyor', () => {
    const matches = src.match(/@keyframes\s+spin/g)
    // 1 kez tanımlanmalı (global style tag'ında)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBe(1)
  })

  it('spin keyframe .map() loop içinde değil', () => {
    // @keyframes spin'in map callback'i içinde olmadığını doğrula
    // map( ile @keyframes spin arasındaki mesafe büyük olmalı
    const spinIdx = src.indexOf('@keyframes spin')
    const mapBeforeSpin = src.lastIndexOf('.map(', spinIdx)
    if (mapBeforeSpin > 0) {
      // Eğer bir map varsa, onun kapanışı spin'den önce olmalı
      const closingParen = src.indexOf('})', mapBeforeSpin)
      // map callback spin'den önce kapanmış olmalı
      if (closingParen > 0 && closingParen < spinIdx) {
        // OK - map, spin'den önce kapanmış
        expect(true).toBe(true)
      } else {
        // Spin, component return'ünün en üstünde global style tag'ında olmalı
        // return ( 'dan sonra çok yakın olmalı
        const returnIdx = src.lastIndexOf('return (', spinIdx)
        if (returnIdx > 0) {
          const distance = spinIdx - returnIdx
          // Return'e yakın olmalı (500 karakter içinde)
          expect(distance).toBeLessThan(500)
        }
      }
    }
  })
})

// ─── TimelineCompare periodMs module-level ───────────────────────────────────
describe('FAZ5: TimelineCompare periodMs module-level', () => {
  const src = readSrc('renderer/components/panels/TimelineCompare.tsx')

  it('PERIOD_MS const ile module seviyesinde tanımlanıyor', () => {
    // Component fonksiyonunun dışında olmalı
    const periodIdx = src.indexOf('const PERIOD_MS')
    expect(periodIdx).toBeGreaterThan(0)

    // export function ... 'dan önce gelmeli
    const funcIdx = src.indexOf('export function')
    if (funcIdx > 0) {
      expect(periodIdx).toBeLessThan(funcIdx)
    }
  })

  it('periodMs artık component içinde değil', () => {
    // Eski: const periodMs tanımı component içinde
    expect(src).not.toMatch(/const\s+periodMs\s*[=:]/)
  })
})
