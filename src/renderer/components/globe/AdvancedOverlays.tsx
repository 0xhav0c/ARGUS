import { useEffect, useRef, useCallback, type MutableRefObject } from 'react'
import type { WeatherAlert, PandemicEvent, NuclearEvent, MilitaryActivity, EnergyFacility, MigrationRoute, InternetOutage } from '../../../shared/types'

const COLORS = {
  weather: { EXTREME: '#ff3b5ccc', SEVERE: '#ff6b35cc', MODERATE: '#f5c542cc', MINOR: '#64c8ffcc' },
  pandemic: { EMERGENCY: '#ff3b5ccc', HIGH: '#ff6b35cc', MODERATE: '#f5c542cc', LOW: '#00d4ffcc' },
  nuclear: { test: '#ff3b5c', facility: '#f5c542', missile: '#ff3b5c', radiation: '#ff6b35', treaty: '#00d4ff' },
  military: { exercise: '#00d4ff', deployment: '#ff6b35', patrol: '#a78bfa', buildup: '#ff3b5c', airspace_closure: '#f5c542' },
  energy: { nuclear: '#f5c542', thermal: '#ff6b35', hydro: '#4a9eff', solar: '#ffd700', wind: '#64c8ff', refinery: '#ff8800', lng_terminal: '#00e676' },
}

export interface AdvancedOverlayClickInfo {
  type: 'weather' | 'pandemic' | 'nuclear' | 'military' | 'energy' | 'migration' | 'internet'
  title: string
  details: Record<string, string | number>
  latitude: number
  longitude: number
}

