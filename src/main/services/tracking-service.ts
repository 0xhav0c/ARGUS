import type { EarthquakeData, NaturalDisaster, FlightData, VesselData } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'

const AIRLINE_CODES: Record<string, string> = {
  THY: 'Turkish Airlines', PGT: 'Pegasus Airlines', SHT: 'SunExpress', AJA: 'AnadoluJet',
  SXS: 'SunExpress', AHY: 'Azerbaijan Airlines',
  RYR: 'Ryanair', EZY: 'easyJet', WZZ: 'Wizz Air', VLG: 'Vueling',
  DAL: 'Delta Air Lines', UAL: 'United Airlines', AAL: 'American Airlines', SWA: 'Southwest',
  DLH: 'Lufthansa', AFR: 'Air France', BAW: 'British Airways', KLM: 'KLM',
  SWR: 'Swiss', AUA: 'Austrian', BEL: 'Brussels Airlines',
  UAE: 'Emirates', QTR: 'Qatar Airways', ETH: 'Etihad', SAA: 'Saudia',
  SIA: 'Singapore Airlines', ANA: 'All Nippon Airways', JAL: 'Japan Airlines',
  CPA: 'Cathay Pacific', KAL: 'Korean Air', CCA: 'Air China', CSN: 'China Southern',
  CES: 'China Eastern', EVA: 'EVA Air',
  AZA: 'ITA Airways', TAP: 'TAP Portugal', IBE: 'Iberia', SAS: 'SAS',
  FIN: 'Finnair', LOT: 'LOT Polish', CSA: 'Czech Airlines',
  QFA: 'Qantas', ANZ: 'Air New Zealand', ACA: 'Air Canada', AVA: 'Avianca',
  RAM: 'Royal Air Maroc', MSR: 'EgyptAir', MEA: 'Middle East Airlines',
  ELY: 'El Al', FDB: 'flydubai', AIC: 'Air India',
}

const AIRCRAFT_CATEGORIES: Record<number, string> = {
  0: 'No ADS-B', 1: 'Light', 2: 'Small', 3: 'Large', 4: 'High Vortex Large',
  5: 'Heavy', 6: 'High Performance', 7: 'Rotorcraft',
}

