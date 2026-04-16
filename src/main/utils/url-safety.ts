/**
 * Centralized SSRF protection for all outbound requests from the main process.
 * Every user-influenced URL (feeds, AI endpoints, API key tests) MUST pass through
 * isSafeUrl() before being fetched.
 */

const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.internal',
  'instance-data',
])

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x0A000000, 0xFF000000],   // 10.0.0.0/8
  [0xAC100000, 0xFFF00000],   // 172.16.0.0/12
  [0xC0A80000, 0xFFFF0000],   // 192.168.0.0/16
  [0x7F000000, 0xFF000000],   // 127.0.0.0/8
  [0xA9FE0000, 0xFFFF0000],   // 169.254.0.0/16  (link-local)
  [0x00000000, 0xFFFFFFFF],   // 0.0.0.0/32
]

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let num = 0
  for (const p of parts) {
    const n = parseInt(p, 10)
    if (isNaN(n) || n < 0 || n > 255) return null
    num = (num << 8) | n
  }
  return num >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  const num = ipv4ToInt(ip)
  if (num === null) return false
  for (const [network, mask] of PRIVATE_IPV4_RANGES) {
    if ((num & mask) === (network & mask)) return true
  }
  return false
}

function isPrivateIPv6(host: string): boolean {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (lower === '::1') return true
  if (lower.startsWith('fe80:')) return true   // link-local
  if (lower.startsWith('fc00:') || lower.startsWith('fd00:')) return true // ULA
  if (lower === '::') return true
  return false
}

export interface SafeUrlOptions {
  allowLocalhost?: boolean
}

/**
 * Returns true if the URL is safe to fetch from the main process.
 * Blocks cloud metadata endpoints, private/loopback IPs, and non-http(s) schemes.
 */
export function isSafeUrl(urlStr: string, opts: SafeUrlOptions = {}): boolean {
  try {
    const u = new URL(urlStr)

    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false

    const host = u.hostname.toLowerCase()

    if (BLOCKED_HOSTS.has(host)) return false

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return !!opts.allowLocalhost
    }

    if (isPrivateIPv4(host)) return false
    if (isPrivateIPv6(host)) return false

    if (host === '0.0.0.0') return false

    if (u.username || u.password) return false

    return true
  } catch {
    return false
  }
}
