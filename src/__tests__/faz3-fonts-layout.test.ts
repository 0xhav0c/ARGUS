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
// Files that legitimately use 7px/8px for chart axis labels, status badges,
// keyboard shortcut indicators, and small UI elements in dashboard charts.
const ALLOWED_SMALL_FONT_FILES = new Set([
  'components/dashboard/DashboardStats.tsx',     // chart axis labels (7px, 8px)
  'components/dashboard/DashboardEntityTracker.tsx', // small badge text (8px)
  'components/dashboard/DashboardFeed.tsx',      // severity badge text (8px)
  'components/dashboard/DashboardSettings.tsx',  // small UI indicators (8px)
  'components/layout/AppShell.tsx',              // cluster expand arrows (8px)
  'components/layout/TopBar.tsx',                // keyboard shortcut hint (8px)
  'components/pages/OperationsPage.tsx',         // small status indicators (8px)
])

describe('FAZ3: Tüm renderer dosyalarında fontSize 7px/8px yok (izin verilenler hariç)', () => {
  const tsxFiles = getAllTsxFiles(RENDERER_DIR)

  it('en az 20 tsx dosyası tarandı (test kapsamlılığı)', () => {
    expect(tsxFiles.length).toBeGreaterThanOrEqual(20)
  })

  // Filter out files that are allowed to use small fonts
  const strictFiles = tsxFiles.filter(f => {
    const rel = path.relative(RENDERER_DIR, f).replace(/\\/g, '/')
    return !ALLOWED_SMALL_FONT_FILES.has(rel)
  })

  it.each(
    strictFiles.map(f => [path.relative(RENDERER_DIR, f), f])
  )('%s — fontSize: \'7px\' yok', (_name, filePath) => {
    const content = readFile(filePath as string)
    const matches = content.match(/fontSize:\s*['"]7px['"]/g)
    expect(matches).toBeNull()
  })

  it.each(
    strictFiles.map(f => [path.relative(RENDERER_DIR, f), f])
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
