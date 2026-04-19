import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useTrackingStore } from '@/stores/tracking-store'
import type { NaturalDisaster } from '../../../shared/types'

const MAX_FLIGHT_ENTITIES = 800
const MAX_VESSEL_ENTITIES = 500
const ANIMATION_INTERVAL_MS = 800

const CLIENT_AIRPORTS = [
  { code: 'IST', name: 'Istanbul', lat: 41.275, lng: 28.752 },
  { code: 'SAW', name: 'Sabiha Gokcen', lat: 40.898, lng: 29.309 },
  { code: 'ESB', name: 'Ankara Esenboga', lat: 40.128, lng: 32.995 },
  { code: 'AYT', name: 'Antalya', lat: 36.899, lng: 30.800 },
  { code: 'LHR', name: 'London Heathrow', lat: 51.470, lng: -0.454 },
  { code: 'CDG', name: 'Paris CDG', lat: 49.013, lng: 2.550 },
  { code: 'FRA', name: 'Frankfurt', lat: 50.034, lng: 8.562 },
  { code: 'AMS', name: 'Amsterdam Schiphol', lat: 52.309, lng: 4.764 },
  { code: 'MAD', name: 'Madrid Barajas', lat: 40.472, lng: -3.561 },
  { code: 'FCO', name: 'Rome Fiumicino', lat: 41.800, lng: 12.239 },
  { code: 'ATH', name: 'Athens', lat: 37.936, lng: 23.945 },
  { code: 'JFK', name: 'New York JFK', lat: 40.640, lng: -73.779 },
  { code: 'LAX', name: 'Los Angeles', lat: 33.943, lng: -118.408 },
  { code: 'DXB', name: 'Dubai', lat: 25.253, lng: 55.366 },
  { code: 'DOH', name: 'Doha', lat: 25.261, lng: 51.565 },
  { code: 'SIN', name: 'Singapore Changi', lat: 1.350, lng: 103.994 },
  { code: 'HND', name: 'Tokyo Haneda', lat: 35.553, lng: 139.780 },
  { code: 'ICN', name: 'Seoul Incheon', lat: 37.463, lng: 126.441 },
  { code: 'PEK', name: 'Beijing', lat: 40.080, lng: 116.603 },
  { code: 'SYD', name: 'Sydney', lat: -33.946, lng: 151.177 },
  { code: 'GRU', name: 'Sao Paulo', lat: -23.435, lng: -46.473 },
  { code: 'CAI', name: 'Cairo', lat: 30.112, lng: 31.410 },
  { code: 'DEL', name: 'Delhi', lat: 28.566, lng: 77.103 },
  { code: 'BKK', name: 'Bangkok', lat: 13.681, lng: 100.747 },
  { code: 'TBS', name: 'Tbilisi', lat: 41.669, lng: 44.955 },
  { code: 'GYD', name: 'Baku Heydar Aliyev', lat: 40.467, lng: 50.047 },
  { code: 'EVN', name: 'Yerevan Zvartnots', lat: 40.147, lng: 44.396 },
  { code: 'TLV', name: 'Tel Aviv Ben Gurion', lat: 32.011, lng: 34.887 },
  { code: 'KBP', name: 'Kyiv Boryspil', lat: 50.345, lng: 30.895 },
  { code: 'WAW', name: 'Warsaw Chopin', lat: 52.166, lng: 20.967 },
  { code: 'PRG', name: 'Prague Vaclav Havel', lat: 50.101, lng: 14.260 },
  { code: 'BUD', name: 'Budapest Liszt Ferenc', lat: 47.433, lng: 19.262 },
  { code: 'OTP', name: 'Bucharest Henri Coanda', lat: 44.572, lng: 26.102 },
  { code: 'SOF', name: 'Sofia', lat: 42.696, lng: 23.411 },
  { code: 'SKG', name: 'Thessaloniki', lat: 40.520, lng: 22.971 },
  { code: 'MXP', name: 'Milan Malpensa', lat: 45.630, lng: 8.723 },
  { code: 'ZAG', name: 'Zagreb', lat: 45.743, lng: 16.069 },
  { code: 'BEG', name: 'Belgrade Nikola Tesla', lat: 44.818, lng: 20.309 },
  { code: 'CPH', name: 'Copenhagen Kastrup', lat: 55.618, lng: 12.656 },
  { code: 'ARN', name: 'Stockholm Arlanda', lat: 59.652, lng: 17.919 },
  { code: 'HEL', name: 'Helsinki Vantaa', lat: 60.317, lng: 24.963 },
  { code: 'OSL', name: 'Oslo Gardermoen', lat: 60.194, lng: 11.100 },
  { code: 'DUS', name: 'Dusseldorf', lat: 51.289, lng: 6.767 },
  { code: 'LIS', name: 'Lisbon Portela', lat: 38.774, lng: -9.134 },
  { code: 'CMN', name: 'Casablanca Mohammed V', lat: 33.367, lng: -7.590 },
  { code: 'ADD', name: 'Addis Ababa Bole', lat: 8.978, lng: 38.799 },
  { code: 'JNB', name: 'Johannesburg OR Tambo', lat: -26.139, lng: 28.246 },
  { code: 'KUL', name: 'Kuala Lumpur', lat: 2.746, lng: 101.710 },
  { code: 'MNL', name: 'Manila Ninoy Aquino', lat: 14.509, lng: 121.020 },
]


