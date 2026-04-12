import { useEffect, useRef, useCallback } from 'react'
import { useAnnotationStore } from '@/stores/annotation-store'
import type { MapAnnotation } from '@/stores/annotation-store'

function makePinCanvas(color: string, size = 48): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2
  const cy = size / 2 - 2
  ctx.beginPath()
  ctx.arc(cx, cy - 4, 10, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#0a0e17'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 8, cy + 2)
  ctx.lineTo(cx, cy + 18)
  ctx.lineTo(cx + 8, cy + 2)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.stroke()
  return c
}

export function useAnnotationOverlay({ viewer }: { viewer: any }): void {
  const annotations = useAnnotationStore((s) => s.annotations)
  const activeToolType = useAnnotationStore((s) => s.activeToolType)

  const entityMapRef = useRef<Map<string, any>>(new Map())
  const cesiumRef = useRef<typeof import('cesium') | null>(null)

  const loadCesium = useCallback(async () => {
    if (!cesiumRef.current) {
      cesiumRef.current = await import('cesium')
    }
    return cesiumRef.current
  }, [])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed?.()) return
    let cancelled = false

    const sync = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed?.()) return

      const wanted = new Set(annotations.map((a) => a.id))

      for (const [id, ent] of entityMapRef.current) {
        if (!wanted.has(id)) {
          try {
            viewer.entities.remove(ent)
          } catch {
            /* */
          }
          entityMapRef.current.delete(id)
        }
      }

      for (const ann of annotations) {
        const prev = entityMapRef.current.get(ann.id)
        if (prev) {
          try {
            viewer.entities.remove(prev)
          } catch {
            /* */
          }
          entityMapRef.current.delete(ann.id)
        }

        try {
          const color = Cesium.Color.fromCssColorString(ann.color).withAlpha(0.92)
          const outline = Cesium.Color.BLACK

          if (ann.type === 'circle') {
            const km = ann.radius ?? 50
            const meters = km * 1000
            const entity = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(
                ann.longitude,
                ann.latitude,
                0
              ),
              ellipse: {
                semiMinorAxis: meters,
                semiMajorAxis: meters,
                material: Cesium.Color.fromCssColorString(ann.color).withAlpha(0.22),
                outline: true,
                outlineColor: color,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
              label: {
                text: ann.title,
                font: '12px "JetBrains Mono", monospace',
                fillColor: color,
                outlineColor: outline,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -8),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 8e6, 0.35),
              },
              properties: {
                annotationId: new Cesium.ConstantProperty(ann.id),
              },
            })
            entityMapRef.current.set(ann.id, entity)
            continue
          }

          if (ann.type === 'line') {
            const endLat = ann.endLat ?? ann.latitude + 0.3
            const endLng = ann.endLng ?? ann.longitude + 0.3
            const entity = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(
                ann.longitude,
                ann.latitude,
                0
              ),
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray([
                  ann.longitude,
                  ann.latitude,
                  endLng,
                  endLat,
                ]),
                width: 3,
                material: new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.2,
                  color: Cesium.Color.fromCssColorString(ann.color).withAlpha(0.85),
                }),
                arcType: Cesium.ArcType.GEODESIC,
                clampToGround: true,
              },
              label: {
                text: ann.title,
                font: '12px "JetBrains Mono", monospace',
                fillColor: color,
                outlineColor: outline,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -6),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 8e6, 0.35),
              },
              properties: {
                annotationId: new Cesium.ConstantProperty(ann.id),
              },
            })
            entityMapRef.current.set(ann.id, entity)
            continue
          }

          const pin = makePinCanvas(ann.color)
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              ann.longitude,
              ann.latitude,
              400
            ),
            billboard: {
              image: pin,
              scale: 0.85,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: 5e6,
            },
            label: {
              text:
                ann.type === 'note' && ann.description
                  ? `${ann.title}\n${ann.description}`
                  : ann.title,
              font: '11px "JetBrains Mono", monospace',
              fillColor: color,
              outlineColor: outline,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -36),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              scaleByDistance: new Cesium.NearFarScalar(8e3, 1.0, 6e6, 0.4),
            },
            properties: {
              annotationId: new Cesium.ConstantProperty(ann.id),
            },
          })
          entityMapRef.current.set(ann.id, entity)
        } catch {
          /* */
        }
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [viewer, annotations, loadCesium])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed?.() || !activeToolType) return

    let handler: any = null
    let destroyed = false

    const setup = async () => {
      const Cesium = await loadCesium()
      if (destroyed || viewer.isDestroyed?.()) return

      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handler.setInputAction((movement: { position: any }) => {
        const tool = useAnnotationStore.getState().activeToolType
        if (!tool) return

        const cartesian = viewer.camera.pickEllipsoid(
          movement.position,
          viewer.scene.globe.ellipsoid
        )
        if (!Cesium.defined(cartesian)) return

        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        const lat = Cesium.Math.toDegrees(carto.latitude)
        const lng = Cesium.Math.toDegrees(carto.longitude)

        const base: Omit<MapAnnotation, 'id' | 'createdAt'> = {
          type: tool,
          latitude: lat,
          longitude: lng,
          title:
            tool === 'note'
              ? 'Note'
              : tool === 'circle'
                ? 'AOI'
                : tool === 'line'
                  ? 'Line'
                  : 'Marker',
          description: '',
          color:
            tool === 'note'
              ? '#f5c542'
              : tool === 'circle'
                ? '#ff6b35'
                : tool === 'line'
                  ? '#00ff87'
                  : '#00d4ff',
          author: 'You',
        }

        if (tool === 'circle') {
          base.radius = 100
        }
        if (tool === 'line') {
          base.endLat = lat + 0.4
          base.endLng = lng + 0.4
        }

        useAnnotationStore.getState().addAnnotation(base)
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }

    void setup()
    return () => {
      destroyed = true
      if (handler && !handler.isDestroyed()) {
        handler.destroy()
      }
      handler = null
    }
  }, [viewer, activeToolType, loadCesium])

  useEffect(() => {
    return () => {
      if (!viewer || viewer.isDestroyed?.()) {
        entityMapRef.current.clear()
        return
      }
      for (const ent of entityMapRef.current.values()) {
        try {
          viewer.entities.remove(ent)
        } catch {
          /* */
        }
      }
      entityMapRef.current.clear()
    }
  }, [viewer])
}
