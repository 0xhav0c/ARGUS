import type { NuclearEvent } from '../../shared/types'

const NUCLEAR_FACILITIES: NuclearEvent[] = [
  { id: 'nf-zaporizhzhia', type: 'facility', title: 'Zaporizhzhia NPP - Occupied, safety concerns', latitude: 47.51, longitude: 34.59, country: 'Ukraine', detectedAt: new Date().toISOString(), description: 'Europe\'s largest nuclear plant under Russian occupation. IAEA monitoring.', source: 'IAEA' },
  { id: 'nf-bushehr', type: 'facility', title: 'Bushehr Nuclear Plant', latitude: 28.83, longitude: 50.88, country: 'Iran', detectedAt: new Date().toISOString(), description: 'Iran\'s only operational nuclear power plant. 1000 MW capacity.', source: 'IAEA' },
  { id: 'nf-yongbyon', type: 'facility', title: 'Yongbyon Nuclear Complex', latitude: 39.8, longitude: 125.75, country: 'North Korea', detectedAt: new Date().toISOString(), description: 'DPRK primary nuclear weapons facility. Reactor and reprocessing plant.', source: 'OSINT' },
  { id: 'nf-natanz', type: 'facility', title: 'Natanz Enrichment Facility', latitude: 33.72, longitude: 51.73, country: 'Iran', detectedAt: new Date().toISOString(), description: 'Underground uranium enrichment facility. Enriching to 60%.', source: 'IAEA' },
  { id: 'nf-dimona', type: 'facility', title: 'Dimona Nuclear Research Center', latitude: 31.0, longitude: 35.14, country: 'Israel', detectedAt: new Date().toISOString(), description: 'Undeclared nuclear weapons facility. Heavy water reactor.', source: 'OSINT' },
  { id: 'nf-lop-nur', type: 'facility', title: 'Lop Nur Test Site', latitude: 41.5, longitude: 88.5, country: 'China', detectedAt: new Date().toISOString(), description: 'Former nuclear test site, now monitoring station.', source: 'CTBTO' },
]

const MISSILE_EVENTS: NuclearEvent[] = [
  { id: 'nm-dprk-icbm', type: 'missile', title: 'DPRK Hwasong-18 ICBM Development', latitude: 39.04, longitude: 125.75, country: 'North Korea', detectedAt: new Date(Date.now() - 864e5).toISOString(), description: 'North Korea continues solid-fuel ICBM development. Range: 15,000+ km.', source: 'DIA', yield: 'N/A' },
  { id: 'nm-iran-bm', type: 'missile', title: 'Iran Fattah-2 Hypersonic Missile', latitude: 35.7, longitude: 51.4, country: 'Iran', detectedAt: new Date(Date.now() - 172800000).toISOString(), description: 'Iran developing hypersonic missile capability with maneuverable warhead.', source: 'OSINT' },
  { id: 'nm-russia-sarmat', type: 'missile', title: 'Russia RS-28 Sarmat ICBM Deployment', latitude: 51.7, longitude: 36.2, country: 'Russia', detectedAt: new Date(Date.now() - 604800000).toISOString(), description: 'Sarmat heavy ICBM deployed at Uzhur silo fields. 10+ MIRV warheads.', source: 'DIA', yield: '50 MT total' },
]

export class NuclearService {
  async getEvents(): Promise<NuclearEvent[]> {
    return [...NUCLEAR_FACILITIES, ...MISSILE_EVENTS]
  }
}
