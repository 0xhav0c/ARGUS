/**
 * FAZ 3 — Font Boyutları ve Layout Testleri
 *
 * Hiçbir renderer dosyasında 7px/8px font kalmadığını
 * ve responsive grid'lerin düzeltildiğini doğrular.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'path'

const RENDERER_DIR = path.resolve(__dirname, '..', 'renderer')

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      // Test dosyalarını hariç tut
      if (!entry.name.includes('.test.')) {
        files.push(fullPath)
      }
    }
  }
  return files
}

function readFile(p: string): string {
  return fs.readFileSync(p, 'utf-8')
}

// ─── 7px/8px Font Kontrolü ──────────────────────────────────────────────────
describe('FAZ3: Tüm renderer dosyalarında fontSize 7px/8px yok', () => {
  const tsxFiles = getAllTsxFiles(RENDERER_DIR)

  it('en az 20 tsx dosyası tarandı (test kapsamlılığı)', () => {
    expect(tsxFiles.length).toBeGreaterThanOrEqual(20)
  })

  it.each(
    tsxFiles.map(f => [path.relative(RENDERER_DIR, f), f])
  )('%s — fontSize: \'7px\' yok', (_name, filePath) => {
    const content = readFile(filePath as string)
    const matches = content.match(/fontSize:\s*['"]7px['"]/g)
    expect(matches).toBeNull()
  })

  it.each(
    tsxFiles.map(f => [path.relative(RENDERER_DIR, f), f])
  )('%s — fontSize: \'8px\' yok', (_name, filePath) => {
    const content = readFile(filePath as string)
    const matches = content.match(/fontSize:\s*['"]8px['"]/g)
    expect(matches).toBeNull()
  })
})

// ─── Canvas Font Kontrolü ────────────────────────────────────────────────────
describe('FAZ3: Canvas ctx.font 7px/8px yok', () => {
  const entityGraphPanel = readFile(path.join(RENDERER_DIR, 'components', 'panels', 'EntityGraphPanel.tsx'))
  const dashboardTimeAnalysis = readFile(path.join(RENDERER_DIR, 'components', 'dashboard', 'DashboardTimeAnalysis.tsx'))

  it('EntityGraphPanel: ctx.font 7px yok', () => {
    expect(entityGraphPanel).not.toMatch(/ctx\.font\s*=.*7px/)
  })

  it('EntityGraphPanel: ctx.font 8px yok', () => {
    expect(entityGraphPanel).not.toMatch(/ctx\.font\s*=.*8px/)
  })

  it('DashboardTimeAnalysis: ctx.font 7px yok', () => {
    expect(dashboardTimeAnalysis).not.toMatch(/ctx\.font\s*=.*7px/)
  })

  it('DashboardTimeAnalysis: ctx.font 8px yok', () => {
    expect(dashboardTimeAnalysis).not.toMatch(/ctx\.font\s*=.*8px/)
  })
})

// ─── Responsive Grid ────────────────────────────────────────────────────────
describe('FAZ3: Responsive grid düzeltmeleri', () => {
  const timelineCompare = readFile(path.join(RENDERER_DIR, 'components', 'panels', 'TimelineCompare.tsx'))
  const securityIntelPage = readFile(path.join(RENDERER_DIR, 'components', 'pages', 'SecurityIntelPage.tsx'))

  it('TimelineCompare: sabit repeat(4,1fr) yerine auto-fit kullanıyor', () => {
    expect(timelineCompare).not.toContain("repeat(4, 1fr)")
    expect(timelineCompare).toContain('auto-fit')
    expect(timelineCompare).toContain('minmax')
  })

  it('SecurityIntelPage: sabit repeat(4,1fr) yerine auto-fit kullanıyor', () => {
    expect(securityIntelPage).not.toContain("repeat(4, 1fr)")
    expect(securityIntelPage).toContain('auto-fit')
  })
})