export function useAdvancedOverlays(
  viewer: any,
  loadCesium: () => Promise<typeof import('cesium')>,
  layers: { weather?: boolean; pandemic?: boolean; nuclear?: boolean; military?: boolean; energy?: boolean; migration?: boolean; internet?: boolean },
  onOverlayClick?: (info: AdvancedOverlayClickInfo) => void,
) {
  const entitiesRef = useRef<any[]>([])
  const clickHandlerRef = useRef<any>(null)
  const onOverlayClickRef = useRef(onOverlayClick)
  onOverlayClickRef.current = onOverlayClick

  const clear = useCallback(() => {
    if (!viewer || viewer.isDestroyed()) return
    for (const e of entitiesRef.current) {
      try { viewer.entities.remove(e) } catch {}
    }
    entitiesRef.current = []
  }, [viewer])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    const setupClick = async () => {
      const Cesium = await loadCesium()
      if (cancelled || viewer.isDestroyed()) return
      if (clickHandlerRef.current && !clickHandlerRef.current.isDestroyed()) {
        clickHandlerRef.current.destroy()
      }
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handler.setInputAction((click: any) => {
        const picked = viewer.scene.pick(click.position)
        if (picked?.id?._argusAdvanced && onOverlayClickRef.current) {
          onOverlayClickRef.current(picked.id._argusAdvanced as AdvancedOverlayClickInfo)
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      clickHandlerRef.current = handler
    }

    setupClick()

    return () => {
      cancelled = true
      if (clickHandlerRef.current && !clickHandlerRef.current.isDestroyed()) {
        clickHandlerRef.current.destroy()
      }
      clickHandlerRef.current = null
    }
  }, [viewer, loadCesium])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    let cancelled = false

    const addEntity = (opts: any, clickInfo?: AdvancedOverlayClickInfo) => {
      if (cancelled || viewer.isDestroyed()) return
      try {
        const e = viewer.entities.add(opts)
        if (clickInfo) (e as any)._argusAdvanced = clickInfo
        entitiesRef.current.push(e)
      } catch {}
    }

    const update = async () => {
      clear()
      const Cesium = await loadCesium()
      if (cancelled) return

      if (layers.weather) {
        try {
          const alerts: WeatherAlert[] = await window.argus.getWeatherAlerts()
          for (const a of alerts) {
            if (a.latitude == null || a.longitude == null || !Number.isFinite(a.latitude) || !Number.isFinite(a.longitude)) continue
            const c = (COLORS.weather as any)[a.severity] || '#64c8ffcc'
            addEntity({
              position: Cesium.Cartesian3.fromDegrees(a.longitude, a.latitude),
              point: { pixelSize: 12, color: Cesium.Color.fromCssColorString(c), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: 5e6 },
              label: { text: `${a.type.toUpperCase()}`, font: '10px monospace', fillColor: Cesium.Color.WHITE, style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 2, outlineColor: Cesium.Color.BLACK, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -16), disableDepthTestDistance: 5e6 },
            }, {
              type: 'weather', title: `${a.type} - ${a.region}`,
              details: { Type: a.type, Severity: a.severity, Region: a.region, Status: a.status, Started: a.startTime || 'N/A' },
              latitude: a.latitude, longitude: a.longitude,
            })
          }
        } catch {}
      }

      if (layers.pandemic) {
        try {
          const events: PandemicEvent[] = await window.argus.getPandemicEvents()
          for (const e of (Array.isArray(events) ? events : [])) {
            if (e.latitude == null || e.longitude == null || !Number.isFinite(e.latitude) || !Number.isFinite(e.longitude)) continue
            const c = (COLORS.pandemic as any)[e.alertLevel] || '#f5c542cc'
            const size = Math.min(20, 8 + Math.log10((e.cases || 0) + 1) * 2)
            addEntity({
              position: Cesium.Cartesian3.fromDegrees(e.longitude, e.latitude),
              point: { pixelSize: size, color: Cesium.Color.fromCssColorString(c), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: 5e6 },
              label: { text: `${e.disease}`, font: '9px monospace', fillColor: Cesium.Color.fromCssColorString('#ff8800'), verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -16), disableDepthTestDistance: 5e6 },
            }, {
              type: 'pandemic', title: `${e.disease} - ${e.country}`,
              details: { Disease: e.disease, Country: e.country, Cases: e.cases ?? 0, Deaths: e.deaths ?? 0, 'Alert Level': e.alertLevel },
              latitude: e.latitude, longitude: e.longitude,
            })
          }
        } catch {}
      }

      if (layers.nuclear) {
        try {
          const events: NuclearEvent[] = await window.argus.getNuclearEvents()
          for (const e of events) {
            if (e.latitude == null || e.longitude == null || !Number.isFinite(e.latitude) || !Number.isFinite(e.longitude)) continue
            const c = (COLORS.nuclear as any)[e.type] || '#f5c542'
            addEntity({
              position: Cesium.Cartesian3.fromDegrees(e.longitude, e.latitude),
              point: { pixelSize: 14, color: Cesium.Color.fromCssColorString(c), outlineColor: Cesium.Color.YELLOW, outlineWidth: 2, disableDepthTestDistance: 5e6 },
              label: { text: `${e.type.toUpperCase()}`, font: '9px monospace', fillColor: Cesium.Color.YELLOW, style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 2, outlineColor: Cesium.Color.BLACK, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -18), disableDepthTestDistance: 5e6 },
            }, {
              type: 'nuclear', title: `${e.type.toUpperCase()} - ${e.facility}`,
              details: { Type: e.type, Facility: e.facility, Country: e.country, Status: e.status, Yield: e.yield || 'N/A', Description: e.description },
              latitude: e.latitude, longitude: e.longitude,
            })
          }
        } catch {}
      }

      if (layers.military) {
        try {
          const acts: MilitaryActivity[] = await window.argus.getMilitaryActivities()
          for (const m of acts) {
            if (m.latitude == null || m.longitude == null || !Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) continue
            const c = (COLORS.military as any)[m.type] || '#a78bfa'
            addEntity({
              position: Cesium.Cartesian3.fromDegrees(m.longitude, m.latitude),
              point: { pixelSize: 12, color: Cesium.Color.fromCssColorString(c), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: 5e6 },
              label: { text: `${m.type.replace('_', ' ').toUpperCase()}`, font: '9px monospace', fillColor: Cesium.Color.fromCssColorString(c), verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -16), disableDepthTestDistance: 5e6 },
            }, {
              type: 'military', title: `${m.type.replace('_', ' ').toUpperCase()} - ${m.name}`,
              details: { Name: m.name, Type: m.type, Force: m.force, Country: m.country, Status: m.status, Description: m.description },
              latitude: m.latitude, longitude: m.longitude,
            })
          }
        } catch {}
      }

      if (layers.energy) {
        try {
          const facilities: EnergyFacility[] = await window.argus.getEnergyFacilities()
          for (const f of facilities) {
            if (f.latitude == null || f.longitude == null || !Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) continue
            const c = (COLORS.energy as any)[f.type] || '#f5c542'
            addEntity({
              position: Cesium.Cartesian3.fromDegrees(f.longitude, f.latitude),
              point: { pixelSize: 10, color: Cesium.Color.fromCssColorString(c), outlineColor: f.status === 'offline' ? Cesium.Color.RED : Cesium.Color.WHITE, outlineWidth: f.status === 'offline' ? 2 : 1, disableDepthTestDistance: 5e6 },
              label: { text: f.name, font: '8px monospace', fillColor: Cesium.Color.WHITE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -14), disableDepthTestDistance: 5e6, scaleByDistance: new Cesium.NearFarScalar(500000, 1.0, 5000000, 0.0) },
            }, {
              type: 'energy', title: f.name,
              details: { Type: f.type, Country: f.country, Capacity: f.capacity || 'N/A', Status: f.status, Operator: f.operator || 'N/A' },
              latitude: f.latitude, longitude: f.longitude,
            })
          }
        } catch {}
      }

      if (layers.migration) {
        try {
          const routes: MigrationRoute[] = await window.argus.getMigrationRoutes()
          for (const r of routes) {
            if (!r.waypoints || r.waypoints.length < 2) continue
            const riskColors: Record<string, string> = { HIGH: '#ff3b5c', MEDIUM: '#f5c542', LOW: '#00d4ff' }
            const positions = r.waypoints.flatMap(([lat, lng]) => [lng, lat])
            addEntity({
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(positions),
                width: 3,
                material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString(riskColors[r.riskLevel] || '#f5c542'), dashLength: 16.0 }),
                clampToGround: true,
              },
            })
            const mid = r.waypoints[Math.floor(r.waypoints.length / 2)]
            if (mid) {
              addEntity({
                position: Cesium.Cartesian3.fromDegrees(mid[1], mid[0]),
                label: { text: r.name, font: '9px monospace', fillColor: Cesium.Color.WHITE, style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 2, outlineColor: Cesium.Color.BLACK, disableDepthTestDistance: 5e6, scaleByDistance: new Cesium.NearFarScalar(1000000, 1.0, 8000000, 0.0) },
                point: { pixelSize: 8, color: Cesium.Color.fromCssColorString(riskColors[r.riskLevel] || '#f5c542'), disableDepthTestDistance: 5e6 },
              }, {
                type: 'migration', title: r.name,
                details: { 'Risk Level': r.riskLevel, 'Est. People': r.estimatedPeople || 'N/A', Route: r.name, Origin: r.origin || 'N/A', Destination: r.destination || 'N/A' },
                latitude: mid[0], longitude: mid[1],
              })
            }
          }
        } catch {}
      }

      if (layers.internet) {
        try {
          const outages: InternetOutage[] = await window.argus.getInternetOutages()
          for (const o of outages) {
            if (!o.latitude || !o.longitude) continue
            const c = o.severity === 'major' ? '#ff3b5c' : o.severity === 'moderate' ? '#ff8800' : '#f5c542'
            addEntity({
              position: Cesium.Cartesian3.fromDegrees(o.longitude, o.latitude),
              point: { pixelSize: 12, color: Cesium.Color.fromCssColorString(c), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: 5e6 },
              label: { text: `${o.country}`, font: '9px monospace', fillColor: Cesium.Color.fromCssColorString(c), verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -16), disableDepthTestDistance: 5e6 },
            }, {
              type: 'internet', title: `Internet Outage - ${o.country}`,
              details: { Country: o.country, Severity: o.severity, Provider: o.provider || 'N/A', 'Affected Users': o.affectedUsers || 'N/A', Started: o.startTime || 'N/A' },
              latitude: o.latitude, longitude: o.longitude,
            })
          }
        } catch {}
      }
    }

    update()
    return () => { cancelled = true; clear() }
  }, [viewer, loadCesium, layers.weather, layers.pandemic, layers.nuclear, layers.military, layers.energy, layers.migration, layers.internet, clear])
}
