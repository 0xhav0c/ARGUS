import type { MilitaryActivity } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'

const COUNTRY_KEYWORDS: Record<string, string> = {
  'russia': 'Russia', 'ukraine': 'Ukraine', 'china': 'China', 'taiwan': 'Taiwan',
  'north korea': 'North Korea', 'dprk': 'North Korea', 'south korea': 'South Korea',
  'iran': 'Iran', 'israel': 'Israel', 'syria': 'Syria', 'turkey': 'Turkey',
  'nato': 'NATO', 'india': 'India', 'pakistan': 'Pakistan', 'japan': 'Japan',
  'myanmar': 'Myanmar', 'yemen': 'Yemen', 'lebanon': 'Lebanon', 'iraq': 'Iraq',
  'saudi': 'Saudi Arabia', 'egypt': 'Egypt', 'libya': 'Libya', 'sudan': 'Sudan',
  'philippines': 'Philippines', 'usa': 'United States', 'u.s.': 'United States',
}

const TYPE_PATTERNS: [RegExp, MilitaryActivity['type']][] = [
  [/exercis|drill/i, 'exercise'],
  [/deploy|troops|forces/i, 'deployment'],
  [/patrol|surveillance/i, 'patrol'],
  [/buildup|mobiliz|escalat/i, 'buildup'],
  [/airspace|no-fly/i, 'airspace_closure'],
]

let cache: MilitaryActivity[] = []
let lastFetch = 0
const TTL = 600_000

function detectCountry(text: string): string {
  const lower = text.toLowerCase()
  for (const [keyword, country] of Object.entries(COUNTRY_KEYWORDS)) {
    if (lower.includes(keyword)) return country
  }
  return 'Unknown'
}

function detectType(text: string): MilitaryActivity['type'] {
  for (const [pattern, type] of TYPE_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return 'deployment'
}

function parseGdeltDate(raw: string): Date {
  // GDELT seendate format: "20250413T143000Z"
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
  return new Date(raw)
}

export class MilitaryService {
  async getActivities(): Promise<MilitaryActivity[]> {
    if (cache.length > 0 && Date.now() - lastFetch < TTL) return cache

    const [gdelt, acled] = await Promise.allSettled([
      this.fetchGDELT(),
      this.fetchACLED(),
    ])

    const results: MilitaryActivity[] = []
    if (gdelt.status === 'fulfilled') results.push(...gdelt.value)
    if (acled.status === 'fulfilled') results.push(...acled.value)

    cache = results.sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    )
    lastFetch = Date.now()

    const gdeltCount = gdelt.status === 'fulfilled' ? gdelt.value.length : 0
    const acledCount = acled.status === 'fulfilled' ? acled.value.length : 0
    console.log(`[Military] ${cache.length} activities loaded (GDELT: ${gdeltCount}, ACLED: ${acledCount})`)

    if (gdelt.status === 'rejected') console.warn('[Military] GDELT fetch failed:', gdelt.reason)
    if (acled.status === 'rejected') console.warn('[Military] ACLED fetch failed:', acled.reason)

    return cache
  }

  private async fetchGDELT(): Promise<MilitaryActivity[]> {
    const query = encodeURIComponent(
      'military OR "armed forces" OR "troops deployment" OR "naval exercise" OR "air defense" OR "missile launch"',
    )
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=30&format=json&timespan=7d`

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`)

    const data = await res.json() as { articles?: GdeltArticle[] }
    const articles = data.articles
    if (!Array.isArray(articles)) return []

    return articles.map((article, index): MilitaryActivity => {
      const country = detectCountry(article.title || '')
      const type = detectType(article.title || '')
      const detectedAt = article.seendate
        ? parseGdeltDate(article.seendate).toISOString()
        : new Date().toISOString()

      return {
        id: `mil-gdelt-${index}`,
        type,
        title: article.title || 'Unknown military activity',
        country,
        description: article.title || '',
        source: `GDELT (${article.domain || 'unknown'})`,
        detectedAt,
        latitude: 0,
        longitude: 0,
        forces: [],
      }
    })
  }

  private async fetchACLED(): Promise<MilitaryActivity[]> {
    const keys = getApiKeyManager()
    const apiKey = keys.get('acled')
    const email = keys.get('acled_email')
    if (!apiKey || !email) {
      console.log('[Military] ACLED API key or email not configured — skipping')
      return []
    }

    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const url =
      `https://api.acleddata.com/acled/read?key=${encodeURIComponent(apiKey)}` +
      `&email=${encodeURIComponent(email)}` +
      `&event_type=Battles&event_type=Explosions/Remote violence&event_type=Strategic developments` +
      `&limit=25` +
      `&event_date=${fmt(sevenDaysAgo)}|${fmt(today)}&event_date_where=BETWEEN`

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`ACLED HTTP ${res.status}`)

    const body = await res.json() as { data?: AcledEvent[] }
    const events = body.data
    if (!Array.isArray(events)) return []

    return events.map((event): MilitaryActivity => {
      const type: MilitaryActivity['type'] =
        event.event_type === 'Battles'
          ? 'deployment'
          : event.event_type === 'Strategic developments'
            ? 'buildup'
            : 'deployment'

      const actor2Suffix = event.actor2 ? ` vs ${event.actor2}` : ''
      const title = `${event.sub_event_type || event.event_type}: ${event.actor1 || 'Unknown'}${actor2Suffix} — ${event.admin1 || ''}, ${event.country || 'Unknown'}`

      return {
        id: `mil-acled-${event.event_id_cnty}`,
        type,
        title,
        country: event.country || 'Unknown',
        latitude: parseFloat(event.latitude) || 0,
        longitude: parseFloat(event.longitude) || 0,
        description: (event.notes || '').substring(0, 300),
        source: `ACLED (${event.source || 'unknown'})`,
        detectedAt: event.event_date ? new Date(event.event_date).toISOString() : new Date().toISOString(),
        forces: [event.actor1, event.actor2].filter(Boolean) as string[],
      }
    })
  }
}

interface GdeltArticle {
  url?: string
  title?: string
  seendate?: string
  domain?: string
  language?: string
  socialimage?: string
}

interface AcledEvent {
  event_id_cnty: string
  event_date: string
  event_type: string
  sub_event_type?: string
  actor1?: string
  actor2?: string
  country?: string
  admin1?: string
  latitude: string
  longitude: string
  notes?: string
  source?: string
}