function buildRoute(
  origin: { name: string; code: string; lat: number; lng: number },
  dest: { name: string; code: string; lat: number; lng: number }
): { origin: typeof origin; dest: typeof dest; routePoints: [number, number, number][] } {
  const steps = 10
  const route: [number, number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    route.push([
      origin.lat + (dest.lat - origin.lat) * t,
      origin.lng + (dest.lng - origin.lng) * t,
      t < 0.12 ? 2000 + t / 0.12 * 9000 :
      t > 0.88 ? 2000 + (1 - t) / 0.12 * 9000 : 10500 + Math.sin(t * Math.PI) * 1500,
    ])
  }
  return { origin, dest, routePoints: route }
}

function resolveAirport(code: string, apiLat?: number, apiLng?: number, apiName?: string):
  { name: string; code: string; lat: number; lng: number } | null {
  if (!code) return null
  // Use API coordinates if provided
  if (apiLat != null && apiLng != null) {
    return { code, name: apiName || code, lat: apiLat, lng: apiLng }
  }
  // Lookup in local list
  for (const ap of CLIENT_AIRPORTS) {
    if (ap.code === code) return ap
  }
  return null
}

export interface TrackingClickInfo {
  type: 'earthquake' | 'disaster' | 'flight' | 'vessel' | 'satellite'
  title: string
  details: Record<string, string | number>
  latitude: number
  longitude: number
  imageUrl?: string
  routePoints?: [number, number, number?][]
  rawData?: any
}

interface TrackingOverlaysProps {
  viewer: any
  onTrackingClick?: (info: TrackingClickInfo) => void
}

function createFlightIcon(): HTMLCanvasElement {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.translate(size / 2, size / 2)

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 20)
  glow.addColorStop(0, 'rgba(0, 180, 255, 0.25)')
  glow.addColorStop(0.6, 'rgba(0, 180, 255, 0.08)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(-24, -24, 48, 48)

  ctx.fillStyle = '#00b4ff'
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(9, 6)
  ctx.lineTo(0, 3)
  ctx.lineTo(-9, 6)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(0, 180, 255, 0.5)'
  ctx.lineWidth = 0.8
  ctx.stroke()

  return canvas
}

function createVesselIcon(vType?: string): HTMLCanvasElement {
  const size = 44
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2

  const typeColors: Record<string, string> = {
    Container: '#64c8ff', Tanker: '#ff9040', VLCC: '#ff6020',
    Cruise: '#d080ff', 'Bulk Carrier': '#80e0a0', 'LNG Carrier': '#40d0d0',
    'LPG Carrier': '#60c8b0', RoRo: '#c0a0ff', Offshore: '#ffcc00',
    'General Cargo': '#90b0d0', 'Vehicle Carrier': '#b0d060',
    'Chemical Tanker': '#e07050', 'Heavy Lift': '#d0a030',
  }
  const color = typeColors[vType || ''] || '#64c8ff'

  const glow = ctx.createRadialGradient(cx, cx, 0, cx, cx, 18)
  glow.addColorStop(0, color + '30')
  glow.addColorStop(0.6, color + '10')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cx - 10)
  ctx.lineTo(cx + 6, cx + 3)
  ctx.lineTo(cx + 5, cx + 8)
  ctx.lineTo(cx - 5, cx + 8)
  ctx.lineTo(cx - 6, cx + 3)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - 7, cx + 9)
  ctx.quadraticCurveTo(cx, cx + 12, cx + 7, cx + 9)
  ctx.stroke()

  return canvas
}

function createEarthquakeIcon(magnitude: number): HTMLCanvasElement {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2

  const intensity = Math.min(1, (magnitude - 2) / 6)
  const r = Math.round(255 * intensity)
  const g = Math.round(100 * (1 - intensity))
  const baseRadius = 8 + intensity * 14

  const glow = ctx.createRadialGradient(cx, cx, 0, cx, cx, baseRadius * 2.2)
  glow.addColorStop(0, `rgba(${r}, ${g}, 20, 0.6)`)
  glow.addColorStop(0.4, `rgba(${r}, ${g}, 20, 0.2)`)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 3; i++) {
    const ringR = baseRadius * (0.6 + i * 0.5)
    ctx.beginPath()
    ctx.arc(cx, cx, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r}, ${g}, 20, ${0.7 - i * 0.2})`
    ctx.lineWidth = 2.0 - i * 0.5
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(cx, cx, 4, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${r}, ${g}, 20)`
  ctx.fill()

  return canvas
}

