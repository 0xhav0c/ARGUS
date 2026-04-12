import { useEffect, useRef, useState, useCallback } from 'react'
import type { ConflictZone, TradeRoute } from '../../../shared/types'

interface Props {
  viewer: any
  showConflictZones: boolean
  showTradeRoutes: boolean
}

export function useConflictTradeOverlay({ viewer, showConflictZones, showTradeRoutes }: Props) {
  const entitiesRef = useRef<any[]>([])
  const [zones, setZones] = useState<ConflictZone[]>([])
  const [routes, setRoutes] = useState<TradeRoute[]>([])

  const load = useCallback(async () => {
    try {
      const [z, r] = await Promise.all([
        window.argus.getConflictZones(),
        window.argus.getTradeRoutes(),
      ])
      setZones(z)
      setRoutes(r)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    for (const e of entitiesRef.current) {
      try { viewer.entities.remove(e) } catch { /* ignore */ }
    }
    entitiesRef.current = []

    const addEntity = async () => {
      const Cesium = await import('cesium')

      if (showConflictZones) {
        for (const zone of zones) {
          const positions = zone.polygon.map(([lat, lng]) =>
            Cesium.Cartesian3.fromDegrees(lng, lat)
          )
          if (positions.length < 3) continue

          const entity = viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: Cesium.Color.fromCssColorString(zone.color).withAlpha(0.15),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(zone.color).withAlpha(0.6),
              outlineWidth: 2,
              classificationType: Cesium.ClassificationType.BOTH,
            },
            name: zone.name,
            description: `<b>${zone.name}</b><br/>Type: ${zone.type}<br/>Parties: ${zone.parties.join(', ')}<br/>${zone.description}`,
          })
          entitiesRef.current.push(entity)

          const center = zone.polygon.reduce((acc, [lat, lng]) => [acc[0] + lat / zone.polygon.length, acc[1] + lng / zone.polygon.length], [0, 0])
          const label = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(center[1], center[0]),
            label: {
              text: zone.name,
              font: '11px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString(zone.color),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              disableDepthTestDistance: 5e6,
              scale: 0.9,
            },
          })
          entitiesRef.current.push(label)
        }
      }

      if (showTradeRoutes) {
        for (const route of routes) {
          const positions = route.waypoints.map(([lat, lng]) =>
            Cesium.Cartesian3.fromDegrees(lng, lat)
          )
          if (positions.length < 2) continue

          const riskColors: Record<string, string> = { LOW: '#00e676', MEDIUM: '#f5c542', HIGH: '#ff6b35', CRITICAL: '#ff3b5c' }
          const color = riskColors[route.riskLevel] || '#00d4ff'
          const typeStyles: Record<string, { width: number; dash: boolean }> = {
            maritime: { width: 2, dash: false },
            pipeline: { width: 3, dash: true },
            rail: { width: 2, dash: true },
            air_corridor: { width: 1, dash: true },
          }
          const style = typeStyles[route.type] || { width: 2, dash: false }

          const material = style.dash
            ? new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString(color).withAlpha(0.7), dashLength: 16 })
            : Cesium.Color.fromCssColorString(color).withAlpha(0.6)

          const entity = viewer.entities.add({
            polyline: {
              positions,
              width: style.width,
              material,
              clampToGround: route.type === 'pipeline' || route.type === 'rail',
            },
            name: route.name,
            description: `<b>${route.name}</b><br/>Type: ${route.type}<br/>Risk: ${route.riskLevel}<br/>${route.commodity}<br/>${route.description}`,
          })
          entitiesRef.current.push(entity)

          if (route.chokepoint) {
            const mid = route.waypoints[Math.floor(route.waypoints.length / 2)]
            const chokeLabel = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(mid[1], mid[0]),
              billboard: {
                image: createChokepointIcon(color),
                width: 16,
                height: 16,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: 5e6,
              },
              label: {
                text: route.name,
                font: '9px JetBrains Mono',
                fillColor: Cesium.Color.fromCssColorString(color),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -14),
                disableDepthTestDistance: 5e6,
                scale: 0.8,
              },
            })
            entitiesRef.current.push(chokeLabel)
          }
        }
      }
    }

    addEntity()

    return () => {
      for (const e of entitiesRef.current) {
        try { if (viewer && !viewer.isDestroyed()) viewer.entities.remove(e) } catch { /* ignore */ }
      }
      entitiesRef.current = []
    }
  }, [viewer, showConflictZones, showTradeRoutes, zones, routes])
}

const chokepointIconCache = new Map<string, string>()
function createChokepointIcon(color: string): string {
  const cached = chokepointIconCache.get(color)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(8, 8, 6, 0, Math.PI * 2)
  ctx.fillStyle = color + '40'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(8, 8, 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  const dataUrl = canvas.toDataURL()
  chokepointIconCache.set(color, dataUrl)
  return dataUrl
}
