import { resolveLocation } from './geo-resolver'
import { classifyDomain, classifySeverity, isOffTopic } from './feed-aggregator'
import type { FeedSource, Incident } from '../../shared/types'

export class FinanceFeedProvider {
  getFeeds(): FeedSource[] {
    return [
      {
        id: 'ft-world',
        name: 'Financial Times',
        url: 'https://www.ft.com/rss/home',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'cnbc-world',
        name: 'CNBC World Economy',
        url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19794221',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'bloomberg-markets',
        name: 'Bloomberg Markets',
        url: 'https://feeds.bloomberg.com/markets/news.rss',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'marketwatch',
        name: 'MarketWatch',
        url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'investing',
        name: 'Investing.com',
        url: 'https://www.investing.com/rss/news.rss',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'yahoo-finance',
        name: 'Yahoo Finance',
        url: 'https://finance.yahoo.com/news/rssindex',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'wsj',
        name: 'Wall Street Journal',
        url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'nikkei-asia',
        name: 'Straits Times Asia',
        url: 'https://www.straitstimes.com/news/asia/rss.xml',
        domain: 'FINANCE',
        type: 'rss',
        feedType: 'general',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'bloomberg-ht-turkey',
        name: 'Bloomberg HT (Turkish finance / markets)',
        url: 'https://www.bloomberght.com/rss',
        domain: 'FINANCE',
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
    const keywords = ['oil', 'gold', 'crypto', 'bitcoin', 'inflation', 'recession',
      'interest rate', 'gdp', 'stock', 'bond', 'currency', 'commodity',
      'market', 'trade', 'economy']
    for (const kw of keywords) {
      if (lower.includes(kw)) tags.push(kw)
    }
    return tags
  }
}
