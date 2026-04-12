/**
 * Centralized geo-resolver: extracts geographic coordinates from text content.
 * Used by all feed providers to consistently and accurately assign incident locations.
 *
 * Strategy:
 * 1. Match against comprehensive location database (countries, regions, cities)
 * 2. Apply minimal jitter to prevent marker overlap
 * 3. If no match found, return null (incident gets filtered or shown without location)
 */

interface GeoLocation {
  lat: number
  lng: number
  name: string
  type: 'country' | 'city' | 'region' | 'org'
}

const LOCATIONS: Record<string, GeoLocation> = {
  // --- Countries ---
  'turkey': { lat: 39.93, lng: 32.86, name: 'Türkiye', type: 'country' },
  'türkiye': { lat: 39.93, lng: 32.86, name: 'Türkiye', type: 'country' },
  'turkiye': { lat: 39.93, lng: 32.86, name: 'Türkiye', type: 'country' },
  'turkish': { lat: 39.93, lng: 32.86, name: 'Türkiye', type: 'country' },
  'ukraine': { lat: 48.38, lng: 31.17, name: 'Ukraine', type: 'country' },
  'ukrainian': { lat: 48.38, lng: 31.17, name: 'Ukraine', type: 'country' },
  'russia': { lat: 55.75, lng: 37.62, name: 'Russia', type: 'country' },
  'russian': { lat: 55.75, lng: 37.62, name: 'Russia', type: 'country' },
  'china': { lat: 39.9, lng: 116.4, name: 'China', type: 'country' },
  'chinese': { lat: 39.9, lng: 116.4, name: 'China', type: 'country' },
  'united states': { lat: 38.9, lng: -77.04, name: 'United States', type: 'country' },
  'american': { lat: 38.9, lng: -77.04, name: 'United States', type: 'country' },
  'u.s.': { lat: 38.9, lng: -77.04, name: 'United States', type: 'country' },
  'iran': { lat: 35.69, lng: 51.39, name: 'Iran', type: 'country' },
  'iranian': { lat: 35.69, lng: 51.39, name: 'Iran', type: 'country' },
  'israel': { lat: 31.77, lng: 35.22, name: 'Israel', type: 'country' },
  'israeli': { lat: 31.77, lng: 35.22, name: 'Israel', type: 'country' },
  'palestine': { lat: 31.9, lng: 35.2, name: 'Palestine', type: 'country' },
  'palestinian': { lat: 31.9, lng: 35.2, name: 'Palestine', type: 'country' },
  'syria': { lat: 35.0, lng: 38.0, name: 'Syria', type: 'country' },
  'syrian': { lat: 35.0, lng: 38.0, name: 'Syria', type: 'country' },
  'iraq': { lat: 33.31, lng: 44.37, name: 'Iraq', type: 'country' },
  'iraqi': { lat: 33.31, lng: 44.37, name: 'Iraq', type: 'country' },
  'yemen': { lat: 15.55, lng: 48.52, name: 'Yemen', type: 'country' },
  'yemeni': { lat: 15.55, lng: 48.52, name: 'Yemen', type: 'country' },
  'houthi': { lat: 15.35, lng: 44.21, name: 'Yemen', type: 'region' },
  'sudan': { lat: 15.59, lng: 32.53, name: 'Sudan', type: 'country' },
  'sudanese': { lat: 15.59, lng: 32.53, name: 'Sudan', type: 'country' },
  'myanmar': { lat: 19.76, lng: 96.07, name: 'Myanmar', type: 'country' },
  'somalia': { lat: 2.05, lng: 45.32, name: 'Somalia', type: 'country' },
  'somali': { lat: 2.05, lng: 45.32, name: 'Somalia', type: 'country' },
  'ethiopia': { lat: 9.02, lng: 38.75, name: 'Ethiopia', type: 'country' },
  'ethiopian': { lat: 9.02, lng: 38.75, name: 'Ethiopia', type: 'country' },
  'libya': { lat: 32.90, lng: 13.18, name: 'Libya', type: 'country' },
  'libyan': { lat: 32.90, lng: 13.18, name: 'Libya', type: 'country' },
  'north korea': { lat: 39.03, lng: 125.75, name: 'North Korea', type: 'country' },
  'south korea': { lat: 37.57, lng: 126.98, name: 'South Korea', type: 'country' },
  'korean': { lat: 37.57, lng: 126.98, name: 'South Korea', type: 'country' },
  'japan': { lat: 35.68, lng: 139.69, name: 'Japan', type: 'country' },
  'japanese': { lat: 35.68, lng: 139.69, name: 'Japan', type: 'country' },
  'india': { lat: 28.61, lng: 77.21, name: 'India', type: 'country' },
  'indian': { lat: 28.61, lng: 77.21, name: 'India', type: 'country' },
  'pakistan': { lat: 33.69, lng: 73.04, name: 'Pakistan', type: 'country' },
  'pakistani': { lat: 33.69, lng: 73.04, name: 'Pakistan', type: 'country' },
  'afghanistan': { lat: 34.53, lng: 69.17, name: 'Afghanistan', type: 'country' },
  'afghan': { lat: 34.53, lng: 69.17, name: 'Afghanistan', type: 'country' },
  'saudi arabia': { lat: 24.71, lng: 46.68, name: 'Saudi Arabia', type: 'country' },
  'saudi': { lat: 24.71, lng: 46.68, name: 'Saudi Arabia', type: 'country' },
  'egypt': { lat: 30.04, lng: 31.24, name: 'Egypt', type: 'country' },
  'egyptian': { lat: 30.04, lng: 31.24, name: 'Egypt', type: 'country' },
  'germany': { lat: 52.52, lng: 13.41, name: 'Germany', type: 'country' },
  'german': { lat: 52.52, lng: 13.41, name: 'Germany', type: 'country' },
  'france': { lat: 48.86, lng: 2.35, name: 'France', type: 'country' },
  'french': { lat: 48.86, lng: 2.35, name: 'France', type: 'country' },
  'united kingdom': { lat: 51.51, lng: -0.13, name: 'United Kingdom', type: 'country' },
  'british': { lat: 51.51, lng: -0.13, name: 'United Kingdom', type: 'country' },
  'uk': { lat: 51.51, lng: -0.13, name: 'United Kingdom', type: 'country' },
  'brazil': { lat: -15.79, lng: -47.88, name: 'Brazil', type: 'country' },
  'brazilian': { lat: -15.79, lng: -47.88, name: 'Brazil', type: 'country' },
  'australia': { lat: -35.28, lng: 149.13, name: 'Australia', type: 'country' },
  'australian': { lat: -35.28, lng: 149.13, name: 'Australia', type: 'country' },
  'taiwan': { lat: 25.03, lng: 121.57, name: 'Taiwan', type: 'country' },
  'taiwanese': { lat: 25.03, lng: 121.57, name: 'Taiwan', type: 'country' },
  'nigeria': { lat: 9.06, lng: 7.49, name: 'Nigeria', type: 'country' },
  'nigerian': { lat: 9.06, lng: 7.49, name: 'Nigeria', type: 'country' },
  'mexico': { lat: 19.43, lng: -99.13, name: 'Mexico', type: 'country' },
  'mexican': { lat: 19.43, lng: -99.13, name: 'Mexico', type: 'country' },
  'canada': { lat: 45.42, lng: -75.70, name: 'Canada', type: 'country' },
  'canadian': { lat: 45.42, lng: -75.70, name: 'Canada', type: 'country' },
  'italy': { lat: 41.90, lng: 12.50, name: 'Italy', type: 'country' },
  'italian': { lat: 41.90, lng: 12.50, name: 'Italy', type: 'country' },
  'spain': { lat: 40.42, lng: -3.70, name: 'Spain', type: 'country' },
  'spanish': { lat: 40.42, lng: -3.70, name: 'Spain', type: 'country' },
  'poland': { lat: 52.23, lng: 21.01, name: 'Poland', type: 'country' },
  'polish': { lat: 52.23, lng: 21.01, name: 'Poland', type: 'country' },
  'south africa': { lat: -25.75, lng: 28.19, name: 'South Africa', type: 'country' },
  'venezuela': { lat: 10.49, lng: -66.88, name: 'Venezuela', type: 'country' },
  'venezuelan': { lat: 10.49, lng: -66.88, name: 'Venezuela', type: 'country' },
  'congo': { lat: -4.32, lng: 15.31, name: 'DR Congo', type: 'country' },
  'congolese': { lat: -4.32, lng: 15.31, name: 'DR Congo', type: 'country' },
  'lebanon': { lat: 33.89, lng: 35.50, name: 'Lebanon', type: 'country' },
  'lebanese': { lat: 33.89, lng: 35.50, name: 'Lebanon', type: 'country' },
  'mali': { lat: 12.64, lng: -8.00, name: 'Mali', type: 'country' },
  'malian': { lat: 12.64, lng: -8.00, name: 'Mali', type: 'country' },
  'morocco': { lat: 34.02, lng: -6.83, name: 'Morocco', type: 'country' },
  'tunisia': { lat: 36.81, lng: 10.17, name: 'Tunisia', type: 'country' },
  'algeria': { lat: 36.75, lng: 3.06, name: 'Algeria', type: 'country' },
  'colombia': { lat: 4.71, lng: -74.07, name: 'Colombia', type: 'country' },
  'argentina': { lat: -34.60, lng: -58.38, name: 'Argentina', type: 'country' },
  'chile': { lat: -33.45, lng: -70.67, name: 'Chile', type: 'country' },
  'peru': { lat: -12.05, lng: -77.04, name: 'Peru', type: 'country' },
  'indonesia': { lat: -6.21, lng: 106.85, name: 'Indonesia', type: 'country' },
  'indonesian': { lat: -6.21, lng: 106.85, name: 'Indonesia', type: 'country' },
  'philippines': { lat: 14.60, lng: 120.98, name: 'Philippines', type: 'country' },
  'philippine': { lat: 14.60, lng: 120.98, name: 'Philippines', type: 'country' },
  'thailand': { lat: 13.76, lng: 100.50, name: 'Thailand', type: 'country' },
  'vietnam': { lat: 21.03, lng: 105.85, name: 'Vietnam', type: 'country' },
  'malaysia': { lat: 3.14, lng: 101.69, name: 'Malaysia', type: 'country' },
  'singapore': { lat: 1.35, lng: 103.82, name: 'Singapore', type: 'country' },
  'greece': { lat: 37.98, lng: 23.73, name: 'Greece', type: 'country' },
  'greek': { lat: 37.98, lng: 23.73, name: 'Greece', type: 'country' },
  'romania': { lat: 44.43, lng: 26.10, name: 'Romania', type: 'country' },
  'hungary': { lat: 47.50, lng: 19.04, name: 'Hungary', type: 'country' },
  'czech': { lat: 50.08, lng: 14.44, name: 'Czech Republic', type: 'country' },
  'sweden': { lat: 59.33, lng: 18.07, name: 'Sweden', type: 'country' },
  'norway': { lat: 59.91, lng: 10.75, name: 'Norway', type: 'country' },
  'finland': { lat: 60.17, lng: 24.94, name: 'Finland', type: 'country' },
  'denmark': { lat: 55.68, lng: 12.57, name: 'Denmark', type: 'country' },
  'netherlands': { lat: 52.37, lng: 4.90, name: 'Netherlands', type: 'country' },
  'dutch': { lat: 52.37, lng: 4.90, name: 'Netherlands', type: 'country' },
  'belgium': { lat: 50.85, lng: 4.35, name: 'Belgium', type: 'country' },
  'switzerland': { lat: 46.95, lng: 7.45, name: 'Switzerland', type: 'country' },
  'swiss': { lat: 46.95, lng: 7.45, name: 'Switzerland', type: 'country' },
  'austria': { lat: 48.21, lng: 16.37, name: 'Austria', type: 'country' },
  'portugal': { lat: 38.72, lng: -9.14, name: 'Portugal', type: 'country' },
  'ireland': { lat: 53.35, lng: -6.26, name: 'Ireland', type: 'country' },
  'kenya': { lat: -1.29, lng: 36.82, name: 'Kenya', type: 'country' },
  'kenyan': { lat: -1.29, lng: 36.82, name: 'Kenya', type: 'country' },
  'uganda': { lat: 0.31, lng: 32.58, name: 'Uganda', type: 'country' },
  'tanzania': { lat: -6.79, lng: 39.28, name: 'Tanzania', type: 'country' },
  'mozambique': { lat: -25.97, lng: 32.59, name: 'Mozambique', type: 'country' },
  'cameroon': { lat: 3.87, lng: 11.52, name: 'Cameroon', type: 'country' },
  'niger': { lat: 13.51, lng: 2.13, name: 'Niger', type: 'country' },
  'chad': { lat: 12.13, lng: 15.05, name: 'Chad', type: 'country' },
  'qatar': { lat: 25.29, lng: 51.53, name: 'Qatar', type: 'country' },
  'uae': { lat: 24.45, lng: 54.65, name: 'UAE', type: 'country' },
  'emirates': { lat: 24.45, lng: 54.65, name: 'UAE', type: 'country' },
  'bahrain': { lat: 26.07, lng: 50.56, name: 'Bahrain', type: 'country' },
  'oman': { lat: 23.61, lng: 58.54, name: 'Oman', type: 'country' },
  'kuwait': { lat: 29.38, lng: 47.99, name: 'Kuwait', type: 'country' },
  'jordan': { lat: 31.95, lng: 35.93, name: 'Jordan', type: 'country' },
  'jordanian': { lat: 31.95, lng: 35.93, name: 'Jordan', type: 'country' },
  'georgia': { lat: 41.72, lng: 44.79, name: 'Georgia', type: 'country' },
  'azerbaijan': { lat: 40.41, lng: 49.87, name: 'Azerbaijan', type: 'country' },
  'armenia': { lat: 40.18, lng: 44.51, name: 'Armenia', type: 'country' },
  'uzbekistan': { lat: 41.30, lng: 69.28, name: 'Uzbekistan', type: 'country' },
  'kazakhstan': { lat: 51.17, lng: 71.43, name: 'Kazakhstan', type: 'country' },
  'belarus': { lat: 53.90, lng: 27.57, name: 'Belarus', type: 'country' },
  'belarusian': { lat: 53.90, lng: 27.57, name: 'Belarus', type: 'country' },
  'serbia': { lat: 44.79, lng: 20.47, name: 'Serbia', type: 'country' },
  'serbian': { lat: 44.79, lng: 20.47, name: 'Serbia', type: 'country' },
  'croatia': { lat: 45.81, lng: 15.98, name: 'Croatia', type: 'country' },
  'bosnia': { lat: 43.86, lng: 18.41, name: 'Bosnia', type: 'country' },
  'kosovo': { lat: 42.66, lng: 21.17, name: 'Kosovo', type: 'country' },
  'albania': { lat: 41.33, lng: 19.82, name: 'Albania', type: 'country' },
  'bulgaria': { lat: 42.70, lng: 23.32, name: 'Bulgaria', type: 'country' },
  'moldova': { lat: 47.01, lng: 28.86, name: 'Moldova', type: 'country' },
  'latvia': { lat: 56.95, lng: 24.11, name: 'Latvia', type: 'country' },
  'lithuania': { lat: 54.69, lng: 25.28, name: 'Lithuania', type: 'country' },
  'estonia': { lat: 59.44, lng: 24.75, name: 'Estonia', type: 'country' },
  'cuba': { lat: 23.11, lng: -82.37, name: 'Cuba', type: 'country' },
  'haiti': { lat: 18.54, lng: -72.34, name: 'Haiti', type: 'country' },
  'nicaragua': { lat: 12.14, lng: -86.25, name: 'Nicaragua', type: 'country' },
  'ecuador': { lat: -0.18, lng: -78.47, name: 'Ecuador', type: 'country' },
  'bolivia': { lat: -16.50, lng: -68.15, name: 'Bolivia', type: 'country' },
  'new zealand': { lat: -41.29, lng: 174.78, name: 'New Zealand', type: 'country' },
  'nepal': { lat: 27.72, lng: 85.32, name: 'Nepal', type: 'country' },
  'bangladesh': { lat: 23.81, lng: 90.41, name: 'Bangladesh', type: 'country' },
  'sri lanka': { lat: 6.93, lng: 79.84, name: 'Sri Lanka', type: 'country' },
  'cambodia': { lat: 11.56, lng: 104.92, name: 'Cambodia', type: 'country' },

  // --- Major Cities ---
  'istanbul': { lat: 41.01, lng: 28.98, name: 'Istanbul', type: 'city' },
  'ankara': { lat: 39.93, lng: 32.86, name: 'Ankara', type: 'city' },
  'kyiv': { lat: 50.45, lng: 30.52, name: 'Kyiv', type: 'city' },
  'kiev': { lat: 50.45, lng: 30.52, name: 'Kyiv', type: 'city' },
  'moscow': { lat: 55.76, lng: 37.62, name: 'Moscow', type: 'city' },
  'beijing': { lat: 39.9, lng: 116.4, name: 'Beijing', type: 'city' },
  'washington': { lat: 38.9, lng: -77.04, name: 'Washington D.C.', type: 'city' },
  'new york': { lat: 40.71, lng: -74.01, name: 'New York', type: 'city' },
  'london': { lat: 51.51, lng: -0.13, name: 'London', type: 'city' },
  'paris': { lat: 48.86, lng: 2.35, name: 'Paris', type: 'city' },
  'berlin': { lat: 52.52, lng: 13.41, name: 'Berlin', type: 'city' },
  'tokyo': { lat: 35.68, lng: 139.69, name: 'Tokyo', type: 'city' },
  'tehran': { lat: 35.69, lng: 51.39, name: 'Tehran', type: 'city' },
  'damascus': { lat: 33.51, lng: 36.29, name: 'Damascus', type: 'city' },
  'baghdad': { lat: 33.31, lng: 44.37, name: 'Baghdad', type: 'city' },
  'kabul': { lat: 34.53, lng: 69.17, name: 'Kabul', type: 'city' },
  'cairo': { lat: 30.04, lng: 31.24, name: 'Cairo', type: 'city' },
  'riyadh': { lat: 24.71, lng: 46.68, name: 'Riyadh', type: 'city' },
  'jerusalem': { lat: 31.77, lng: 35.22, name: 'Jerusalem', type: 'city' },
  'tel aviv': { lat: 32.09, lng: 34.78, name: 'Tel Aviv', type: 'city' },
  'gaza': { lat: 31.52, lng: 34.46, name: 'Gaza', type: 'city' },
  'west bank': { lat: 31.95, lng: 35.20, name: 'West Bank', type: 'region' },
  'rafah': { lat: 31.30, lng: 34.25, name: 'Rafah', type: 'city' },
  'beirut': { lat: 33.89, lng: 35.50, name: 'Beirut', type: 'city' },
  'aleppo': { lat: 36.20, lng: 37.16, name: 'Aleppo', type: 'city' },
  'idlib': { lat: 35.93, lng: 36.63, name: 'Idlib', type: 'city' },
  'khartoum': { lat: 15.59, lng: 32.53, name: 'Khartoum', type: 'city' },
  'mogadishu': { lat: 2.05, lng: 45.32, name: 'Mogadishu', type: 'city' },
  'addis ababa': { lat: 9.02, lng: 38.75, name: 'Addis Ababa', type: 'city' },
  'tripoli': { lat: 32.90, lng: 13.18, name: 'Tripoli', type: 'city' },
  'pyongyang': { lat: 39.03, lng: 125.75, name: 'Pyongyang', type: 'city' },
  'seoul': { lat: 37.57, lng: 126.98, name: 'Seoul', type: 'city' },
  'taipei': { lat: 25.03, lng: 121.57, name: 'Taipei', type: 'city' },
  'new delhi': { lat: 28.61, lng: 77.21, name: 'New Delhi', type: 'city' },
  'mumbai': { lat: 19.08, lng: 72.88, name: 'Mumbai', type: 'city' },
  'islamabad': { lat: 33.69, lng: 73.04, name: 'Islamabad', type: 'city' },
  'shanghai': { lat: 31.23, lng: 121.47, name: 'Shanghai', type: 'city' },
  'hong kong': { lat: 22.28, lng: 114.16, name: 'Hong Kong', type: 'city' },
  'dubai': { lat: 25.20, lng: 55.27, name: 'Dubai', type: 'city' },
  'abu dhabi': { lat: 24.45, lng: 54.65, name: 'Abu Dhabi', type: 'city' },
  'doha': { lat: 25.29, lng: 51.53, name: 'Doha', type: 'city' },
  'singapore city': { lat: 1.28, lng: 103.85, name: 'Singapore', type: 'city' },
  'rome': { lat: 41.90, lng: 12.50, name: 'Rome', type: 'city' },
  'madrid': { lat: 40.42, lng: -3.70, name: 'Madrid', type: 'city' },
  'brussels': { lat: 50.85, lng: 4.35, name: 'Brussels', type: 'city' },
  'geneva': { lat: 46.20, lng: 6.15, name: 'Geneva', type: 'city' },
  'vienna': { lat: 48.21, lng: 16.37, name: 'Vienna', type: 'city' },
  'zurich': { lat: 47.37, lng: 8.54, name: 'Zurich', type: 'city' },
  'ottawa': { lat: 45.42, lng: -75.70, name: 'Ottawa', type: 'city' },
  'canberra': { lat: -35.28, lng: 149.13, name: 'Canberra', type: 'city' },
  'sao paulo': { lat: -23.55, lng: -46.63, name: 'São Paulo', type: 'city' },
  'mexico city': { lat: 19.43, lng: -99.13, name: 'Mexico City', type: 'city' },
  'frankfurt': { lat: 50.11, lng: 8.68, name: 'Frankfurt', type: 'city' },
  'warsaw': { lat: 52.23, lng: 21.01, name: 'Warsaw', type: 'city' },
  'bucharest': { lat: 44.43, lng: 26.10, name: 'Bucharest', type: 'city' },
  'nairobi': { lat: -1.29, lng: 36.82, name: 'Nairobi', type: 'city' },
  'lagos': { lat: 6.52, lng: 3.38, name: 'Lagos', type: 'city' },
  'pretoria': { lat: -25.75, lng: 28.19, name: 'Pretoria', type: 'city' },
  'johannesburg': { lat: -26.20, lng: 28.05, name: 'Johannesburg', type: 'city' },
  'amman': { lat: 31.95, lng: 35.93, name: 'Amman', type: 'city' },
  'muscat': { lat: 23.61, lng: 58.54, name: 'Muscat', type: 'city' },
  'tbilisi': { lat: 41.72, lng: 44.79, name: 'Tbilisi', type: 'city' },
  'baku': { lat: 40.41, lng: 49.87, name: 'Baku', type: 'city' },
  'minsk': { lat: 53.90, lng: 27.57, name: 'Minsk', type: 'city' },
  'belgrade': { lat: 44.79, lng: 20.47, name: 'Belgrade', type: 'city' },

  // Turkish cities for more precise matching
  'diyarbakır': { lat: 37.91, lng: 40.24, name: 'Diyarbakır', type: 'city' },
  'diyarbakir': { lat: 37.91, lng: 40.24, name: 'Diyarbakır', type: 'city' },
  'gaziantep': { lat: 37.06, lng: 37.38, name: 'Gaziantep', type: 'city' },
  'hatay': { lat: 36.20, lng: 36.16, name: 'Hatay', type: 'city' },
  'izmir': { lat: 38.42, lng: 27.13, name: 'İzmir', type: 'city' },
  'antalya': { lat: 36.90, lng: 30.69, name: 'Antalya', type: 'city' },
  'adana': { lat: 37.00, lng: 35.33, name: 'Adana', type: 'city' },
  'mersin': { lat: 36.81, lng: 34.64, name: 'Mersin', type: 'city' },

  // Ukrainian cities
  'kharkiv': { lat: 49.99, lng: 36.23, name: 'Kharkiv', type: 'city' },
  'odesa': { lat: 46.47, lng: 30.73, name: 'Odesa', type: 'city' },
  'odessa': { lat: 46.47, lng: 30.73, name: 'Odesa', type: 'city' },
  'mariupol': { lat: 47.10, lng: 37.54, name: 'Mariupol', type: 'city' },
  'zaporizhzhia': { lat: 47.84, lng: 35.14, name: 'Zaporizhzhia', type: 'city' },
  'kherson': { lat: 46.64, lng: 32.62, name: 'Kherson', type: 'city' },
  'donbas': { lat: 48.02, lng: 37.80, name: 'Donbas', type: 'region' },
  'donetsk': { lat: 48.00, lng: 37.80, name: 'Donetsk', type: 'city' },
  'luhansk': { lat: 48.57, lng: 39.31, name: 'Luhansk', type: 'city' },
  'crimea': { lat: 44.95, lng: 34.10, name: 'Crimea', type: 'region' },
  'lviv': { lat: 49.84, lng: 24.03, name: 'Lviv', type: 'city' },

  // --- Regions / Organizations ---
  'europe': { lat: 50.85, lng: 4.35, name: 'Europe', type: 'region' },
  'european': { lat: 50.85, lng: 4.35, name: 'Europe', type: 'region' },
  'middle east': { lat: 31.0, lng: 37.0, name: 'Middle East', type: 'region' },
  'africa': { lat: 0.0, lng: 25.0, name: 'Africa', type: 'region' },
  'african': { lat: 0.0, lng: 25.0, name: 'Africa', type: 'region' },
  'asia': { lat: 35.0, lng: 105.0, name: 'Asia', type: 'region' },
  'asian': { lat: 35.0, lng: 105.0, name: 'Asia', type: 'region' },
  'sahel': { lat: 14.0, lng: 2.0, name: 'Sahel', type: 'region' },
  'horn of africa': { lat: 8.0, lng: 46.0, name: 'Horn of Africa', type: 'region' },
  'baltic': { lat: 56.95, lng: 24.11, name: 'Baltic', type: 'region' },
  'balkan': { lat: 42.0, lng: 21.0, name: 'Balkans', type: 'region' },
  'caucasus': { lat: 42.0, lng: 44.5, name: 'Caucasus', type: 'region' },
  'central asia': { lat: 41.0, lng: 65.0, name: 'Central Asia', type: 'region' },
  'southeast asia': { lat: 10.0, lng: 106.0, name: 'Southeast Asia', type: 'region' },
  'south china sea': { lat: 15.0, lng: 115.0, name: 'South China Sea', type: 'region' },
  'arctic': { lat: 71.0, lng: 25.0, name: 'Arctic', type: 'region' },
  'pacific': { lat: 0.0, lng: 180.0, name: 'Pacific', type: 'region' },
  'latin america': { lat: -10.0, lng: -55.0, name: 'Latin America', type: 'region' },
  'caribbean': { lat: 18.0, lng: -69.0, name: 'Caribbean', type: 'region' },
  'red sea': { lat: 20.0, lng: 38.5, name: 'Red Sea', type: 'region' },

  // Financial centers
  'wall street': { lat: 40.71, lng: -74.01, name: 'Wall Street', type: 'city' },

  // Organizations mapped to HQ
  'united nations': { lat: 40.75, lng: -73.97, name: 'United Nations', type: 'org' },
  'nato': { lat: 50.88, lng: 4.42, name: 'NATO', type: 'org' },
  'pentagon': { lat: 38.87, lng: -77.06, name: 'Pentagon', type: 'org' },
  'kremlin': { lat: 55.75, lng: 37.62, name: 'Kremlin', type: 'org' },
  'white house': { lat: 38.90, lng: -77.04, name: 'White House', type: 'org' },
  'iaea': { lat: 48.23, lng: 16.41, name: 'IAEA', type: 'org' },
  'who': { lat: 46.23, lng: 6.13, name: 'WHO', type: 'org' },
  'world bank': { lat: 38.90, lng: -77.04, name: 'World Bank', type: 'org' },
  'imf': { lat: 38.90, lng: -77.03, name: 'IMF', type: 'org' },
  'eu ': { lat: 50.84, lng: 4.38, name: 'EU', type: 'org' },
  'european union': { lat: 50.84, lng: 4.38, name: 'EU', type: 'org' },
  'african union': { lat: 9.02, lng: 38.75, name: 'African Union', type: 'org' },
  'asean': { lat: -6.18, lng: 106.83, name: 'ASEAN', type: 'org' },
  'opec': { lat: 48.22, lng: 16.37, name: 'OPEC', type: 'org' },
  'hezbollah': { lat: 33.85, lng: 35.86, name: 'Hezbollah', type: 'org' },
  'hamas': { lat: 31.52, lng: 34.46, name: 'Hamas', type: 'org' },
  'isis': { lat: 35.0, lng: 40.0, name: 'ISIS', type: 'org' },
  'al qaeda': { lat: 15.0, lng: 45.0, name: 'Al-Qaeda', type: 'org' },
  'al-qaeda': { lat: 15.0, lng: 45.0, name: 'Al-Qaeda', type: 'org' },
  'taliban': { lat: 34.53, lng: 69.17, name: 'Taliban', type: 'org' },
  'wagner': { lat: 55.75, lng: 37.62, name: 'Wagner Group', type: 'org' },
  'boko haram': { lat: 11.85, lng: 13.16, name: 'Boko Haram', type: 'org' },
  'al-shabaab': { lat: 2.05, lng: 45.32, name: 'Al-Shabaab', type: 'org' },
}

