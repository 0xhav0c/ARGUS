import { useCallback } from 'react'
import type { Incident } from '../../shared/types'

export function useGlobeCamera(viewer: any) {
  const flyToIncident = useCallback(async (incident: Incident, onComplete?: () => void) => {
    if (!viewer || viewer.isDestroyed()) return

    if (incident.latitude == null || incident.longitude == null ||
        (incident.latitude === 0 && incident.longitude === 0)) {
      console.warn('[Camera] Invalid coordinates for incident:', incident.title, incident.latitude, incident.longitude)
      return
    }

    const Cesium = await import('cesium')

    const currentAlt = viewer.camera.positionCartographic.height
    const MAX_FLY_ALT = 800000
    const MIN_FLY_ALT = 50000
    const targetAlt = Math.max(MIN_FLY_ALT, Math.min(currentAlt, MAX_FLY_ALT))

    window.dispatchEvent(new Event('argus-lock-rotation'))

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        incident.longitude,
        incident.latitude,
        targetAlt
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      },
      duration: 1.5,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      complete: onComplete,
    })
  }, [viewer])

  const flyToRegion = useCallback(async (lat: number, lng: number, altitude = 6000000) => {
    if (!viewer || viewer.isDestroyed()) return

    const Cesium = await import('cesium')

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, altitude),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      },
      duration: 2.0
    })
  }, [viewer])

  const resetView = useCallback(async () => {
    if (!viewer || viewer.isDestroyed()) return

    const Cesium = await import('cesium')

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(30, 20, 22000000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      },
      duration: 2.0
    })
  }, [viewer])

  const unlockRotation = useCallback(() => {
    window.dispatchEvent(new Event('argus-unlock-rotation'))
  }, [])

  return { flyToIncident, flyToRegion, resetView, unlockRotation }
}
