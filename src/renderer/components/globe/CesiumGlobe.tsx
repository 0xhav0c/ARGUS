import { useEffect, useRef, useState, Component, type ReactNode, type ErrorInfo } from 'react'

interface CesiumGlobeProps {
  onReady?: (viewer: any) => void
  sceneMode?: '3d' | '2d' | 'columbus'
}

class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GlobeErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0e17', fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', color: '#ff3b5c' }}>⚠</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ff3b5c', marginBottom: '8px' }}>GLOBE ERROR</div>
            <div style={{ fontSize: '11px', color: '#4a5568', maxWidth: '400px' }}>{this.state.error}</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function CesiumGlobeInner({ onReady, sceneMode }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  // Handle scene mode changes
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const doMorph = async () => {
      await import('cesium')
      if (sceneMode === '2d') {
        viewer.scene.morphTo2D(1.5)
      } else if (sceneMode === 'columbus') {
        viewer.scene.morphToColumbusView(1.5)
      } else {
        viewer.scene.morphTo3D(1.5)
      }
    }
    doMorph()
  }, [sceneMode])

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return
    let destroyed = false
    let lockRotation = () => {}
    let unlockRotation = () => {}
    let ro: ResizeObserver | null = null

    const init = async () => {
      try {
        const Cesium = await import('cesium')
        if (destroyed || !containerRef.current) return
        await import('cesium/Build/Cesium/Widgets/widgets.css')

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          scene3DOnly: false,
          orderIndependentTranslucency: false,
          msaaSamples: 4,
          contextOptions: {
            webgl: { alpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'high-performance' }
          }
        })

        if (destroyed) { viewer.destroy(); return }

        const scene = viewer.scene

        // HiDPI/Retina resolution: render at native device pixel ratio for sharp imagery
        viewer.useBrowserRecommendedResolution = false
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2)

        scene.backgroundColor = Cesium.Color.BLACK
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628')
        scene.globe.enableLighting = false
        scene.globe.showGroundAtmosphere = false
        scene.globe.depthTestAgainstTerrain = true

        // Subtle atmosphere edge glow (thin blue halo at Earth's rim)
        if (scene.skyAtmosphere) {
          scene.skyAtmosphere.show = true
          scene.skyAtmosphere.brightnessShift = -0.4
          scene.skyAtmosphere.hueShift = 0.0
          scene.skyAtmosphere.saturationShift = -0.2
        }

        scene.fog.enabled = false
        if (scene.sun) scene.sun.show = false
        if (scene.moon) scene.moon.show = false

        // High-quality realistic starfield
        const generateStarFace = (seed: number): HTMLCanvasElement => {
          const size = 2048
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')!

          // Deep space gradient background
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7)
          bgGrad.addColorStop(0, '#020408')
          bgGrad.addColorStop(1, '#000102')
          ctx.fillStyle = bgGrad
          ctx.fillRect(0, 0, size, size)

          let s = seed
          const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }

          // Subtle nebula clouds
          for (let i = 0; i < 5; i++) {
            const cx = rand() * size
            const cy = rand() * size
            const r = 300 + rand() * 600
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
            const hues = [220, 240, 260, 200, 280]
            const hue = hues[i % hues.length] + rand() * 20
            grad.addColorStop(0, `hsla(${hue}, 40%, 12%, 0.06)`)
            grad.addColorStop(0.3, `hsla(${hue}, 30%, 8%, 0.03)`)
            grad.addColorStop(0.6, `hsla(${hue}, 20%, 5%, 0.015)`)
            grad.addColorStop(1, 'transparent')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, size, size)
          }

          // Milky way band (subtle on some faces)
          if (seed % 3 === 0) {
            ctx.save()
            ctx.translate(size / 2, size / 2)
            ctx.rotate(rand() * Math.PI)
            const mwGrad = ctx.createLinearGradient(-size, -size * 0.15, size, size * 0.15)
            mwGrad.addColorStop(0, 'transparent')
            mwGrad.addColorStop(0.3, 'rgba(180, 200, 240, 0.015)')
            mwGrad.addColorStop(0.5, 'rgba(200, 210, 240, 0.025)')
            mwGrad.addColorStop(0.7, 'rgba(180, 200, 240, 0.015)')
            mwGrad.addColorStop(1, 'transparent')
            ctx.fillStyle = mwGrad
            ctx.fillRect(-size, -size * 0.3, size * 2, size * 0.6)
            ctx.restore()
          }

          // Dust motes (very faint, very many)
          for (let i = 0; i < 8000; i++) {
            const x = rand() * size
            const y = rand() * size
            const brightness = 60 + rand() * 80
            const alpha = 0.15 + rand() * 0.25
            ctx.fillStyle = `rgba(${brightness + 120}, ${brightness + 130}, ${brightness + 160}, ${alpha})`
            ctx.fillRect(x, y, 1, 1)
          }

          // Small stars
          for (let i = 0; i < 1200; i++) {
            const x = rand() * size
            const y = rand() * size
            const brightness = 140 + rand() * 115
            const radius = 0.4 + rand() * 0.8

            const temp = rand()
            let r2: number, g: number, b: number
            if (temp < 0.15) {
              r2 = brightness * 0.7; g = brightness * 0.8; b = brightness        // blue
            } else if (temp < 0.3) {
              r2 = brightness * 0.85; g = brightness * 0.9; b = brightness       // blue-white
            } else if (temp < 0.4) {
              r2 = brightness; g = brightness * 0.92; b = brightness * 0.7       // warm
            } else if (temp < 0.45) {
              r2 = brightness; g = brightness * 0.75; b = brightness * 0.5       // orange
            } else {
              r2 = brightness; g = brightness; b = brightness                    // white
            }

            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${Math.round(r2)}, ${Math.round(g)}, ${Math.round(b)}, ${0.5 + rand() * 0.5})`
            ctx.fill()
          }

          // Medium bright stars with soft glow
          for (let i = 0; i < 120; i++) {
            const x = rand() * size
            const y = rand() * size
            const radius = 0.8 + rand() * 1.5

            const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 5)
            const temp = rand()
            const glowR = temp < 0.3 ? 160 : temp < 0.5 ? 255 : 220
            const glowG = temp < 0.3 ? 190 : temp < 0.5 ? 220 : 225
            const glowB = temp < 0.3 ? 255 : temp < 0.5 ? 180 : 240

            glow.addColorStop(0, `rgba(${glowR}, ${glowG}, ${glowB}, 0.35)`)
            glow.addColorStop(0.2, `rgba(${glowR}, ${glowG}, ${glowB}, 0.12)`)
            glow.addColorStop(0.5, `rgba(${glowR}, ${glowG}, ${glowB}, 0.03)`)
            glow.addColorStop(1, 'transparent')
            ctx.fillStyle = glow
            ctx.fillRect(x - radius * 5, y - radius * 5, radius * 10, radius * 10)

            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(240, 245, 255, ${0.8 + rand() * 0.2})`
            ctx.fill()
          }

          // Bright prominent stars with diffraction spikes
          for (let i = 0; i < 15; i++) {
            const x = rand() * size
            const y = rand() * size
            const radius = 1.5 + rand() * 2.0

            // Large outer glow
            const bigGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 12)
            bigGlow.addColorStop(0, 'rgba(200, 220, 255, 0.2)')
            bigGlow.addColorStop(0.15, 'rgba(180, 200, 255, 0.06)')
            bigGlow.addColorStop(0.4, 'rgba(160, 180, 240, 0.02)')
            bigGlow.addColorStop(1, 'transparent')
            ctx.fillStyle = bigGlow
            ctx.fillRect(x - radius * 12, y - radius * 12, radius * 24, radius * 24)

            // Diffraction spikes
            ctx.save()
            ctx.translate(x, y)
            ctx.globalAlpha = 0.15
            for (let s = 0; s < 4; s++) {
              ctx.rotate(Math.PI / 4)
              ctx.fillStyle = 'rgba(200, 220, 255, 0.3)'
              ctx.fillRect(-0.5, -radius * 8, 1, radius * 16)
            }
            ctx.globalAlpha = 1
            ctx.restore()

            // Core
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, 0.95)`
            ctx.fill()

            // Inner bright ring
            ctx.beginPath()
            ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 255, 255, 1)'
            ctx.fill()
          }

          return canvas
        }

        try {
          scene.skyBox = new Cesium.SkyBox({
            sources: {
              positiveX: generateStarFace(12345),
              negativeX: generateStarFace(67890),
              positiveY: generateStarFace(11111),
              negativeY: generateStarFace(22222),
              positiveZ: generateStarFace(33333),
              negativeZ: generateStarFace(44444),
            }
          })
        } catch { /* no skybox */ }

        // === IMAGERY LAYERS ===
        viewer.imageryLayers.removeAll()

        scene.globe.maximumScreenSpaceError = 1.0
        scene.globe.tileCacheSize = 1000

        // Apple Silicon ANGLE/Metal shader bug workaround
        // https://github.com/CesiumGS/cesium/issues/11251
        const isAppleSiliconMac = (() => {
          try {
            if (typeof process !== 'undefined' && process.platform === 'darwin' && process.arch === 'arm64') return true
          } catch { /* renderer may not have process */ }
          return navigator.platform === 'MacIntel'
            && typeof (navigator as any).userAgentData?.architecture === 'string'
              ? (navigator as any).userAgentData.architecture === 'arm'
              : (navigator.platform === 'MacIntel'
                  && !('ontouchend' in document)
                  && navigator.maxTouchPoints === 0
                  && window.matchMedia?.('(-webkit-device-pixel-ratio: 2)').matches
                  && /Mac/.test(navigator.userAgent))
        })()

        // Layer 1: NaturalEarthII - dark blue tinted globe
        let baseLayer: any = null
        try {
          const baseImagery = await Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
          )
          if (!destroyed) {
            baseLayer = viewer.imageryLayers.addImageryProvider(baseImagery)
            if (!isAppleSiliconMac) {
              baseLayer.brightness = 0.5
              baseLayer.contrast = 1.3
              baseLayer.saturation = 0.3
              baseLayer.gamma = 0.8
            }
          }
        } catch {
          console.warn('[Globe] Base imagery failed')
        }

        // Layer 2: ArcGIS World Imagery - high-res satellite (zoom-in)
        let satLayer: any = null
        try {
          const arcgisImagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
          )
          if (!destroyed) {
            satLayer = viewer.imageryLayers.addImageryProvider(arcgisImagery)
            satLayer.alpha = 0
            satLayer.brightness = 1.0
            satLayer.contrast = 1.05
            console.log('[Globe] ArcGIS satellite layer ready')
          }
        } catch {
          console.warn('[Globe] ArcGIS unavailable, trying Bing')
          const bingKey = import.meta.env.VITE_BING_MAPS_KEY
          if (bingKey) {
            try {
              const bingImagery = await Cesium.BingMapsImageryProvider.fromUrl(
                'https://dev.virtualearth.net', {
                  key: bingKey,
                  mapStyle: Cesium.BingMapsStyle.AERIAL,
                }
              )
              if (!destroyed) {
                satLayer = viewer.imageryLayers.addImageryProvider(bingImagery)
                satLayer.alpha = 0
                console.log('[Globe] Bing satellite fallback ready')
              }
            } catch {
              console.warn('[Globe] Bing satellite provider failed')
            }
          } else {
            console.warn('[Globe] No VITE_BING_MAPS_KEY configured, skipping Bing imagery')
          }
        }

        // Layer 4: ArcGIS Reference Labels - city/country names (zoom-in)
        let labelLayer: any = null
        try {
          const labelsImagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer'
          )
          if (!destroyed) {
            labelLayer = viewer.imageryLayers.addImageryProvider(labelsImagery)
            labelLayer.alpha = 0
            console.log('[Globe] Label overlay ready')
          }
        } catch {
          console.warn('[Globe] Label overlay unavailable')
        }

        // Terrain (only if Cesium Ion token is configured)
        if (Cesium.Ion.defaultAccessToken) {
          try {
            const terrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
              requestVertexNormals: true,
              requestWaterMask: false
            })
            if (!destroyed) {
              viewer.terrainProvider = terrain
            }
          } catch {
            console.warn('[Globe] Terrain failed — check Cesium Ion token')
          }
        }

        // Camera - look at Earth center from directly above
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(30, 20, 22000000),
          orientation: {
            heading: 0,
            pitch: Cesium.Math.toRadians(-90),
            roll: 0,
          },
        })

        // ResizeObserver to keep globe properly sized when container changes
        ro = new ResizeObserver(() => {
          if (!viewer.isDestroyed()) viewer.resize()
        })
        if (containerRef.current) ro.observe(containerRef.current)

        // Controls
        const ctrl = scene.screenSpaceCameraController
        ctrl.enableZoom = true
        ctrl.enableRotate = true
        ctrl.enableTilt = true
        ctrl.enableLook = false
        ctrl.minimumZoomDistance = 500
        ctrl.maximumZoomDistance = 30000000
        ctrl.inertiaZoom = 0.5
        ctrl.inertiaSpin = 0.8
        ctrl.inertiaTranslate = 0.8
        ctrl.enableCollisionDetection = true
        ctrl.minimumCollisionTerrainHeight = 500
        ctrl.zoomEventTypes = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH]
        ctrl.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG]
        ctrl.tiltEventTypes = [Cesium.CameraEventType.RIGHT_DRAG, Cesium.CameraEventType.MIDDLE_DRAG]
        scene.camera.defaultZoomAmount = 500000

        // Auto-rotation with smooth zoom-out resume
        let autoRotate = true
        let isZoomingOut = false
        let resumeTimer: ReturnType<typeof setTimeout> | null = null
        const OVERVIEW_ALT = 18000000

        scene.postRender.addEventListener(() => {
          if (viewer.isDestroyed()) return

          // Smooth zoom-out before resuming rotation — center globe
          if (isZoomingOut) {
            const currentAlt = viewer.camera.positionCartographic.height
            if (currentAlt < OVERVIEW_ALT * 0.95) {
              const t = Math.min(1, (OVERVIEW_ALT - currentAlt) / OVERVIEW_ALT)
              const step = Math.max(50000, (OVERVIEW_ALT - currentAlt) * 0.02)
              const carto = viewer.camera.positionCartographic

              const currentPitch = viewer.camera.pitch
              const targetPitch = Cesium.Math.toRadians(-90)
              const newPitch = currentPitch + (targetPitch - currentPitch) * 0.04

              const currentHeading = viewer.camera.heading
              const newHeading = currentHeading * (1 - 0.02)

              viewer.camera.setView({
                destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, currentAlt + step),
                orientation: {
                  heading: newHeading,
                  pitch: newPitch,
                  roll: 0,
                },
              })
            } else {
              isZoomingOut = false
              autoRotate = true
            }
          }

          if (lockedOnIncident && driftStartTime > 0) {
            const t = (Date.now() - driftStartTime) / 1000
            const headingOff = Math.sin(t * 0.15) * Cesium.Math.toRadians(3.5)
              + Math.sin(t * 0.07) * Cesium.Math.toRadians(1.5)
            const pitchOff = Math.sin(t * 0.11 + 1.2) * Cesium.Math.toRadians(1.8)
              + Math.sin(t * 0.05 + 0.5) * Cesium.Math.toRadians(0.8)
            viewer.camera.setView({
              orientation: {
                heading: driftAnchorHeading + headingOff,
                pitch: driftAnchorPitch + pitchOff,
                roll: 0
              }
            })
          }

          if (autoRotate && !isZoomingOut && !lockedOnIncident) {
            viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(0.025))
          }

          const alt = viewer.camera.positionCartographic.height

          // Satellite imagery fades in as user zooms closer
          const SAT_START = 8000000
          const SAT_FULL  = 800000
          let satAlpha = 0
          if (alt <= SAT_FULL) {
            satAlpha = 1
          } else if (alt < SAT_START) {
            const t = 1 - (alt - SAT_FULL) / (SAT_START - SAT_FULL)
            satAlpha = t * t
          }

          if (satLayer) satLayer.alpha = satAlpha

          if (baseLayer && !isAppleSiliconMac) {
            baseLayer.brightness = 0.5 + 0.3 * satAlpha
            baseLayer.saturation = 0.3 + 0.5 * satAlpha
          }

          // Labels at medium-close zoom
          if (labelLayer) {
            const LBL_START = 3000000
            const LBL_FULL  = 500000
            if (alt > LBL_START) {
              labelLayer.alpha = 0
            } else if (alt < LBL_FULL) {
              labelLayer.alpha = 0.9
            } else {
              const t = 1 - (alt - LBL_FULL) / (LBL_START - LBL_FULL)
              labelLayer.alpha = t * 0.9
            }
          }
        })

        let lockedOnIncident = false
        let driftStartTime = 0
        let driftAnchorHeading = 0
        let driftAnchorPitch = 0

        const stopDrift = () => {
          lockedOnIncident = false
          driftStartTime = 0
          if (driftAnchorTimer) { clearTimeout(driftAnchorTimer); driftAnchorTimer = null }
        }

        const pauseRotation = () => {
          autoRotate = false
          isZoomingOut = false
          if (resumeTimer) clearTimeout(resumeTimer)
          stopDrift()
          resumeTimer = setTimeout(() => {
            isZoomingOut = true
          }, 20000)
        }

        let driftAnchorTimer: ReturnType<typeof setTimeout> | null = null

        lockRotation = () => {
          autoRotate = false
          isZoomingOut = false
          lockedOnIncident = true
          if (resumeTimer) clearTimeout(resumeTimer)
          if (driftAnchorTimer) clearTimeout(driftAnchorTimer)
          driftAnchorTimer = setTimeout(() => {
            if (!lockedOnIncident || viewer.isDestroyed()) return
            driftStartTime = Date.now()
            driftAnchorHeading = viewer.camera.heading
            driftAnchorPitch = viewer.camera.pitch
          }, 1800)
        }

        unlockRotation = () => {
          stopDrift()
          pauseRotation()
        }

        window.addEventListener('argus-lock-rotation', lockRotation)
        window.addEventListener('argus-unlock-rotation', unlockRotation)

        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
        handler.setInputAction(pauseRotation, Cesium.ScreenSpaceEventType.LEFT_DOWN)
        handler.setInputAction(pauseRotation, Cesium.ScreenSpaceEventType.RIGHT_DOWN)
        handler.setInputAction(pauseRotation, Cesium.ScreenSpaceEventType.MIDDLE_DOWN)
        handler.setInputAction(pauseRotation, Cesium.ScreenSpaceEventType.WHEEL)

        // Hide credits
        try {
          const cc = viewer.cesiumWidget.creditContainer as HTMLElement
          if (cc) cc.style.display = 'none'
        } catch {}

        if (!destroyed) {
          viewerRef.current = viewer
          setLoading(false)
          console.log('[Globe] Ready - Palantir theme')
          onReadyRef.current?.(viewer)
        }
      } catch (err) {
        console.error('[Globe] Init failed:', err)
        if (!destroyed) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      destroyed = true
      if (ro) ro.disconnect()
      window.removeEventListener('argus-lock-rotation', lockRotation)
      window.removeEventListener('argus-unlock-rotation', unlockRotation)
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  if (error) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0e17', fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: 'center', padding: '24px', maxWidth: '400px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px', color: '#ff3b5c' }}>⚠</div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#ff3b5c' }}>GLOBE INIT FAILED</div>
          <div style={{ fontSize: '11px', color: '#4a5568', wordBreak: 'break-word' }}>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%', background: '#060a14',
        zIndex: 0,
      }} />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#060a14', pointerEvents: 'none', zIndex: 10,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', color: '#00d4ff',
              textShadow: '0 0 20px rgba(0,212,255,0.3)', letterSpacing: '0.4em' }}>ARGUS</div>
            <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.2em' }}>INITIALIZING GLOBE ENGINE</div>
            <div style={{
              width: '120px', height: '2px', background: '#1a2235', margin: '12px auto 0',
              borderRadius: '1px', overflow: 'hidden',
            }}>
              <div style={{
                width: '40%', height: '100%', background: 'linear-gradient(90deg, #00d4ff, #4a9eff)',
                borderRadius: '1px', animation: 'loadbar 1.5s ease-in-out infinite',
              }} />
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes loadbar { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }`}</style>
    </>
  )
}

export function CesiumGlobe(props: CesiumGlobeProps) {
  return (
    <GlobeErrorBoundary>
      <CesiumGlobeInner {...props} />
    </GlobeErrorBoundary>
  )
}
