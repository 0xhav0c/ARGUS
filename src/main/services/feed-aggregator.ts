import Parser from 'rss-parser'
import { createHash } from 'crypto'
import { CacheManager } from './cache-manager'
import { broadcastIncidentUpdate } from '../ipc/incidents'
import { resolveLocation } from './geo-resolver'
import type { Incident, IncidentDomain, IncidentSeverity, FeedSource } from '../../shared/types'

// ──────────────────────────────────────────────────────────────
// LAYER 0 — Off-topic filter: content irrelevant to intelligence
// ──────────────────────────────────────────────────────────────
const OFF_TOPIC = /\b(football|soccer|basketball|tennis|cricket|rugby|baseball|golf|Formula\s?1|F1\s?race|Grand\s?Prix|championship|World\s?Cup\s?(qualif|final|group)|Premier\s?League|La\s?Liga|Serie\s?A|Bundesliga|Champions\s?League|UEFA|FIFA|Olympics|Olympic\s?Games|medal\s?winner|trophy|tournament|playoff|relegat|celebrity|Kardashian|Hollywood|Bollywood|box\s?office|Grammy|Oscar|Emmy|album\s?release|concert\s?tour|fashion\s?week|runway|Met\s?Gala|Super\s?Bowl\s?halftime|reality\s?TV|horoscope|zodiac|crossword|sudoku|recipe|cookbook|cooking\s?show|lifestyle|travel\s?guide|vacation\s?deal|hotel\s?review|restaurant\s?review|rom-com|sitcom|soap\s?opera|video\s?game\s?release|esports|streaming\s?service|Netflix|Disney\+|pet\s?adoption|gardening|weight\s?loss|fitness\s?tip|beauty\s?product)/i

export function isOffTopic(text: string): boolean {
  if (!OFF_TOPIC.test(text)) return false
  const hasIntelValue = /\b(sanction|military|attack|bomb|missile|nuclear|weapon|hack|breach|cyber|conflict|war\b|intelligence|espionage|crisis|inflation|recession|coup|invasion|terrorist)/i.test(text)
  return !hasIntelValue
}

// ──────────────────────────────────────────────────────────────
// LAYER 1 — Strong (multi-word) n-gram domain patterns
// These are high-confidence signals that override weaker matches
// ──────────────────────────────────────────────────────────────
const STRONG_CONFLICT = /\b(armed\s?conflict|civil\s?war|military\s?(operation|offensive|strike|assault|intervention)|air\s?strike|airstrike|artillery\s?(fire|barrage|shelling)|missile\s?(strike|attack|launch|barrage)|troops?\s?deploy(ed|ment)?|killed\s?in\s?(attack|combat|strike|shelling|bombing)|suicide\s?bomb(er|ing)?|terrorist\s?(attack|plot|threat)|insurgent\s?(attack|group)|armed\s?group|militia\s?(attack|force)|ethnic\s?cleansing|war\s?crime|mass\s?grave|ceasefire\s?violat|frontline\s?advance|ground\s?(offensive|invasion)|naval\s?blockade|drone\s?strike|cluster\s?bomb|chemical\s?(attack|weapon)|barrel\s?bomb|cross-border\s?(attack|shelling))/i

const STRONG_CYBER = /\b(cyber\s?attack|data\s?breach|ransomware\s?(attack|gang|group)|phishing\s?(campaign|attack|email)|zero[- ]day\s?(exploit|vulnerability)|nation[- ]state\s?(hack|attack)|supply[- ]chain\s?(attack|compromise)|critical\s?infrastructure\s?(attack|hack)|apt[\s-]?\d{1,3}|threat\s?actor|C2\s?server|credentials?\s?(leak|dump|theft)|dark\s?web\s?(market|leak|forum)|state[- ]sponsored\s?(hack|cyber)|DDoS\s?attack|botnet\s?(attack|takedown))/i

const STRONG_INTEL = /\b(intelligence\s?(report|agency|operation|community)|espionage\s?(ring|case|scandal)|diplomatic\s?(crisis|incident|row|ties)|geopolitical\s?(tension|shift|risk|implication)|UN\s?Security\s?Council|NATO\s?(summit|meeting|deploy)|nuclear\s?(deal|program|weapon|proliferat)|regime\s?change|political\s?(crisis|unrest|instability)|election\s?(interfer|fraud|rigg)|trade\s?war|economic\s?sanction|arms\s?(deal|embargo|race)|territorial\s?dispute|sovereignty\s?(dispute|violation)|bilateral\s?(talks|relations|deal))/i