const AIRPORTS = [
  // Turkey
  { code: 'IST', name: 'Istanbul Airport', lat: 41.275, lng: 28.752 },
  { code: 'SAW', name: 'Sabiha Gokcen', lat: 40.898, lng: 29.309 },
  { code: 'ESB', name: 'Esenboga', lat: 40.128, lng: 32.995 },
  { code: 'AYT', name: 'Antalya Airport', lat: 36.899, lng: 30.800 },
  { code: 'ADB', name: 'Izmir Adnan Menderes', lat: 38.292, lng: 27.157 },
  { code: 'DIY', name: 'Diyarbakir Airport', lat: 37.894, lng: 40.201 },
  { code: 'GZT', name: 'Gaziantep Airport', lat: 36.947, lng: 37.479 },
  { code: 'TZX', name: 'Trabzon Airport', lat: 40.995, lng: 39.789 },
  { code: 'VAN', name: 'Van Ferit Melen', lat: 38.468, lng: 43.332 },
  { code: 'EZS', name: 'Elazig Airport', lat: 38.607, lng: 39.291 },
  { code: 'ERZ', name: 'Erzurum Airport', lat: 39.957, lng: 41.170 },
  { code: 'ASR', name: 'Kayseri Erkilet', lat: 38.770, lng: 35.495 },
  { code: 'KYA', name: 'Konya Airport', lat: 37.979, lng: 32.562 },
  { code: 'SZF', name: 'Samsun Carsamba', lat: 41.254, lng: 36.567 },
  { code: 'DNZ', name: 'Denizli Cardak', lat: 37.786, lng: 29.701 },
  { code: 'BJV', name: 'Bodrum Milas', lat: 37.250, lng: 27.664 },
  { code: 'DLM', name: 'Dalaman Airport', lat: 36.713, lng: 28.793 },
  { code: 'MLX', name: 'Malatya Erhac', lat: 38.354, lng: 38.254 },
  { code: 'HTY', name: 'Hatay Airport', lat: 36.362, lng: 36.282 },
  { code: 'MZH', name: 'Amasya Merzifon', lat: 40.829, lng: 35.522 },
  { code: 'NAV', name: 'Nevsehir Kapadokya', lat: 38.772, lng: 34.535 },
  // Caucasus & Central Asia
  { code: 'TBS', name: 'Tbilisi Airport', lat: 41.669, lng: 44.955 },
  { code: 'GYD', name: 'Baku Heydar Aliyev', lat: 40.468, lng: 50.047 },
  { code: 'EVN', name: 'Yerevan Zvartnots', lat: 40.147, lng: 44.396 },
  { code: 'ALA', name: 'Almaty Airport', lat: 43.352, lng: 77.040 },
  { code: 'NQZ', name: 'Astana Nursultan', lat: 51.022, lng: 71.467 },
  { code: 'TAS', name: 'Tashkent Airport', lat: 41.261, lng: 69.281 },
  { code: 'FRU', name: 'Bishkek Manas', lat: 43.062, lng: 74.478 },
  // Europe - Major
  { code: 'LHR', name: 'London Heathrow', lat: 51.470, lng: -0.454 },
  { code: 'LGW', name: 'London Gatwick', lat: 51.148, lng: -0.190 },
  { code: 'STN', name: 'London Stansted', lat: 51.885, lng: 0.235 },
  { code: 'LTN', name: 'London Luton', lat: 51.875, lng: -0.368 },
  { code: 'MAN', name: 'Manchester Airport', lat: 53.354, lng: -2.275 },
  { code: 'EDI', name: 'Edinburgh Airport', lat: 55.950, lng: -3.373 },
  { code: 'BHX', name: 'Birmingham Airport', lat: 52.454, lng: -1.748 },
  { code: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.013, lng: 2.550 },
  { code: 'ORY', name: 'Paris Orly', lat: 48.723, lng: 2.379 },
  { code: 'NCE', name: 'Nice Cote d\'Azur', lat: 43.658, lng: 7.216 },
  { code: 'LYS', name: 'Lyon Saint-Exupery', lat: 45.726, lng: 5.091 },
  { code: 'MRS', name: 'Marseille Provence', lat: 43.436, lng: 5.215 },
  { code: 'FRA', name: 'Frankfurt Airport', lat: 50.034, lng: 8.562 },
  { code: 'MUC', name: 'Munich Airport', lat: 48.354, lng: 11.786 },
  { code: 'DUS', name: 'Dusseldorf Airport', lat: 51.289, lng: 6.767 },
  { code: 'HAM', name: 'Hamburg Airport', lat: 53.630, lng: 9.988 },
  { code: 'TXL', name: 'Berlin Tegel', lat: 52.560, lng: 13.288 },
  { code: 'BER', name: 'Berlin Brandenburg', lat: 52.366, lng: 13.509 },
  { code: 'CGN', name: 'Cologne Bonn', lat: 50.866, lng: 7.143 },
  { code: 'STR', name: 'Stuttgart Airport', lat: 48.690, lng: 9.222 },
  { code: 'AMS', name: 'Amsterdam Schiphol', lat: 52.309, lng: 4.764 },
  { code: 'BRU', name: 'Brussels Airport', lat: 50.901, lng: 4.484 },
  { code: 'MAD', name: 'Madrid Barajas', lat: 40.472, lng: -3.561 },
  { code: 'BCN', name: 'Barcelona El Prat', lat: 41.297, lng: 2.078 },
  { code: 'AGP', name: 'Malaga Airport', lat: 36.675, lng: -4.499 },
  { code: 'PMI', name: 'Palma de Mallorca', lat: 39.552, lng: 2.739 },
  { code: 'ALC', name: 'Alicante Airport', lat: 38.282, lng: -0.558 },
  { code: 'VLC', name: 'Valencia Airport', lat: 39.490, lng: -0.473 },
  { code: 'LIS', name: 'Lisbon Airport', lat: 38.774, lng: -9.134 },
  { code: 'OPO', name: 'Porto Airport', lat: 41.248, lng: -8.681 },
  { code: 'FCO', name: 'Rome Fiumicino', lat: 41.800, lng: 12.239 },
  { code: 'MXP', name: 'Milan Malpensa', lat: 45.630, lng: 8.723 },
  { code: 'LIN', name: 'Milan Linate', lat: 45.449, lng: 9.278 },
  { code: 'NAP', name: 'Naples Airport', lat: 40.886, lng: 14.291 },
  { code: 'VCE', name: 'Venice Marco Polo', lat: 45.505, lng: 12.352 },
  { code: 'BLQ', name: 'Bologna Airport', lat: 44.535, lng: 11.289 },
  { code: 'ZRH', name: 'Zurich Airport', lat: 47.464, lng: 8.549 },
  { code: 'GVA', name: 'Geneva Airport', lat: 46.238, lng: 6.109 },
  { code: 'ATH', name: 'Athens Eleftherios', lat: 37.936, lng: 23.945 },
  { code: 'SKG', name: 'Thessaloniki Airport', lat: 40.519, lng: 22.971 },
  { code: 'VIE', name: 'Vienna Airport', lat: 48.110, lng: 16.570 },
  { code: 'PRG', name: 'Prague Vaclav Havel', lat: 50.101, lng: 14.260 },
  { code: 'BUD', name: 'Budapest Liszt Ferenc', lat: 47.439, lng: 19.262 },
  { code: 'WAW', name: 'Warsaw Chopin', lat: 52.166, lng: 20.967 },
  { code: 'KRK', name: 'Krakow Airport', lat: 50.077, lng: 19.785 },
  { code: 'OTP', name: 'Bucharest Otopeni', lat: 44.572, lng: 26.102 },
  { code: 'SOF', name: 'Sofia Airport', lat: 42.695, lng: 23.406 },
  { code: 'BEG', name: 'Belgrade Nikola Tesla', lat: 44.819, lng: 20.309 },
  { code: 'ZAG', name: 'Zagreb Airport', lat: 45.742, lng: 16.069 },
  { code: 'LJU', name: 'Ljubljana Airport', lat: 46.224, lng: 14.457 },
  { code: 'TIA', name: 'Tirana Airport', lat: 41.415, lng: 19.720 },
  { code: 'SKP', name: 'Skopje Airport', lat: 41.962, lng: 21.621 },
  // Scandinavia
  { code: 'ARN', name: 'Stockholm Arlanda', lat: 59.652, lng: 17.919 },
  { code: 'CPH', name: 'Copenhagen Kastrup', lat: 55.618, lng: 12.656 },
  { code: 'OSL', name: 'Oslo Gardermoen', lat: 60.194, lng: 11.100 },
  { code: 'HEL', name: 'Helsinki Vantaa', lat: 60.317, lng: 24.963 },
  { code: 'GOT', name: 'Gothenburg Landvetter', lat: 57.663, lng: 12.280 },
  // Russia & CIS
  { code: 'SVO', name: 'Moscow Sheremetyevo', lat: 55.973, lng: 37.415 },
  { code: 'DME', name: 'Moscow Domodedovo', lat: 55.409, lng: 37.906 },
  { code: 'VKO', name: 'Moscow Vnukovo', lat: 55.601, lng: 37.286 },
  { code: 'LED', name: 'Saint Petersburg Pulkovo', lat: 59.800, lng: 30.263 },
  { code: 'KBP', name: 'Kyiv Boryspil', lat: 50.345, lng: 30.895 },
  { code: 'IEV', name: 'Kyiv Zhuliany', lat: 50.402, lng: 30.452 },
  { code: 'MSQ', name: 'Minsk National', lat: 53.883, lng: 28.032 },
  { code: 'KZN', name: 'Kazan Airport', lat: 55.606, lng: 49.279 },
  // North America
  { code: 'JFK', name: 'New York JFK', lat: 40.640, lng: -73.779 },
  { code: 'EWR', name: 'Newark Liberty', lat: 40.693, lng: -74.169 },
  { code: 'LGA', name: 'New York LaGuardia', lat: 40.777, lng: -73.873 },
  { code: 'LAX', name: 'Los Angeles Intl', lat: 33.943, lng: -118.408 },
  { code: 'SFO', name: 'San Francisco Intl', lat: 37.619, lng: -122.375 },
  { code: 'ORD', name: 'Chicago O\'Hare', lat: 41.978, lng: -87.905 },
  { code: 'ATL', name: 'Atlanta Hartsfield', lat: 33.637, lng: -84.428 },
  { code: 'DFW', name: 'Dallas Fort Worth', lat: 32.897, lng: -97.038 },
  { code: 'DEN', name: 'Denver Intl', lat: 39.862, lng: -104.673 },
  { code: 'SEA', name: 'Seattle Tacoma', lat: 47.449, lng: -122.309 },
  { code: 'MIA', name: 'Miami Intl', lat: 25.796, lng: -80.287 },
  { code: 'IAH', name: 'Houston Intercontinental', lat: 29.984, lng: -95.341 },
  { code: 'PHX', name: 'Phoenix Sky Harbor', lat: 33.437, lng: -112.008 },
  { code: 'MSP', name: 'Minneapolis St Paul', lat: 44.882, lng: -93.222 },
  { code: 'DTW', name: 'Detroit Metropolitan', lat: 42.212, lng: -83.353 },
  { code: 'BOS', name: 'Boston Logan', lat: 42.364, lng: -71.005 },
  { code: 'PHL', name: 'Philadelphia Intl', lat: 39.872, lng: -75.241 },
  { code: 'IAD', name: 'Washington Dulles', lat: 38.945, lng: -77.456 },
  { code: 'DCA', name: 'Washington Reagan', lat: 38.852, lng: -77.038 },
  { code: 'CLT', name: 'Charlotte Douglas', lat: 35.214, lng: -80.943 },
  { code: 'MCO', name: 'Orlando Intl', lat: 28.429, lng: -81.309 },
  { code: 'LAS', name: 'Las Vegas McCarran', lat: 36.080, lng: -115.152 },
  { code: 'YYZ', name: 'Toronto Pearson', lat: 43.678, lng: -79.629 },
  { code: 'YVR', name: 'Vancouver Intl', lat: 49.195, lng: -123.180 },
  { code: 'YUL', name: 'Montreal Trudeau', lat: 45.471, lng: -73.737 },
  { code: 'MEX', name: 'Mexico City Intl', lat: 19.436, lng: -99.072 },
  { code: 'CUN', name: 'Cancun Airport', lat: 21.037, lng: -86.877 },
  // Middle East
  { code: 'DXB', name: 'Dubai International', lat: 25.253, lng: 55.366 },
  { code: 'DOH', name: 'Hamad International', lat: 25.261, lng: 51.565 },
  { code: 'AUH', name: 'Abu Dhabi Intl', lat: 24.433, lng: 54.651 },
  { code: 'JED', name: 'Jeddah Airport', lat: 21.680, lng: 39.157 },
  { code: 'RUH', name: 'Riyadh King Khalid', lat: 24.958, lng: 46.699 },
  { code: 'BAH', name: 'Bahrain Intl', lat: 26.271, lng: 50.634 },
  { code: 'KWI', name: 'Kuwait Intl', lat: 29.227, lng: 47.980 },
  { code: 'MCT', name: 'Muscat Intl', lat: 23.593, lng: 58.284 },
  { code: 'AMM', name: 'Amman Queen Alia', lat: 31.723, lng: 35.993 },
  { code: 'TLV', name: 'Tel Aviv Ben Gurion', lat: 32.011, lng: 34.887 },
  { code: 'BEY', name: 'Beirut Rafic Hariri', lat: 33.821, lng: 35.488 },
  { code: 'BGW', name: 'Baghdad Intl', lat: 33.263, lng: 44.236 },
  { code: 'IKA', name: 'Tehran Imam Khomeini', lat: 35.416, lng: 51.152 },
  // Africa
  { code: 'CAI', name: 'Cairo International', lat: 30.112, lng: 31.410 },
  { code: 'ADD', name: 'Addis Ababa Bole', lat: 8.978, lng: 38.799 },
  { code: 'JNB', name: 'Johannesburg OR Tambo', lat: -26.139, lng: 28.246 },
  { code: 'CPT', name: 'Cape Town Intl', lat: -33.965, lng: 18.602 },
  { code: 'NBO', name: 'Nairobi Jomo Kenyatta', lat: -1.319, lng: 36.928 },
  { code: 'LOS', name: 'Lagos Murtala Muhammed', lat: 6.577, lng: 3.321 },
  { code: 'ABJ', name: 'Abidjan Felix HB', lat: 5.262, lng: -3.926 },
  { code: 'CMN', name: 'Casablanca Mohammed V', lat: 33.368, lng: -7.590 },
  { code: 'ALG', name: 'Algiers Houari Boumed', lat: 36.691, lng: 3.215 },
  { code: 'TUN', name: 'Tunis Carthage', lat: 36.851, lng: 10.227 },
  { code: 'DAR', name: 'Dar es Salaam Julius N', lat: -6.878, lng: 39.203 },
  { code: 'ACC', name: 'Accra Kotoka', lat: 5.605, lng: -0.167 },
  // Asia
  { code: 'SIN', name: 'Singapore Changi', lat: 1.350, lng: 103.994 },
  { code: 'HND', name: 'Tokyo Haneda', lat: 35.553, lng: 139.780 },
  { code: 'NRT', name: 'Tokyo Narita', lat: 35.765, lng: 140.386 },
  { code: 'KIX', name: 'Osaka Kansai', lat: 34.427, lng: 135.244 },
  { code: 'ICN', name: 'Seoul Incheon', lat: 37.463, lng: 126.441 },
  { code: 'GMP', name: 'Seoul Gimpo', lat: 37.559, lng: 126.791 },
  { code: 'PEK', name: 'Beijing Capital', lat: 40.080, lng: 116.603 },
  { code: 'PKX', name: 'Beijing Daxing', lat: 39.510, lng: 116.411 },
  { code: 'PVG', name: 'Shanghai Pudong', lat: 31.143, lng: 121.805 },
  { code: 'SHA', name: 'Shanghai Hongqiao', lat: 31.198, lng: 121.336 },
  { code: 'CAN', name: 'Guangzhou Baiyun', lat: 23.393, lng: 113.299 },
  { code: 'SZX', name: 'Shenzhen Baoan', lat: 22.639, lng: 113.810 },
  { code: 'CTU', name: 'Chengdu Shuangliu', lat: 30.578, lng: 103.947 },
  { code: 'HKG', name: 'Hong Kong Intl', lat: 22.309, lng: 113.915 },
  { code: 'TPE', name: 'Taipei Taoyuan', lat: 25.078, lng: 121.233 },
  { code: 'BKK', name: 'Bangkok Suvarnabhumi', lat: 13.681, lng: 100.747 },
  { code: 'DMK', name: 'Bangkok Don Mueang', lat: 13.913, lng: 100.607 },
  { code: 'KUL', name: 'Kuala Lumpur KLIA', lat: 2.746, lng: 101.710 },
  { code: 'CGK', name: 'Jakarta Soekarno-Hatta', lat: -6.126, lng: 106.656 },
  { code: 'MNL', name: 'Manila Ninoy Aquino', lat: 14.509, lng: 121.020 },
  { code: 'SGN', name: 'Ho Chi Minh Tan Son Nhat', lat: 10.819, lng: 106.652 },
  { code: 'HAN', name: 'Hanoi Noi Bai', lat: 21.221, lng: 105.807 },
  { code: 'DEL', name: 'Delhi Indira Gandhi', lat: 28.566, lng: 77.103 },
  { code: 'BOM', name: 'Mumbai CSIA', lat: 19.089, lng: 72.868 },
  { code: 'BLR', name: 'Bangalore Kempegowda', lat: 13.199, lng: 77.706 },
  { code: 'MAA', name: 'Chennai Airport', lat: 12.990, lng: 80.169 },
  { code: 'CCU', name: 'Kolkata Netaji SC', lat: 22.654, lng: 88.447 },
  { code: 'HYD', name: 'Hyderabad Rajiv Gandhi', lat: 17.240, lng: 78.429 },
  { code: 'CMB', name: 'Colombo Bandaranaike', lat: 7.181, lng: 79.884 },
  { code: 'DAC', name: 'Dhaka Hazrat Shahjalal', lat: 23.843, lng: 90.398 },
  { code: 'KTM', name: 'Kathmandu Tribhuvan', lat: 27.697, lng: 85.359 },
  { code: 'ISB', name: 'Islamabad Airport', lat: 33.549, lng: 72.826 },
  { code: 'KHI', name: 'Karachi Jinnah', lat: 24.907, lng: 67.161 },
  { code: 'LHE', name: 'Lahore Allama Iqbal', lat: 31.522, lng: 74.404 },
  { code: 'KBL', name: 'Kabul Intl', lat: 34.566, lng: 69.212 },
  // Oceania
  { code: 'SYD', name: 'Sydney Kingsford', lat: -33.946, lng: 151.177 },
  { code: 'MEL', name: 'Melbourne Tullamarine', lat: -37.674, lng: 144.843 },
  { code: 'BNE', name: 'Brisbane Airport', lat: -27.384, lng: 153.118 },
  { code: 'PER', name: 'Perth Airport', lat: -31.940, lng: 115.967 },
  { code: 'AKL', name: 'Auckland Airport', lat: -37.008, lng: 174.792 },
  // South America
  { code: 'GRU', name: 'Sao Paulo Guarulhos', lat: -23.435, lng: -46.473 },
  { code: 'GIG', name: 'Rio de Janeiro Galeao', lat: -22.810, lng: -43.250 },
  { code: 'EZE', name: 'Buenos Aires Ezeiza', lat: -34.822, lng: -58.536 },
  { code: 'BOG', name: 'Bogota El Dorado', lat: 4.702, lng: -74.147 },
  { code: 'SCL', name: 'Santiago Arturo Merino', lat: -33.393, lng: -70.786 },
  { code: 'LIM', name: 'Lima Jorge Chavez', lat: -12.022, lng: -77.114 },
  { code: 'PTY', name: 'Panama Tocumen', lat: 9.071, lng: -79.384 },
]

