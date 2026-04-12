import { useEffect, useRef } from 'react'
import type { Incident } from '../../../shared/types'

/** [latitude, longitude] */
type LatLon = [number, number]

export interface InfrastructureLayerProps {
  viewer: any
  enabled: boolean
  incidents?: Incident[]
}

const PROXIMITY_DEG = 3

const PIPELINE_ROUTES: { id: string; path: LatLon[] }[] = [
  { id: 'nord-stream', path: [[60.1, 11.1], [55.5, 13.5], [54.4, 13.8]] },
  { id: 'btc', path: [[40.5, 50.0], [41.7, 44.8], [36.8, 35.9]] },
  { id: 'tapline', path: [[26.3, 50.1], [32.0, 36.0]] },
  { id: 'druzhba', path: [[52.0, 34.0], [52.2, 21.0], [48.8, 16.5]] },
  { id: 'keystone-xl', path: [[50.5, -108], [41.2, -96]] },
  { id: 'turkstream', path: [[44.7, 37.8], [41.5, 28.8]] }
]

const CABLE_ROUTES: { id: string; path: LatLon[] }[] = [
  { id: 'transatlantic', path: [[40.7, -74], [51.5, -0.1]] },
  { id: 'sea-me-we-3', path: [[1.3, 103.8], [12.8, 45.0], [30.0, 32.5], [36.5, 4.5]] },
  { id: 'pacific-crossing', path: [[35.7, 139.7], [37.8, -122.4]] }
]

const CHOKEPOINTS: { id: string; name: string; lat: number; lon: number }[] = [
  { id: 'hormuz', name: 'Strait of Hormuz', lat: 26.6, lon: 56.3 },
  { id: 'suez', name: 'Suez Canal', lat: 30.0, lon: 32.6 },
  { id: 'malacca', name: 'Strait of Malacca', lat: 2.5, lon: 101.5 },
  { id: 'bosphorus', name: 'Bosphorus', lat: 41.1, lon: 29.1 },
  { id: 'panama', name: 'Panama Canal', lat: 9.1, lon: -79.7 },
  { id: 'gibraltar', name: 'Strait of Gibraltar', lat: 35.9, lon: -5.6 },
  { id: 'good-hope', name: 'Cape of Good Hope', lat: -34.4, lon: 18.5 },
  { id: 'taiwan-strait', name: 'Taiwan Strait', lat: 24.0, lon: 119.5 }
]

function pathToDegreesArray(path: LatLon[]): number[] {
  const flat: number[] = []
  for (const [lat, lon] of path) {
    flat.push(lon, lat)
  }
  return flat
}

function distancePointToSegmentDeg(
  plat: number,
  plon: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dx = lat2 - lat1
  const dy = lon2 - lon1
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-14) {
    return Math.hypot(plat - lat1, plon - lon1)
  }
  let t = ((plat - lat1) * dx + (plon - lon1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const nlat = lat1 + t * dx
  const nlon = lon1 + t * dy
  return Math.hypot(plat - nlat, plon - nlon)
}

function minDistanceIncidentToPathDeg(inc: Incident, path: LatLon[]): number {
  let minD = Infinity
  for (const [lat, lon] of path) {
    minD = Math.min(minD, Math.hypot(inc.latitude - lat, inc.longitude - lon))
  }
  for (let i = 0; i < path.length - 1; i++) {
    const [la, lo] = path[i]
    const [lb, lc] = path[i + 1]
    minD = Math.min(minD, distancePointToSegmentDeg(inc.latitude, inc.longitude, la, lo, lb, lc))
  }
  return minD
}

function isPolylineAtRisk(path: LatLon[], incidents?: Incident[]): boolean {
  if (!incidents?.length) return false
  for (const inc of incidents) {
    if (inc.latitude === 0 && inc.longitude === 0) continue
    if (minDistanceIncidentToPathDeg(inc, path) <= PROXIMITY_DEG) return true
  }
  return false
}

function isChokepointAtRisk(lat: number, lon: number, incidents?: Incident[]): boolean {
  if (!incidents?.length) return false
  for (const inc of incidents) {
    if (inc.latitude === 0 && inc.longitude === 0) continue
    if (Math.hypot(inc.latitude - lat, inc.longitude - lon) <= PROXIMITY_DEG) return true
  }
  return false
}

function createDiamondDataUrl(fill: string, stroke: string): string {
  const size = 40
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r, cy)
  ctx.lineTo(cx, cy + r)
  ctx.lineTo(cx - r, cy)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.stroke()
  return canvas.toDataURL()
}