const STRONG_FINANCE = /\b(stock\s?market\s?(crash|rally|plunge|surge)|interest\s?rate\s?(hike|cut|decision)|central\s?bank\s?(meeting|decision|policy)|GDP\s?(growth|decline|contraction)|currency\s?(crisis|devaluat|collapse)|bond\s?yield\s?(rise|fall|spike)|oil\s?price\s?(surge|drop|crash)|market\s?crash|economic\s?(crisis|collapse|recession|downturn)|debt\s?(crisis|default|ceiling)|fiscal\s?(cliff|deficit|stimulus)|monetary\s?policy|trade\s?(deficit|surplus|imbalance)|supply\s?chain\s?disruption|commodity\s?price)/i

// ──────────────────────────────────────────────────────────────
// LAYER 2 — Weak (single-word) domain patterns - lower weight
// ──────────────────────────────────────────────────────────────
const WEAK_CONFLICT = /\b(bombing|shelling|casualties|massacre|genocide|coup|invasion|insurgent|militia|frontline|warfare|occupation|blockade|siege)\b/i
const WEAK_CYBER = /\b(hack(ed|er|ing)?|malware|ransomware|phishing|ddos|exploit|vulnerability|CVE-\d|botnet|trojan|spyware|backdoor|infosec|cryptojack)\b/i
const WEAK_INTEL = /\b(sanction(s|ed)?|diplomat(ic|y)|geopolit|summit|treaty|bilateral|sovereignty|embargo|alliance|espionage|intelligence)\b/i
const WEAK_FINANCE = /\b(inflation|recession|IPO|bitcoin|crypto(currency)?|commodity|hedge\s?fund|fiscal|tariff)\b/i

// ──────────────────────────────────────────────────────────────
// LAYER 3 — Positive / humanitarian sentiment patterns
// Downgrade severity and shift CONFLICT → INTEL
// ──────────────────────────────────────────────────────────────
const POSITIVE_PATTERN = /\b(peace\s?(agreement|deal|talks?|process|accord|treaty|plan|effort)|ceasefire\s?(agree|sign|hold|reach)|signed\s?(agreement|deal|treaty|accord)|diplomatic\s?(breakthrough|progress|solution)|reconciliation|normalization\s?of\s?relations|cooperation\s?(agreement|deal|pact)|partnership|humanitarian\s?(aid|relief|corridor|assistance|mission)|rescue\s?(operation|effort|mission)|aid\s?deliver(y|ed)|refugee\s?(resettl|assist|protect)|peace\s?keeping|demilitariz|disarmament|reconstruction|rebuild|recover(y|ing)|development\s?(project|program|aid|initiative)|economic\s?growth|reform\s?(plan|program|effort)|democratic\s?(transition|election|reform)|peaceful\s?(protest|transition|resolution)|freed|liberated|saved|evacuated)/i

const NEUTRAL_INDICATOR = /\b(announced|according\s?to|said\s?in\s?a\s?statement|reported(ly)?|scheduled|conference|visited|met\s?with|discussed|proposed|plan(ned|ning)?|delegation|spokesperson|press\s?conference|briefing)\b/i

// ──────────────────────────────────────────────────────────────
// LAYER 4 — Ambiguous words that need context disambiguation
// ──────────────────────────────────────────────────────────────
const AMBIGUOUS_WAR = /\b(war)\b/i
const WAR_FALSE_POSITIVE = /\b(star\s?wars?|trade\s?war|war\s?on\s?(poverty|drugs|cancer|obesity|hunger|crime|terror)|cold\s?war\s?(era|museum|memorial)|world\s?war\s?(I{1,2}|1|2|one|two)\s?(museum|memorial|veteran|anniversary|commemo))/i

const AMBIGUOUS_ATTACK = /\b(attack)\b/i
const ATTACK_FALSE_POSITIVE = /\b(heart\s?attack|panic\s?attack|anxiety\s?attack|asthma\s?attack|shark\s?attack|bear\s?attack|dog\s?attack|animal\s?attack|gout\s?attack)/i

const AMBIGUOUS_MILITARY = /\b(military)\b/i
const MILITARY_FALSE_POSITIVE = /\b(military\s?(museum|parade|cemetery|memorial|veteran|band|academy\s?graduat|history|heritage|wedding|family|spouse|discount))/i

const AMBIGUOUS_KILLED = /\b(killed)\b/i
const KILLED_CONFLICT_CONTEXT = /\b(soldiers?\s?killed|civilians?\s?killed|people\s?killed\s?in\s?(attack|bomb|strike|shelling|raid|conflict|clash)|killed\s?by\s?(militants?|rebels?|forces?|troops?|fighters?|soldiers?|airstrike|drone|bomb|shell|missile)|death\s?toll|fatalities\s?in\s?(conflict|war|attack|battle))/i