function createDisasterIcon(type: NaturalDisaster['type']): HTMLCanvasElement {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2

  const colors: Record<string, string> = {
    wildfire: '#ff6b00', volcano: '#ff2020', storm: '#9040ff',
    flood: '#2090ff', earthquake: '#ffaa00', other: '#ff60a0',
  }
  const color = colors[type] || colors.other

  ctx.fillStyle = color + '25'
  ctx.beginPath()
  ctx.arc(cx, cx, 20, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = color
  ctx.font = '22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const icons: Record<string, string> = {
    wildfire: '\u{1F525}', volcano: '\u{1F30B}', storm: '\u{1F300}',
    flood: '\u{1F30A}', earthquake: '\u{1F4A5}', other: '\u26A0',
  }
  ctx.fillText(icons[type] || '\u26A0', cx, cx)

  return canvas
}

function createSatelliteIcon(category: string): HTMLCanvasElement {
  const size = 40
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2

  const catColors: Record<string, string> = {
    starlink: '#a78bfa', iss: '#fbbf24', military: '#ef4444',
    weather: '#3b82f6', communication: '#10b981', navigation: '#06b6d4',
    science: '#f59e0b', other: '#8b5cf6',
  }
  const color = catColors[category] || catColors.other

  const glow = ctx.createRadialGradient(cx, cx, 0, cx, cx, 16)
  glow.addColorStop(0, color + '40')
  glow.addColorStop(0.5, color + '15')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = color + 'B0'
  ctx.fillRect(cx - 14, cx - 3, 8, 6)
  ctx.fillRect(cx + 6, cx - 3, 8, 6)

  ctx.strokeStyle = color
  ctx.lineWidth = 0.5
  ctx.strokeRect(cx - 14, cx - 3, 8, 6)
  ctx.strokeRect(cx + 6, cx - 3, 8, 6)
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(cx - 14 + i * 2, cx - 3)
    ctx.lineTo(cx - 14 + i * 2, cx + 3)
    ctx.stroke()
    ctx.moveTo(cx + 6 + i * 2, cx - 3)
    ctx.lineTo(cx + 6 + i * 2, cx + 3)
    ctx.stroke()
  }

  ctx.fillStyle = color
  ctx.fillRect(cx - 4, cx - 4, 8, 8)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.strokeRect(cx - 4, cx - 4, 8, 8)

  ctx.beginPath()
  ctx.moveTo(cx, cx - 4)
  ctx.lineTo(cx, cx - 8)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cx - 9, 2, Math.PI, 0)
  ctx.stroke()

  return canvas
}

