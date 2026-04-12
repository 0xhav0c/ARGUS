import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import type { Incident, IncidentDomain } from '../../../shared/types'

const DOMAIN_COLORS: Record<IncidentDomain, { hex: string; r: number; g: number; b: number }> = {
  CONFLICT: { hex: '#ff6b35', r: 255, g: 107, b: 53 },
  CYBER:    { hex: '#00ff41', r: 0,   g: 255, b: 65 },
  INTEL:    { hex: '#00b4d8', r: 0,   g: 180, b: 216 },
  FINANCE:  { hex: '#f5c542', r: 245, g: 197, b: 66 },
}

const SEVERITY_SCALE: Record<string, number> = {
  CRITICAL: 1.0,
  HIGH: 0.75,
  MEDIUM: 0.55,
  LOW: 0.4,
  INFO: 0.25,
}

const MAX_MARKERS = 500
const MAX_ARCS = 8
const ARC_MAX_GEO_DEG = 20
const MARKER_DEBOUNCE_MS = 200
const PULSE_INTERVAL_MS = 100
const PULSE_CYCLE_MS = 4000

function stablePulsePhaseOffset(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % PULSE_CYCLE_MS
}

function incidentsWithinGeoDegrees(a: Incident, b: Incident, maxDeg: number): boolean {
  const dLat = a.latitude - b.latitude
  const dLng = a.longitude - b.longitude
  return Math.hypot(dLat, dLng) < maxDeg
}

// Tight bounding boxes for land masses
const LAND_BOXES = [
  // North America (tighter - excludes open Atlantic/Pacific)
  { minLat: 48, maxLat: 72, minLng: -168, maxLng: -52 },   // Canada/Alaska
  { minLat: 25, maxLat: 49, minLng: -130, maxLng: -66 },   // Continental US
  { minLat: 14, maxLat: 33, minLng: -118, maxLng: -86 },   // Mexico
  { minLat: 7, maxLat: 23, minLng: -90, maxLng: -60 },     // Central America + Caribbean islands
  // South America
  { minLat: -5, maxLat: 13, minLng: -80, maxLng: -50 },    // Northern SA
  { minLat: -25, maxLat: -5, minLng: -75, maxLng: -35 },   // Central SA
  { minLat: -56, maxLat: -25, minLng: -73, maxLng: -48 },  // Southern SA
  // Europe
  { minLat: 36, maxLat: 45, minLng: -10, maxLng: 30 },     // Southern Europe
  { minLat: 45, maxLat: 55, minLng: -6, maxLng: 25 },      // Central Europe
  { minLat: 55, maxLat: 71, minLng: 4, maxLng: 32 },       // Northern Europe / Scandinavia
  { minLat: 50, maxLat: 59, minLng: -11, maxLng: 2 },      // UK/Ireland
  { minLat: 63, maxLat: 66, minLng: -24, maxLng: -13 },    // Iceland
  // Africa
  { minLat: 25, maxLat: 38, minLng: -18, maxLng: 35 },     // North Africa
  { minLat: 4, maxLat: 25, minLng: -18, maxLng: 50 },      // West/Central/East Africa
  { minLat: -35, maxLat: 4, minLng: 10, maxLng: 42 },      // Southern/East Africa
  { minLat: -26, maxLat: -12, minLng: 43, maxLng: 50 },    // Madagascar
  // Middle East / Central Asia
  { minLat: 12, maxLat: 42, minLng: 28, maxLng: 62 },      // Middle East
  { minLat: 35, maxLat: 55, minLng: 50, maxLng: 88 },      // Central Asia
  // Russia / North Asia
  { minLat: 42, maxLat: 75, minLng: 28, maxLng: 180 },     // Russia
  // South Asia
  { minLat: 6, maxLat: 37, minLng: 62, maxLng: 98 },       // India/Pakistan/Bangladesh
  // East Asia
  { minLat: 18, maxLat: 54, minLng: 98, maxLng: 135 },     // China/Mongolia
  { minLat: 30, maxLat: 46, minLng: 126, maxLng: 146 },    // Japan/Korea
  // Southeast Asia
  { minLat: -2, maxLat: 21, minLng: 95, maxLng: 110 },     // Thailand/Myanmar/Vietnam
  { minLat: -8, maxLat: 8, minLng: 95, maxLng: 120 },      // Indonesia (Sumatra/Borneo/Java)
  { minLat: 5, maxLat: 20, minLng: 117, maxLng: 127 },     // Philippines
  { minLat: -10, maxLat: 0, minLng: 120, maxLng: 142 },    // Eastern Indonesia / Papua
  // Oceania
  { minLat: -40, maxLat: -11, minLng: 112, maxLng: 154 },  // Australia
  { minLat: -48, maxLat: -34, minLng: 166, maxLng: 179 },  // New Zealand
  { minLat: 20, maxLat: 23, minLng: -160, maxLng: -155 },  // Hawaii
]

