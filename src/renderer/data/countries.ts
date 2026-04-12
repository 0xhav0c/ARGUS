import type { CountryProfile } from '../../shared/types'

export const COUNTRIES: CountryProfile[] = [
  { code: 'TR', name: 'Türkiye', capital: 'Ankara', population: 85_280_000, area: 783_562, continent: 'Asia', latitude: 39.9, longitude: 32.9, riskLevel: 'MEDIUM', flags: ['NATO', 'G20'] },
  { code: 'US', name: 'United States', capital: 'Washington D.C.', population: 331_900_000, area: 9_833_520, continent: 'North America', latitude: 38.9, longitude: -77.0, riskLevel: 'MEDIUM', flags: ['NATO', 'G7', 'G20', 'UNSC-P5'] },
  { code: 'RU', name: 'Russia', capital: 'Moscow', population: 144_100_000, area: 17_098_242, continent: 'Europe', latitude: 55.8, longitude: 37.6, riskLevel: 'HIGH', flags: ['UNSC-P5', 'G20', 'BRICS'] },
  { code: 'CN', name: 'China', capital: 'Beijing', population: 1_412_000_000, area: 9_596_960, continent: 'Asia', latitude: 39.9, longitude: 116.4, riskLevel: 'MEDIUM', flags: ['UNSC-P5', 'G20', 'BRICS'] },
  { code: 'GB', name: 'United Kingdom', capital: 'London', population: 67_330_000, area: 243_610, continent: 'Europe', latitude: 51.5, longitude: -0.1, riskLevel: 'LOW', flags: ['NATO', 'G7', 'G20', 'UNSC-P5'] },
  { code: 'FR', name: 'France', capital: 'Paris', population: 67_750_000, area: 640_679, continent: 'Europe', latitude: 48.9, longitude: 2.3, riskLevel: 'LOW', flags: ['NATO', 'G7', 'G20', 'UNSC-P5', 'EU'] },
  { code: 'DE', name: 'Germany', capital: 'Berlin', population: 83_240_000, area: 357_022, continent: 'Europe', latitude: 52.5, longitude: 13.4, riskLevel: 'LOW', flags: ['NATO', 'G7', 'G20', 'EU'] },
  { code: 'UA', name: 'Ukraine', capital: 'Kyiv', population: 43_790_000, area: 603_500, continent: 'Europe', latitude: 50.4, longitude: 30.5, riskLevel: 'CRITICAL', flags: ['Active Conflict'] },
  { code: 'IL', name: 'Israel', capital: 'Jerusalem', population: 9_364_000, area: 22_072, continent: 'Asia', latitude: 31.8, longitude: 35.2, riskLevel: 'CRITICAL', flags: ['Active Conflict'] },
  { code: 'PS', name: 'Palestine', capital: 'Ramallah', population: 5_380_000, area: 6_020, continent: 'Asia', latitude: 31.9, longitude: 35.2, riskLevel: 'CRITICAL', flags: ['Active Conflict'] },
  { code: 'IR', name: 'Iran', capital: 'Tehran', population: 86_760_000, area: 1_648_195, continent: 'Asia', latitude: 35.7, longitude: 51.4, riskLevel: 'HIGH', flags: ['Sanctioned', 'Nuclear Program'] },
  { code: 'KP', name: 'North Korea', capital: 'Pyongyang', population: 25_970_000, area: 120_538, continent: 'Asia', latitude: 39.0, longitude: 125.8, riskLevel: 'HIGH', flags: ['Sanctioned', 'Nuclear Program'] },
  { code: 'SY', name: 'Syria', capital: 'Damascus', population: 21_320_000, area: 185_180, continent: 'Asia', latitude: 33.5, longitude: 36.3, riskLevel: 'CRITICAL', flags: ['Active Conflict', 'Sanctioned'] },
  { code: 'IQ', name: 'Iraq', capital: 'Baghdad', population: 41_190_000, area: 438_317, continent: 'Asia', latitude: 33.3, longitude: 44.4, riskLevel: 'HIGH', flags: ['Post-Conflict'] },
  { code: 'AF', name: 'Afghanistan', capital: 'Kabul', population: 40_100_000, area: 652_230, continent: 'Asia', latitude: 34.5, longitude: 69.2, riskLevel: 'CRITICAL', flags: ['Sanctioned'] },
  { code: 'IN', name: 'India', capital: 'New Delhi', population: 1_417_000_000, area: 3_287_263, continent: 'Asia', latitude: 28.6, longitude: 77.2, riskLevel: 'MEDIUM', flags: ['G20', 'BRICS', 'Nuclear'] },
  { code: 'PK', name: 'Pakistan', capital: 'Islamabad', population: 231_400_000, area: 881_913, continent: 'Asia', latitude: 33.7, longitude: 73.0, riskLevel: 'HIGH', flags: ['Nuclear'] },
  { code: 'SA', name: 'Saudi Arabia', capital: 'Riyadh', population: 36_410_000, area: 2_149_690, continent: 'Asia', latitude: 24.7, longitude: 46.7, riskLevel: 'MEDIUM', flags: ['G20', 'OPEC'] },
  { code: 'JP', name: 'Japan', capital: 'Tokyo', population: 125_700_000, area: 377_975, continent: 'Asia', latitude: 35.7, longitude: 139.7, riskLevel: 'LOW', flags: ['G7', 'G20'] },
  { code: 'KR', name: 'South Korea', capital: 'Seoul', population: 51_740_000, area: 100_210, continent: 'Asia', latitude: 37.6, longitude: 127.0, riskLevel: 'MEDIUM', flags: ['G20'] },
  { code: 'BR', name: 'Brazil', capital: 'Brasilia', population: 214_300_000, area: 8_515_767, continent: 'South America', latitude: -15.8, longitude: -47.9, riskLevel: 'MEDIUM', flags: ['G20', 'BRICS'] },
  { code: 'AU', name: 'Australia', capital: 'Canberra', population: 26_000_000, area: 7_692_024, continent: 'Oceania', latitude: -35.3, longitude: 149.1, riskLevel: 'LOW', flags: ['G20', 'AUKUS'] },
  { code: 'TW', name: 'Taiwan', capital: 'Taipei', population: 23_570_000, area: 36_193, continent: 'Asia', latitude: 25.0, longitude: 121.5, riskLevel: 'HIGH', flags: ['Disputed Territory'] },
  { code: 'NG', name: 'Nigeria', capital: 'Abuja', population: 218_500_000, area: 923_768, continent: 'Africa', latitude: 9.1, longitude: 7.5, riskLevel: 'HIGH', flags: ['Insurgency'] },
  { code: 'ET', name: 'Ethiopia', capital: 'Addis Ababa', population: 120_300_000, area: 1_104_300, continent: 'Africa', latitude: 9.0, longitude: 38.7, riskLevel: 'HIGH', flags: ['Civil Conflict'] },
  { code: 'SD', name: 'Sudan', capital: 'Khartoum', population: 46_870_000, area: 1_861_484, continent: 'Africa', latitude: 15.6, longitude: 32.5, riskLevel: 'CRITICAL', flags: ['Active Conflict'] },
  { code: 'MM', name: 'Myanmar', capital: 'Naypyidaw', population: 54_410_000, area: 676_578, continent: 'Asia', latitude: 19.8, longitude: 96.2, riskLevel: 'CRITICAL', flags: ['Civil War', 'Sanctioned'] },
  { code: 'VE', name: 'Venezuela', capital: 'Caracas', population: 28_440_000, area: 916_445, continent: 'South America', latitude: 10.5, longitude: -66.9, riskLevel: 'HIGH', flags: ['Sanctioned'] },
  { code: 'YE', name: 'Yemen', capital: "Sana'a", population: 33_700_000, area: 527_968, continent: 'Asia', latitude: 15.4, longitude: 44.2, riskLevel: 'CRITICAL', flags: ['Active Conflict'] },
  { code: 'LY', name: 'Libya', capital: 'Tripoli', population: 6_870_000, area: 1_759_540, continent: 'Africa', latitude: 32.9, longitude: 13.2, riskLevel: 'HIGH', flags: ['Post-Conflict'] },
  { code: 'SO', name: 'Somalia', capital: 'Mogadishu', population: 17_070_000, area: 637_657, continent: 'Africa', latitude: 2.0, longitude: 45.3, riskLevel: 'CRITICAL', flags: ['Active Conflict', 'Insurgency'] },
  { code: 'MX', name: 'Mexico', capital: 'Mexico City', population: 128_900_000, area: 1_964_375, continent: 'North America', latitude: 19.4, longitude: -99.1, riskLevel: 'MEDIUM', flags: ['G20'] },
  { code: 'EG', name: 'Egypt', capital: 'Cairo', population: 104_300_000, area: 1_001_450, continent: 'Africa', latitude: 30.0, longitude: 31.2, riskLevel: 'MEDIUM', flags: [] },
  { code: 'PL', name: 'Poland', capital: 'Warsaw', population: 37_750_000, area: 312_696, continent: 'Europe', latitude: 52.2, longitude: 21.0, riskLevel: 'LOW', flags: ['NATO', 'EU'] },
  { code: 'IT', name: 'Italy', capital: 'Rome', population: 59_110_000, area: 301_340, continent: 'Europe', latitude: 41.9, longitude: 12.5, riskLevel: 'LOW', flags: ['NATO', 'G7', 'G20', 'EU'] },
  { code: 'ES', name: 'Spain', capital: 'Madrid', population: 47_420_000, area: 505_990, continent: 'Europe', latitude: 40.4, longitude: -3.7, riskLevel: 'LOW', flags: ['NATO', 'EU'] },
  { code: 'CA', name: 'Canada', capital: 'Ottawa', population: 38_930_000, area: 9_984_670, continent: 'North America', latitude: 45.4, longitude: -75.7, riskLevel: 'LOW', flags: ['NATO', 'G7', 'G20'] },
  { code: 'ZA', name: 'South Africa', capital: 'Pretoria', population: 60_600_000, area: 1_219_090, continent: 'Africa', latitude: -25.7, longitude: 28.2, riskLevel: 'MEDIUM', flags: ['G20', 'BRICS'] },
  { code: 'CD', name: 'DR Congo', capital: 'Kinshasa', population: 99_010_000, area: 2_344_858, continent: 'Africa', latitude: -4.3, longitude: 15.3, riskLevel: 'HIGH', flags: ['Active Conflict'] },
  { code: 'LB', name: 'Lebanon', capital: 'Beirut', population: 5_490_000, area: 10_452, continent: 'Asia', latitude: 33.9, longitude: 35.5, riskLevel: 'HIGH', flags: ['Economic Crisis'] },
]

