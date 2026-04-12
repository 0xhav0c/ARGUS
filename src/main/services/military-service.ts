import type { MilitaryActivity } from '../../shared/types'

const ACTIVITIES: MilitaryActivity[] = [
  { id: 'mil-1', type: 'exercise', title: 'NATO Steadfast Defender 2024+', latitude: 54.0, longitude: 18.0, country: 'Multi-NATO', forces: ['US', 'UK', 'Germany', 'France', 'Poland'], detectedAt: new Date().toISOString(), description: 'Largest NATO exercise since Cold War. 90,000 troops across Europe.', source: 'NATO' },
  { id: 'mil-2', type: 'patrol', title: 'Russian Northern Fleet Arctic Patrol', latitude: 72.0, longitude: 40.0, country: 'Russia', forces: ['Russian Navy'], detectedAt: new Date().toISOString(), description: 'Northern Fleet patrol in Barents Sea with nuclear submarines.', source: 'OSINT' },
  { id: 'mil-3', type: 'buildup', title: 'PLA Exercises Near Taiwan Strait', latitude: 24.5, longitude: 119.0, country: 'China', forces: ['PLA Navy', 'PLA Air Force', 'PLA Rocket Force'], detectedAt: new Date().toISOString(), description: 'Increased PLA activity in Taiwan Strait. Multiple carrier groups deployed.', source: 'DoD' },
  { id: 'mil-4', type: 'deployment', title: 'US Carrier Strike Group - Arabian Sea', latitude: 23.0, longitude: 60.0, country: 'US', forces: ['USS Eisenhower CSG'], detectedAt: new Date().toISOString(), description: 'US carrier group positioned in response to Houthi attacks on shipping.', source: 'CENTCOM' },
  { id: 'mil-5', type: 'airspace_closure', title: 'Ukraine Eastern Airspace - NOTAM', latitude: 49.0, longitude: 36.0, country: 'Ukraine', forces: ['Ukrainian Air Force'], detectedAt: new Date().toISOString(), description: 'Airspace restricted due to active combat operations in eastern Ukraine.', source: 'EUROCONTROL' },
  { id: 'mil-6', type: 'exercise', title: 'India-US Yudh Abhyas Exercise', latitude: 32.0, longitude: 77.0, country: 'India', forces: ['Indian Army', 'US Army'], detectedAt: new Date(Date.now() - 86400000).toISOString(), description: 'Joint military exercise focusing on high-altitude warfare.', source: 'MoD India' },
  { id: 'mil-7', type: 'patrol', title: 'Russian Strategic Bombers - Alaska ADIZ', latitude: 60.0, longitude: -175.0, country: 'Russia', forces: ['Russian Air Force'], detectedAt: new Date(Date.now() - 172800000).toISOString(), description: 'Tu-95 Bear bombers intercepted near Alaska ADIZ by NORAD F-22s.', source: 'NORAD' },
  { id: 'mil-8', type: 'buildup', title: 'Iran IRGC Naval Buildup - Hormuz', latitude: 26.5, longitude: 56.5, country: 'Iran', forces: ['IRGC Navy'], detectedAt: new Date().toISOString(), description: 'Fast attack craft and drone boat deployments near Strait of Hormuz.', source: 'CENTCOM' },
]

export class MilitaryService {
  async getActivities(): Promise<MilitaryActivity[]> {
    return ACTIVITIES.map(a => ({ ...a, detectedAt: new Date(Date.now() - Math.random() * 172800000).toISOString() }))
  }
}
