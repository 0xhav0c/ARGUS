import type { VIPTweet } from '../../shared/types'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

let electronNet: typeof import('electron').net | null = null
let userDataPath = ''
let electronBrowserWindow: typeof import('electron').BrowserWindow | null = null
try {
  const electron = require('electron')
  electronNet = electron.net
  userDataPath = electron.app.getPath('userData')
  electronBrowserWindow = electron.BrowserWindow
} catch { /* not in electron context */ }

const BROWSER_HEADERS: Record<string, string> = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
}

async function chromeFetch(url: string, timeoutMs = 15000): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  if (electronNet) {
    try {
      const res = await electronNet.fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' as any })
      return { ok: res.ok, status: res.status, text: () => res.text() }
    } catch {
      // fallback to node fetch
    }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal, redirect: 'follow' })
    return { ok: res.ok, status: res.status, text: () => res.text() }
  } finally {
    clearTimeout(timer)
  }
}

async function headlessFetch(url: string, timeoutMs = 25000): Promise<string | null> {
  if (!electronBrowserWindow) return null
  return new Promise((resolve) => {
    let resolved = false
    const done = (val: string | null) => { if (!resolved) { resolved = true; resolve(val) } }
    const timer = setTimeout(() => { try { win?.destroy() } catch {} done(null) }, timeoutMs)

    const win = new electronBrowserWindow!({
      show: false, width: 1024, height: 768,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    })

    const TWEET_MARKERS = ['tweet-content', 'timeline-item', 'tweet-body', 'tweet_text', 'status-body']

    const pollForContent = async (attempt = 0): Promise<void> => {
      if (resolved) return
      try {
        const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML')
        if (typeof html === 'string' && TWEET_MARKERS.some(m => html.includes(m))) {
          clearTimeout(timer)
          try { win.destroy() } catch {}
          done(html)
          return
        }
        if (attempt < 8) {
          await new Promise(r => setTimeout(r, 2000))
          return pollForContent(attempt + 1)
        }
        clearTimeout(timer)
        try { win.destroy() } catch {}
        done(typeof html === 'string' ? html : null)
      } catch { clearTimeout(timer); try { win.destroy() } catch {} done(null) }
    }

    win.webContents.on('did-finish-load', () => { setTimeout(() => pollForContent(), 2000) })
    win.webContents.on('did-fail-load', () => { clearTimeout(timer); try { win.destroy() } catch {} done(null) })
    win.loadURL(url, { userAgent: BROWSER_HEADERS['User-Agent'] }).catch(() => { clearTimeout(timer); try { win.destroy() } catch {} done(null) })
  })
}

const VIP_ACCOUNTS: Array<{
  handle: string
  name: string
  title: string
  country: string
}> = [
  { handle: 'POTUS', name: 'President of the United States', title: 'US President', country: 'US' },
  { handle: 'VP', name: 'Vice President', title: 'US Vice President', country: 'US' },
  { handle: 'EmmanuelMacron', name: 'Emmanuel Macron', title: 'French President', country: 'FR' },
  { handle: 'RTErdogan', name: 'Recep Tayyip Erdoğan', title: 'Turkish President', country: 'TR' },
  { handle: 'ZelenskyyUa', name: 'Volodymyr Zelenskyy', title: 'Ukrainian President', country: 'UA' },
  { handle: 'naaborinhambir', name: 'Narendra Modi', title: 'Indian PM', country: 'IN' },
  { handle: 'netanyahu', name: 'Benjamin Netanyahu', title: 'Israeli PM', country: 'IL' },
  { handle: 'elonmusk', name: 'Elon Musk', title: 'CEO Tesla/SpaceX/X', country: 'US' },
  { handle: 'NATO', name: 'NATO', title: 'North Atlantic Treaty Organization', country: 'INT' },
  { handle: 'UN', name: 'United Nations', title: 'United Nations', country: 'INT' },
  { handle: 'WHO', name: 'WHO', title: 'World Health Organization', country: 'INT' },
  { handle: 'DeptofDefense', name: 'US DoD', title: 'Department of Defense', country: 'US' },
  { handle: 'StateDept', name: 'State Department', title: 'US State Department', country: 'US' },
  { handle: 'FederalReserve', name: 'Federal Reserve', title: 'US Central Bank', country: 'US' },
  { handle: 'ECB', name: 'European Central Bank', title: 'ECB', country: 'EU' },
  { handle: 'IMFNews', name: 'IMF', title: 'International Monetary Fund', country: 'INT' },
  { handle: 'SecDef', name: 'Secretary of Defense', title: 'US SecDef', country: 'US' },
  { handle: 'KremlinRussia_E', name: 'The Kremlin', title: 'Russian Presidency', country: 'RU' },
  { handle: 'MFA_China', name: 'China MFA', title: 'Chinese Foreign Ministry', country: 'CN' },
]