export function useInfrastructureLayer({ viewer, enabled, incidents }: InfrastructureLayerProps): void {
  const entitiesRef = useRef<any[]>([])

  useEffect(() => {
    const removeAll = () => {
      if (viewer && !viewer.isDestroyed?.()) {
        for (const entity of entitiesRef.current) {
          viewer.entities.remove(entity)
        }
      }
      entitiesRef.current = []
    }

    if (!enabled || !viewer || viewer.isDestroyed?.()) {
      removeAll()
      return
    }

    let cancelled = false

    ;(async () => {
      const Cesium = await import('cesium')
      if (cancelled || !viewer || viewer.isDestroyed?.()) return

      removeAll()

      const orange = Cesium.Color.fromCssColorString('#ff8c00')
      const cyan = Cesium.Color.fromCssColorString('#00e5ff')
      const riskRed = Cesium.Color.RED.withAlpha(0.7)
      const pulseMaterial = () =>
        new Cesium.PolylineDashMaterialProperty({
          color: riskRed,
          dashLength: 18
        })

      for (const route of PIPELINE_ROUTES) {
        const atRisk = isPolylineAtRisk(route.path, incidents)
        const entity = viewer.entities.add({
          id: `infra-pipeline-${route.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(pathToDegreesArray(route.path)),
            width: 2,
            material: atRisk
              ? pulseMaterial()
              : new Cesium.PolylineDashMaterialProperty({
                  color: orange,
                  dashLength: 18
                }),
            arcType: Cesium.ArcType.GEODESIC
          }
        })
        entitiesRef.current.push(entity)
      }

      for (const route of CABLE_ROUTES) {
        const atRisk = isPolylineAtRisk(route.path, incidents)
        const entity = viewer.entities.add({
          id: `infra-cable-${route.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(pathToDegreesArray(route.path)),
            width: 1,
            material: atRisk
              ? new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.35,
                  color: Cesium.Color.RED.withAlpha(0.75)
                })
              : cyan,
            arcType: Cesium.ArcType.GEODESIC
          }
        })
        entitiesRef.current.push(entity)
      }

      const normalDiamond = createDiamondDataUrl('rgba(0,206,209,0.95)', 'rgba(255,255,255,0.9)')
      const riskDiamond = createDiamondDataUrl('rgba(255,60,60,0.95)', 'rgba(255,200,200,0.95)')

      for (const cp of CHOKEPOINTS) {
        const atRisk = isChokepointAtRisk(cp.lat, cp.lon, incidents)
        const position = Cesium.Cartesian3.fromDegrees(cp.lon, cp.lat)
        const entity = viewer.entities.add({
          id: `infra-choke-${cp.id}`,
          position,
          billboard: {
            image: atRisk ? riskDiamond : normalDiamond,
            scale: 0.85,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            color: Cesium.Color.WHITE
          },
          label: {
            text: cp.name,
            font: '13px sans-serif',
            fillColor: atRisk
              ? Cesium.Color.RED.withAlpha(0.85)
              : Cesium.Color.fromCssColorString('#e0f7fa'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -28),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: 5e6
          }
        })
        entitiesRef.current.push(entity)
      }
    })()

    return () => {
      cancelled = true
      removeAll()
    }
  }, [viewer, enabled, incidents])
}
