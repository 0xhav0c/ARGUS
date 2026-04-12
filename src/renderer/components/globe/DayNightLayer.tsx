import { useEffect, useRef } from 'react'

export function useDayNightLayer({ viewer, enabled }: { viewer: any; enabled: boolean }) {
  const entityRef = useRef<any>(null)
  const lineRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (viewer && !viewer.isDestroyed?.()) {
        if (entityRef.current) { try { viewer.entities.remove(entityRef.current) } catch {} }
        if (lineRef.current) { try { viewer.entities.remove(lineRef.current) } catch {} }
      }
      entityRef.current = null
      lineRef.current = null
    }

    if (!viewer || viewer.isDestroyed?.() || !enabled) { cleanup(); return cleanup }

    cleanup()

    ;(async () => {
      const Cesium = await import('cesium')
      if (!viewer || viewer.isDestroyed?.() || !enabled) return

      const createNightCanvas = () => {
        const canvas = document.createElement('canvas')
        const W = 1440, H = 720
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, W, H)

        const now = new Date()
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
        const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10))
        const hourUTC = now.getUTCHours() + now.getUTCMinutes() / 60
        const subSolarLng = (12 - hourUTC) * 15

        for (let py = 0; py < H; py++) {
          const lat = 90 - (py / H) * 180
          const latRad = lat * Math.PI / 180
          const decRad = declination * Math.PI / 180

          for (let px = 0; px < W; px++) {
            const lng = (px / W) * 360 - 180
            const lngDiff = (lng - subSolarLng) * Math.PI / 180
            const cosZenith = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(lngDiff)

            if (cosZenith < 0.05) {
              const darkness = Math.min(1, Math.max(0, (0.05 - cosZenith) / 0.4))
              const alpha = Math.floor(darkness * 140)
              if (alpha > 3) {
                ctx.fillStyle = `rgba(2,3,12,${alpha / 255})`
                ctx.fillRect(px, py, 1, 1)
              }
            }
          }
        }
        return canvas
      }

      const getTerminatorPositions = () => {
        const now = new Date()
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
        const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10))
        const hourUTC = now.getUTCHours() + now.getUTCMinutes() / 60
        const subSolarLng = (12 - hourUTC) * 15

        const positions: number[] = []
        for (let lat = -89; lat <= 89; lat += 1) {
          const latRad = lat * Math.PI / 180
          const decRad = declination * Math.PI / 180
          const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad)
          if (cosHourAngle >= -1 && cosHourAngle <= 1) {
            const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI
            const lng1 = subSolarLng + hourAngle
            const lng2 = subSolarLng - hourAngle
            const normLng = (l: number) => ((l + 180) % 360 + 360) % 360 - 180
            positions.push(normLng(lng1), lat, 500)
          }
        }
        return positions
      }

      const updateLayer = () => {
        if (!viewer || viewer.isDestroyed?.()) return

        const canvas = createNightCanvas()
        if (entityRef.current) { try { viewer.entities.remove(entityRef.current) } catch {} }
        entityRef.current = viewer.entities.add({
          rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
            material: new Cesium.ImageMaterialProperty({ image: canvas, transparent: true }),
            height: 50,
          },
        })

        const terminatorDegs = getTerminatorPositions()
        if (lineRef.current) { try { viewer.entities.remove(lineRef.current) } catch {} }
        if (terminatorDegs.length >= 6) {
          lineRef.current = viewer.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(terminatorDegs),
              width: 2,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.15,
                color: Cesium.Color.fromCssColorString('#ff9500aa'),
              }),
              clampToGround: false,
            },
          })
        }
      }

      updateLayer()
      intervalRef.current = setInterval(updateLayer, 60000)
    })()

    return cleanup
  }, [viewer, enabled])
}
