import type { SanctionEntity } from '../../shared/types'

const OFAC_SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.csv'

let cachedEntities: SanctionEntity[] = []
let lastFetch = 0
const CACHE_TTL = 86400000 // 24h

const KNOWN_SANCTIONS: SanctionEntity[] = [
  { id: 'ofac-1', name: 'Wagner Group', aliases: ['PMC Wagner', 'Vagner'], type: 'entity', source: 'OFAC', program: 'RUSSIA-EO14024', country: 'RU', remarks: 'Russian private military company' },
  { id: 'ofac-2', name: 'Lazarus Group', aliases: ['HIDDEN COBRA', 'Guardians of Peace', 'APT38'], type: 'entity', source: 'OFAC', program: 'DPRK', country: 'KP', remarks: 'North Korean state-sponsored cyber group' },
  { id: 'ofac-3', name: 'Islamic Revolutionary Guard Corps', aliases: ['IRGC', 'Sepah', 'Pasdaran'], type: 'entity', source: 'OFAC', program: 'IRAN', country: 'IR', remarks: 'Iranian military organization' },
  { id: 'eu-1', name: 'Rostec', aliases: ['Russian Technologies', 'Rostekh'], type: 'entity', source: 'EU', program: 'EU-RUSSIA', country: 'RU', remarks: 'Russian state defense conglomerate' },
  { id: 'un-1', name: 'Hezbollah', aliases: ['Hizballah', 'Party of God'], type: 'entity', source: 'UN', program: 'UN-1701', country: 'LB', remarks: 'Lebanese militant group' },
  { id: 'ofac-4', name: 'Fancy Bear', aliases: ['APT28', 'Sofacy', 'Sednit', 'GRU Unit 26165'], type: 'entity', source: 'OFAC', program: 'CYBER2', country: 'RU', remarks: 'Russian military intelligence cyber unit' },
  { id: 'ofac-5', name: 'Conti', aliases: ['Ryuk', 'Wizard Spider'], type: 'entity', source: 'OFAC', program: 'CYBER2', country: 'RU', remarks: 'Ransomware group' },
  { id: 'uk-1', name: 'Sandworm', aliases: ['Voodoo Bear', 'GRU Unit 74455', 'IRIDIUM'], type: 'entity', source: 'UK', program: 'UK-CYBER', country: 'RU', remarks: 'Russian military cyber destruction unit' },
  { id: 'ofac-6', name: 'Hamas', aliases: ['Harakat al-Muqawama al-Islamiyya'], type: 'entity', source: 'OFAC', program: 'SDGT', country: 'PS', remarks: 'Palestinian militant organization' },
  { id: 'ofac-7', name: 'Houthi Movement', aliases: ['Ansar Allah', 'Ansarullah'], type: 'entity', source: 'OFAC', program: 'YEMEN', country: 'YE', remarks: 'Yemeni armed movement' },
]

export class SanctionsService {
  async getSanctionsList(): Promise<SanctionEntity[]> {
    if (cachedEntities.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return cachedEntities
    }

    try {
      const fetched = await this.fetchOFACList()
      cachedEntities = [...KNOWN_SANCTIONS, ...fetched]
      lastFetch = Date.now()
      console.log(`[Sanctions] ${cachedEntities.length} entities loaded`)
    } catch {
      if (cachedEntities.length === 0) cachedEntities = [...KNOWN_SANCTIONS]
    }
    return cachedEntities
  }

  private async fetchOFACList(): Promise<SanctionEntity[]> {
    const entities: SanctionEntity[] = []
    try {
      const res = await fetch(OFAC_SDN_URL, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return entities

      const text = await res.text()
      const lines = text.split('\n').slice(0, 500)
      for (const line of lines) {
        const cols = line.split('","').map(c => c.replace(/"/g, '').trim())
        if (cols.length < 5) continue
        const name = cols[1]
        if (!name || name.length < 3) continue
        entities.push({
          id: `ofac-sdn-${cols[0]}`,
          name,
          aliases: [],
          type: cols[2]?.toLowerCase().includes('individual') ? 'individual' : 'entity',
          source: 'OFAC',
          program: cols[3] || 'SDN',
          country: cols[4]?.substring(0, 2) || undefined,
          remarks: cols[5] || undefined,
        })
      }
    } catch { /* fallback to known list */ }
    return entities
  }

  checkText(text: string): SanctionEntity[] {
    const lower = text.toLowerCase()
    const allEntities = cachedEntities.length > 0 ? cachedEntities : KNOWN_SANCTIONS
    return allEntities.filter(e => {
      if (lower.includes(e.name.toLowerCase())) return true
      return e.aliases.some(a => lower.includes(a.toLowerCase()))
    })
  }
}