type RSSSourceFactory = (handle: string) => string

const RSS_SOURCES: RSSSourceFactory[] = [
  (h) => `https://xcancel.com/${h}/rss`,
  (h) => `https://nitter.net/${h}/rss`,
  (h) => `https://nitter.privacyredirect.com/${h}/rss`,
  (h) => `https://lightbrd.com/${h}/rss`,
  (h) => `https://nitter.space/${h}/rss`,
  (h) => `https://nuku.trabun.org/${h}/rss`,
  (h) => `https://nitter.tiekoetter.com/${h}/rss`,
  (h) => `https://nitter.catsarch.com/${h}/rss`,
  (h) => `https://nitter.cz/${h}/rss`,
  (h) => `https://bird.makeup/users/${h}/rss`,
  (h) => `https://twiiit.com/${h}/rss`,
  (h) => `https://rsshub.app/twitter/user/${h}`,
  (h) => `https://nitter.poast.org/${h}/rss`,
  (h) => `https://nitter.lunar.icu/${h}/rss`,
  (h) => `https://nitter.woodland.cafe/${h}/rss`,
  (h) => `https://nitter.1d4.us/${h}/rss`,
]

const NITTER_HTML_BASES = [
  'https://xcancel.com',
  'https://nitter.net',
  'https://lightbrd.com',
  'https://nitter.space',
  'https://nuku.trabun.org',
  'https://nitter.privacyredirect.com',
  'https://nitter.catsarch.com',
  'https://nitter.tiekoetter.com',
]

