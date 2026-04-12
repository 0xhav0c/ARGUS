import { resolveLocation } from './geo-resolver'
import { classifyDomain, classifySeverity, isOffTopic } from './feed-aggregator'
import type { FeedSource, Incident } from '../../shared/types'

export class ConflictFeedProvider {
  getFeeds(): FeedSource[] {
    return [
      {
        id: 'reliefweb-updates',
        name: 'ReliefWeb Updates',
        url: 'https://reliefweb.int/updates/rss.xml',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'war-on-rocks',
        name: 'War on the Rocks',
        url: 'https://warontherocks.com/feed/',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 600
      },
      {
        id: 'bbc-world-conflict',
        name: 'BBC World News',
        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'guardian-world',
        name: 'The Guardian World',
        url: 'https://www.theguardian.com/world/rss',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'aljazeera-rss',
        name: 'Al Jazeera News',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'military-times',
        name: 'Military Times',
        url: 'https://www.militarytimes.com/arc/outboundfeeds/rss/category/news/',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 600
      },
      {
        id: 'anadolu-agency',
        name: 'Anadolu Agency (Turkish)',
        url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'trt-haber',
        name: 'TRT Haber (Turkish)',
        url: 'https://www.trthaber.com/sondakika.rss',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'aljazeera-arabic',
        name: 'Al Jazeera Arabic',
        url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0a9be4f44',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'tass',
        name: 'TASS',
        url: 'https://tass.com/rss/v2.xml',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'xinhua-world',
        name: 'Xinhua World (English)',
        url: 'https://www.xinhuanet.com/english/rss/worldrss.xml',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'rt-news',
        name: 'RT News',
        url: 'https://www.rt.com/rss/news/',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'reuters-world',
        name: 'Reuters World News',
        url: 'https://feeds.reuters.com/reuters/worldNews',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'france24-en',
        name: 'France 24 English',
        url: 'https://www.france24.com/en/rss',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'dw-world',
        name: 'Deutsche Welle World',
        url: 'https://rss.dw.com/rdf/rss-en-world',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'middleeasteye',
        name: 'Middle East Monitor',
        url: 'https://www.middleeastmonitor.com/feed/',
        domain: 'CONFLICT',
        type: 'rss',
        feedType: 'dedicated',
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
    const keywords = ['missile', 'drone', 'artillery', 'infantry', 'naval', 'air strike',
      'ceasefire', 'evacuation', 'humanitarian', 'refugees', 'sanctions',
      'earthquake', 'flood', 'relief', 'aid', 'crisis']
    for (const kw of keywords) {
      if (lower.includes(kw)) tags.push(kw)
    }
    return tags
  }
}