const PORTS = [
  { code: 'TRIST', name: 'Istanbul', lat: 41.01, lng: 28.97 },
  { code: 'NLRTM', name: 'Rotterdam', lat: 51.92, lng: 4.48 },
  { code: 'DEHAM', name: 'Hamburg', lat: 53.55, lng: 9.97 },
  { code: 'CNSHA', name: 'Shanghai', lat: 31.23, lng: 121.47 },
  { code: 'SGSIN', name: 'Singapore', lat: 1.29, lng: 103.85 },
  { code: 'AEDXB', name: 'Dubai (Jebel Ali)', lat: 25.00, lng: 55.06 },
  { code: 'EGLGP', name: 'London Gateway', lat: 51.45, lng: 0.47 },
  { code: 'GRPIR', name: 'Piraeus', lat: 37.94, lng: 23.65 },
  { code: 'EGFXT', name: 'Felixstowe', lat: 51.96, lng: 1.30 },
  { code: 'BEANR', name: 'Antwerp', lat: 51.23, lng: 4.40 },
  { code: 'FRLEH', name: 'Le Havre', lat: 49.49, lng: 0.11 },
  { code: 'ITGOA', name: 'Genoa', lat: 44.41, lng: 8.93 },
  { code: 'ESBCN', name: 'Barcelona', lat: 41.35, lng: 2.17 },
  { code: 'SAJED', name: 'Jeddah', lat: 21.54, lng: 39.17 },
  { code: 'USNYC', name: 'New York/New Jersey', lat: 40.68, lng: -74.04 },
  { code: 'USSAV', name: 'Savannah', lat: 32.08, lng: -81.09 },
  { code: 'USMIA', name: 'Miami', lat: 25.77, lng: -80.19 },
  { code: 'JPYOK', name: 'Yokohama', lat: 35.44, lng: 139.64 },
  { code: 'KRPUS', name: 'Busan', lat: 35.18, lng: 129.08 },
  { code: 'HKHKG', name: 'Hong Kong', lat: 22.29, lng: 114.17 },
  { code: 'TWKHH', name: 'Kaohsiung', lat: 22.62, lng: 120.31 },
  { code: 'ZADUR', name: 'Durban', lat: -29.87, lng: 31.05 },
  { code: 'BRSSZ', name: 'Santos', lat: -23.95, lng: -46.31 },
  { code: 'INMAA', name: 'Chennai', lat: 13.08, lng: 80.29 },
  { code: 'AUBNE', name: 'Brisbane', lat: -27.38, lng: 153.17 },
]

// Simplified land detection for vessel filtering - reject vessels that fall on land
const LAND_AREAS = [
  { minLat: 25, maxLat: 72, minLng: -130, maxLng: -52 },   // North America
  { minLat: -56, maxLat: 13, minLng: -80, maxLng: -35 },   // South America
  { minLat: 36, maxLat: 71, minLng: -11, maxLng: 32 },     // Europe
  { minLat: -35, maxLat: 38, minLng: -18, maxLng: 50 },    // Africa
  { minLat: 12, maxLat: 75, minLng: 28, maxLng: 180 },     // Asia / Russia
  { minLat: -40, maxLat: -11, minLng: 112, maxLng: 154 },  // Australia
  { minLat: 6, maxLat: 37, minLng: 62, maxLng: 98 },       // India
  { minLat: 18, maxLat: 54, minLng: 98, maxLng: 135 },     // China
  { minLat: 30, maxLat: 46, minLng: 126, maxLng: 146 },    // Japan
]
const SEA_AREAS = [
  { minLat: 30, maxLat: 46, minLng: -6, maxLng: 36 },      // Mediterranean
  { minLat: 40, maxLat: 47, minLng: 26, maxLng: 42 },      // Black Sea
  { minLat: 36, maxLat: 42, minLng: 46, maxLng: 55 },      // Caspian
  { minLat: 18, maxLat: 31, minLng: -98, maxLng: -80 },    // Gulf of Mexico
  { minLat: 9, maxLat: 22, minLng: -88, maxLng: -60 },     // Caribbean
  { minLat: 46, maxLat: 62, minLng: 10, maxLng: 30 },      // Baltic
  { minLat: 10, maxLat: 28, minLng: 32, maxLng: 44 },      // Red Sea
  { minLat: 23, maxLat: 31, minLng: 46, maxLng: 57 },      // Persian Gulf
  { minLat: 55, maxLat: 67, minLng: -8, maxLng: 12 },      // North Sea
  { minLat: -8, maxLat: 8, minLng: 95, maxLng: 120 },      // South China Sea
  { minLat: 0, maxLat: 20, minLng: 77, maxLng: 92 },       // Bay of Bengal
  { minLat: 49, maxLat: 54, minLng: -12, maxLng: -5 },     // Irish Sea / Celtic
  { minLat: 57, maxLat: 62, minLng: -3, maxLng: 4 },       // Norwegian Sea
]

function isOnLand(lat: number, lng: number): boolean {
  const inSea = SEA_AREAS.some(b => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng)
  if (inSea) return false

  const inLand = LAND_AREAS.some(b => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng)
  return inLand
}