const AMBIGUOUS_CRISIS = /\b(crisis)\b/i
const CRISIS_FALSE_POSITIVE = /\b(midlife\s?crisis|identity\s?crisis|existential\s?crisis|quarter-life\s?crisis|crisis\s?of\s?faith)/i

// ──────────────────────────────────────────────────────────────
// LAYER 5 — Confidence threshold for general feeds
// ──────────────────────────────────────────────────────────────
const GENERAL_FEED_MIN_SCORE = 12

// ──────────────────────────────────────────────────────────────
// classifyDomain — 6-layer classification engine
// ──────────────────────────────────────────────────────────────
export function classifyDomain(text: string, feedDefault: IncidentDomain, feedType: 'dedicated' | 'general' = 'dedicated'): IncidentDomain {
  const scores: Record<IncidentDomain, number> = { CONFLICT: 0, CYBER: 0, INTEL: 0, FINANCE: 0 }

  // Layer 1: Strong n-gram patterns (high weight)
  const strongMatches: [IncidentDomain, RegExp][] = [
    ['CONFLICT', STRONG_CONFLICT],
    ['CYBER', STRONG_CYBER],
    ['INTEL', STRONG_INTEL],
    ['FINANCE', STRONG_FINANCE],
  ]
  for (const [domain, rx] of strongMatches) {
    const m = text.match(new RegExp(rx.source, 'gi'))
    if (m) scores[domain] += m.length * 15
  }

  // Layer 2: Weak single-word patterns (lower weight)
  const weakMatches: [IncidentDomain, RegExp][] = [
    ['CONFLICT', WEAK_CONFLICT],
    ['CYBER', WEAK_CYBER],
    ['INTEL', WEAK_INTEL],
    ['FINANCE', WEAK_FINANCE],
  ]
  for (const [domain, rx] of weakMatches) {
    const m = text.match(new RegExp(rx.source, 'gi'))
    if (m) scores[domain] += m.length * 6
  }

  // Layer 3: Positive / humanitarian content shifts CONFLICT → INTEL
  const isPositive = POSITIVE_PATTERN.test(text)
  if (isPositive) {
    scores['INTEL'] += 10
    scores['CONFLICT'] = Math.max(0, scores['CONFLICT'] - 8)
  }

  // Layer 4: Disambiguate ambiguous terms
  if (AMBIGUOUS_WAR.test(text)) {
    if (WAR_FALSE_POSITIVE.test(text)) {
      scores['CONFLICT'] = Math.max(0, scores['CONFLICT'] - 10)
    }
  }
  if (AMBIGUOUS_ATTACK.test(text)) {
    if (ATTACK_FALSE_POSITIVE.test(text)) {
      scores['CONFLICT'] = Math.max(0, scores['CONFLICT'] - 8)
    }
  }
  if (AMBIGUOUS_MILITARY.test(text)) {
    if (MILITARY_FALSE_POSITIVE.test(text)) {
      scores['CONFLICT'] = Math.max(0, scores['CONFLICT'] - 8)
    }
  }
  if (AMBIGUOUS_KILLED.test(text) && scores['CONFLICT'] > 0) {
    if (!KILLED_CONFLICT_CONTEXT.test(text)) {
      scores['CONFLICT'] = Math.max(0, scores['CONFLICT'] - 6)
    }
  }
  if (AMBIGUOUS_CRISIS.test(text)) {
    if (CRISIS_FALSE_POSITIVE.test(text)) {
      scores['CONFLICT'] = Math.max(0, scores['CONFLICT'] - 6)
      scores['INTEL'] = Math.max(0, scores['INTEL'] - 6)
    }
  }

  // Neutral indicator: if heavily neutral language and no strong signal, lower all domain scores slightly
  if (NEUTRAL_INDICATOR.test(text) && !isPositive) {
    const maxBefore = Math.max(...Object.values(scores))
    if (maxBefore > 0 && maxBefore < 10) {
      for (const d of Object.keys(scores) as IncidentDomain[]) {
        scores[d] = Math.max(0, scores[d] - 3)
      }
    }
  }

  // Layer 5: Confidence threshold
  const maxScore = Math.max(...Object.values(scores))

  if (maxScore === 0) {
    // No keywords matched at all
    if (feedType === 'dedicated') return feedDefault
    return 'INTEL' // general feeds: unknown content → INTEL (safest)
  }

  if (feedType === 'general' && maxScore < GENERAL_FEED_MIN_SCORE) {
    return 'INTEL' // below confidence threshold for general feeds
  }

  // Pick winner
  const winner = (Object.entries(scores) as [IncidentDomain, number][])
    .filter(([, s]) => s === maxScore)
    .map(([d]) => d)[0]

  return winner || feedDefault
}