function createStarlinkIcon(): HTMLCanvasElement {
  const size = 24
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2

  ctx.fillStyle = 'rgba(167, 139, 250, 0.4)'
  ctx.beginPath()
  ctx.arc(cx, cx, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#a78bfa'
  ctx.beginPath()
  ctx.arc(cx, cx, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.arc(cx, cx, 6, 0, Math.PI * 2)
  ctx.stroke()

  return canvas
}

const iconCache = new Map<string, HTMLCanvasElement>()

function getCachedIcon(key: string, factory: () => HTMLCanvasElement): HTMLCanvasElement {
  if (!iconCache.has(key)) {
    iconCache.set(key, factory())
  }
  return iconCache.get(key)!
}

export function useTrackingOverlays({ viewer, onTrackingClick }: TrackingOverlaysProps) {
  const enabledLayers = useTrackingStore(s => s.enabledLayers)
  const flights: any[] = []
  const vessels: any[] = []
  const earthquakes = useTrackingStore(s => s.earthquakes)
  const disasters = useTrackingStore(s => s.disasters)
  const satellites = useTrackingStore(s => s.satellites)

  const flightEntitiesRef = useRef<any[]>([])
  const vesselEntitiesRef = useRef<any[]>([])
  const quakeEntitiesRef = useRef<any[]>([])
  const disasterEntitiesRef = useRef<any[]>([])
  const satelliteEntitiesRef = useRef<any[]>([])
  const selectedRouteRef = useRef<any[]>([])
  const cesiumRef = useRef<any>(null)

  // Limit rendered entities for performance
  const limitedFlights = useMemo(() => flights.slice(0, MAX_FLIGHT_ENTITIES), [flights])
  const limitedVessels = useMemo(() => vessels.slice(0, MAX_VESSEL_ENTITIES), [vessels])

  const flightDataRef = useRef(limitedFlights.map(f => ({ ...f })))
  const vesselDataRef = useRef(limitedVessels.map(v => ({ ...v })))
  useEffect(() => {
    flightDataRef.current = limitedFlights.map(f => ({ ...f }))
  }, [limitedFlights])
  useEffect(() => {
    vesselDataRef.current = limitedVessels.map(v => ({ ...v }))
  }, [limitedVessels])

  const loadCesium = useCallback(async () => {
    if (!cesiumRef.current) {
      cesiumRef.current = await import('cesium')
    }
    return cesiumRef.current
  }, [])

  // Throttled real-time movement animation (interval = ANIMATION_INTERVAL_MS)
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    let lastTime = Date.now()

    const timer = setInterval(() => {
      if (!viewer || viewer.isDestroyed()) return
      const Cesium = cesiumRef.current
      if (!Cesium) return

      const now = Date.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      const camHeight = viewer.camera.positionCartographic?.height || 10000000
      const speedMult = camHeight < 50000 ? 6.0 :
                        camHeight < 200000 ? 3.0 :
                        camHeight < 1000000 ? 1.5 :
                        camHeight < 5000000 ? 0.8 : 0.3

      const effectiveDt = dt * speedMult

      const flightEntities = flightEntitiesRef.current
      const flightData = flightDataRef.current
      const len1 = Math.min(flightEntities.length, flightData.length)

      for (let i = 0; i < len1; i++) {
        const entity = flightEntities[i]
        const flight = flightData[i]
        if (!entity || !flight) continue

        try {
          const headingRad = flight.heading * 0.017453
          const dLat = Math.cos(headingRad) * flight.velocity * effectiveDt / 111000
          const cosLat = Math.cos(flight.latitude * 0.017453)
          if (cosLat === 0) continue
          const dLng = Math.sin(headingRad) * flight.velocity * effectiveDt / (111000 * cosLat)

          flight.latitude += dLat
          flight.longitude += dLng

          entity.position = Cesium.Cartesian3.fromDegrees(
            flight.longitude, flight.latitude, flight.altitude
          )
        } catch {}
      }

      const vesselEntities = vesselEntitiesRef.current
      const vesselData = vesselDataRef.current
      const len2 = Math.min(vesselEntities.length, vesselData.length)

      for (let i = 0; i < len2; i++) {
        const entity = vesselEntities[i]
        const vessel = vesselData[i]
        if (!entity || !vessel) continue

        try {
          const headingRad = vessel.heading * 0.017453
          const speedMs = vessel.speed * 0.51444
          const dLat = Math.cos(headingRad) * speedMs * effectiveDt / 111000
          const cosLat = Math.cos(vessel.latitude * 0.017453)
          if (cosLat === 0) continue
          const dLng = Math.sin(headingRad) * speedMs * effectiveDt / (111000 * cosLat)

          vessel.latitude += dLat
          vessel.longitude += dLng

          entity.position = Cesium.Cartesian3.fromDegrees(
            vessel.longitude, vessel.latitude, 0
          )
        } catch {}
      }
    }, ANIMATION_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [viewer])

  // Flights
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    for (const e of flightEntitiesRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    flightEntitiesRef.current = []

    if (!enabledLayers.flights || limitedFlights.length === 0) return

    const render = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      const icon = getCachedIcon('flight', createFlightIcon)

      for (let flightIdx = 0; flightIdx < limitedFlights.length; flightIdx++) {
        const flight = limitedFlights[flightIdx]
        if (flight.onGround) continue
        if (flight.altitude < 100) continue
        try {
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              flight.longitude, flight.latitude, flight.altitude
            ),
            billboard: {
              image: icon,
              scale: 1.0,
              rotation: Cesium.Math.toRadians(-flight.heading),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              disableDepthTestDistance: 5e6,
              sizeInMeters: false,
              pixelOffset: Cesium.Cartesian2.ZERO,
            },
            label: {
              text: flight.callsign || flight.icao24,
              font: 'bold 12px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString('#00b4ff'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, 28),
              scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 3e6, 0.0),
              disableDepthTestDistance: 5e6,
            },
            properties: {
              trackingType: new Cesium.ConstantProperty('flight'),
              flightIndex: new Cesium.ConstantProperty(flightIdx),
            },
          })
          flightEntitiesRef.current.push(entity)
        } catch {}
      }
    }

    render()
    return () => { cancelled = true }
  }, [viewer, limitedFlights, enabledLayers, loadCesium])

  // Vessels
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    for (const e of vesselEntitiesRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    vesselEntitiesRef.current = []

    if (!enabledLayers.vessels || limitedVessels.length === 0) return

    const render = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      for (let vesselIdx = 0; vesselIdx < limitedVessels.length; vesselIdx++) {
        const vessel = limitedVessels[vesselIdx]
        const vIconKey = `vessel-${vessel.type}`
        const icon = getCachedIcon(vIconKey, () => createVesselIcon(vessel.type))

        try {
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(vessel.longitude, vessel.latitude, 100),
            billboard: {
              image: icon,
              scale: 1.0,
              rotation: Cesium.Math.toRadians(-vessel.heading),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              heightReference: Cesium.HeightReference.NONE,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              sizeInMeters: false,
            },
            label: {
              text: vessel.name,
              font: 'bold 11px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString('#64c8ff'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, 24),
              scaleByDistance: new Cesium.NearFarScalar(3e4, 1.0, 2e6, 0.0),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            properties: {
              trackingType: new Cesium.ConstantProperty('vessel'),
              vesselIndex: new Cesium.ConstantProperty(vesselIdx),
            },
          })
          vesselEntitiesRef.current.push(entity)
        } catch {}
      }
    }

    render()
    return () => { cancelled = true }
  }, [viewer, limitedVessels, enabledLayers, loadCesium])

  // Earthquakes
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    for (const e of quakeEntitiesRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    quakeEntitiesRef.current = []

    if (!enabledLayers.earthquakes || earthquakes.length === 0) return

    const render = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      for (const quake of earthquakes) {
        const magKey = `quake-${Math.round(quake.magnitude * 2)}`
        const icon = getCachedIcon(magKey, () => createEarthquakeIcon(quake.magnitude))

        try {
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(quake.longitude, quake.latitude, 0),
            billboard: {
              image: icon,
              scale: 0.8 + (quake.magnitude / 10) * 0.6,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: 5e6,
              sizeInMeters: false,
            },
            label: {
              text: `M${quake.magnitude.toFixed(1)}`,
              font: 'bold 13px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString(
                quake.magnitude >= 6 ? '#ff3020' :
                quake.magnitude >= 4.5 ? '#ff8800' : '#ffcc00'
              ),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -28),
              scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 8e6, 0.5),
              disableDepthTestDistance: 5e6,
            },
            properties: {
              trackingType: new Cesium.ConstantProperty('earthquake'),
              place: new Cesium.ConstantProperty(quake.place),
              magnitude: new Cesium.ConstantProperty(quake.magnitude),
              depth: new Cesium.ConstantProperty(quake.depth),
              lat: new Cesium.ConstantProperty(quake.latitude),
              lng: new Cesium.ConstantProperty(quake.longitude),
            }
          })
          quakeEntitiesRef.current.push(entity)
        } catch {}
      }
    }

    render()
    return () => { cancelled = true }
  }, [viewer, earthquakes, enabledLayers, loadCesium])

  // Natural Disasters
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    for (const e of disasterEntitiesRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    disasterEntitiesRef.current = []

    if (!enabledLayers.disasters || disasters.length === 0) return

    const render = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      for (const disaster of disasters) {
        const icon = getCachedIcon(`disaster-${disaster.type}`, () => createDisasterIcon(disaster.type))

        try {
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(disaster.longitude, disaster.latitude, 0),
            billboard: {
              image: icon,
              scale: 1.2,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: 5e6,
              sizeInMeters: false,
            },
            label: {
              text: disaster.title.length > 35 ? disaster.title.slice(0, 35) + '\u2026' : disaster.title,
              font: 'bold 11px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString('#ff60a0'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, 28),
              scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 5e6, 0.4),
              disableDepthTestDistance: 5e6,
            },
            properties: {
              trackingType: new Cesium.ConstantProperty('disaster'),
              title: new Cesium.ConstantProperty(disaster.title),
              type: new Cesium.ConstantProperty(disaster.type),
              lat: new Cesium.ConstantProperty(disaster.latitude),
              lng: new Cesium.ConstantProperty(disaster.longitude),
            }
          })
          disasterEntitiesRef.current.push(entity)
        } catch {}
      }
    }

    render()
    return () => { cancelled = true }
  }, [viewer, disasters, enabledLayers, loadCesium])

  // Satellites
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    for (const e of satelliteEntitiesRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    satelliteEntitiesRef.current = []

    if (!enabledLayers.satellites || satellites.length === 0) return

    const render = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      const isStarlink = (name: string) => name.startsWith('STARLINK')
      const starlinkIcon = getCachedIcon('starlink-dot', createStarlinkIcon)

      for (const sat of satellites) {
        try {
          const isStl = isStarlink(sat.name)
          const iconKey = isStl ? 'starlink-dot' : `sat-${sat.category}`
          const icon = isStl ? starlinkIcon : getCachedIcon(iconKey, () => createSatelliteIcon(sat.category))
          const altMeters = sat.altitude * 1000

          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(sat.longitude, sat.latitude, altMeters),
            billboard: {
              image: icon,
              scale: isStl ? 0.7 : 1.0,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              disableDepthTestDistance: 5e6,
              sizeInMeters: false,
            },
            label: isStl ? undefined : {
              text: sat.name.length > 20 ? sat.name.slice(0, 20) : sat.name,
              font: 'bold 10px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString('#a78bfa'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, 22),
              scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 1e7, 0.3),
              disableDepthTestDistance: 5e6,
            },
            properties: {
              trackingType: new Cesium.ConstantProperty('satellite'),
              satName: new Cesium.ConstantProperty(sat.name),
              noradId: new Cesium.ConstantProperty(sat.noradId),
              category: new Cesium.ConstantProperty(sat.category),
              altitude: new Cesium.ConstantProperty(sat.altitude),
              velocity: new Cesium.ConstantProperty(sat.velocity),
              intlDes: new Cesium.ConstantProperty(sat.intlDesignator || ''),
              launchDate: new Cesium.ConstantProperty(sat.launchDate || ''),
              lat: new Cesium.ConstantProperty(sat.latitude),
              lng: new Cesium.ConstantProperty(sat.longitude),
              imageUrl: new Cesium.ConstantProperty(sat.imageUrl || ''),
              orbitType: new Cesium.ConstantProperty(sat.orbitType || ''),
              period: new Cesium.ConstantProperty(sat.period || 0),
              inclination: new Cesium.ConstantProperty(sat.inclination || 0),
              apogee: new Cesium.ConstantProperty(sat.apogee || 0),
              perigee: new Cesium.ConstantProperty(sat.perigee || 0),
              rcsSize: new Cesium.ConstantProperty(sat.rcsSize || ''),
              satCountry: new Cesium.ConstantProperty(sat.country || ''),
              objectType: new Cesium.ConstantProperty(sat.objectType || ''),
            },
          })
          satelliteEntitiesRef.current.push(entity)
        } catch {}
      }
    }

    render()
    return () => { cancelled = true }
  }, [viewer, satellites, enabledLayers, loadCesium])

  // Draw route polyline for selected entity
  const drawRoute = useCallback(async (
    routePoints: [number, number, number?][],
    color: string,
    labels?: { originLabel?: string; destLabel?: string; currentLat?: number; currentLng?: number; currentAlt?: number }
  ) => {
    if (!viewer || viewer.isDestroyed()) return
    const Cesium = await loadCesium()

    for (const e of selectedRouteRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    selectedRouteRef.current = []

    if (routePoints.length < 2) return

    const posArray: number[] = []
    for (const pt of routePoints) {
      posArray.push(pt[1], pt[0], pt[2] || 0)
    }

    // Main route line
    try {
      const routeEntity = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(posArray),
          width: 4,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.25,
            color: Cesium.Color.fromCssColorString(color).withAlpha(0.8)
          }),
          arcType: Cesium.ArcType.GEODESIC,
        }
      })
      selectedRouteRef.current.push(routeEntity)
    } catch {}

    // Traveled portion (origin to current position) in different color
    if (labels?.currentLat != null && labels?.currentLng != null) {
      const origin = routePoints[0]
      try {
        const traveledEntity = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              origin[1], origin[0], origin[2] || 0,
              labels.currentLng, labels.currentLat, labels.currentAlt || 0,
            ]),
            width: 5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.3,
              color: Cesium.Color.fromCssColorString('#00ff87').withAlpha(0.9)
            }),
            arcType: Cesium.ArcType.GEODESIC,
          }
        })
        selectedRouteRef.current.push(traveledEntity)
      } catch {}

      // Remaining portion (current to dest) in dimmer color
      const dest = routePoints[routePoints.length - 1]
      try {
        const remainingEntity = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              labels.currentLng, labels.currentLat, labels.currentAlt || 0,
              dest[1], dest[0], dest[2] || 0,
            ]),
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.15,
              color: Cesium.Color.fromCssColorString(color).withAlpha(0.5)
            }),
            arcType: Cesium.ArcType.GEODESIC,
          }
        })
        selectedRouteRef.current.push(remainingEntity)
      } catch {}
    }

    // Origin marker with airport label
    const origin = routePoints[0]
    const originText = labels?.originLabel || 'ORIGIN'
    try {
      const originMarker = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(origin[1], origin[0], 0),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString('#00ff87'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: 5e6,
        },
        label: {
          text: originText,
          font: 'bold 12px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString('#00ff87'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: 5e6,
        },
      })
      selectedRouteRef.current.push(originMarker)
    } catch {}

    // Destination marker with airport label
    const dest = routePoints[routePoints.length - 1]
    const destText = labels?.destLabel || 'DESTINATION'
    try {
      const destMarker = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(dest[1], dest[0], 0),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString('#ff3b5c'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: 5e6,
        },
        label: {
          text: destText,
          font: 'bold 12px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString('#ff3b5c'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: 5e6,
        },
      })
      selectedRouteRef.current.push(destMarker)
    } catch {}
  }, [viewer, loadCesium])

  // Click handler for ALL tracking entities
  const onTrackingClickRef = useRef(onTrackingClick)
  onTrackingClickRef.current = onTrackingClick

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let handler: any = null

    const setup = async () => {
      const Cesium = await loadCesium()
      if (viewer.isDestroyed()) return

      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handler.setInputAction(async (movement: any) => {
        const picked = viewer.scene.pick(movement.position)
        if (!Cesium.defined(picked) || !picked.id?.properties) return

        try {
          const trackingType = picked.id.properties.trackingType?.getValue()

          if (trackingType === 'earthquake') {
            const place = picked.id.properties.place?.getValue() || 'Unknown'
            const magnitude = picked.id.properties.magnitude?.getValue() || 0
            const depth = picked.id.properties.depth?.getValue() || 0
            const lat = picked.id.properties.lat?.getValue() || 0
            const lng = picked.id.properties.lng?.getValue() || 0
            onTrackingClickRef.current?.({
              type: 'earthquake',
              title: `M${magnitude.toFixed(1)} Earthquake`,
              details: {
                Place: place, Magnitude: magnitude.toFixed(1),
                'Depth (km)': depth.toFixed(1),
                Latitude: lat.toFixed(4), Longitude: lng.toFixed(4),
              },
              latitude: lat, longitude: lng,
            })
          } else if (trackingType === 'disaster') {
            const title = picked.id.properties.title?.getValue() || 'Unknown'
            const disType = picked.id.properties.type?.getValue() || ''
            const lat = picked.id.properties.lat?.getValue() || 0
            const lng = picked.id.properties.lng?.getValue() || 0
            onTrackingClickRef.current?.({
              type: 'disaster', title,
              details: { Type: disType, Latitude: lat.toFixed(4), Longitude: lng.toFixed(4) },
              latitude: lat, longitude: lng,
            })
          } else if (trackingType === 'flight') {
            const idx = picked.id.properties.flightIndex?.getValue() ?? -1
            const flight = limitedFlights[idx]
            if (!flight) return

            const details: Record<string, string | number> = {}
            const api = (window as any).argus

            // Fetch real metadata and route from OpenSky (async, non-blocking)
            let realMeta: any = {}
            let realRoute: any = {}
            try {
              if (api?.getFlightMetadata) {
                realMeta = await api.getFlightMetadata(flight.icao24) || {}
              }
            } catch {}
            try {
              if (api?.getFlightRoute) {
                realRoute = await api.getFlightRoute(flight.callsign) || {}
              }
            } catch {}

            const airline = realMeta.operator || flight.airline
            const aircraftType = realMeta.aircraftType
            const registration = realMeta.registration

            // Only use real API data - no estimation
            const originAp = resolveAirport(
              realRoute.originCode || '',
              realRoute.originLat, realRoute.originLng, realRoute.originName
            )
            const destAp = resolveAirport(
              realRoute.destCode || '',
              realRoute.destLat, realRoute.destLng, realRoute.destName
            )
            const routeCalc = (originAp && destAp) ? buildRoute(originAp, destAp) : null

            if (airline) details['Airline'] = airline
            details['Callsign'] = flight.callsign || 'N/A'
            details['ICAO24'] = flight.icao24
            if (aircraftType) details['Aircraft'] = aircraftType
            if (registration) details['Registration'] = registration
            if (flight.category) details['Category'] = flight.category
            details['Origin Country'] = flight.originCountry

            if (originAp && destAp) {
              details['Route'] = `${originAp.code} \u2192 ${destAp.code}`
              details['Departure'] = `${originAp.name} (${originAp.code})`
              details['Arrival'] = `${destAp.name} (${destAp.code})`
            } else if (destAp) {
              details['Destination'] = `${destAp.name} (${destAp.code})`
            } else if (originAp) {
              details['Origin'] = `${originAp.name} (${originAp.code})`
            }

            details['Baro. Altitude'] = `${Math.round(flight.baroAltitude || flight.altitude)} m (${Math.round((flight.baroAltitude || flight.altitude) * 3.281)} ft)`
            if (flight.gpsAltitude) details['GPS Altitude'] = `${Math.round(flight.gpsAltitude)} m`
            details['Ground Speed'] = `${Math.round(flight.velocity * 3.6)} km/h (${Math.round(flight.velocity * 1.944)} kts)`
            if (flight.verticalRate) details['Vertical Rate'] = `${Math.round(flight.verticalRate)} ft/min`
            details['Heading'] = `${Math.round(flight.heading)}\u00B0`
            if (flight.squawk) details['Squawk'] = flight.squawk
            details['Latitude'] = Number(flight.latitude.toFixed(5))
            details['Longitude'] = Number(flight.longitude.toFixed(5))

            const routePoints = routeCalc?.routePoints
            if (routePoints) {
              drawRoute(routePoints, '#00ff87', {
                originLabel: originAp ? `${originAp.code} - ${originAp.name}` : 'ORIGIN',
                destLabel: destAp ? `${destAp.code} - ${destAp.name}` : 'DESTINATION',
                currentLat: flight.latitude,
                currentLng: flight.longitude,
                currentAlt: flight.altitude,
              })
            }

            const rawData = {
              ...flight,
              airline, aircraftType, registration,
              originAirport: originAp?.name,
              originCode: originAp?.code,
              destAirport: destAp?.name,
              destCode: destAp?.code,
              routePoints,
            }

            onTrackingClickRef.current?.({
              type: 'flight',
              title: `${flight.callsign || flight.icao24}`,
              details,
              latitude: flight.latitude, longitude: flight.longitude,
              imageUrl: flight.icao24 ? `https://api.planespotters.net/pub/photos/hex/${flight.icao24}` : undefined,
              routePoints,
              rawData,
            })
          } else if (trackingType === 'vessel') {
            const idx = picked.id.properties.vesselIndex?.getValue() ?? -1
            const vessel = limitedVessels[idx]
            if (!vessel) return

            const details: Record<string, string | number> = {}

            details['Name'] = vessel.name
            if (vessel.imo) details['IMO'] = vessel.imo
            details['MMSI'] = vessel.mmsi
            details['Type'] = vessel.type
            details['Flag'] = vessel.flag
            if (vessel.callsign) details['Call Sign'] = vessel.callsign
            if (vessel.status) details['Status'] = vessel.status

            if (vessel.originPort && vessel.destination) {
              details['Route'] = `${vessel.originPort} \u2192 ${vessel.destination}`
            }
            if (vessel.originPort) details['Origin Port'] = `${vessel.originPort} (${vessel.originPortCode})`
            details['Destination'] = `${vessel.destination} (${vessel.destPortCode || ''})`
            if (vessel.eta) details['ETA'] = new Date(vessel.eta).toLocaleString()

            details['Speed'] = `${vessel.speed} kts`
            details['Heading'] = `${Math.round(vessel.heading)}\u00B0`
            if (vessel.course) details['Course'] = `${vessel.course}\u00B0`

            if (vessel.length) details['Length'] = `${vessel.length} m`
            if (vessel.width) details['Beam'] = `${vessel.width} m`
            if (vessel.draft) details['Draft'] = `${vessel.draft} m`

            details['Latitude'] = Number(vessel.latitude.toFixed(5))
            details['Longitude'] = Number(vessel.longitude.toFixed(5))

            if (vessel.routePoints) {
              drawRoute(
                vessel.routePoints.map(p => [p[0], p[1], 0] as [number, number, number]),
                '#64c8ff',
                {
                  originLabel: vessel.originPort ? `${vessel.originPortCode || ''} - ${vessel.originPort}` : 'ORIGIN',
                  destLabel: vessel.destination ? `${vessel.destPortCode || ''} - ${vessel.destination}` : 'DESTINATION',
                  currentLat: vessel.latitude,
                  currentLng: vessel.longitude,
                  currentAlt: 0,
                }
              )
            }

            onTrackingClickRef.current?.({
              type: 'vessel',
              title: vessel.name,
              details,
              latitude: vessel.latitude, longitude: vessel.longitude,
              routePoints: vessel.routePoints?.map(p => [p[0], p[1], 0] as [number, number, number]),
              rawData: vessel,
            })
          } else if (trackingType === 'satellite') {
            const satName = picked.id.properties.satName?.getValue() || 'Unknown'
            const noradId = picked.id.properties.noradId?.getValue() || 0
            const category = picked.id.properties.category?.getValue() || ''
            const altitude = picked.id.properties.altitude?.getValue() || 0
            const velocity = picked.id.properties.velocity?.getValue() || 0
            const intlDes = picked.id.properties.intlDes?.getValue() || ''
            const launchDate = picked.id.properties.launchDate?.getValue() || ''
            const lat = picked.id.properties.lat?.getValue() || 0
            const lng = picked.id.properties.lng?.getValue() || 0
            const imgUrl = picked.id.properties.imageUrl?.getValue() || ''
            const orbitType = picked.id.properties.orbitType?.getValue() || ''
            const period = picked.id.properties.period?.getValue() || 0
            const inclination = picked.id.properties.inclination?.getValue() || 0
            const apogee = picked.id.properties.apogee?.getValue() || 0
            const perigee = picked.id.properties.perigee?.getValue() || 0
            const rcsSize = picked.id.properties.rcsSize?.getValue() || ''
            const satCountry = picked.id.properties.satCountry?.getValue() || ''
            const objectType = picked.id.properties.objectType?.getValue() || ''
            onTrackingClickRef.current?.({
              type: 'satellite',
              title: satName,
              details: {
                'NORAD ID': noradId,
                Category: category.charAt(0).toUpperCase() + category.slice(1),
                'Orbit Type': orbitType || 'N/A',
                'Altitude (km)': Math.round(altitude),
                'Velocity (km/s)': velocity.toFixed(1),
                'Period (min)': period > 0 ? period.toFixed(2) : 'N/A',
                'Inclination': inclination > 0 ? `${inclination.toFixed(2)}°` : 'N/A',
                'Apogee (km)': apogee > 0 ? Math.round(apogee) : 'N/A',
                'Perigee (km)': perigee > 0 ? Math.round(perigee) : 'N/A',
                'RCS Size': rcsSize || 'N/A',
                'Object Type': objectType || 'N/A',
                'Country': satCountry || 'N/A',
                'Intl Designator': intlDes || 'N/A',
                'Launch Date': launchDate || 'N/A',
                Latitude: lat.toFixed(4),
                Longitude: lng.toFixed(4),
              },
              latitude: lat, longitude: lng,
              imageUrl: imgUrl || undefined,
            })
          }
        } catch {}
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }

    setup()
    return () => { if (handler && !handler.isDestroyed()) handler.destroy() }
  }, [viewer, limitedFlights, limitedVessels, loadCesium, drawRoute])

  // Auto-refresh
  useEffect(() => {
    const anyEnabled = Object.values(enabledLayers).some(v => v)
    if (!anyEnabled) return

    const interval = setInterval(() => {
      useTrackingStore.getState().refreshEnabled()
    }, 60000)

    return () => clearInterval(interval)
  }, [enabledLayers])
}
