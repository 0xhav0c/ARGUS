import { useEffect, useRef, useState, useCallback } from 'react'
import type { RFEvent } from '../../../shared/types'

interface Props {
  viewer: any
  enabled: boolean
}

export function useSigintOverlay({ viewer, enabled }: Props) {
  const entitiesRef = useRef<any[]>([])
  const [events, setEvents] = useState<RFEvent[]>([])

  const load = useCallback(async () => {
    try {
      const data = await window.argus.getRFEvents()
      setEvents(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { if (enabled) load() }, [enabled, load])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    for (const e of entitiesRef.current) {
      try { viewer.entities.remove(e) } catch { /* ignore */ }
    }
    entitiesRef.current = []

    if (!enabled || events.length === 0) return

    const addEntities = async () => {
      const Cesium = await import('cesium')

      const typeConfig: Record<string, { color: string; radius: number; icon: string }> = {
        jamming: { color: '#ff3b5c', radius: 80000, icon: 'JAM' },
        interference: { color: '#ff8800', radius: 60000, icon: 'INT' },
        anomaly: { color: '#f5c542', radius: 40000, icon: 'ANM' },
        propagation: { color: '#00d4ff', radius: 50000, icon: 'PRG' },
      }

      for (const ev of events) {
        const cfg = typeConfig[ev.type] || typeConfig.anomaly
        const position = Cesium.Cartesian3.fromDegrees(ev.longitude, ev.latitude)

        const entity = viewer.entities.add({
          position,
          ellipse: {
            semiMajorAxis: cfg.radius,
            semiMinorAxis: cfg.radius,
            material: Cesium.Color.fromCssColorString(cfg.color).withAlpha(0.12),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(cfg.color).withAlpha(0.5),
            outlineWidth: 1,
            classificationType: Cesium.ClassificationType.BOTH,
          },
          label: {
            text: `[${cfg.icon}] ${ev.type.toUpperCase()}`,
            font: '9px JetBrains Mono',
            fillColor: Cesium.Color.fromCssColorString(cfg.color),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            disableDepthTestDistance: 5e6,
            scale: 0.8,
          },
          name: ev.description,
          description: `<b>${ev.type.toUpperCase()}</b><br/>Freq: ${ev.frequency || 'N/A'}<br/>Band: ${ev.band || 'N/A'}<br/>Source: ${ev.source}<br/>${ev.description}`,
        })
        entitiesRef.current.push(entity)
      }
    }

    addEntities()

    return () => {
      for (const e of entitiesRef.current) {
        try { if (viewer && !viewer.isDestroyed()) viewer.entities.remove(e) } catch { /* ignore */ }
      }
      entitiesRef.current = []
    }
  }, [viewer, enabled, events])
}
