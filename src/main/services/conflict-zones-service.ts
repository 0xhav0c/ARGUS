import type { ConflictZone, TradeRoute } from '../../shared/types'

const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: 'cz-ukraine', name: 'Ukraine-Russia Conflict',
    type: 'active_combat',
    polygon: [[52.3,30.0],[52.3,40.2],[47.0,40.2],[47.0,38.0],[44.4,36.0],[44.4,33.5],[46.0,30.0]],
    color: '#ff3b5c',
    parties: ['Ukraine', 'Russia'],
    startDate: '2022-02-24',
    casualties: 500000,
    description: 'Full-scale war between Russia and Ukraine across eastern and southern Ukraine.',
  },
  {
    id: 'cz-gaza', name: 'Gaza Conflict',
    type: 'active_combat',
    polygon: [[31.6,34.2],[31.6,34.6],[31.2,34.6],[31.2,34.2]],
    color: '#ff3b5c',
    parties: ['Israel', 'Hamas'],
    startDate: '2023-10-07',
    description: 'Armed conflict in Gaza Strip following October 7 attacks.',
  },
  {
    id: 'cz-sudan', name: 'Sudan Civil War',
    type: 'active_combat',
    polygon: [[22.0,22.0],[22.0,38.5],[10.0,38.5],[10.0,22.0]],
    color: '#ff6b35',
    parties: ['SAF', 'RSF'],
    startDate: '2023-04-15',
    description: 'Civil war between Sudanese Armed Forces and Rapid Support Forces.',
  },
  {
    id: 'cz-myanmar', name: 'Myanmar Civil War',
    type: 'active_combat',
    polygon: [[28.5,92.0],[28.5,101.0],[10.0,101.0],[10.0,92.0]],
    color: '#ff6b35',
    parties: ['Military Junta', 'NUG', 'Ethnic Armed Groups'],
    startDate: '2021-02-01',
    description: 'Multi-front civil war following 2021 military coup.',
  },
  {
    id: 'cz-sahel', name: 'Sahel Insurgency',
    type: 'insurgency',
    polygon: [[25.0,-5.0],[25.0,15.0],[12.0,15.0],[12.0,-5.0]],
    color: '#f5c542',
    parties: ['JNIM', 'ISGS', 'National Armies'],
    startDate: '2012-01-01',
    description: 'Jihadist insurgency across Mali, Burkina Faso, and Niger.',
  },
  {
    id: 'cz-ethiopia', name: 'Ethiopia - Regional Tensions',
    type: 'tension',
    polygon: [[15.0,33.0],[15.0,48.0],[3.4,48.0],[3.4,33.0]],
    color: '#f5c542',
    parties: ['Federal Government', 'Regional Forces'],
    startDate: '2020-11-04',
    description: 'Post-Tigray war regional tensions and Amhara/Oromia conflicts.',
  },
  {
    id: 'cz-taiwan', name: 'Taiwan Strait Tension',
    type: 'tension',
    polygon: [[26.5,119.0],[26.5,122.5],[22.0,122.5],[22.0,119.0]],
    color: '#f5c542',
    parties: ['China', 'Taiwan'],
    startDate: '1949-01-01',
    description: 'Ongoing cross-strait military tensions with increasing PLA activity.',
  },
  {
    id: 'cz-drc', name: 'Eastern DRC Conflict',
    type: 'active_combat',
    polygon: [[-1.0,27.0],[-1.0,31.0],[-5.0,31.0],[-5.0,27.0]],
    color: '#ff6b35',
    parties: ['M23', 'FARDC', 'FDLR'],
    startDate: '2022-03-01',
    description: 'M23 rebellion in eastern DRC with regional involvement.',
  },
  {
    id: 'cz-korea', name: 'Korean DMZ',
    type: 'tension',
    polygon: [[38.4,124.5],[38.4,129.5],[37.6,129.5],[37.6,124.5]],
    color: '#f5c542',
    parties: ['North Korea', 'South Korea'],
    startDate: '1953-07-27',
    description: 'Heavily militarized border zone with periodic escalations.',
  },
]

