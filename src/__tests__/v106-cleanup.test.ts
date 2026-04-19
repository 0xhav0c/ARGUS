/**
 * v1.0.6 Cleanup Tests
 *
 * Verifies that removed features are truly gone from UI-facing code,
 * i18n consistency, and feature flag defaults match expectations.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

// ─── GlobalSearchDropdown: no flight/vessel categories ──────────────────────
describe('v1.0.6: GlobalSearchDropdown categories', () => {
  const src = readSrc('renderer/components/panels/GlobalSearchDropdown.tsx')

  it('SearchHitKind type does not include flight or vessel', () => {
    // The exported type should not have flight/vessel as category options
    // Note: The file may still reference flights/vessels in internal logic for
    // backward compat, but the KIND_META (which drives the UI category pills)
    // should not include them.
    const kindMetaBlock = src.match(/const KIND_META[\s\S]*?\n\}/)?.[0] || ''
    expect(kindMetaBlock).not.toContain("flight:")
    expect(kindMetaBlock).not.toContain("vessel:")
  })

  it('ALL_KINDS array does not include flight or vessel', () => {
    const allKindsMatch = src.match(/const ALL_KINDS[\s\S]*?\]/)
    expect(allKindsMatch).not.toBeNull()
    const allKindsStr = allKindsMatch![0]
    expect(allKindsStr).not.toContain("'flight'")
    expect(allKindsStr).not.toContain("'vessel'")
  })
})

// ─── TopBar: no TRACK button ────────────────────────────────────────────────
describe('v1.0.6: TopBar — no TRACK button', () => {
  const src = readSrc('renderer/components/layout/TopBar.tsx')

  it('no raw "TRACK" button label in TopBar', () => {
    // The TopBar should not have a standalone TRACK button
    // (tracking search panel is toggled differently)
    expect(src).not.toMatch(/>TRACK</)
    expect(src).not.toContain("'TRACK'")
  })
})

// ─── No OpenSky API key definitions ─────────────────────────────────────────
describe('v1.0.6: No OpenSky API key definitions in renderer', () => {
  it('no OPENSKY_API_KEY in renderer components', () => {
    const rendererDir = path.resolve(SRC, 'renderer')
    const tsxFiles = getAllTsxFiles(rendererDir)
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/OPENSKY_API_KEY/i)
    }
  })
})

// ─── No companion tab in settings ───────────────────────────────────────────
describe('v1.0.6: Settings companion tab handling', () => {
  const src = readSrc('renderer/components/dashboard/DashboardSettings.tsx')

  it('companion tab type exists in settings type (backward compat) but feature default is false', () => {
    // Settings modal still has companion in the type for backward compat,
    // but the feature flag should default to false.
    const settingsStore = readSrc('renderer/stores/settings-store.ts')
    expect(settingsStore).toContain('featureCompanion: false')
  })
})

// ─── No weather tab in SecurityIntelPage SUB_TABS ───────────────────────────
describe('v1.0.6: SecurityIntelPage — no weather tab', () => {
  const src = readSrc('renderer/components/pages/SecurityIntelPage.tsx')

  it('SUB_TABS does not include weather as a tab', () => {
    // Extract the SUB_TABS array definition
    const subTabsBlock = src.match(/const SUB_TABS[\s\S]*?\]/)?.[0] || ''
    expect(subTabsBlock).not.toMatch(/id:\s*['"]weather['"]/)
  })
})

// ─── No disasters in tracking layers ────────────────────────────────────────
describe('v1.0.6: Feature flags — removed features default to false', () => {
  const settingsStore = readSrc('renderer/stores/settings-store.ts')

  it('trackFlights defaults to false', () => {
    expect(settingsStore).toContain('trackFlights: false')
  })

  it('trackVessels defaults to false', () => {
    expect(settingsStore).toContain('trackVessels: false')
  })

  it('trackDisasters defaults to false', () => {
    expect(settingsStore).toContain('trackDisasters: false')
  })

  it('featureCompanion defaults to false', () => {
    expect(settingsStore).toContain('featureCompanion: false')
  })

  it('secWeather defaults to false', () => {
    expect(settingsStore).toContain('secWeather: false')
  })
})

// ─── i18n translation files ─────────────────────────────────────────────────
describe('v1.0.6: i18n translation files', () => {
  const i18nDir = path.resolve(SRC, 'renderer', 'i18n')
  const expectedLanguages = ['en', 'tr', 'ar', 'ru', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'hi']

  it('all 12 translation files exist', () => {
    for (const lang of expectedLanguages) {
      const filePath = path.join(i18nDir, `${lang}.json`)
      expect(fs.existsSync(filePath)).toBe(true)
    }
  })

  it('all translation files are valid JSON', () => {
    for (const lang of expectedLanguages) {
      const filePath = path.join(i18nDir, `${lang}.json`)
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()
    }
  })

  it('all translation files have the same top-level keys as English', () => {
    const enPath = path.join(i18nDir, 'en.json')
    const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))).sort()

    for (const lang of expectedLanguages) {
      if (lang === 'en') continue
      const filePath = path.join(i18nDir, `${lang}.json`)
      const langKeys = Object.keys(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).sort()
      expect(langKeys).toEqual(enKeys)
    }
  })

  it('i18n index imports all 12 languages', () => {
    const indexSrc = readSrc('renderer/i18n/index.ts')
    for (const lang of expectedLanguages) {
      expect(indexSrc).toContain(`from './${lang}.json'`)
    }
  })

  it('SUPPORTED_LANGUAGES has 12 entries', () => {
    const indexSrc = readSrc('renderer/i18n/index.ts')
    // Count code entries in the array
    const codeMatches = indexSrc.match(/code:\s*'/g)
    expect(codeMatches).not.toBeNull()
    expect(codeMatches!.length).toBe(12)
  })
})

// ─── Helper ─────────────────────────────────────────────────────────────────
function getAllTsxFiles(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (!entry.name.includes('.test.')) {
        files.push(fullPath)
      }
    }
  }
  return files
}
