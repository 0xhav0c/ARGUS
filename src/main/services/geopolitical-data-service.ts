import type { MigrationRoute, EnergyFacility } from '../../shared/types'

const MIGRATION_ROUTES: MigrationRoute[] = [
  { id: 'mr-1', name: 'Central Mediterranean', waypoints: [[33.0,11.0],[35.0,12.5],[37.5,15.0]], estimatedFlow: '~150,000/year', origin: 'North Africa', destination: 'Italy', riskLevel: 'HIGH', description: 'Libya/Tunisia to Italy. Most dangerous migration route.' },
  { id: 'mr-2', name: 'Eastern Mediterranean', waypoints: [[37.0,27.0],[37.5,24.0],[38.0,23.7]], estimatedFlow: '~50,000/year', origin: 'Turkey', destination: 'Greece', riskLevel: 'MEDIUM', description: 'Turkey to Greek islands. EU-Turkey deal reduced flows.' },
  { id: 'mr-3', name: 'Western Balkans', waypoints: [[41.3,19.8],[42.4,21.0],[44.0,21.0],[45.5,19.0],[46.0,16.0]], estimatedFlow: '~90,000/year', origin: 'Turkey/Greece', destination: 'Central Europe', riskLevel: 'MEDIUM', description: 'Overland route through Balkans toward Western Europe.' },
  { id: 'mr-4', name: 'US-Mexico Border', waypoints: [[16.0,-92.0],[20.0,-100.0],[26.0,-100.0],[32.0,-110.0]], estimatedFlow: '~2,000,000/year', origin: 'Central America', destination: 'United States', riskLevel: 'HIGH', description: 'Largest migration corridor globally. Record encounters.' },
  { id: 'mr-5', name: 'Darién Gap', waypoints: [[7.5,-77.5],[8.5,-77.0],[9.0,-79.5]], estimatedFlow: '~500,000/year', origin: 'South America', destination: 'Central America', riskLevel: 'HIGH', description: 'Dangerous jungle crossing from Colombia to Panama.' },
  { id: 'mr-6', name: 'English Channel', waypoints: [[50.9,1.8],[51.0,1.4],[51.1,1.2]], estimatedFlow: '~45,000/year', origin: 'France', destination: 'United Kingdom', riskLevel: 'HIGH', description: 'Small boat crossings despite prevention efforts.' },
  { id: 'mr-7', name: 'Horn of Africa', waypoints: [[10.0,43.0],[12.0,45.0],[14.0,49.0]], estimatedFlow: '~100,000/year', origin: 'Ethiopia/Somalia', destination: 'Yemen/Gulf', riskLevel: 'HIGH', description: 'Across Gulf of Aden, often forced into conflict zones.' },
]

const ENERGY_FACILITIES: EnergyFacility[] = [
  { id: 'ef-1', name: 'Kashiwazaki-Kariwa NPP', type: 'nuclear', latitude: 37.43, longitude: 138.6, country: 'Japan', capacity: '7,965 MW', status: 'maintenance' },
  { id: 'ef-2', name: 'Bruce Nuclear Station', type: 'nuclear', latitude: 44.33, longitude: -81.6, country: 'Canada', capacity: '6,384 MW', status: 'operational' },
  { id: 'ef-3', name: 'Ghawar Oil Field', type: 'refinery', latitude: 25.4, longitude: 49.6, country: 'Saudi Arabia', capacity: '3.8M bbl/day', status: 'operational' },
  { id: 'ef-4', name: 'Ras Tanura Refinery', type: 'refinery', latitude: 26.6, longitude: 50.2, country: 'Saudi Arabia', capacity: '550K bbl/day', status: 'operational' },
  { id: 'ef-5', name: 'Kharg Island Terminal', type: 'lng_terminal', latitude: 29.2, longitude: 50.3, country: 'Iran', capacity: '5M bbl/day', status: 'operational' },
  { id: 'ef-6', name: 'Three Gorges Dam', type: 'hydro', latitude: 30.82, longitude: 111.0, country: 'China', capacity: '22,500 MW', status: 'operational' },
  { id: 'ef-7', name: 'Bhadla Solar Park', type: 'solar', latitude: 27.5, longitude: 72.0, country: 'India', capacity: '2,245 MW', status: 'operational' },
  { id: 'ef-8', name: 'Hornsea Wind Farm', type: 'wind', latitude: 53.9, longitude: 1.8, country: 'UK', capacity: '2,852 MW', status: 'operational' },
  { id: 'ef-9', name: 'Sabine Pass LNG', type: 'lng_terminal', latitude: 29.7, longitude: -93.9, country: 'US', capacity: '30 MTPA', status: 'operational' },
  { id: 'ef-10', name: 'Nord Stream Hub (Lubmin)', type: 'lng_terminal', latitude: 54.1, longitude: 13.7, country: 'Germany', capacity: 'Destroyed', status: 'offline' },
]

export class GeopoliticalDataService {
  getMigrationRoutes(): MigrationRoute[] { return MIGRATION_ROUTES }
  getEnergyFacilities(): EnergyFacility[] { return ENERGY_FACILITIES }
}