export class TrackingService {
  private cache: Record<string, { data: any; timestamp: number }> = {}
  private CACHE_TTL = 45000
  private ROUTE_CACHE_TTL = 300000

  private openSkyAuthFailed = false

  resetOpenSkyAuth(): void {
    this.openSkyAuthFailed = false
  }

  private getOpenSkyHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (this.openSkyAuthFailed) return headers
    const user = getApiKeyManager().get('opensky_user')
    const pass = getApiKeyManager().get('opensky_pass')
    if (user) headers['Authorization'] = 'Basic ' + Buffer.from(`${user}:${pass || ''}`).toString('base64')
    return headers
  }

  private async fetchOpenSky(url: string, timeout = 15000): Promise<Response> {
    const res = await fetch(url, { headers: this.getOpenSkyHeaders(), signal: AbortSignal.timeout(timeout) })
    if (res.status === 401 && !this.openSkyAuthFailed) {
      console.warn('[Tracking] OpenSky credentials rejected, falling back to anonymous')
      this.openSkyAuthFailed = true
      return fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeout) })
    }
    return res
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache[key]
    if (!entry) return null
    const ttl = (key.startsWith('route-') || key.startsWith('meta-')) ? this.ROUTE_CACHE_TTL : this.CACHE_TTL
    if (Date.now() - entry.timestamp < ttl) {
      return entry.data as T
    }
    return null
  }

  private setCache(key: string, data: any): void {
    this.cache[key] = { data, timestamp: Date.now() }
  }

  async getEarthquakes(): Promise<EarthquakeData[]> {
    const cached = this.getCached<EarthquakeData[]>('earthquakes')
    if (cached) return cached

    try {
      const res = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
      )
      if (!res.ok) throw new Error(`USGS: ${res.status}`)

      const data: any = await res.json()
      const earthquakes: EarthquakeData[] = (data.features || []).map((f: any) => ({
        id: f.id,
        magnitude: f.properties.mag,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        place: f.properties.place || 'Unknown',
        time: new Date(f.properties.time).toISOString(),
        tsunami: f.properties.tsunami === 1,
        url: f.properties.url,
      }))

      this.setCache('earthquakes', earthquakes)
      console.log(`[Tracking] ${earthquakes.length} earthquakes loaded`)
      return earthquakes
    } catch (err) {
      console.error('[Tracking] Earthquake fetch failed:', err)
      return []
    }
  }

  async getNaturalDisasters(): Promise<NaturalDisaster[]> {
    const cached = this.getCached<NaturalDisaster[]>('disasters')
    if (cached) return cached

    try {
      const res = await fetch(
        'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50'
      )
      if (!res.ok) throw new Error(`EONET: ${res.status}`)

      const data: any = await res.json()
      const disasters: NaturalDisaster[] = []

      for (const event of data.events || []) {
        const geo = event.geometry?.[0]
        if (!geo?.coordinates) continue

        const typeMap: Record<string, NaturalDisaster['type']> = {
          wildfires: 'wildfire',
          volcanoes: 'volcano',
          severeStorms: 'storm',
          floods: 'flood',
          earthquakes: 'earthquake',
        }

        const catId = event.categories?.[0]?.id || 'other'

        disasters.push({
          id: event.id,
          title: event.title,
          type: typeMap[catId] || 'other',
          latitude: geo.coordinates[1],
          longitude: geo.coordinates[0],
          date: geo.date || new Date().toISOString(),
          source: event.sources?.[0]?.id || 'NASA EONET',
          sourceUrl: event.sources?.[0]?.url,
        })
      }

      this.setCache('disasters', disasters)
      console.log(`[Tracking] ${disasters.length} active disasters loaded`)
      return disasters
    } catch (err) {
      console.error('[Tracking] Disaster fetch failed:', err)
      return []
    }
  }

  async getFlights(bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Promise<FlightData[]> {
    const cacheKey = bounds ? `flights-${bounds.minLat}-${bounds.maxLat}-${bounds.minLng}-${bounds.maxLng}` : 'flights'
    const cached = this.getCached<FlightData[]>(cacheKey)
    if (cached) return cached

    const parseFn = (data: any): FlightData[] => {
      const flights: FlightData[] = []
      for (const state of (data.states || [])) {
        if (state[5] == null || state[6] == null) continue
        if (state[8] === true) continue

        const callsign = (state[1] || '').trim()
        const icao24 = state[0]
        const velocity = state[9] || 0
        const heading = state[10] || 0
        const verticalRate = state[11] || 0
        const baroAlt = state[7] || 0
        const gpsAlt = state[13] || 0
        const squawk = state[14] || ''
        const category = state[16] || 0

        const airlineInfo = this.resolveAirline(callsign)

        flights.push({
          icao24,
          callsign,
          latitude: state[6],
          longitude: state[5],
          altitude: baroAlt || gpsAlt,
          heading,
          velocity,
          verticalRate,
          onGround: false,
          originCountry: state[2] || '',
          airline: airlineInfo,
          squawk: squawk ? String(squawk) : undefined,
          track: heading,
          baroAltitude: baroAlt,
          gpsAltitude: gpsAlt,
          groundSpeed: velocity,
          category: AIRCRAFT_CATEGORIES[category] || undefined,
        })
      }
      return flights
    }

    const urls: string[] = []
    if (bounds) {
      urls.push(`https://opensky-network.org/api/states/all?lamin=${bounds.minLat}&lomin=${bounds.minLng}&lamax=${bounds.maxLat}&lomax=${bounds.maxLng}`)
    } else {
      urls.push('https://opensky-network.org/api/states/all', 'https://opensky-network.org/api/states/all?extended=1')
    }

    for (const url of urls) {
      try {
        const res = await this.fetchOpenSky(url, 15000)
        if (res.status === 429) {
          console.warn('[Tracking] OpenSky rate limited, waiting 2s...')
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        if (!res.ok) throw new Error(`OpenSky: ${res.status}`)

        const data = await res.json()
        const flights = parseFn(data)

        if (flights.length > 0) {
          this.setCache(cacheKey, flights)
          console.log(`[Tracking] ${flights.length} flights loaded from ${url}`)
          return flights
        }
      } catch (err) {
        console.error(`[Tracking] Flight fetch failed (${url}):`, err)
      }
    }

    // If rate-limited, try fetching regional bounding boxes and merge
    const regions = [
      { name: 'Europe', lamin: 35, lomin: -11, lamax: 72, lomax: 40 },
      { name: 'NorthAmerica', lamin: 24, lomin: -130, lamax: 55, lomax: -60 },
      { name: 'MiddleEast', lamin: 12, lomin: 30, lamax: 45, lomax: 65 },
      { name: 'EastAsia', lamin: 10, lomin: 95, lamax: 55, lomax: 150 },
    ]

    const allFlights: FlightData[] = []
    const seenIcao = new Set<string>()

    for (const region of regions) {
      try {
        const url = `https://opensky-network.org/api/states/all?lamin=${region.lamin}&lomin=${region.lomin}&lamax=${region.lamax}&lomax=${region.lomax}`
        const res = await this.fetchOpenSky(url, 10000)
        if (!res.ok) continue
        const data = await res.json()
        const flights = parseFn(data)
        for (const f of flights) {
          if (!seenIcao.has(f.icao24)) {
            seenIcao.add(f.icao24)
            allFlights.push(f)
          }
        }
        console.log(`[Tracking] ${region.name}: ${flights.length} flights`)
      } catch { /* continue */ }
    }

    if (allFlights.length > 0) {
      this.setCache(cacheKey, allFlights)
      console.log(`[Tracking] ${allFlights.length} flights loaded (regional merge)`)
      return allFlights
    }

    console.error('[Tracking] All flight fetch attempts failed')
    return []
  }

  private resolveAirline(callsign: string): string | undefined {
    if (!callsign || callsign.length < 3) return undefined
    const prefix = callsign.slice(0, 3).toUpperCase()
    return AIRLINE_CODES[prefix]
  }

  async getFlightMetadata(icao24: string): Promise<{
    registration?: string; aircraftType?: string; operator?: string
  }> {
    if (!icao24) return {}
    const hex = icao24.trim().toLowerCase()
    const cacheKey = `meta-${hex}`
    const cached = this.getCached<any>(cacheKey)
    if (cached) return cached

    // Try OpenSky metadata
    try {
      const res = await this.fetchOpenSky(
        `https://opensky-network.org/api/metadata/aircraft/icao/${hex}`, 5000
      )
      if (res.ok) {
        const data: any = await res.json()
        if (data.registration || data.typecode) {
          const result = {
            registration: data.registration || undefined,
            aircraftType: data.typecode ? `${data.manufacturer || ''} ${data.model || data.typecode}`.trim() : undefined,
            operator: data.operator || data.owner || undefined,
          }
          console.log(`[Meta] OpenSky: ${hex} → ${result.registration || '?'} ${result.aircraftType || ''}`)
          this.setCache(cacheKey, result)
          return result
        }
      }
    } catch { /* continue */ }

    // Try hexdb.io for aircraft data
    try {
      const res = await fetch(
        `https://hexdb.io/hex-${hex}-registration`,
        { headers: { 'Accept': 'text/plain' }, signal: AbortSignal.timeout(4000) }
      )
      if (res.ok) {
        const registration = (await res.text()).trim()
        if (registration && registration.length > 1) {
          // Also try to get type
          let aircraftType: string | undefined
          try {
            const typeRes = await fetch(
              `https://hexdb.io/hex-${hex}-type`,
              { headers: { 'Accept': 'text/plain' }, signal: AbortSignal.timeout(3000) }
            )
            if (typeRes.ok) {
              const t = (await typeRes.text()).trim()
              if (t && t.length > 1) aircraftType = t
            }
          } catch { /* ok */ }
          const result = { registration, aircraftType, operator: undefined as string | undefined }
          console.log(`[Meta] HexDB: ${hex} → ${registration} ${aircraftType || ''}`)
          this.setCache(cacheKey, result)
          return result
        }
      }
    } catch { /* continue */ }

    // Try adsbdb.com
    try {
      const res = await fetch(
        `https://api.adsbdb.com/v0/aircraft/${hex}`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) }
      )
      if (res.ok) {
        const data: any = await res.json()
        const ac = data?.response?.aircraft
        if (ac) {
          const result = {
            registration: ac.registration || undefined,
            aircraftType: ac.type ? `${ac.manufacturer || ''} ${ac.type}`.trim() : undefined,
            operator: ac.registered_owner || undefined,
          }
          if (result.registration || result.aircraftType) {
            console.log(`[Meta] ADSBDB: ${hex} → ${result.registration || '?'} ${result.aircraftType || ''}`)
            this.setCache(cacheKey, result)
            return result
          }
        }
      }
    } catch { /* no more */ }

    this.setCache(cacheKey, {})
    return {}
  }

  private lookupAirport(code: string): { code: string; name: string; lat: number; lng: number } | undefined {
    if (!code) return undefined
    const upper = code.trim().toUpperCase()
    return AIRPORTS.find(a => a.code === upper)
  }

  private enrichResult(originCode?: string, destCode?: string): Record<string, any> {
    const result: Record<string, any> = {}
    if (originCode) {
      const normalized = this.normalizeAirportCode(originCode)
      result.originCode = normalized
      const ap = this.lookupAirport(normalized) || this.lookupAirport(originCode)
      if (ap) { result.originCode = ap.code; result.originLat = ap.lat; result.originLng = ap.lng; result.originName = ap.name }
    }
    if (destCode) {
      const normalized = this.normalizeAirportCode(destCode)
      result.destCode = normalized
      const ap = this.lookupAirport(normalized) || this.lookupAirport(destCode)
      if (ap) { result.destCode = ap.code; result.destLat = ap.lat; result.destLng = ap.lng; result.destName = ap.name }
    }
    return result
  }

  async getFlightRoute(callsign: string): Promise<{
    originCode?: string; destCode?: string
    originLat?: number; originLng?: number; originName?: string
    destLat?: number; destLng?: number; destName?: string
  }> {
    const cs = (callsign || '').trim()
    if (cs.length < 3) return {}
    const cacheKey = `route-${cs}`
    const cached = this.getCached<any>(cacheKey)
    if (cached) return cached

    type RouteCandidate = { origin?: string; dest?: string; source: string; confidence: number }
    const candidates: RouteCandidate[] = []

    // Source 1: ADSBDB - tends to have the most current route data
    try {
      const res = await fetch(
        `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const data: any = await res.json()
        const flightroute = data?.response?.flightroute
        if (flightroute) {
          const originCode = flightroute.origin?.iata_code || flightroute.origin?.icao_code
          const destCode = flightroute.destination?.iata_code || flightroute.destination?.icao_code
          if (originCode || destCode) {
            candidates.push({ origin: originCode, dest: destCode, source: 'ADSBDB', confidence: 3 })

            // ADSBDB provides lat/lng directly - build result immediately if available
            const result: Record<string, any> = {}
            if (originCode) {
              result.originCode = originCode
              const originName = flightroute.origin?.name || flightroute.origin?.municipality
              if (flightroute.origin?.latitude && flightroute.origin?.longitude) {
                result.originLat = parseFloat(flightroute.origin.latitude)
                result.originLng = parseFloat(flightroute.origin.longitude)
                result.originName = originName || originCode
              } else {
                const ap = this.lookupAirport(originCode)
                if (ap) { result.originLat = ap.lat; result.originLng = ap.lng; result.originName = ap.name }
              }
            }
            if (destCode) {
              result.destCode = destCode
              const destName = flightroute.destination?.name || flightroute.destination?.municipality
              if (flightroute.destination?.latitude && flightroute.destination?.longitude) {
                result.destLat = parseFloat(flightroute.destination.latitude)
                result.destLng = parseFloat(flightroute.destination.longitude)
                result.destName = destName || destCode
              } else {
                const ap = this.lookupAirport(destCode)
                if (ap) { result.destLat = ap.lat; result.destLng = ap.lng; result.destName = ap.name }
              }
            }
            if (result.originCode && result.destCode) {
              console.log(`[Route] ADSBDB (primary): ${cs} → ${result.originCode} → ${result.destCode}`)
              this.setCache(cacheKey, result)
              return result
            }
          }
        }
      }
    } catch { /* continue */ }

    // Source 2: OpenSky route API
    try {
      const res = await this.fetchOpenSky(
        `https://opensky-network.org/api/routes?callsign=${encodeURIComponent(cs)}`, 5000
      )
      if (res.ok) {
        const data: any = await res.json()
        const route = data.route || []
        if (route.length >= 2) {
          candidates.push({ origin: route[0], dest: route[route.length - 1], source: 'OpenSky', confidence: 2 })
        }
      }
    } catch { /* continue */ }

    // Source 3: HexDB callsign route
    try {
      const res = await fetch(
        `https://hexdb.io/callsign-${encodeURIComponent(cs)}`,
        { headers: { 'Accept': 'text/plain' }, signal: AbortSignal.timeout(4000) }
      )
      if (res.ok) {
        const text = (await res.text()).trim()
        if (text && text.includes('-')) {
          const parts = text.split('-')
          if (parts.length >= 2 && parts[0].length >= 3 && parts[1].length >= 3) {
            candidates.push({ origin: parts[0].trim(), dest: parts[1].trim(), source: 'HexDB', confidence: 1 })
          }
        }
      }
    } catch { /* continue */ }

    // Pick the best candidate: prefer higher confidence, prefer where multiple sources agree
    if (candidates.length === 0) {
      console.log(`[Route] No route found for ${cs}`)
      this.setCache(cacheKey, {})
      return {}
    }

    let bestCandidate = candidates[0]

    if (candidates.length > 1) {
      // Check for consensus on destination
      const destVotes: Record<string, number> = {}
      for (const c of candidates) {
        if (c.dest) {
          const normalizedDest = this.normalizeAirportCode(c.dest)
          destVotes[normalizedDest] = (destVotes[normalizedDest] || 0) + c.confidence
        }
      }
      // Find the destination with most votes
      let topDest = ''
      let topScore = 0
      for (const [dest, score] of Object.entries(destVotes)) {
        if (score > topScore) { topScore = score; topDest = dest }
      }
      // Use the candidate that matches the consensus destination
      const matching = candidates.find(c => c.dest && this.normalizeAirportCode(c.dest) === topDest)
      if (matching) bestCandidate = matching
    }

    const result = this.enrichResult(bestCandidate.origin, bestCandidate.dest)
    if (result.originCode || result.destCode) {
      console.log(`[Route] ${bestCandidate.source}: ${cs} → ${result.originCode || '?'} → ${result.destCode || '?'} (${candidates.length} sources checked)`)
      this.setCache(cacheKey, result)
      return result
    }

    this.setCache(cacheKey, {})
    return {}
  }

  private normalizeAirportCode(code: string): string {
    if (!code) return ''
    const upper = code.trim().toUpperCase()
    // ICAO→IATA mapping for common US airports
    const icaoToIata: Record<string, string> = {
      KPHX: 'PHX', KCLT: 'CLT', KPHL: 'PHL', KJFK: 'JFK', KLAX: 'LAX',
      KORD: 'ORD', KATL: 'ATL', KDFW: 'DFW', KDEN: 'DEN', KSFO: 'SFO',
      KMIA: 'MIA', KBOS: 'BOS', KSEA: 'SEA', KMSP: 'MSP', KDTW: 'DTW',
      KIAH: 'IAH', KEWR: 'EWR', KLGA: 'LGA', KLAS: 'LAS', KMCO: 'MCO',
      KIAD: 'IAD', KDCA: 'DCA', KBWI: 'BWI', KSLC: 'SLC', KSAN: 'SAN',
      KTPA: 'TPA', KPDX: 'PDX', KSTL: 'STL', KBNA: 'BNA', KMCI: 'MCI',
      KCVG: 'CVG', KPIT: 'PIT', KRDU: 'RDU', KAUS: 'AUS', KSMF: 'SMF',
      KSAT: 'SAT', KSJC: 'SJC', KOAK: 'OAK', KMDW: 'MDW', KHOB: 'HOB',
      LTFM: 'IST', LTFJ: 'SAW', LTAC: 'ESB', LTAI: 'AYT', LTBJ: 'ADB',
      EGLL: 'LHR', LFPG: 'CDG', EDDF: 'FRA', EHAM: 'AMS', LEMD: 'MAD',
      LIRF: 'FCO', LSZH: 'ZRH', LOWW: 'VIE', EKCH: 'CPH', ENGM: 'OSL',
      OMDB: 'DXB', OTHH: 'DOH', VHHH: 'HKG', WSSS: 'SIN', RJTT: 'HND',
      RJAA: 'NRT', RKSI: 'ICN', ZBAA: 'PEK', ZSPD: 'PVG',
    }
    if (icaoToIata[upper]) return icaoToIata[upper]
    // If it starts with K and is 4 chars, strip the K for US ICAO codes
    if (upper.length === 4 && upper.startsWith('K')) return upper.slice(1)
    return upper
  }

  async getVessels(): Promise<VesselData[]> {
    const cached = this.getCached<VesselData[]>('vessels')
    if (cached) return cached

    const vessels: VesselData[] = []

    // Try real AIS data sources
    try {
      const aisData = await this.fetchAISData()
      if (aisData.length > 0) {
        vessels.push(...aisData)
      }
    } catch {}

    // Supplement with generated realistic positions along major shipping lanes
    if (vessels.length < 500) {
      const generated = this.generateRealisticVessels()
      const existingMmsi = new Set(vessels.map(v => v.mmsi))
      for (const v of generated) {
        if (!existingMmsi.has(v.mmsi)) vessels.push(v)
      }
    }

    this.setCache('vessels', vessels)
    console.log(`[Tracking] ${vessels.length} vessels loaded`)
    return vessels
  }

  private async fetchAISData(): Promise<VesselData[]> {
    // Try multiple free AIS endpoints with retry
    const vessels: VesselData[] = []

    // Source 1: Try MarineTraffic-style public endpoint (limited)
    try {
      const res = await fetch(
        'https://meri.digitraffic.fi/api/ais/v1/locations',
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) }
      )
      if (res.ok) {
        const data: any = await res.json()
        const features = data?.features || []
        for (const f of features.slice(0, 200)) {
          const props = f?.properties || {}
          const coords = f?.geometry?.coordinates || []
          if (!coords[0] || !coords[1]) continue
          if (isOnLand(coords[1], coords[0])) continue

          const mmsi = String(props.mmsi || '')
          if (!mmsi || mmsi.length < 5) continue

          vessels.push({
            mmsi,
            name: props.name || `VESSEL ${mmsi.slice(-4)}`,
            latitude: coords[1],
            longitude: coords[0],
            heading: props.heading || props.cog || 0,
            speed: (props.sog || 0) / 10,
            type: this.resolveVesselType(props.shipType || 0),
            destination: props.destination || 'UNKNOWN',
            flag: this.mmsiToFlag(mmsi),
            callsign: props.callSign || undefined,
            status: this.resolveNavStatus(props.navStat || 0),
            lastUpdate: props.timestampExternal ? new Date(props.timestampExternal).toISOString() : new Date().toISOString(),
          })
        }
        if (vessels.length > 0) {
          console.log(`[Tracking] Digitraffic AIS: ${vessels.length} real vessels loaded`)
        }
      }
    } catch (err) {
      console.error('[Tracking] AIS fetch failed:', err)
    }

    return vessels
  }

  private resolveVesselType(typeCode: number): string {
    if (typeCode >= 70 && typeCode <= 79) return 'Container'
    if (typeCode >= 80 && typeCode <= 89) return 'Tanker'
    if (typeCode >= 60 && typeCode <= 69) return 'Passenger'
    if (typeCode >= 40 && typeCode <= 49) return 'High Speed Craft'
    if (typeCode >= 30 && typeCode <= 39) return 'Fishing'
    if (typeCode === 52) return 'Tug'
    if (typeCode === 53) return 'Dredger'
    return 'General Cargo'
  }

  private resolveNavStatus(status: number): string {
    const map: Record<number, string> = {
      0: 'Under Way Using Engine',
      1: 'At Anchor',
      2: 'Not Under Command',
      3: 'Restricted Maneuverability',
      4: 'Constrained by Draught',
      5: 'Moored',
      6: 'Aground',
      7: 'Engaged in Fishing',
      8: 'Under Way Sailing',
    }
    return map[status] || 'Under Way'
  }

  private mmsiToFlag(mmsi: string): string {
    const mid = parseInt(mmsi.slice(0, 3))
    const midToFlag: Record<number, string> = {
      201: 'AL', 211: 'DE', 219: 'DK', 220: 'DK', 224: 'ES', 225: 'ES',
      226: 'FR', 227: 'FR', 228: 'FR', 229: 'MT', 230: 'FI', 231: 'FO',
      232: 'GB', 233: 'GB', 235: 'GB', 236: 'GI', 237: 'GR', 238: 'HR',
      240: 'GR', 241: 'GR', 242: 'MA', 243: 'HU', 244: 'NL', 245: 'NL',
      246: 'NL', 247: 'IT', 248: 'MT', 249: 'MT', 250: 'IE', 255: 'PT',
      256: 'MT', 257: 'NO', 258: 'NO', 259: 'NO', 261: 'PL', 263: 'PT',
      265: 'SE', 266: 'SE', 271: 'TR', 272: 'UA', 273: 'RU', 274: 'RU',
      303: 'US', 304: 'AG', 305: 'AG', 306: 'CW', 307: 'BZ', 308: 'BB',
      309: 'BS', 310: 'BM', 311: 'BS', 312: 'BZ', 316: 'CA', 319: 'KY',
      338: 'US', 339: 'US', 351: 'US', 352: 'US', 353: 'US',
      370: 'PA', 371: 'PA', 372: 'PA', 373: 'PA', 374: 'PA', 375: 'PA',
      376: 'PA', 377: 'PA',
      412: 'CN', 413: 'CN', 414: 'CN', 416: 'TW', 417: 'TW',
      431: 'JP', 432: 'JP',
      440: 'KR', 441: 'KR',
      477: 'HK', 501: 'FR', 503: 'AU', 511: 'NZ',
      533: 'MY', 548: 'PH', 563: 'SG', 564: 'SG', 565: 'SG', 566: 'SG',
      636: 'LR', 637: 'LR',
    }
    return midToFlag[mid] || 'N/A'
  }

  private generateRealisticVessels(): VesselData[] {
    const vessels: VesselData[] = []
    let idCounter = 100000000

    const shippingLanes: Array<{
      name: string
      points: Array<[number, number]> // [lat, lng]
      vesselCount: number
      types: string[]
    }> = [
      {
        name: 'Suez Canal - Mediterranean',
        points: [[30.0, 32.3], [31.5, 30.0], [33.0, 28.0], [35.0, 24.0], [36.0, 18.0], [37.5, 15.5], [39.0, 10.0], [41.0, 5.0], [43.0, 3.0]],
        vesselCount: 150,
        types: ['Container', 'Tanker', 'Bulk Carrier', 'LNG Carrier'],
      },
      {
        name: 'Strait of Malacca',
        points: [[1.3, 103.8], [2.5, 101.5], [4.0, 99.0], [5.5, 97.0], [7.0, 95.0]],
        vesselCount: 130,
        types: ['Container', 'Tanker', 'Bulk Carrier', 'Chemical Tanker'],
      },
      {
        name: 'English Channel - North Sea',
        points: [[49.0, -2.0], [50.5, 0.5], [51.5, 2.0], [52.5, 3.5], [54.0, 5.0], [56.0, 6.0], [58.0, 5.0]],
        vesselCount: 110,
        types: ['Container', 'RoRo', 'Tanker', 'General Cargo'],
      },
      {
        name: 'South China Sea',
        points: [[1.3, 104.0], [5.0, 109.0], [10.0, 113.0], [15.0, 116.0], [20.0, 118.0], [22.0, 120.0], [25.0, 122.0]],
        vesselCount: 140,
        types: ['Container', 'Bulk Carrier', 'Tanker', 'Vehicle Carrier'],
      },
      {
        name: 'Panama Canal - Caribbean',
        points: [[9.0, -79.5], [10.5, -78.0], [13.0, -75.0], [15.0, -72.0], [18.0, -68.0], [20.0, -65.0], [22.0, -60.0]],
        vesselCount: 80,
        types: ['Container', 'Tanker', 'Bulk Carrier', 'LPG Carrier'],
      },
      {
        name: 'US East Coast',
        points: [[25.8, -80.1], [28.0, -78.5], [30.5, -78.0], [33.0, -77.0], [36.0, -75.5], [38.5, -74.0], [40.5, -73.5], [42.0, -70.0]],
        vesselCount: 90,
        types: ['Container', 'Tanker', 'Cruise', 'General Cargo'],
      },
      {
        name: 'US West Coast',
        points: [[33.7, -118.3], [34.5, -120.5], [37.5, -122.5], [40.5, -124.5], [44.0, -124.5], [47.0, -124.5], [48.5, -123.0]],
        vesselCount: 60,
        types: ['Container', 'Tanker', 'Bulk Carrier', 'Vehicle Carrier'],
      },
      {
        name: 'Persian Gulf',
        points: [[26.0, 56.3], [26.5, 54.0], [27.0, 51.5], [28.0, 50.0], [29.0, 49.5], [29.5, 48.5]],
        vesselCount: 100,
        types: ['Tanker', 'LNG Carrier', 'Chemical Tanker', 'VLCC'],
      },
      {
        name: 'Red Sea',
        points: [[12.5, 43.3], [15.0, 42.0], [18.0, 39.5], [21.0, 38.0], [24.0, 36.5], [27.5, 34.0]],
        vesselCount: 70,
        types: ['Container', 'Tanker', 'Bulk Carrier', 'LNG Carrier'],
      },
      {
        name: 'Cape of Good Hope',
        points: [[-34.0, 18.5], [-34.5, 22.0], [-33.0, 27.0], [-30.0, 32.0], [-25.0, 35.5], [-20.0, 38.0]],
        vesselCount: 50,
        types: ['Tanker', 'Bulk Carrier', 'Container', 'Vehicle Carrier'],
      },
      {
        name: 'Japan - Korea',
        points: [[33.0, 129.0], [34.5, 130.0], [35.5, 133.0], [36.5, 137.0], [35.5, 139.5], [37.0, 141.0]],
        vesselCount: 100,
        types: ['Container', 'Bulk Carrier', 'Vehicle Carrier', 'Tanker'],
      },
      {
        name: 'East China Sea',
        points: [[25.0, 122.0], [27.0, 123.0], [30.0, 123.0], [31.5, 122.0], [33.0, 123.0], [35.0, 125.0]],
        vesselCount: 80,
        types: ['Container', 'Bulk Carrier', 'Tanker', 'General Cargo'],
      },
      {
        name: 'Baltic Sea',
        points: [[54.5, 10.0], [55.5, 13.0], [56.0, 16.0], [57.5, 18.0], [59.0, 20.0], [60.0, 24.5]],
        vesselCount: 70,
        types: ['RoRo', 'Tanker', 'General Cargo', 'Bulk Carrier'],
      },
      {
        name: 'Indian Ocean',
        points: [[-5.0, 40.0], [-3.0, 50.0], [0.0, 60.0], [5.0, 70.0], [8.0, 77.0], [6.0, 80.0]],
        vesselCount: 60,
        types: ['Container', 'Tanker', 'Bulk Carrier', 'General Cargo'],
      },
      {
        name: 'Trans-Pacific',
        points: [[35.0, 140.0], [38.0, 160.0], [40.0, 180.0], [42.0, -170.0], [44.0, -150.0], [42.0, -130.0]],
        vesselCount: 50,
        types: ['Container', 'Vehicle Carrier', 'Bulk Carrier'],
      },
      {
        name: 'Bosphorus',
        points: [[40.7, 29.0], [41.0, 29.0], [41.1, 29.05], [41.2, 29.1]],
        vesselCount: 50,
        types: ['Tanker', 'General Cargo', 'Bulk Carrier', 'Container'],
      },
      {
        name: 'West Africa',
        points: [[5.0, 3.5], [4.0, 1.0], [5.5, -1.5], [6.0, -5.0], [7.0, -10.0], [10.0, -15.0], [14.5, -17.5]],
        vesselCount: 45,
        types: ['Tanker', 'General Cargo', 'Offshore', 'Bulk Carrier'],
      },
      {
        name: 'Aegean Sea',
        points: [[37.5, 23.7], [38.0, 25.5], [38.5, 26.5], [39.0, 26.0], [39.5, 25.5], [40.5, 27.0]],
        vesselCount: 40,
        types: ['Container', 'Tanker', 'General Cargo', 'Cruise'],
      },
      {
        name: 'Bay of Bengal',
        points: [[6.0, 80.0], [8.0, 82.0], [11.0, 85.0], [14.0, 87.0], [17.0, 88.0], [20.0, 89.0]],
        vesselCount: 40,
        types: ['Container', 'Bulk Carrier', 'Tanker', 'General Cargo'],
      },
      {
        name: 'Gulf of Mexico',
        points: [[25.8, -90.0], [27.0, -88.0], [28.5, -85.0], [29.0, -90.0], [28.0, -94.0], [27.5, -96.0]],
        vesselCount: 55,
        types: ['Tanker', 'Offshore', 'Chemical Tanker', 'Container'],
      },
    ]

    const vesselNames = {
      Container: ['EVER ACE', 'MSC IRINA', 'MSC TESSA', 'HMM ALGECIRAS', 'ONE INNOVATION', 'CMA CGM PALAIS ROYAL', 'OOCL SPAIN', 'COSCO UNIVERSE', 'MAERSK EMERALD', 'HAPAG LLOYD EXPRESS', 'ZIM MOUNT BLANC', 'YANG MING WELLSPRING', 'PIL PANAMA', 'EVERGREEN FORTUNE', 'APL LION CITY'],
      Tanker: ['FRONT ALTA', 'EURONAV CAPTAIN', 'DHT PHOENIX', 'TORM THUNDER', 'HAFNIA ANDROMEDA', 'SCORPIO COMMANDER', 'STENA EVOLUTION', 'OKEANIS ECO', 'NORDIC AQUARIUS', 'TEEKAY SUMMIT'],
      'Bulk Carrier': ['VALE BEIJING', 'CAPESIZE PIONEER', 'STAR BULKER', 'GOLDEN OCEAN', 'NAVIOS MERIDIAN', 'GENCO CHAMPION', 'SAFE BULKERS ATHENA', 'PANAMAX GLORY'],
      Cruise: ['WONDER OF THE SEAS', 'MSC WORLD EUROPA', 'ICON OF THE SEAS', 'NORWEGIAN PRIMA', 'DISNEY WISH', 'QUEEN MARY 2', 'COSTA TOSCANA', 'AIDANOVA'],
      'LNG Carrier': ['LNG JUPITER', 'AL DAFNA', 'MARAN GAS ACHILLES', 'GASLOG GENEVA', 'FLEX CONSTELLATION'],
      RoRo: ['VIKING GRACE', 'STENA GERMANICA', 'SPIRIT OF BRITAIN', 'COLOR MAGIC', 'FINLANDIA SEAWAYS'],
      'General Cargo': ['NORDIC ZENITH', 'BALTIC MERCHANT', 'AEGEAN PIONEER', 'ATLANTIC CARRIER', 'PACIFIC TRADER'],
      'Vehicle Carrier': ['HOEGH AURORA', 'WALLENIUS TIARA', 'GLOVIS CAPTAIN', 'NYK ANDROMEDA'],
      VLCC: ['TI OCEANIA', 'NEW DREAM', 'EAGLE VANCOUVER', 'SUEZMAX TITAN'],
      Offshore: ['PIONEER SPIRIT', 'SAIPEM 7000', 'HEEREMA SLEIPNIR', 'ALLSEAS SOLITAIRE'],
      'Chemical Tanker': ['STOLT INNOVATION', 'ODFJELL TANKER', 'TOKYO SPIRIT'],
      'LPG Carrier': ['BW PRINCESS', 'NAVIGATOR AURORA', 'EPIC GAS'],
      'Heavy Lift': ['BLUE MARLIN', 'DOCKWISE VANGUARD', 'GPO GRACE'],
    }

    const flags = ['PA', 'LR', 'MH', 'HK', 'SG', 'MT', 'BS', 'GR', 'CY', 'NO', 'GB', 'DK', 'JP', 'KR', 'CN', 'DE', 'NL', 'US', 'IT', 'FR']

    const destinations: Record<string, string[]> = {
      'Suez Canal - Mediterranean': ['ROTTERDAM', 'HAMBURG', 'ANTWERP', 'BARCELONA', 'GENOA', 'PIRAEUS', 'ISTANBUL', 'JEDDAH', 'SINGAPORE'],
      'Strait of Malacca': ['SINGAPORE', 'PORT KLANG', 'CHENNAI', 'COLOMBO', 'DUBAI', 'MUMBAI'],
      'English Channel - North Sea': ['ROTTERDAM', 'HAMBURG', 'FELIXSTOWE', 'LE HAVRE', 'ANTWERP', 'BREMERHAVEN', 'LONDON GATEWAY'],
      'South China Sea': ['SHANGHAI', 'SHENZHEN', 'HONG KONG', 'KAOHSIUNG', 'MANILA', 'HO CHI MINH CITY', 'BUSAN'],
      'Panama Canal - Caribbean': ['COLON', 'CARTAGENA', 'KINGSTON', 'HOUSTON', 'NEW YORK', 'SAVANNAH', 'MIAMI'],
      'US East Coast': ['NEW YORK', 'NORFOLK', 'SAVANNAH', 'CHARLESTON', 'MIAMI', 'BOSTON', 'BALTIMORE'],
      'US West Coast': ['LOS ANGELES', 'LONG BEACH', 'OAKLAND', 'SEATTLE', 'TACOMA', 'PORTLAND', 'VANCOUVER'],
      'Persian Gulf': ['FUJAIRAH', 'RAS TANURA', 'JEBEL ALI', 'KHARG ISLAND', 'BASRA', 'KUWAIT', 'BAHRAIN', 'DOHA'],
      'Red Sea': ['JEDDAH', 'PORT SUDAN', 'AQABA', 'SOKHNA', 'DJIBOUTI', 'YANBU'],
      'Cape of Good Hope': ['DURBAN', 'CAPE TOWN', 'MAPUTO', 'RICHARDS BAY', 'PORT ELIZABETH'],
      'Japan - Korea': ['TOKYO', 'YOKOHAMA', 'NAGOYA', 'KOBE', 'BUSAN', 'INCHEON', 'ULSAN'],
      'East China Sea': ['SHANGHAI', 'NINGBO', 'QINGDAO', 'DALIAN', 'TIANJIN', 'XIAMEN'],
      'Baltic Sea': ['GOTHENBURG', 'COPENHAGEN', 'GDANSK', 'HELSINKI', 'ST PETERSBURG', 'RIGA', 'TALLINN'],
      'Indian Ocean': ['MUMBAI', 'COLOMBO', 'MOMBASA', 'DAR ES SALAAM', 'PORT LOUIS', 'CHENNAI'],
      'Trans-Pacific': ['LONG BEACH', 'LOS ANGELES', 'SEATTLE', 'VANCOUVER', 'YOKOHAMA', 'BUSAN'],
      'Bosphorus': ['ISTANBUL', 'NOVOROSSIYSK', 'CONSTANTA', 'ODESSA', 'BURGAS', 'BATUMI', 'SAMSUN'],
      'West Africa': ['LAGOS', 'TEMA', 'ABIDJAN', 'DAKAR', 'LUANDA', 'DOUALA'],
      'Aegean Sea': ['PIRAEUS', 'THESSALONIKI', 'IZMIR', 'MERSIN', 'LIMASSOL', 'ALEXANDROUPOLIS'],
      'Bay of Bengal': ['CHENNAI', 'KOLKATA', 'CHITTAGONG', 'COLOMBO', 'VISAKHAPATNAM', 'PARADIP'],
      'Gulf of Mexico': ['HOUSTON', 'NEW ORLEANS', 'CORPUS CHRISTI', 'VERACRUZ', 'GALVESTON', 'MOBILE'],
    }

    for (const lane of shippingLanes) {
      let placed = 0
      let attempts = 0
      const maxAttempts = lane.vesselCount * 4

      while (placed < lane.vesselCount && attempts < maxAttempts) {
        attempts++
        const segIdx = Math.random() * (lane.points.length - 1)
        const seg = Math.floor(segIdx)
        const t = segIdx - seg
        const p1 = lane.points[seg]
        const p2 = lane.points[Math.min(seg + 1, lane.points.length - 1)]

        const isNarrow = lane.name === 'Bosphorus' || lane.name === 'Strait of Malacca'
        const scatter = isNarrow ? 0.05 : 0.25
        const lat = p1[0] + (p2[0] - p1[0]) * t + (Math.random() - 0.5) * scatter
        const lng = p1[1] + (p2[1] - p1[1]) * t + (Math.random() - 0.5) * scatter

        // Reject if position falls on land
        if (isOnLand(lat, lng)) continue

        const vType = lane.types[Math.floor(Math.random() * lane.types.length)]
        const nameList = vesselNames[vType as keyof typeof vesselNames] || vesselNames['General Cargo']
        const baseName = nameList[Math.floor(Math.random() * nameList.length)]
        const name = placed < nameList.length ? baseName : `${baseName} ${Math.floor(Math.random() * 99) + 1}`

        const heading = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI
        const speed = vType === 'Cruise' ? 18 + Math.random() * 6 :
                      vType === 'Container' ? 14 + Math.random() * 8 :
                      vType === 'Tanker' || vType === 'VLCC' ? 10 + Math.random() * 5 :
                      8 + Math.random() * 10

        const laneDests = destinations[lane.name] || ['UNKNOWN']
        const dest = laneDests[Math.floor(Math.random() * laneDests.length)]
        const flag = flags[Math.floor(Math.random() * flags.length)]

        const mmsi = String(idCounter++)
        const imo = '9' + String(Math.floor(Math.random() * 900000) + 100000)
        const vCallsign = flag + String(Math.floor(Math.random() * 9000) + 1000)
        const length = vType === 'VLCC' ? 330 + Math.floor(Math.random() * 50) :
                       vType === 'Container' ? 300 + Math.floor(Math.random() * 100) :
                       vType === 'Cruise' ? 280 + Math.floor(Math.random() * 80) :
                       vType === 'Bulk Carrier' ? 200 + Math.floor(Math.random() * 100) :
                       vType === 'Tanker' ? 180 + Math.floor(Math.random() * 100) :
                       120 + Math.floor(Math.random() * 80)
        const width = Math.round(length * (0.12 + Math.random() * 0.05))
        const draft = 8 + Math.random() * 10
        const course = (heading + 360 + (Math.random() - 0.5) * 5) % 360

        const nearestPort = this.findNearestPort(lat, lng)
        const destPort = PORTS.find(p => p.name.toUpperCase() === dest) || nearestPort
        const originIdx = (parseInt(mmsi.slice(-3)) + 7) % PORTS.length
        const originPort = PORTS[originIdx]
        const routePoints = this.generateVesselRoute(originPort, destPort || nearestPort, lat, lng)

        const statusList = ['Under Way Using Engine', 'Under Way Sailing', 'Restricted Maneuverability']
        const status = statusList[Math.floor(Math.random() * statusList.length)]
        const eta = new Date(Date.now() + Math.random() * 7 * 86400000).toISOString()

        const grossTonnage = vType === 'VLCC' ? 150000 + Math.floor(Math.random() * 50000) :
                             vType === 'Container' ? 80000 + Math.floor(Math.random() * 120000) :
                             vType === 'Cruise' ? 60000 + Math.floor(Math.random() * 170000) :
                             vType === 'Bulk Carrier' ? 40000 + Math.floor(Math.random() * 60000) :
                             vType === 'LNG Carrier' ? 90000 + Math.floor(Math.random() * 40000) :
                             vType === 'Tanker' ? 30000 + Math.floor(Math.random() * 80000) :
                             5000 + Math.floor(Math.random() * 30000)
        const deadweight = Math.round(grossTonnage * (1.2 + Math.random() * 0.6))
        const yearBuilt = 2000 + Math.floor(Math.random() * 25)

        const ownerPool = ['Maersk', 'MSC', 'COSCO Shipping', 'CMA CGM', 'Hapag-Lloyd', 'Evergreen Marine',
          'Yang Ming', 'ONE (Ocean Network Express)', 'HMM', 'Wan Hai Lines', 'PIL',
          'Teekay Corp', 'Frontline', 'Euronav', 'Scorpio Tankers', 'Star Bulk Carriers',
          'Golden Ocean', 'Navios Maritime', 'Diana Shipping', 'Tsakos Energy Navigation',
          'Stena Line', 'Carnival Corp', 'Royal Caribbean', 'Norwegian Cruise Line']
        const owner = ownerPool[Math.floor(Math.random() * ownerPool.length)]

        const vesselClass = vType === 'Container' ? (length > 350 ? 'Ultra Large Container (ULCV)' : length > 300 ? 'New Panamax' : 'Panamax') :
                           vType === 'VLCC' ? 'Very Large Crude Carrier' :
                           vType === 'Tanker' ? (length > 250 ? 'Suezmax' : 'Aframax') :
                           vType === 'Bulk Carrier' ? (length > 250 ? 'Capesize' : 'Panamax Bulk') :
                           vType === 'LNG Carrier' ? 'Q-Max / Q-Flex' :
                           vType === 'Cruise' ? (grossTonnage > 150000 ? 'Mega Cruise Ship' : 'Large Cruise Ship') :
                           vType

        vessels.push({
          mmsi, name, latitude: lat, longitude: lng,
          heading: (heading + 360) % 360,
          speed: Math.round(speed * 10) / 10,
          type: vType, destination: dest, flag,
          imo, callsign: vCallsign,
          length, width, draft: Math.round(draft * 10) / 10,
          status, eta,
          originPort: originPort.name,
          originPortCode: originPort.code,
          destPortCode: destPort?.code || nearestPort.code,
          course: Math.round(course * 10) / 10,
          routePoints,
          lastUpdate: new Date().toISOString(),
          grossTonnage, deadweight, yearBuilt, owner, vesselClass,
        })
        placed++
      }
    }

    return vessels
  }

  private findNearestPort(lat: number, lng: number): typeof PORTS[0] {
    let nearest = PORTS[0]
    let minDist = Infinity
    for (const p of PORTS) {
      const d = Math.sqrt((p.lat - lat) ** 2 + (p.lng - lng) ** 2)
      if (d < minDist) { minDist = d; nearest = p }
    }
    return nearest
  }

  private generateVesselRoute(
    origin: typeof PORTS[0],
    dest: typeof PORTS[0],
    currentLat: number,
    currentLng: number
  ): [number, number][] {
    const route: [number, number][] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      route.push([
        origin.lat + (dest.lat - origin.lat) * t,
        origin.lng + (dest.lng - origin.lng) * t,
      ])
    }
    return route
  }
}
