import { resolveLocation } from './geo-resolver'
import { classifyDomain, classifySeverity, isOffTopic } from './feed-aggregator'
import type { FeedSource, Incident } from '../../shared/types'

export class IntelFeedProvider {
  getFeeds(): FeedSource[] {
    return [
      {
        id: 'un-news',
        name: 'UN News',
        url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 600
      },
      {
        id: 'foreign-affairs',
        name: 'Foreign Affairs',
        url: 'https://www.foreignaffairs.com/rss.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 1800
      },
      {
        id: 'bbc-politics',
        name: 'BBC Politics',
        url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'nyt-world',
        name: 'NYT World',
        url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'rferl',
        name: 'Radio Free Europe',
        url: 'https://www.rferl.org/api/z-pqpiev-qpp',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 600
      },
      {
        id: 'politico-world',
        name: 'Politico',
        url: 'https://rss.politico.com/politics-news.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'economist',
        name: 'The Economist',
        url: 'https://www.economist.com/international/rss.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 900
      },
      {
        id: 'hurriyet-daily-news',
        name: 'Hürriyet Daily News',
        url: 'https://www.hurriyetdailynews.com/rss',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'sana-syria-en',
        name: 'SANA Syria (English)',
        url: 'https://sana.sy/en/?feed=rss2',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'iran-intl',
        name: 'Iran International',
        url: 'https://www.iranintl.com/en/feed',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'yonhap-yna',
        name: 'Yonhap News Agency',
        url: 'https://en.yna.co.kr/RSS/news.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'nhk-world-japan',
        name: 'NHK World-Japan News',
        url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'south-china-morning',
        name: 'South China Morning Post',
        url: 'https://www.scmp.com/rss/91/feed',
        domain: 'INTEL',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      }
    ]
  }

  parseToIncident(item: Record<string, unknown>, feed: FeedSource): Incident | null {
    const title = (item.title as string) ?? ''
    if (!title) return null

    const fullText = title + ' ' + ((item.contentSnippet as string) ?? '')
    if (isOffTopic(fullText)) return null
    const location = resolveLocation(fullText)
    if (!location) return null

    const domain = classifyDomain(fullText, feed.domain, feed.feedType)
    const severity = classifySeverity(fullText, domain)

    return {
      id: '',
      title,
      description: ((item.contentSnippet as string) ?? '').substring(0, 500),
      domain,
      severity,
      latitude: location.latitude,
      longitude: location.longitude,
      country: location.country,
      timestamp: (item.isoDate as string) ?? new Date().toISOString(),
      source: feed.name,
      sourceUrl: (item.link as string) ?? undefined,
      tags: this.extractTags(fullText),
      metadata: { feedId: feed.id }
    }
  }

  private extractTags(text: string): string[] {
    const tags: string[] = []
    const lower = text.toLowerCase()
    const keywords = ['sanctions', 'nuclear', 'diplomatic', 'treaty', 'alliance',
      'espionage', 'intelligence', 'summit', 'crisis', 'sovereignty',
      'election', 'embargo', 'geopolitical']
    for (const kw of keywords) {
      if (lower.includes(kw)) tags.push(kw)
    }
    return tags
  }
}
