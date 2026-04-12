import type { SatelliteData } from '../../shared/types'

// TLE data from CelesTrak (free, no API key)
const TLE_URLS: Record<string, string> = {
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json',
  weather: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json',
  gnss: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=json',
  geo: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=json',
  military: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=json',
  science: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=json',
}

// Simplified SGP4-like position from TLE (approximate, uses mean elements)
function tleToPosition(tle: any): { lat: number; lng: number; alt: number; vel: number } | null {
  try {
    const meanMotion = tle.MEAN_MOTION || 0
    const inclination = tle.INCLINATION || 0
    const epoch = tle.EPOCH ? new Date(tle.EPOCH).getTime() : Date.now()

    if (meanMotion === 0) return null

    const now = Date.now()
    const minutesSinceEpoch = (now - epoch) / 60000
    const orbitalPeriod = 1440 / meanMotion
    const currentAnomaly = ((minutesSinceEpoch / orbitalPeriod) * 360) % 360

    const semiMajorAxis = Math.pow((86400 / (meanMotion * 2 * Math.PI)) * 398600.4418, 1 / 3)
    const alt = semiMajorAxis - 6371

    const incRad = inclination * Math.PI / 180
    const anomRad = currentAnomaly * Math.PI / 180

    // Approximate lat/lng
    const raanDeg = (tle.RA_OF_ASC_NODE || 0) + (minutesSinceEpoch * -0.004178) // RAAN drift
    const argPeri = (tle.ARG_OF_PERICENTER || 0) * Math.PI / 180
    const trueAnomaly = anomRad + argPeri

    const lat = Math.asin(Math.sin(incRad) * Math.sin(trueAnomaly)) * 180 / Math.PI
    const earthRotation = (minutesSinceEpoch * 360 / 1440) % 360
    let lng = (raanDeg + Math.atan2(
      Math.cos(incRad) * Math.sin(trueAnomaly),
      Math.cos(trueAnomaly)
    ) * 180 / Math.PI - earthRotation) % 360

    if (lng > 180) lng -= 360
    if (lng < -180) lng += 360

    const vel = 2 * Math.PI * semiMajorAxis / (orbitalPeriod * 60)

    return {
      lat: Math.max(-90, Math.min(90, lat)),
      lng,
      alt: Math.max(100, alt),
      vel: Math.max(0, vel),
    }
  } catch {
    return null
  }
}

export class SatelliteService {
  private cache: Record<string, { data: SatelliteData[]; timestamp: number }> = {}
  private CACHE_TTL = 120000

