import type { NuclearEvent } from '../../shared/types'

// Known nuclear facilities as static reference data — clearly marked, not pretending to be live events
const REFERENCE_FACILITIES: NuclearEvent[] = [
  { id: 'nf-zaporizhzhia', type: 'facility', title: 'Zaporizhzhia NPP — IAEA monitoring', latitude: 47.51, longitude: 34.59, country: 'Ukraine', detectedAt: '2022-03-04T00:00:00Z', description: 'Europe\'s largest nuclear plant under Russian occupation. IAEA monitoring ongoing.', source: 'IAEA (reference)' },
  { id: 'nf-bushehr', type: 'facility', title: 'Bushehr Nuclear Plant', latitude: 28.83, longitude: 50.88, country: 'Iran', detectedAt: '2011-09-01T00:00:00Z', description: 'Iran\'s only operational nuclear power plant. 1000 MW capacity.', source: 'IAEA (reference)' },
  { id: 'nf-yongbyon', type: 'facility', title: 'Yongbyon Nuclear Complex', latitude: 39.8, longitude: 125.75, country: 'North Korea', detectedAt: '1986-01-01T00:00:00Z', description: 'DPRK primary nuclear weapons facility. Reactor and reprocessing plant.', source: 'OSINT (reference)' },
  { id: 'nf-natanz', type: 'facility', title: 'Natanz Enrichment Facility', latitude: 33.72, longitude: 51.73, country: 'Iran', detectedAt: '2002-08-01T00:00:00Z', description: 'Underground uranium enrichment facility.', source: 'IAEA (reference)' },
  { id: 'nf-dimona', type: 'facility', title: 'Dimona Nuclear Research Center', latitude: 31.0, longitude: 35.14, country: 'Israel', detectedAt: '1958-01-01T00:00:00Z', description: 'Undeclared nuclear research facility. Heavy water reactor.', source: 'OSINT (reference)' },
  { id: 'nf-lop-nur', type: 'facility', title: 'Lop Nur Test Site', latitude: 41.5, longitude: 88.5, country: 'China', detectedAt: '1964-10-16T00:00:00Z', description: 'Former nuclear test site, now CTBTO monitoring station.', source: 'CTBTO (reference)' },
]

export class NuclearService {
  async getEvents(): Promise<NuclearEvent[]> {
    // Return only reference facility data — clearly dated, no fake "live" missile events
    // TODO: Integrate real sources (IAEA RSS, CTBTO seismic alerts, NTI API)
    return REFERENCE_FACILITIES
  }
}
// Removed: MISSILE_EVENTS — 3 hardcoded fake missile events (DPRK ICBM, Iran Fattah-2,
// Russia Sarmat) with new Date().toISOString() timestamps that pretended to be live intelligence.
