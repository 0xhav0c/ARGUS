import type { ExtractedEntity, Incident, SentimentData } from '../../shared/types'
import type { SanctionsService } from './sanctions-service'

export class EntityExtractionService {
  private entities: Map<string, ExtractedEntity> = new Map()
  private sanctionsService: SanctionsService | null = null

  setSanctionsService(s: SanctionsService) { this.sanctionsService = s }

  extractFromIncidents(incidents: Incident[]): ExtractedEntity[] {
    this.entities.clear()

    for (const inc of incidents) {
      const text = `${inc.title} ${inc.description || ''}`
      const found = this.extractEntitiesFromText(text)
      for (const e of found) {
        const key = e.name.toLowerCase()
        const existing = this.entities.get(key)
        if (existing) {
          existing.mentions++
          if (!existing.incidentIds.includes(inc.id)) existing.incidentIds.push(inc.id)
          existing.lastSeen = inc.timestamp
        } else {
          e.incidentIds = [inc.id]
          e.firstSeen = inc.timestamp
          e.lastSeen = inc.timestamp
          if (this.sanctionsService) {
            const matches = this.sanctionsService.checkText(e.name)
            e.sanctioned = matches.length > 0
          }
          this.entities.set(key, e)
        }
      }
    }

    this.buildRelations()

    return Array.from(this.entities.values())
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 200)
  }

  private extractEntitiesFromText(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    const orgPatterns = [
      /\b(NATO|UN|EU|IAEA|WHO|OPEC|BRICS|G7|G20|ASEAN|SCO|AUKUS|CIA|FBI|NSA|FSB|GRU|MI6|Mossad|ISI|DGSE)\b/g,
      /\b(Pentagon|Kremlin|White House|Downing Street|Elysée)\b/g,
      /\b(Wagner|Hezbollah|Hamas|Houthi|ISIS|ISIL|Taliban|Al[ -]Qaeda|PKK|YPG)\b/g,
      /\b(Lockheed Martin|Raytheon|BAE Systems|Rheinmetall|Rostec|CNNC|Rosatom)\b/g,
    ]

    const personPatterns = [
      /\b(Putin|Zelensky|Biden|Trump|Xi Jinping|Modi|Erdogan|Macron|Scholz|Sunak|Netanyahu|Khamenei|Kim Jong[- ]?Un|Assad|Maduro|Sisi|MBS|Lavrov|Blinken|Austin|Shoigu|Gerasimov)\b/g,
    ]

    const weaponPatterns = [
      /\b(HIMARS|Javelin|Patriot|S-400|S-300|ATACMS|Storm Shadow|Kinzhal|Iskander|Kalibr|F-35|F-16|Su-35|Su-57|T-90|Leopard 2|Abrams|Bayraktar|IRIS-T|NASAMS|Gepard|Iron Dome|Arrow|David's Sling)\b/gi,
    ]

    const locationPatterns = [
      /\b(Crimea|Donbas|Donetsk|Luhansk|Kherson|Zaporizhzhia|Bakhmut|Avdiivka|Kursk|Belgorod|Taiwan Strait|South China Sea|Golan Heights|West Bank|Rafah|Khan Younis|Aleppo|Idlib|Nagorno[- ]Karabakh)\b/gi,
    ]

    const allPatterns: [RegExp[], ExtractedEntity['type']][] = [
      [orgPatterns, 'organization'],
      [personPatterns, 'person'],
      [weaponPatterns, 'weapon'],
      [locationPatterns, 'location'],
    ]

    const seen = new Set<string>()
    for (const [patterns, type] of allPatterns) {
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(text)) !== null) {
          const name = match[1] || match[0]
          const key = name.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          entities.push({
            id: `ent-${key.replace(/\s+/g, '-')}`,
            name,
            type,
            mentions: 1,
            incidentIds: [],
            firstSeen: '',
            lastSeen: '',
            relatedEntities: [],
          })
        }
      }
    }

    return entities
  }

  private buildRelations() {
    const entArr = Array.from(this.entities.values())
    for (const e of entArr) {
      for (const other of entArr) {
        if (e.id === other.id) continue
        const shared = e.incidentIds.filter(id => other.incidentIds.includes(id))
        if (shared.length >= 2) {
          if (!e.relatedEntities.find(r => r.id === other.id)) {
            const relation = e.type === 'person' && other.type === 'organization' ? 'affiliated'
              : e.type === 'person' && other.type === 'weapon' ? 'uses'
              : e.type === 'organization' && other.type === 'location' ? 'operates in'
              : 'co-mentioned'
            e.relatedEntities.push({ id: other.id, name: other.name, relation })
          }
        }
      }
      e.relatedEntities = e.relatedEntities.slice(0, 10)
    }
  }

  analyzeSentiment(incidents: Incident[]): SentimentData[] {
    const regionMap = new Map<string, { pos: number; neg: number; neu: number; count: number }>()
    const positiveWords = /\bpeace|ceasefire|agreement|cooperation|aid|humanitarian|rescue|recovery|reform|progress|growth|stability\b/i
    const negativeWords = /\battack|kill|bomb|missile|strike|war|conflict|threat|sanction|crisis|terror|casualt|dead|wound|explosion|destroy\b/i

    for (const inc of incidents) {
      const region = inc.country || inc.region || 'Global'
      const text = `${inc.title} ${inc.description || ''}`
      const pos = (text.match(positiveWords) || []).length
      const neg = (text.match(negativeWords) || []).length
      const entry = regionMap.get(region) || { pos: 0, neg: 0, neu: 0, count: 0 }
      if (pos > neg) entry.pos++
      else if (neg > pos) entry.neg++
      else entry.neu++
      entry.count++
      regionMap.set(region, entry)
    }

    const results: SentimentData[] = []
    for (const [region, data] of regionMap) {
      if (data.count < 2) continue
      const total = data.pos + data.neg + data.neu
      const score = total > 0 ? ((data.pos - data.neg) / total) * 100 : 0
      results.push({
        topic: region,
        region,
        positive: data.pos,
        negative: data.neg,
        neutral: data.neu,
        score: Math.round(score),
        trend: score > 10 ? 'improving' : score < -10 ? 'worsening' : 'stable',
        sampleSize: data.count,
        timestamp: new Date().toISOString(),
      })
    }

    return results.sort((a, b) => a.score - b.score).slice(0, 30)
  }
}