  async getSatellites(categories?: string[]): Promise<SatelliteData[]> {
    const cacheKey = 'all-sats'
    const cached = this.cache[cacheKey]
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const satellites: SatelliteData[] = []
    const groups = categories || ['stations', 'starlink', 'weather', 'gnss', 'military', 'geo', 'science']

    const categoryMap: Record<string, SatelliteData['category']> = {
      stations: 'iss',
      starlink: 'starlink',
      weather: 'weather',
      gnss: 'navigation',
      geo: 'communication',
      military: 'military',
      science: 'science',
    }

    const imageMap: Record<string, string> = {
      'ISS (ZARYA)': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/320px-International_Space_Station_after_undocking_of_STS-132.jpg',
      'HST': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Hubble_Space_Telescope_-_01.jpg/240px-Hubble_Space_Telescope_-_01.jpg',
      'CSS (TIANHE)': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Tiangong_Space_Station_Rendering_2021.10.png/320px-Tiangong_Space_Station_Rendering_2021.10.png',
      'TERRA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Terra_satellite_EOS_AM-1.jpg/320px-Terra_satellite_EOS_AM-1.jpg',
      'AQUA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/EOS_Aqua_%28EOS_PM-1%29.jpg/320px-EOS_Aqua_%28EOS_PM-1%29.jpg',
      'NOAA 19': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/240px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
      'LANDSAT 8': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Landsat_Data_Continuity_Mission_Observatory_testing.jpg/280px-Landsat_Data_Continuity_Mission_Observatory_testing.jpg',
      'LANDSAT 9': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Landsat_Data_Continuity_Mission_Observatory_testing.jpg/280px-Landsat_Data_Continuity_Mission_Observatory_testing.jpg',
      'GOES 16': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/GOES-R_spacecraft_image.jpg/300px-GOES-R_spacecraft_image.jpg',
      'GOES 17': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/GOES-R_spacecraft_image.jpg/300px-GOES-R_spacecraft_image.jpg',
      'GOES 18': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/GOES-R_spacecraft_image.jpg/300px-GOES-R_spacecraft_image.jpg',
      'METEOSAT-11': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Meteosat_MSG.jpg/300px-Meteosat_MSG.jpg',
      'METEOSAT-12': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Meteosat_MSG.jpg/300px-Meteosat_MSG.jpg',
      'JASON-3': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Jason-3_satellite.jpg/300px-Jason-3_satellite.jpg',
      'COSPAS-SARSAT': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Cospas-Sarsat_logo.svg/240px-Cospas-Sarsat_logo.svg.png',
    }

    const categoryImageFallback: Record<string, string> = {
      starlink: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Starlink_Mission_%2847926144123%29.jpg/320px-Starlink_Mission_%2847926144123%29.jpg',
      weather: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/GOES-R_spacecraft_image.jpg/300px-GOES-R_spacecraft_image.jpg',
      military: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/USA-245_NROL-65_satellite.jpg/280px-USA-245_NROL-65_satellite.jpg',
      navigation: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/GPS_Satellite_NASA_art-iif.jpg/280px-GPS_Satellite_NASA_art-iif.jpg',
      communication: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Intelsat_I_%28Early_Bird%29.jpg/240px-Intelsat_I_%28Early_Bird%29.jpg',
      science: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Hubble_Space_Telescope_-_01.jpg/240px-Hubble_Space_Telescope_-_01.jpg',
    }

    const promises = groups.map(async (group) => {
      const url = TLE_URLS[group]
      if (!url) return

      const fetchWithRetry = async (retries = 2): Promise<any[] | null> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const res = await fetch(url, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(15000),
            })
            if (res.status === 429) {
              console.warn(`[Satellite] Rate limited on ${group}, retry ${attempt + 1}...`)
              await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
              continue
            }
            if (!res.ok) return null
            const data = await res.json()
            return Array.isArray(data) ? data : null
          } catch (err) {
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
              continue
            }
            return null
          }
        }
        return null
      }

      try {
        const tles = await fetchWithRetry()
        if (!tles) return
        const cat = categoryMap[group] || 'other'

        const maxItems = group === 'starlink' ? 800 : group === 'military' ? 100 : group === 'geo' ? 150 : group === 'science' ? 80 : 150
        const items = tles.slice(0, maxItems)

        for (const tle of items) {
          const pos = tleToPosition(tle)
          if (!pos) continue

          const name = tle.OBJECT_NAME || 'UNKNOWN'
          const meanMotion = tle.MEAN_MOTION || 0
          const period = meanMotion > 0 ? 1440 / meanMotion : 0
          const inclination = tle.INCLINATION || 0
          const eccentricity = tle.ECCENTRICITY || 0
          const sma = period > 0 ? Math.pow((period * 60 / (2 * Math.PI)) * Math.sqrt(398600.4418), 2 / 3) : 0
          const apogee = sma > 0 ? sma * (1 + eccentricity) - 6371 : pos.alt
          const perigee = sma > 0 ? sma * (1 - eccentricity) - 6371 : pos.alt

          let orbitType = 'LEO'
          if (pos.alt > 35000) orbitType = 'GEO'
          else if (pos.alt > 2000) orbitType = 'MEO'
          else if (pos.alt < 600 && inclination > 85) orbitType = 'Polar LEO'
          else if (inclination > 85) orbitType = 'Sun-Sync'

          const countryCode = (tle.COUNTRY_CODE || '').trim()
          const rcsSize = tle.RCS_SIZE || ''
          const objectType = tle.OBJECT_TYPE || ''

          satellites.push({
            noradId: tle.NORAD_CAT_ID || 0,
            name,
            latitude: pos.lat,
            longitude: pos.lng,
            altitude: pos.alt,
            velocity: pos.vel,
            category: cat,
            intlDesignator: tle.INTLDES || undefined,
            launchDate: tle.LAUNCH_DATE || undefined,
            imageUrl: imageMap[name] || categoryImageFallback[cat] || undefined,
            orbitType,
            period: Math.round(period * 100) / 100,
            inclination: Math.round(inclination * 100) / 100,
            apogee: Math.round(apogee),
            perigee: Math.round(perigee),
            rcsSize: rcsSize || undefined,
            country: countryCode || undefined,
            objectType: objectType || undefined,
          })
        }
      } catch (err) {
        console.error(`[Satellite] Failed to fetch ${group}:`, err)
      }
    })

    await Promise.allSettled(promises)

    this.cache[cacheKey] = { data: satellites, timestamp: Date.now() }
    console.log(`[Satellite] ${satellites.length} satellites loaded`)
    return satellites
  }
}