const TRADE_ROUTES: TradeRoute[] = [
  {
    id: 'tr-suez', name: 'Suez Canal',
    type: 'maritime', commodity: 'Oil, LNG, Container',
    waypoints: [[31.3,32.3],[30.5,32.3],[29.9,32.5]],
    riskLevel: 'HIGH', chokepoint: true,
    dailyVolume: '12% of global trade',
    description: 'Critical chokepoint connecting Mediterranean and Red Sea. Houthi attacks disrupting traffic.',
  },
  {
    id: 'tr-hormuz', name: 'Strait of Hormuz',
    type: 'maritime', commodity: 'Crude Oil, LNG',
    waypoints: [[26.6,56.2],[26.2,56.5],[25.8,56.8]],
    riskLevel: 'HIGH', chokepoint: true,
    dailyVolume: '21M barrels/day oil',
    description: 'World\'s most important oil chokepoint between Iran and Oman.',
  },
  {
    id: 'tr-malacca', name: 'Strait of Malacca',
    type: 'maritime', commodity: 'Oil, Container',
    waypoints: [[4.2,100.0],[2.5,102.0],[1.3,103.8]],
    riskLevel: 'MEDIUM', chokepoint: true,
    dailyVolume: '16M barrels/day oil',
    description: 'Key shipping lane between Indian Ocean and Pacific. Piracy risk.',
  },
  {
    id: 'tr-bab', name: 'Bab el-Mandeb',
    type: 'maritime', commodity: 'Oil, LNG, Container',
    waypoints: [[12.6,43.3],[12.4,43.5],[12.2,43.8]],
    riskLevel: 'CRITICAL', chokepoint: true,
    dailyVolume: '6.2M barrels/day oil',
    description: 'Under active Houthi threat. Many vessels rerouting via Cape of Good Hope.',
  },
  {
    id: 'tr-bosphorus', name: 'Turkish Straits',
    type: 'maritime', commodity: 'Oil, Grain',
    waypoints: [[41.2,29.0],[41.1,29.05],[41.0,29.0]],
    riskLevel: 'MEDIUM', chokepoint: true,
    dailyVolume: '3M barrels/day oil',
    description: 'Bosphorus and Dardanelles connecting Black Sea to Mediterranean.',
  },
  {
    id: 'tr-nord', name: 'Northern Sea Route',
    type: 'maritime', commodity: 'LNG, Cargo',
    waypoints: [[68.0,33.0],[72.0,55.0],[73.0,80.0],[72.0,110.0],[70.0,140.0],[65.0,170.0]],
    riskLevel: 'LOW',
    description: 'Arctic shipping route with increasing Russian military presence.',
  },
  {
    id: 'tr-druzhba', name: 'Druzhba Pipeline',
    type: 'pipeline', commodity: 'Crude Oil',
    waypoints: [[54.0,53.0],[53.0,46.0],[52.0,38.0],[52.5,30.0],[51.0,24.0],[50.0,19.0]],
    riskLevel: 'HIGH',
    dailyVolume: '1M barrels/day',
    description: 'World\'s longest pipeline network. Russia-Europe crude oil supply under sanctions pressure.',
  },
  {
    id: 'tr-turkstream', name: 'TurkStream Pipeline',
    type: 'pipeline', commodity: 'Natural Gas',
    waypoints: [[44.6,37.8],[43.0,35.0],[41.5,32.0],[41.2,29.0]],
    riskLevel: 'MEDIUM',
    description: 'Russia-Turkey gas pipeline under Black Sea.',
  },
  {
    id: 'tr-cape', name: 'Cape of Good Hope Route',
    type: 'maritime', commodity: 'Container, Oil',
    waypoints: [[30.0,32.5],[20.0,38.0],[5.0,42.0],[-10.0,40.0],[-25.0,35.0],[-34.4,18.5]],
    riskLevel: 'LOW',
    description: 'Alternative route avoiding Suez/Red Sea. Longer but safer amid Houthi threats.',
  },
  {
    id: 'tr-belt', name: 'China Belt & Road (Maritime)',
    type: 'maritime', commodity: 'Container, Manufactured Goods',
    waypoints: [[31.2,121.5],[22.3,114.2],[10.0,107.0],[1.3,103.8],[-6.1,106.8],[5.0,80.0],[12.0,45.0],[30.0,32.5],[37.0,15.0],[40.0,0.0]],
    riskLevel: 'MEDIUM',
    description: 'China\'s maritime silk road connecting Asia to Europe via key ports.',
  },
]

export class ConflictZonesService {
  getConflictZones(): ConflictZone[] {
    return CONFLICT_ZONES
  }

  getTradeRoutes(): TradeRoute[] {
    return TRADE_ROUTES
  }
}
