/**
 * v1.0.6 Security Tests
 *
 * Validates IPC input validation, API key masking, eval/innerHTML safety,
 * settings allowlist, SSRF protection, and prototype pollution guards.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8')
}

function getAllFiles(dir: string, ext: string[]): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, ext))
    } else if (ext.some(e => entry.name.endsWith(e)) && !entry.name.includes('.test.')) {
      files.push(fullPath)
    }
  }
  return files
}

// ─── IPC Handler Input Validation ───────────────────────────────────────────
describe('Security: IPC handlers validate inputs', () => {
  const aiIpc = readSrc('main/ipc/ai.ts')

  it('ai-summarize validates query is string with length bounds', () => {
    expect(aiIpc).toMatch(/typeof query !== 'string'/)
    expect(aiIpc).toMatch(/query\.length/)
  })

  it('ai-config-set validates updates is object', () => {
    expect(aiIpc).toMatch(/typeof updates !== 'object'/)
  })

  it('ai-config-set uses ALLOWED_AI_CONFIG_KEYS allowlist', () => {
    expect(aiIpc).toContain('ALLOWED_AI_CONFIG_KEYS')
    expect(aiIpc).toMatch(/ALLOWED_AI_CONFIG_KEYS\.has\(/)
  })
})

describe('Security: Incident IPC validates settings updates', () => {
  const incidentIpc = readSrc('main/ipc/incidents.ts')

  it('update-settings uses ALLOWED_SETTINGS allowlist', () => {
    expect(incidentIpc).toContain('ALLOWED_SETTINGS')
    expect(incidentIpc).toMatch(/ALLOWED_SETTINGS\.has\(key\)/)
  })

  it('update-settings rejects non-object input', () => {
    expect(incidentIpc).toMatch(/typeof settings !== 'object'/)
  })

  it('update-settings enforces value size limit', () => {
    expect(incidentIpc).toMatch(/strVal\.length > \d+/)
  })
})

// ─── API Key Manager — masking ──────────────────────────────────────────────
describe('Security: API key manager masks raw keys', () => {
  const src = readSrc('main/services/api-key-manager.ts')

  it('mask() method exists and hides key content', () => {
    expect(src).toContain('private mask(value: string)')
    // Should show dots/bullets, not raw key
    expect(src).toMatch(/['"]••••/)
  })

  it('getAll() returns maskedValue, not raw keys', () => {
    expect(src).toContain('maskedValue: this.mask(raw)')
    // getAll should NOT return the decrypted value directly
    expect(src).not.toMatch(/value:\s*this\.decrypt/)
    expect(src).not.toMatch(/value:\s*raw/)
  })

  it('encryption is used for storage', () => {
    expect(src).toContain('safeStorage.encryptString')
    expect(src).toContain('safeStorage.decryptString')
  })

  it('only allows known key IDs', () => {
    expect(src).toContain('VALID_KEY_IDS')
    expect(src).toMatch(/if \(!VALID_KEY_IDS\.has\(keyId\)\) return/)
  })

  it('get-settings handler filters out api_key_ entries', () => {
    const incidentIpc = readSrc('main/ipc/incidents.ts')
    expect(incidentIpc).toMatch(/filter.*api_key_/)
  })
})

// ─── No eval() in renderer ──────────────────────────────────────────────────
describe('Security: No eval() usage in renderer', () => {
  const rendererDir = path.resolve(SRC, 'renderer')
  const rendererFiles = getAllFiles(rendererDir, ['.ts', '.tsx'])

  it('scans at least 20 renderer files', () => {
    expect(rendererFiles.length).toBeGreaterThanOrEqual(20)
  })

  it.each(
    rendererFiles.map(f => [path.relative(rendererDir, f), f])
  )('%s — no eval() call', (_name, filePath) => {
    const content = fs.readFileSync(filePath as string, 'utf-8')
    // Match eval( but not evaluat or evaluate
    const matches = content.match(/\beval\s*\(/g)
    if (matches) {
      // Filter out false positives (e.g., "evaluate", "evaluation")
      const lines = content.split('\n')
      for (const line of lines) {
        if (/\beval\s*\(/.test(line) && !/evaluat/i.test(line)) {
          expect(line).not.toMatch(/\beval\s*\(/)
        }
      }
    }
  })
})

// ─── No innerHTML in renderer components ────────────────────────────────────
describe('Security: No innerHTML in renderer components', () => {
  const rendererDir = path.resolve(SRC, 'renderer')
  const componentFiles = getAllFiles(path.join(rendererDir, 'components'), ['.tsx'])

  it('scans at least 15 component files', () => {
    expect(componentFiles.length).toBeGreaterThanOrEqual(15)
  })

  it.each(
    componentFiles.map(f => [path.relative(rendererDir, f), f])
  )('%s — no innerHTML assignment', (_name, filePath) => {
    const content = fs.readFileSync(filePath as string, 'utf-8')
    // Direct innerHTML assignment is dangerous
    const matches = content.match(/\.innerHTML\s*=/g)
    expect(matches).toBeNull()
  })

  // MarkdownText.tsx is the only component allowed to use dangerouslySetInnerHTML
  // because it renders sanitized markdown output (with its own escaping via esc()).
  const DANGEROUSLY_ALLOWED = new Set(['ui/MarkdownText.tsx'])

  it.each(
    componentFiles
      .filter(f => !DANGEROUSLY_ALLOWED.has(path.relative(path.join(rendererDir, 'components'), f).replace(/\\/g, '/')))
      .map(f => [path.relative(rendererDir, f), f])
  )('%s — no dangerouslySetInnerHTML', (_name, filePath) => {
    const content = fs.readFileSync(filePath as string, 'utf-8')
    // dangerouslySetInnerHTML should not be used in components (except MarkdownText)
    expect(content).not.toContain('dangerouslySetInnerHTML')
  })
})

// ─── Settings allowlist enforcement ─────────────────────────────────────────
describe('Security: Settings allowlist is enforced', () => {
  const incidentIpc = readSrc('main/ipc/incidents.ts')

  it('ALLOWED_SETTINGS contains expected keys', () => {
    expect(incidentIpc).toContain("'language'")
    expect(incidentIpc).toContain("'theme'")
    expect(incidentIpc).toContain("'refreshInterval'")
  })

  it('unknown settings keys are skipped', () => {
    // The code should check: if (!ALLOWED_SETTINGS.has(key)) continue
    expect(incidentIpc).toMatch(/if \(!ALLOWED_SETTINGS\.has\(key\)\) continue/)
  })
})

// ─── SSRF Protection ────────────────────────────────────────────────────────
describe('Security: SSRF protection on user URLs', () => {
  const urlSafety = readSrc('main/utils/url-safety.ts')

  it('isSafeUrl function exists', () => {
    expect(urlSafety).toContain('export function isSafeUrl')
  })

  it('blocks cloud metadata endpoints', () => {
    expect(urlSafety).toContain('metadata.google.internal')
  })

  it('blocks private IPv4 ranges', () => {
    expect(urlSafety).toContain('10.0.0.0/8')
    expect(urlSafety).toContain('172.16.0.0/12')
    expect(urlSafety).toContain('192.168.0.0/16')
    expect(urlSafety).toContain('127.0.0.0/8')
  })

  it('blocks private IPv6 addresses', () => {
    expect(urlSafety).toContain('::1')
    expect(urlSafety).toContain('fe80:')
  })

  it('only allows http and https protocols', () => {
    expect(urlSafety).toMatch(/u\.protocol !== 'http:'/)
    expect(urlSafety).toMatch(/u\.protocol !== 'https:'/)
  })

  it('blocks URLs with embedded credentials', () => {
    expect(urlSafety).toContain('u.username')
    expect(urlSafety).toContain('u.password')
  })

  it('is imported by services that handle user URLs', () => {
    const feedsIpc = readSrc('main/ipc/feeds.ts')
    expect(feedsIpc).toContain('isSafeUrl')

    const aiService = readSrc('main/services/ai-service.ts')
    expect(aiService).toContain('isSafeUrl')
  })
})

// ─── Prototype Pollution Guards ─────────────────────────────────────────────
describe('Security: Prototype pollution guards in settings update', () => {
  const incidentIpc = readSrc('main/ipc/incidents.ts')
  const aiIpc = readSrc('main/ipc/ai.ts')

  it('update-settings rejects __proto__', () => {
    expect(incidentIpc).toContain("'__proto__'")
  })

  it('update-settings rejects constructor', () => {
    expect(incidentIpc).toContain("'constructor'")
  })

  it('update-settings rejects prototype', () => {
    expect(incidentIpc).toContain("'prototype'")
  })

  it('ai-config-set rejects __proto__', () => {
    expect(aiIpc).toContain("'__proto__'")
  })

  it('ai-config-set rejects constructor', () => {
    expect(aiIpc).toContain("'constructor'")
  })

  it('ai-config-set rejects prototype', () => {
    expect(aiIpc).toContain("'prototype'")
  })
})