// ──────────────────────────────────────────────────────────────
// classifySeverity — context-aware severity with disambiguation
// ──────────────────────────────────────────────────────────────
export function classifySeverity(text: string, domain?: IncidentDomain): IncidentSeverity {
  const lower = text.toLowerCase()

  // CRITICAL: only for unambiguous, extreme events
  if (/\b(massacre|genocide|nuclear\s?(strike|attack|detonat)|wmd\s?(use|deploy|attack)|mass\s?casualt(y|ies)|chemical\s?(attack|weapon\s?use)|biological\s?(attack|weapon)|critical\s?infrastructure\s?(attack|destroy|down)|nation[- ]state\s?cyber\s?attack|large[- ]scale\s?(attack|offensive|invasion))\b/.test(lower)) {
    return 'CRITICAL'
  }

  // Positive content can never be above MEDIUM
  if (POSITIVE_PATTERN.test(text)) {
    if (/\b(casualties|killed|dead|wounded|injured|victim)\b/.test(lower)) return 'MEDIUM'
    return 'LOW'
  }

  // HIGH: confirmed violence, active threats, significant breaches
  const highConflict = /\b(suicide\s?bomb|car\s?bomb|bombing|airstrike|air\s?strike|shelling|artillery\s?fire|missile\s?(strike|attack)|troops?\s?(deploy|advanc)|casualties|civilians?\s?killed|soldiers?\s?killed|people\s?killed|terrorist\s?attack|armed\s?(clash|assault)|hostage|kidnap)/i.test(text)
  const highCyber = /\b(ransomware\s?attack|data\s?breach|zero[- ]day\s?exploit|critical\s?vulnerability|nation[- ]state\s?hack|supply[- ]chain\s?attack|credentials?\s?(leak|dump)|massive\s?(breach|leak|hack))/i.test(text)
  const highFinance = /\b(market\s?crash|currency\s?collapse|debt\s?default|bank\s?run|economic\s?collapse|flash\s?crash)/i.test(text)
  if (highConflict || highCyber || highFinance) return 'HIGH'

  // MEDIUM: tensions, moderate threats, notable events
  if (/\b(clash(es)?|tension|troops|deployment|vulnerability|malware|phishing|ddos|negotiation|protest|unrest|demonstration|riot|sanctions?\s?(impos|announc)|military\s?(buildup|exercise|drill)|border\s?(incident|tension|clash)|coup\s?(attempt|plot)|recession|downturn)\b/.test(lower)) {
    return 'MEDIUM'
  }

  // LOW: diplomatic, advisory, warnings, monitoring
  if (/\b(ceasefire|peace|diplomacy|diplomatic|patch|update|advisory|warning|statement|resolution|report|relief|aid|humanitarian|monitoring|review|assessment|analysis|outlook)\b/.test(lower)) {
    return 'LOW'
  }

  return 'INFO'
}

interface FeedProvider {
  getFeeds(): FeedSource[]
  parseToIncident?(item: Record<string, unknown>, feed: FeedSource): Incident | null
}

export class FeedAggregator {
  private parser: Parser
  private cache: CacheManager
  private providers: Map<IncidentDomain, FeedProvider> = new Map()
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  private fetchedIds: Set<string> = new Set()

  constructor() {
    this.parser = new Parser({
      timeout: 15000,
      headers: {
        'User-Agent': 'Argus/1.0 Intelligence Dashboard'
      }
    })
    this.cache = new CacheManager()
  }

  registerProvider(domain: IncidentDomain, provider: FeedProvider): void {
    this.providers.set(domain, provider)
  }

  async initialize(): Promise<void> {
    const activeIds = new Set<string>()
    for (const [, provider] of this.providers) {
      for (const feed of provider.getFeeds()) {
        this.cache.upsertFeed(feed)
        activeIds.add(feed.id)
      }
    }
    this.cache.disableStaleFeedIds(activeIds)

    const existing = this.cache.getIncidents()
    for (const inc of existing) {
      this.fetchedIds.add(inc.id)
    }
    console.log(`[Feed] Loaded ${existing.length} cached incidents from database`)
  }