function stripHtml(s: string): string {
  let text = s
    // Remove the opening tag that wraps the content (e.g. <div class="tweet-content media-body" dir="auto">)
    .replace(/^<[^>]+>/i, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    // Remove leftover attribute fragments (class="...", dir="...")
    .replace(/\b(?:class|dir|style|id|data-\w+)="[^"]*"/gi, '')
    .replace(/\s+/g, ' ').trim()

  // If content still starts with ">", remove it (leftover from tag parsing)
  if (text.startsWith('>')) text = text.slice(1).trim()
  return text
}

export class VIPTweetService {
  private cache: { data: VIPTweet[]; timestamp: number } | null = null
  private persistedTweets: VIPTweet[] = []
  private CACHE_TTL = 180000
  private lastKnownIds: Set<string> = new Set()
  private onNewTweet?: (tweet: VIPTweet) => void
  private workingSources: number[] = []
  private activeAccounts = [...VIP_ACCOUNTS]
  private persistPath: string
  private consecutiveFailures = 0
  private workingHeadlessBase: string | null = null
  private fetchInProgress: Promise<VIPTweet[]> | null = null

  constructor() {
    const dir = userDataPath || join(process.cwd(), '.argus-data')
    try { mkdirSync(dir, { recursive: true }) } catch {}
    this.persistPath = join(dir, 'vip-tweets.json')
    this.loadFromDisk()
  }

  private loadFromDisk() {
    try {
      const raw = readFileSync(this.persistPath, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        const cutoff = Date.now() - 72 * 3600000
        this.persistedTweets = data.filter((t: VIPTweet) => new Date(t.timestamp).getTime() > cutoff)
        console.log(`[VIP Tweets] Loaded ${this.persistedTweets.length} tweets from disk`)
      }
    } catch { /* first run or corrupt file */ }
  }

  private saveToDisk() {
    try {
      writeFileSync(this.persistPath, JSON.stringify(this.persistedTweets.slice(0, 500)), 'utf-8')
    } catch (e) { console.error('[VIP Tweets] Save failed:', e) }
  }

  setNewTweetCallback(cb: (tweet: VIPTweet) => void) { this.onNewTweet = cb }

  async getVIPTweets(customAccounts?: Array<{ handle: string; name: string; title: string; country: string }>): Promise<VIPTweet[]> {
    if (customAccounts && customAccounts.length > 0) this.activeAccounts = customAccounts
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) return this.cache.data

    if (this.fetchInProgress) return this.fetchInProgress
    this.fetchInProgress = this._doFetch()
    try { return await this.fetchInProgress } finally { this.fetchInProgress = null }
  }

  private async _doFetch(): Promise<VIPTweet[]> {
    const freshTweets = await this.fetchAllSources()

    if (freshTweets.length > 0) {
      this.consecutiveFailures = 0
      this.CACHE_TTL = 180000
      const existingIds = new Set(this.persistedTweets.map(t => t.id))
      for (const t of freshTweets) {
        if (!existingIds.has(t.id)) this.persistedTweets.push(t)
      }
      this.saveToDisk()
    } else {
      this.consecutiveFailures++
      if (this.consecutiveFailures > 3) {
        this.CACHE_TTL = Math.min(600000, this.CACHE_TTL * 1.5)
      }
    }

    const cutoff72h = Date.now() - 72 * 3600000
    this.persistedTweets = this.persistedTweets.filter(t => new Date(t.timestamp).getTime() > cutoff72h)
    this.persistedTweets.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    const tweets = this.persistedTweets.slice(0, 200)

    if (this.cache && this.onNewTweet) {
      for (const tweet of tweets) {
        if (!this.lastKnownIds.has(tweet.id)) {
          const age = Date.now() - new Date(tweet.timestamp).getTime()
          if (age < 600000) this.onNewTweet(tweet)
        }
      }
    }

    this.lastKnownIds = new Set(tweets.map(t => t.id))
    this.cache = { data: tweets, timestamp: Date.now() }
    const status = freshTweets.length > 0 ? '' : ` [${this.consecutiveFailures} consecutive failures, TTL=${Math.round(this.CACHE_TTL/1000)}s]`
    console.log(`[VIP Tweets] ${tweets.length} tweets (${freshTweets.length} fresh this cycle)${status}`)
    return tweets
  }

  private async fetchAllSources(): Promise<VIPTweet[]> {
    // 1. Try cached working RSS source first
    if (this.workingSources.length > 0) {
      for (const srcIdx of this.workingSources) {
        const results = await this.tryRssSource(srcIdx)
        if (results.length > 0) return results
      }
      this.workingSources = []
    }

    // 2. Probe ALL RSS sources in parallel (race for first working)
    const probeAccount = this.activeAccounts[0].handle
    const rssProbes = RSS_SOURCES.map(async (factory, idx) => {
      try {
        const res = await chromeFetch(factory(probeAccount), 12000)
        if (!res.ok) return null
        const xml = await res.text()
        const hasRss = (xml.includes('<rss') || xml.includes('<feed') || xml.includes('<channel>')) &&
                       (xml.includes('<item') || xml.includes('<entry'))
        return hasRss ? idx : null
      } catch { return null }
    })

    const probeResults = await Promise.allSettled(rssProbes)
    const workingIndices: number[] = []
    for (const r of probeResults) {
      if (r.status === 'fulfilled' && r.value !== null) workingIndices.push(r.value)
    }

    if (workingIndices.length > 0) {
      console.log(`[VIP Tweets] ${workingIndices.length} RSS sources alive: ${workingIndices.join(', ')}`)
      for (const srcIdx of workingIndices) {
        this.workingSources = [srcIdx]
        const results = await this.tryRssSource(srcIdx)
        if (results.length > 0) return results
      }
    } else {
      console.log('[VIP Tweets] All RSS sources failed.')
    }

    // 3. Probe ALL HTML sources in parallel
    console.log('[VIP Tweets] Trying Nitter HTML scrape (parallel probe)...')
    const htmlProbes = NITTER_HTML_BASES.map(async (base) => {
      try {
        const testUrl = `${base}/${probeAccount}`
        const res = await chromeFetch(testUrl, 15000)
        if (!res.ok) return null
        const html = await res.text()
        const hasTweets = html.includes('tweet-content') || html.includes('timeline-item')
          || html.includes('tweet-body') || html.includes('tweet_text')
          || html.includes('status-body') || html.includes('tweet-text')
        if (!hasTweets) {
          const title = (html.match(/<title>(.*?)<\/title>/)?.[1] || 'none').slice(0, 50)
          console.log(`[VIP Tweets] HTML ${base}: no tweet markers (${html.length} chars, title: ${title})`)
          return null
        }
        return base
      } catch (err) {
        console.log(`[VIP Tweets] HTML ${base} error: ${(err as Error).message?.slice(0, 60)}`)
        return null
      }
    })

    const htmlResults = await Promise.allSettled(htmlProbes)
    for (const r of htmlResults) {
      if (r.status !== 'fulfilled' || !r.value) continue
      const base = r.value
      console.log(`[VIP Tweets] HTML ${base} has tweets! Scraping all accounts...`)
      const allTweets: VIPTweet[] = []
      for (let i = 0; i < this.activeAccounts.length; i += 3) {
        const batch = this.activeAccounts.slice(i, i + 3)
        const results = await Promise.allSettled(
          batch.map(acc => this.scrapeNitterHtml(`${base}/${acc.handle}`, acc))
        )
        for (const r2 of results) {
          if (r2.status === 'fulfilled') allTweets.push(...r2.value)
        }
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      if (allTweets.length > 0) return allTweets
    }

    // 4. Last resort: headless Chromium (solves Cloudflare JS challenge)
    if (electronBrowserWindow) {
      console.log('[VIP Tweets] Trying headless Chromium (Cloudflare bypass)...')
      const allHeadlessBases = ['https://xcancel.com', 'https://nitter.net', 'https://nitter.privacyredirect.com', 'https://lightbrd.com', 'https://nitter.space']
      const headlessBases = this.workingHeadlessBase
        ? [this.workingHeadlessBase, ...allHeadlessBases.filter(b => b !== this.workingHeadlessBase)]
        : allHeadlessBases
      for (const base of headlessBases) {
        try {
          const html = await headlessFetch(`${base}/${probeAccount}`, 25000)
          if (!html) continue
          const hasTweets = html.includes('tweet-content') || html.includes('timeline-item')
            || html.includes('tweet-body') || html.includes('tweet_text')
            || html.includes('status-body') || html.includes('tweet-text')
          if (!hasTweets) {
            const title = (html.match(/<title>(.*?)<\/title>/)?.[1] || 'none').slice(0, 50)
            console.log(`[VIP Tweets] Headless ${base}: no tweet markers (title: ${title})`)
            continue
          }
          this.workingHeadlessBase = base
          console.log(`[VIP Tweets] Headless ${base} has tweets! Scraping all accounts...`)
          const allTweets: VIPTweet[] = []
          for (let i = 0; i < this.activeAccounts.length; i += 2) {
            const batch = this.activeAccounts.slice(i, i + 2)
            const results = await Promise.allSettled(
              batch.map(acc => headlessFetch(`${base}/${acc.handle}`, 22000).then(h => h ? this.parseNitterHtml(h, acc) : []))
            )
            for (const r of results) {
              if (r.status === 'fulfilled') allTweets.push(...r.value)
            }
            if (i + 2 < this.activeAccounts.length) await new Promise(resolve => setTimeout(resolve, 800))
          }
          if (allTweets.length > 0) return allTweets
        } catch (err) {
          console.log(`[VIP Tweets] Headless ${base} error: ${(err as Error).message?.slice(0, 60)}`)
        }
      }
    }

    console.log('[VIP Tweets] All methods failed.')
    return []
  }

  private parseNitterHtml(html: string, account: typeof VIP_ACCOUNTS[0]): VIPTweet[] {
    const tweets: VIPTweet[] = []
    const extractContent = (regex: RegExp): string[] => {
      const results: string[] = []
      let m: RegExpExecArray | null
      while ((m = regex.exec(html)) !== null) results.push(m[1])
      return results
    }
    const contentTexts = extractContent(/class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g)
      .concat(extractContent(/class="tweet-body[^"]*"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g))
      .concat(extractContent(/class="status-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g))
    for (const rawText of contentTexts.slice(0, 8)) {
      const text = stripHtml(rawText)
      if (text.length < 5 || text.length > 600) continue
      const id = `hl-${account.handle}-${Buffer.from(text.slice(0, 50)).toString('base64').replace(/[/+=]/g, '').slice(0, 16)}`
      tweets.push({
        id, author: account.name, authorHandle: `@${account.handle}`,
        authorTitle: account.title, authorCountry: account.country,
        content: text.slice(0, 500), timestamp: new Date().toISOString(),
        url: `https://x.com/${account.handle}`, isVerified: true,
      })
    }
    return tweets
  }

  private async tryRssSource(srcIdx: number): Promise<VIPTweet[]> {
    const getUrl = RSS_SOURCES[srcIdx]
    const allTweets: VIPTweet[] = []
    for (let i = 0; i < this.activeAccounts.length; i += 4) {
      const batch = this.activeAccounts.slice(i, i + 4)
      const results = await Promise.allSettled(
        batch.map(account => this.fetchRssAccount(getUrl(account.handle), account))
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allTweets.push(...r.value)
      }
      if (i + 4 < this.activeAccounts.length) await new Promise(r => setTimeout(r, 300))
    }
    return allTweets
  }

  private async fetchRssAccount(url: string, account: typeof VIP_ACCOUNTS[0]): Promise<VIPTweet[]> {
    const tweets: VIPTweet[] = []
    try {
      const res = await chromeFetch(url)
      if (!res.ok) return []
      const xml = await res.text()
      if (xml.length < 100) return []

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || xml.match(/<entry>([\s\S]*?)<\/entry>/g)
      if (!items) return []

      for (const item of items.slice(0, 10)) {
        const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/)
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/) || item.match(/<link[^>]*href="([^"]*)"/)
        const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || item.match(/<published>([\s\S]*?)<\/published>/) || item.match(/<updated>([\s\S]*?)<\/updated>/)
        const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/)
          || item.match(/<content[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content>/) || item.match(/<content[^>]*>([\s\S]*?)<\/content>/)

        const rawContent = descMatch?.[1] || titleMatch?.[1] || ''
        const content = stripHtml(rawContent)
        if (!content || content.length < 5) continue

        let link = (linkMatch?.[1] || '').trim()
        if (link.includes('nitter.') || link.includes('bird.makeup') || link.includes('twiiit.com') || link.includes('xcancel.com')) {
          const statusMatch = link.match(/\/status\/(\d+)/)
          if (statusMatch) link = `https://x.com/${account.handle}/status/${statusMatch[1]}`
        }
        const tweetUrl = (link.includes('/status/') || link.includes('/statuses/')) ? link : `https://x.com/${account.handle}`

        let date: string
        try { date = dateMatch?.[1]?.trim() ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString() }
        catch { date = new Date().toISOString() }

        const id = `tweet-${account.handle}-${Buffer.from(content.slice(0, 60)).toString('base64').replace(/[/+=]/g, '').slice(0, 20)}`
        tweets.push({
          id, author: account.name, authorHandle: `@${account.handle}`,
          authorTitle: account.title, authorCountry: account.country,
          content: content.slice(0, 500), timestamp: date, url: tweetUrl, isVerified: true,
        })
      }
    } catch { /* silent */ }
    return tweets
  }

  private async scrapeNitterHtml(url: string, account: typeof VIP_ACCOUNTS[0]): Promise<VIPTweet[]> {
    const tweets: VIPTweet[] = []
    try {
      const res = await chromeFetch(url)
      if (!res.ok) return []
      const html = await res.text()

      // Extract tweet text from various Nitter HTML patterns
      const extractContent = (regex: RegExp): string[] => {
        const results: string[] = []
        let m: RegExpExecArray | null
        while ((m = regex.exec(html)) !== null) {
          results.push(m[1])
        }
        return results
      }

      const contentTexts = extractContent(/class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g)
        .concat(extractContent(/class="tweet-body[^"]*"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g))
        .concat(extractContent(/class="status-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g))

      if (contentTexts.length === 0) return []

      for (const rawText of contentTexts.slice(0, 8)) {
        const text = stripHtml(rawText)
        if (text.length < 5 || text.length > 600) continue

        const id = `html-${account.handle}-${Buffer.from(text.slice(0, 50)).toString('base64').replace(/[/+=]/g, '').slice(0, 16)}`
        tweets.push({
          id, author: account.name, authorHandle: `@${account.handle}`,
          authorTitle: account.title, authorCountry: account.country,
          content: text.slice(0, 500), timestamp: new Date().toISOString(),
          url: `https://x.com/${account.handle}`, isVerified: true,
        })
      }
    } catch { /* silent */ }
    return tweets
  }
}
