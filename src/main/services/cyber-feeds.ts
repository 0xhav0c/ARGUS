import { resolveLocation } from './geo-resolver'
import { classifyDomain, classifySeverity, isOffTopic } from './feed-aggregator'
import type { FeedSource, Incident } from '../../shared/types'

export class CyberFeedProvider {
  getFeeds(): FeedSource[] {
    return [
      {
        id: 'cisa-alerts',
        name: 'CISA Alerts',
        url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'krebs-security',
        name: 'Krebs on Security',
        url: 'https://krebsonsecurity.com/feed/',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 600
      },
      {
        id: 'threatpost',
        name: 'The Hacker News',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'bleeping-computer',
        name: 'BleepingComputer',
        url: 'https://www.bleepingcomputer.com/feed/',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'dark-reading',
        name: 'Dark Reading',
        url: 'https://www.darkreading.com/rss.xml',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'securityweek',
        name: 'SecurityWeek',
        url: 'https://www.securityweek.com/feed/',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 300
      },
      {
        id: 'threatpost-kaspersky',
        name: 'Securelist',
        url: 'https://securelist.com/feed/',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 600
      },
      {
        id: 'schneier',
        name: 'Schneier on Security',
        url: 'https://www.schneier.com/feed/',
        domain: 'CYBER',
        type: 'rss',
        feedType: 'dedicated',
        enabled: true,
        refreshInterval: 900
      },
      {
        id: 'us-cert',
        name: 'US-CERT',
        url: 'https://www.cisa.gov/uscert/ncas/alerts.xml',
        domain: 'CYBER',
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
    const keywords = ['ransomware', 'malware', 'phishing', 'ddos', 'zero-day', 'exploit',
      'apt', 'breach', 'vulnerability', 'botnet', 'trojan', 'spyware', 'backdoor',
      'cyber', 'hack', 'data leak']
    for (const kw of keywords) {
      if (lower.includes(kw)) tags.push(kw)
    }
    return tags
  }
}