  async refreshAll(): Promise<void> {
    const feeds = this.cache.getFeeds().filter(f => f.enabled)
    const now = Date.now()

    const staleFeeds = feeds.filter(feed => {
      if (!feed.lastFetched) return true
      const lastFetched = new Date(feed.lastFetched).getTime()
      const intervalMs = (feed.refreshInterval ?? 300) * 1000
      return (now - lastFetched) > intervalMs
    })

    if (staleFeeds.length === 0) {
      console.log('[Feed] All feeds are fresh, skipping refresh')
      return
    }

    console.log(`[Feed] Refreshing ${staleFeeds.length}/${feeds.length} stale feeds`)

    const results = await Promise.allSettled(
      staleFeeds.map(feed => this.fetchFeed(feed))
    )

    let newCount = 0
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const feed = staleFeeds[i]
      if (result.status === 'fulfilled') {
        newCount += result.value
      } else {
        this.cache.updateFeedStatus(feed.id, new Date().toISOString(), String(result.reason))
      }
    }

    if (newCount > 0) {
      console.log(`[Feed] Added ${newCount} new incidents`)
    }
  }

  private async fetchFeed(feed: FeedSource): Promise<number> {
    try {
      const etag = this.cache.getFeedMeta(feed.id, 'etag')
      const lastModified = this.cache.getFeedMeta(feed.id, 'lastModified')

      const headers: Record<string, string> = {
        'User-Agent': 'Argus/1.0 Intelligence Dashboard'
      }
      if (etag) headers['If-None-Match'] = etag
      if (lastModified) headers['If-Modified-Since'] = lastModified

      let parsed: Parser.Output<Record<string, unknown>>
      try {
        parsed = await this.parser.parseURL(feed.url)
      } catch (err: any) {
        if (err?.statusCode === 304) {
          this.cache.updateFeedStatus(feed.id, new Date().toISOString())
          return 0
        }
        throw err
      }

      const now = new Date().toISOString()
      const provider = this.providers.get(feed.domain)
      let newCount = 0

      for (const item of parsed.items ?? []) {
        const incident = provider?.parseToIncident?.(item as Record<string, unknown>, feed)
          ?? this.defaultParseToIncident(item as Record<string, unknown>, feed)

        if (!incident) continue

        const stableId = this.generateStableId(item, feed)
        incident.id = stableId

        if (this.fetchedIds.has(stableId)) continue

        this.fetchedIds.add(stableId)
        this.cache.upsertIncident(incident)
        broadcastIncidentUpdate(incident)
        newCount++
      }

      this.cache.updateFeedStatus(feed.id, now)
      return newCount
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.cache.updateFeedStatus(feed.id, new Date().toISOString(), msg)
      console.error(`[Feed Error] ${feed.name}: ${msg}`)
      return 0
    }
  }

  private generateStableId(item: Record<string, unknown>, feed: FeedSource): string {
    const guid = (item.guid as string) ?? (item.id as string) ?? ''
    const link = (item.link as string) ?? ''
    const title = (item.title as string) ?? ''
    const date = (item.isoDate as string) ?? (item.pubDate as string) ?? ''

    const key = guid || `${feed.id}:${link}:${title}:${date}`
    return createHash('sha256').update(key).digest('hex').substring(0, 16)
  }

  private defaultParseToIncident(item: Record<string, unknown>, feed: FeedSource): Incident | null {
    const title = (item.title as string) ?? ''
    if (!title) return null

    const fullText = title + ' ' + ((item.contentSnippet as string) ?? (item.content as string) ?? '')
    if (isOffTopic(fullText)) return null
    const location = resolveLocation(fullText)
    if (!location) return null

    const domain = classifyDomain(fullText, feed.domain, feed.feedType ?? 'dedicated')
    const severity = classifySeverity(fullText, domain)

    return {
      id: '',
      title,
      description: this.stripHtml((item.contentSnippet as string) ?? (item.content as string) ?? ''),
      domain,
      severity,
      latitude: location.latitude,
      longitude: location.longitude,
      country: location.country,
      timestamp: (item.isoDate as string) ?? new Date().toISOString(),
      source: feed.name,
      sourceUrl: (item.link as string) ?? undefined,
      tags: this.extractTags(title),
      metadata: { feedId: feed.id }
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500)
  }

  private extractTags(text: string): string[] {
    const keywords = [
      'attack', 'military', 'missile', 'drone', 'explosion', 'war',
      'cyber', 'hack', 'malware', 'ransomware', 'ddos', 'breach',
      'sanctions', 'nuclear', 'diplomatic', 'treaty', 'intelligence',
      'market', 'crash', 'inflation', 'recession', 'oil', 'gold'
    ]
    const lower = text.toLowerCase()
    return keywords.filter(kw => lower.includes(kw))
  }

  startAutoRefresh(intervalMs: number = 300000): void {
    this.stopAutoRefresh()
    this.refreshTimer = setInterval(() => this.refreshAll(), intervalMs)
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}