// Water exclusion zones: areas within land boxes that are water
const WATER_ZONES = [
  { minLat: 30, maxLat: 46, minLng: -5, maxLng: 36 },     // Mediterranean Sea
  { minLat: 40, maxLat: 47, minLng: 27, maxLng: 42 },     // Black Sea
  { minLat: 36, maxLat: 42, minLng: 46, maxLng: 55 },     // Caspian Sea
  { minLat: 18, maxLat: 31, minLng: -98, maxLng: -80 },   // Gulf of Mexico
  { minLat: 9, maxLat: 22, minLng: -88, maxLng: -60 },    // Caribbean Sea
  { minLat: 46, maxLat: 60, minLng: 10, maxLng: 30 },     // Baltic Sea
  { minLat: 10, maxLat: 25, minLng: 32, maxLng: 44 },     // Red Sea
  { minLat: 23, maxLat: 31, minLng: 46, maxLng: 57 },     // Persian Gulf
  { minLat: 20, maxLat: 27, minLng: 55, maxLng: 77 },     // Arabian Sea (deep)
  { minLat: 0, maxLat: 22, minLng: 77, maxLng: 92 },      // Bay of Bengal (deep)
  { minLat: 55, maxLat: 67, minLng: -8, maxLng: 12 },     // North Sea
  { minLat: -5, maxLat: 8, minLng: 100, maxLng: 118 },    // South China Sea
]

export function isLikelyOnLand(lat: number, lng: number): boolean {
  if (Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5) return false
  if (Math.abs(lat) > 82) return false

  // Must be within a land box
  const inLand = LAND_BOXES.some(box =>
    lat >= box.minLat && lat <= box.maxLat &&
    lng >= box.minLng && lng <= box.maxLng
  )
  if (!inLand) return false

  // Must not be in a water exclusion zone
  const inWater = WATER_ZONES.some(box =>
    lat >= box.minLat && lat <= box.maxLat &&
    lng >= box.minLng && lng <= box.maxLng
  )
  if (inWater) {
    // Allow points near coastlines (within ~2 degrees of a land box edge)
    const nearCoast = LAND_BOXES.some(box => {
      const inside = lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng
      if (!inside) return false
      const distToEdge = Math.min(
        lat - box.minLat, box.maxLat - lat,
        lng - box.minLng, box.maxLng - lng
      )
      return distToEdge < 2
    })
    return nearCoast
  }

  return true
}

interface GlobeOverlaysProps {
  viewer: any
  incidents: Incident[]
  timelineCutoff?: string | null
  onSelectIncident?: (incident: Incident, screenPosition?: { x: number; y: number }) => void
}

