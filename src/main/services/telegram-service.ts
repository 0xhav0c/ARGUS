import type { TelegramMessage } from '../../shared/types'

let cache: TelegramMessage[] = []
let lastFetch = 0
const TTL = 300000

const RSSHUB_MIRRORS = [
  'https://rsshub.app',
  'https://rsshub.rssforever.com',
  'https://rsshub-instance.zeabur.app',
  'https://rss.fatpandac.com',
]

interface TelegramChannel {
  name: string
  title: string
  category: 'conflict' | 'cyber' | 'osint' | 'geopolitics' | 'custom'
  keywords?: string[]
}

const OSINT_CHANNELS: TelegramChannel[] = [
  { name: 'intelslava', title: 'Intel Slava Z', category: 'conflict', keywords: ['military', 'frontline', 'strike', 'troops'] },
  { name: 'ryaborsvoboda', title: 'Rybar', category: 'conflict', keywords: ['map', 'situation', 'direction', 'advance'] },
  { name: 'operativnozsu', title: 'OperativnoZSU', category: 'conflict', keywords: ['alert', 'defense', 'air', 'missile'] },
  { name: 'osaborona', title: 'Oborona UA', category: 'conflict', keywords: ['defense', 'brigade', 'counter'] },
  { name: 'militarylab', title: 'Military Lab', category: 'osint', keywords: ['analysis', 'drone', 'equipment'] },
  { name: 'SputnikInt', title: 'Sputnik International', category: 'geopolitics', keywords: ['summit', 'sanctions', 'diplomacy'] },
  { name: 'raboronba', title: 'RA Bornba', category: 'conflict', keywords: ['strike', 'bomb', 'artillery'] },
  { name: 'DarkReading', title: 'Dark Reading', category: 'cyber', keywords: ['vulnerability', 'malware', 'breach', 'CVE'] },
  { name: 'TheHackersNews', title: 'The Hackers News', category: 'cyber', keywords: ['hack', 'exploit', 'zero-day', 'ransomware'] },
  { name: 'bbaborona', title: 'BB UA Intel', category: 'osint', keywords: ['intelligence', 'report', 'update'] },
  { name: 'OpenSourceIntelligence', title: 'OSINT Aggregator', category: 'osint', keywords: ['osint', 'source', 'satellite'] },
  { name: 'CyberSecurityHub', title: 'Cyber Security Hub', category: 'cyber', keywords: ['threat', 'attack', 'phishing'] },
]

function analyzePriority(content: string, keywords: string[]): 'high' | 'medium' | 'low' {
  const lower = content.toLowerCase()
  const urgentWords = ['breaking', 'urgent', 'alert', 'critical', 'explosion', 'strike', 'attack', 'missile']
  if (urgentWords.some(w => lower.includes(w))) return 'high'
  if (keywords.some(k => lower.includes(k))) return 'medium'
  return 'low'
}

export class TelegramService {
  private customChannels: TelegramChannel[] = []
  private workingMirror = 0

  addCustomChannel(name: string, title: string) {
    if (!this.customChannels.find(c => c.name === name)) {
      this.customChannels.push({ name, title, category: 'custom' })
    }
  }

  removeCustomChannel(name: string) {
    this.customChannels = this.customChannels.filter(c => c.name !== name)
  }

  async getMessages(): Promise<TelegramMessage[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache
    const allChannels = [...OSINT_CHANNELS, ...this.customChannels]
    const messages: TelegramMessage[] = []

    const baseMirrors = [RSSHUB_MIRRORS[this.workingMirror], ...RSSHUB_MIRRORS.filter((_, i) => i !== this.workingMirror)]

    for (const ch of allChannels) {
      let fetched = false
      for (const mirror of baseMirrors) {
        try {
          const res = await fetch(`${mirror}/telegram/channel/${ch.name}`, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Argus/2.0)' },
          })
          if (!res.ok) continue
          const text = await res.text()
          const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
          if (items.length === 0) continue

          this.workingMirror = RSSHUB_MIRRORS.indexOf(mirror)
          for (const item of items.slice(0, 8)) {
            const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
            const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
            const desc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || ''
            const content = desc.replace(/<[^>]+>/g, '').trim().substring(0, 600) || title
            if (!content || content.length < 10) continue

            const priority = analyzePriority(content, ch.keywords || [])
            messages.push({
              id: `tg-${ch.name}-${Date.parse(pubDate || '') || Date.now()}-${messages.length}`,
              channel: ch.name,
              channelTitle: ch.title,
              content,
              timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              category: ch.category,
              priority,
            })
          }
          fetched = true
          break
        } catch { continue }
      }
      if (!fetched && ch.category !== 'custom') {
        console.log(`[Telegram] Failed to fetch channel: ${ch.name}`)
      }
    }

    // No fake fallback — return empty if all RSS mirrors fail

    cache = messages.sort((a, b) => {
      const pa = a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : 1
      const pb = b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : 1
      if (pa !== pb) return pb - pa
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    lastFetch = Date.now()
    return cache
  }
}