// Sort by key length descending so longer (more specific) matches take priority
const SORTED_KEYS = Object.keys(LOCATIONS).sort((a, b) => b.length - a.length)

export interface ResolvedLocation {
  latitude: number
  longitude: number
  country: string
}

/**
 * Simple hash to generate deterministic offset from text.
 * Returns a value between 0 and 1.
 */
function textHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % 10000) / 10000
}

/**
 * Resolve geographic coordinates from text.
 * Returns null if no location can be determined (prevents random ocean placement).
 *
 * Uses deterministic hash-based micro-offsets instead of random jitter:
 * - city:    ±0.005° (~500m) - stays within urban area
 * - country: ±0.02°  (~2km)  - stays near capital/center
 * - region:  ±0.04°  (~4km)
 * - org:     ±0.003° (~300m) - very precise HQ location
 */
export function resolveLocation(text: string): ResolvedLocation | null {
  if (!text) return null

  const lower = text.toLowerCase()

  for (const key of SORTED_KEYS) {
    if (lower.includes(key)) {
      const loc = LOCATIONS[key]

      const maxOffset =
        loc.type === 'city' ? 0.005 :
        loc.type === 'org' ? 0.003 :
        loc.type === 'country' ? 0.02 :
        0.04

      const h1 = textHash(text)
      const h2 = textHash(text + ':lng')

      return {
        latitude: loc.lat + (h1 - 0.5) * maxOffset * 2,
        longitude: loc.lng + (h2 - 0.5) * maxOffset * 2,
        country: loc.name,
      }
    }
  }

  return null
}