function createGlowBillboard(
  color: { r: number; g: number; b: number },
  size: number,
  severity: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const s = Math.max(size * 2, 64)
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')!
  const cx = s / 2, cy = s / 2

  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.75)
  outerGlow.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.25)`)
  outerGlow.addColorStop(0.4, `rgba(${color.r},${color.g},${color.b},0.08)`)
  outerGlow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = outerGlow
  ctx.fillRect(0, 0, s, s)

  const coreRadius = s * 0.1
  ctx.beginPath()
  ctx.arc(cx, cy, coreRadius + 2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},0.45)`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, coreRadius * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()

  if (severity === 'CRITICAL' || severity === 'HIGH') {
    const ringR = s * 0.18
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${severity === 'CRITICAL' ? 0.7 : 0.4})`
    ctx.lineWidth = severity === 'CRITICAL' ? 1.5 : 1
    ctx.stroke()
  }

  if (severity === 'CRITICAL') {
    const b = s * 0.25
    const bLen = s * 0.08
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},0.55)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx - b, cy - b + bLen); ctx.lineTo(cx - b, cy - b); ctx.lineTo(cx - b + bLen, cy - b)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + b - bLen, cy - b); ctx.lineTo(cx + b, cy - b); ctx.lineTo(cx + b, cy - b + bLen)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - b, cy + b - bLen); ctx.lineTo(cx - b, cy + b); ctx.lineTo(cx - b + bLen, cy + b)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + b - bLen, cy + b); ctx.lineTo(cx + b, cy + b); ctx.lineTo(cx + b, cy + b - bLen)
    ctx.stroke()
  }

  return canvas
}

const billboardCache = new Map<string, HTMLCanvasElement>()

function getCachedBillboard(domain: IncidentDomain, severity: string): HTMLCanvasElement {
  const key = `${domain}-${severity}-v2`
  if (!billboardCache.has(key)) {
    const color = DOMAIN_COLORS[domain] ?? DOMAIN_COLORS.CYBER
    const scale = SEVERITY_SCALE[severity] ?? 0.3
    const size = Math.round(32 + scale * 40)
    billboardCache.set(key, createGlowBillboard(color, size, severity))
  }
  return billboardCache.get(key)!
}

export function useGlobeOverlays({ viewer, incidents, timelineCutoff, onSelectIncident }: GlobeOverlaysProps) {
  const markerEntitiesRef = useRef<Map<string, any>>(new Map())
  const pulseEntitiesRef = useRef<Map<string, any>>(new Map())
  const pulseAnimStateRef = useRef<Map<string, { canvas: HTMLCanvasElement; color: { r: number; g: number; b: number }; phaseOffset: number }>>(new Map())
  const arcEntitiesRef = useRef<any[]>([])
  const cesiumRef = useRef<any>(null)
  const incidentsRef = useRef(incidents)
  incidentsRef.current = incidents

  const visibleIncidents = useMemo(() => {
    if (!timelineCutoff) return incidents
    const cutoffMs = new Date(timelineCutoff).getTime()
    if (isNaN(cutoffMs)) return incidents
    return incidents.filter(i => new Date(i.timestamp).getTime() <= cutoffMs)
  }, [incidents, timelineCutoff])

  const [debouncedVisibleIncidents, setDebouncedVisibleIncidents] = useState(visibleIncidents)
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedVisibleIncidents(visibleIncidents)
    }, MARKER_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [visibleIncidents])

  const renderIncidents = useMemo(
    () => debouncedVisibleIncidents.slice(0, MAX_MARKERS),
    [debouncedVisibleIncidents]
  )

  const loadCesium = useCallback(async () => {
    if (!cesiumRef.current) {
      cesiumRef.current = await import('cesium')
    }
    return cesiumRef.current
  }, [])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false
    let clusterRef: any = null
    let listenerRemover: any = null

    ;(async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return
      try {
        const cluster = new Cesium.EntityCluster({
          enabled: true,
          pixelRange: 40,
          minimumClusterSize: 3,
          clusterBillboards: true,
          clusterLabels: false,
          clusterPoints: false,
        })
        clusterRef = cluster
        listenerRemover = cluster.clusterEvent.addEventListener((_ids: any[], clusterObj: any) => {
          clusterObj.billboard.show = true
          clusterObj.billboard.image = getCachedBillboard('CONFLICT', 'HIGH')
          clusterObj.billboard.scale = 0.8 + Math.min(_ids.length / 20, 0.6)
          clusterObj.label.show = true
          clusterObj.label.text = `${_ids.length}`
          clusterObj.label.font = '12px JetBrains Mono'
          clusterObj.label.fillColor = Cesium.Color.WHITE
          clusterObj.label.outlineColor = Cesium.Color.BLACK
          clusterObj.label.outlineWidth = 2
          clusterObj.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE
          clusterObj.label.pixelOffset = new Cesium.Cartesian2(0, -20)
        })
        viewer.dataSourceDisplay.defaultDataSource.clustering = cluster
      } catch {}
    })()

    return () => {
      cancelled = true
      if (listenerRemover) { try { listenerRemover() } catch {} }
      if (clusterRef) { try { clusterRef.enabled = false } catch {} }
    }
  }, [viewer, loadCesium])

  // Billboard markers - only on land, filtered by timeline
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    const update = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      const currentIds = new Set(renderIncidents.map(i => i.id))

      for (const [id, entity] of markerEntitiesRef.current) {
        if (!currentIds.has(id)) {
          try { viewer.entities.remove(entity) } catch {}
          markerEntitiesRef.current.delete(id)
        }
      }

      for (const incident of renderIncidents) {
        if (markerEntitiesRef.current.has(incident.id)) continue
        if (!isLikelyOnLand(incident.latitude, incident.longitude)) continue

        const billboardImage = getCachedBillboard(incident.domain, incident.severity)
        const scale = SEVERITY_SCALE[incident.severity] ?? 0.3

        try {
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(incident.longitude, incident.latitude, 0),
            billboard: {
              image: billboardImage,
              scale: 0.6 + scale * 0.4,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: 5e6,
              sizeInMeters: false,
              scaleByDistance: new Cesium.NearFarScalar(100, 1.4, 1.5e7, 0.6),
            },
            properties: {
              incidentId: new Cesium.ConstantProperty(incident.id),
            }
          })
          markerEntitiesRef.current.set(incident.id, entity)
        } catch {}
      }
    }

    update()
    return () => {
      cancelled = true
      if (viewer && !viewer.isDestroyed()) {
        for (const entity of markerEntitiesRef.current.values()) {
          try { viewer.entities.remove(entity) } catch {}
        }
      }
      markerEntitiesRef.current.clear()
    }
  }, [viewer, renderIncidents, loadCesium])

  // Animated pulse halo for CRITICAL - only on land (single interval redraws all pulse canvases)
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false
    const intervalRef: { id: ReturnType<typeof setInterval> | null } = { id: null }

    const redrawAllPulseCanvases = () => {
      if (cancelled || viewer.isDestroyed()) {
        if (intervalRef.id !== null) { clearInterval(intervalRef.id); intervalRef.id = null }
        return
      }
      const now = Date.now()
      for (const state of pulseAnimStateRef.current.values()) {
        const ctx = state.canvas.getContext('2d')
        if (!ctx) continue
        const cx = 32, cy = 32
        const elapsed = (now + state.phaseOffset) % PULSE_CYCLE_MS
        const progress = elapsed / PULSE_CYCLE_MS

        ctx.clearRect(0, 0, 64, 64)

        const r = 4 + 24 * progress
        const a = 0.5 * (1 - progress)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${state.color.r},${state.color.g},${state.color.b},${a})`
        ctx.lineWidth = 1.2
        ctx.stroke()

        if (progress < 0.5) {
          const r2 = 4 + 24 * (progress + 0.5)
          const a2 = 0.25 * (0.5 - progress)
          ctx.beginPath()
          ctx.arc(cx, cy, r2, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${state.color.r},${state.color.g},${state.color.b},${a2})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }

    const update = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      const criticals = renderIncidents.filter(
        i => i.severity === 'CRITICAL' && isLikelyOnLand(i.latitude, i.longitude)
      )
      const currentIds = new Set(criticals.map(i => i.id))

      for (const [id, entity] of pulseEntitiesRef.current) {
        if (!currentIds.has(id)) {
          try { viewer.entities.remove(entity) } catch {}
          pulseEntitiesRef.current.delete(id)
          pulseAnimStateRef.current.delete(id)
        }
      }

      for (const incident of criticals) {
        if (pulseEntitiesRef.current.has(incident.id)) continue

        const color = DOMAIN_COLORS[incident.domain] ?? DOMAIN_COLORS.CONFLICT

        const pulseCanvas = document.createElement('canvas')
        pulseCanvas.width = 64
        pulseCanvas.height = 64
        const phaseOffset = stablePulsePhaseOffset(incident.id)
        pulseAnimStateRef.current.set(incident.id, { canvas: pulseCanvas, color, phaseOffset })

        try {
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(incident.longitude, incident.latitude, 0),
            billboard: {
              image: new Cesium.CallbackProperty(() => pulseCanvas, false),
              scale: 2.0,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: 5e6,
              sizeInMeters: false,
              scaleByDistance: new Cesium.NearFarScalar(100, 1.4, 1.5e7, 0.6),
            }
          })
          pulseEntitiesRef.current.set(incident.id, entity)
        } catch {
          pulseAnimStateRef.current.delete(incident.id)
        }
      }

      redrawAllPulseCanvases()
      if (cancelled || viewer.isDestroyed()) return
      if (pulseAnimStateRef.current.size > 0 && intervalRef.id === null) {
        intervalRef.id = setInterval(redrawAllPulseCanvases, PULSE_INTERVAL_MS)
      }
    }

    update()
    return () => {
      cancelled = true
      if (intervalRef.id !== null) { clearInterval(intervalRef.id); intervalRef.id = null }
      if (viewer && !viewer.isDestroyed()) {
        for (const entity of pulseEntitiesRef.current.values()) {
          try { viewer.entities.remove(entity) } catch {}
        }
      }
      pulseEntitiesRef.current.clear()
      pulseAnimStateRef.current.clear()
    }
  }, [viewer, renderIncidents, loadCesium])

  // Arc connections - only on land, CRITICAL same domain
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    const update = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      for (const entity of arcEntitiesRef.current) {
        try { viewer.entities.remove(entity) } catch {}
      }
      arcEntitiesRef.current = []

      const critical = renderIncidents.filter(
        i => (i.severity === 'CRITICAL' || i.severity === 'HIGH') &&
             isLikelyOnLand(i.latitude, i.longitude)
      )
      if (critical.length < 2) return

      const connections: Array<{ from: Incident; to: Incident }> = []

      for (let i = 0; i < critical.length && connections.length < MAX_ARCS; i++) {
        for (let j = i + 1; j < critical.length && connections.length < MAX_ARCS; j++) {
          if (critical[i].domain !== critical[j].domain) continue
          if (!incidentsWithinGeoDegrees(critical[i], critical[j], ARC_MAX_GEO_DEG)) continue
          connections.push({ from: critical[i], to: critical[j] })
        }
      }

      for (const conn of connections) {
        const dc = DOMAIN_COLORS[conn.from.domain]
        const color = Cesium.Color.fromCssColorString(dc?.hex ?? '#ffffff').withAlpha(0.15)

        try {
          const entity = viewer.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                conn.from.longitude, conn.from.latitude, 50000,
                conn.to.longitude, conn.to.latitude, 50000
              ]),
              width: 1,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.15,
                color
              }),
              arcType: Cesium.ArcType.GEODESIC
            }
          })
          arcEntitiesRef.current.push(entity)
        } catch {}
      }
    }

    update()
    return () => {
      cancelled = true
      if (viewer && !viewer.isDestroyed()) {
        for (const entity of arcEntitiesRef.current) {
          try { viewer.entities.remove(entity) } catch {}
        }
      }
      arcEntitiesRef.current = []
    }
  }, [viewer, renderIncidents, loadCesium])

  const onSelectRef = useRef(onSelectIncident)
  onSelectRef.current = onSelectIncident

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let handler: any = null
    let cancelled = false

    const setup = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return

      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handler.setInputAction((movement: any) => {
        if (!onSelectRef.current) return
        const picked = viewer.scene.pick(movement.position)
        if (Cesium.defined(picked) && picked.id?.properties) {
          try {
            const incidentId = picked.id.properties.incidentId?.getValue()
            if (incidentId) {
              const incident = incidentsRef.current.find(i => i.id === incidentId)
              if (incident) {
                const screenPos = movement.position ? { x: movement.position.x, y: movement.position.y } : undefined
                onSelectRef.current(incident, screenPos)
              }
            }
          } catch {}
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }

    setup()
    return () => {
      cancelled = true
      if (handler && !handler.isDestroyed()) handler.destroy()
    }
  }, [viewer, loadCesium])
}