// Approximate bounding boxes for countries (minLat, maxLat, minLng, maxLng)
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  TR: [36, 42, 26, 45],
  US: [24, 50, -125, -66],
  RU: [41, 82, 19, 180],
  CN: [18, 54, 73, 135],
  GB: [49, 61, -9, 2],
  FR: [42, 51, -5, 10],
  DE: [47, 55, 6, 15],
  UA: [44, 52, 22, 40],
  IL: [29, 33.5, 34, 36],
  PS: [31, 32.5, 34, 35.5],
  IR: [25, 40, 44, 63],
  KP: [37.5, 43, 124, 131],
  SY: [32, 37.5, 35.5, 42.5],
  IQ: [29, 37.5, 38.5, 48.5],
  AF: [29, 38.5, 60, 75],
  IN: [6, 36, 68, 98],
  PK: [23, 37, 61, 77],
  SA: [16, 32, 34, 56],
  JP: [24, 46, 123, 146],
  KR: [33, 39, 124, 132],
  BR: [-34, 5, -74, -35],
  AU: [-44, -10, 113, 154],
  TW: [21, 26, 119, 122],
  NG: [4, 14, 2.5, 15],
  ET: [3, 15, 33, 48],
  SD: [8, 22, 22, 39],
  MM: [9.5, 28.5, 92, 101],
  VE: [0.5, 12.5, -73, -60],
  YE: [12, 19, 42, 54],
  LY: [19, 33, 9, 25],
  SO: [-2, 12, 41, 51],
  MX: [14, 33, -118, -86],
  EG: [22, 32, 25, 37],
  PL: [49, 55, 14, 24],
  IT: [36, 47, 6.5, 18.5],
  ES: [36, 44, -9.5, 4.5],
  CA: [41, 84, -141, -52],
  ZA: [-35, -22, 16, 33],
  CD: [-14, 5.5, 12, 31],
  LB: [33, 34.7, 35, 36.6],
}

export function findCountryByCoords(lat: number, lng: number): CountryProfile | null {
  // First try bounding box match (more accurate)
  for (const c of COUNTRIES) {
    const bounds = COUNTRY_BOUNDS[c.code]
    if (bounds) {
      const [minLat, maxLat, minLng, maxLng] = bounds
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
        return c
      }
    }
  }

  // Fallback: nearest capital (for countries without bounds)
  let closest: CountryProfile | null = null
  let minDist = Infinity
  for (const c of COUNTRIES) {
    if (COUNTRY_BOUNDS[c.code]) continue
    const dlat = c.latitude - lat
    const dlng = c.longitude - lng
    const dist = dlat * dlat + dlng * dlng
    if (dist < minDist) {
      minDist = dist
      closest = c
    }
  }
  return minDist < 100 ? closest : null
}

export function findCountryByName(name: string): CountryProfile | null {
  const lower = name.toLowerCase()
  return COUNTRIES.find(c =>
    c.name.toLowerCase() === lower ||
    c.code.toLowerCase() === lower
  ) || null
}
