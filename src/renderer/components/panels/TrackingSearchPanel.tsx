import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTrackingStore } from '@/stores/tracking-store'
import type { FlightData, VesselData, SatelliteData } from '../../../shared/types'

const P = {
  font: "'JetBrains Mono', 'Fira Code', monospace",
  bg: 'rgba(10,14,23,0.98)',
  card: '#0d1220',
  border: '#141c2e',
  dim: '#4a5568',
  text: '#c8d6e5',
  accent: '#00d4ff',
}

type SearchCategory = 'all' | 'flights' | 'vessels' | 'satellites'

interface TrackingSearchResult {
  type: 'flight' | 'vessel' | 'satellite'
  id: string
  title: string
  subtitle: string
  icon: string
  color: string
  lat: number
  lng: number
  raw: FlightData | VesselData | SatelliteData
}

interface TrackingSearchPanelProps {
  isOpen: boolean
  onClose: () => void
  onLocate: (lat: number, lng: number, title: string) => void
  onTrackingClick: (info: any) => void
}

export function TrackingSearchPanel({ isOpen, onClose, onLocate, onTrackingClick }: TrackingSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SearchCategory>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const flights = useTrackingStore(s => s.flights)
  const vessels = useTrackingStore(s => s.vessels)
  const satellites = useTrackingStore(s => s.satellites)
  const enabledLayers = useTrackingStore(s => s.enabledLayers)

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen, onClose])

  const allResults = useMemo<TrackingSearchResult[]>(() => {
    const results: TrackingSearchResult[] = []

    if (category === 'all' || category === 'flights') {
      for (const f of flights) {
        results.push({
          type: 'flight',
          id: f.icao24,
          title: f.callsign || f.icao24,
          subtitle: `${f.originCountry} • ${Math.round((f.velocity || 0) * 3.6)} km/h • ${Math.round(f.altitude || 0)}m`,
          icon: '✈',
          color: '#00b4ff',
          lat: f.latitude,
          lng: f.longitude,
          raw: f,
        })
      }
    }

    if (category === 'all' || category === 'vessels') {
      for (const v of vessels) {
        results.push({
          type: 'vessel',
          id: String(v.mmsi),
          title: v.name || `MMSI ${v.mmsi}`,
          subtitle: `${v.flag || 'N/A'} • ${v.type || 'Unknown'} • ${v.speed || 0} kts`,
          icon: '⚓',
          color: '#64c8ff',
          lat: v.latitude,
          lng: v.longitude,
          raw: v,
        })
      }
    }

    if (category === 'all' || category === 'satellites') {
      for (const s of satellites) {
        results.push({
          type: 'satellite',
          id: String(s.noradId),
          title: s.name,
          subtitle: `${s.category} • ${Math.round(s.altitude)} km • ${s.orbitType || 'LEO'}`,
          icon: '🛰',
          color: '#a78bfa',
          lat: s.latitude,
          lng: s.longitude,
          raw: s,
        })
      }
    }

    return results
  }, [flights, vessels, satellites, category])

  const filtered = useMemo(() => {
    if (!query.trim()) return allResults.slice(0, 50)
    const q = query.toLowerCase().trim()
    return allResults
      .filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
      .slice(0, 100)
  }, [allResults, query])

  const handleResultClick = useCallback((r: TrackingSearchResult) => {
    onLocate(r.lat, r.lng, r.title)

    if (r.type === 'flight') {
      const f = r.raw as FlightData
      onTrackingClick({
        type: 'flight',
        title: f.callsign || f.icao24,
        details: {
          Callsign: f.callsign || 'N/A',
          ICAO24: f.icao24,
          'Origin Country': f.originCountry,
          Altitude: `${Math.round(f.altitude)}m`,
          Speed: `${Math.round(f.velocity * 3.6)} km/h`,
        },
        latitude: f.latitude,
        longitude: f.longitude,
        imageUrl: `https://api.planespotters.net/pub/photos/hex/${f.icao24}`,
        rawData: f,
      })
    } else if (r.type === 'vessel') {
      const v = r.raw as VesselData
      onTrackingClick({
        type: 'vessel',
        title: v.name || `MMSI ${v.mmsi}`,
        details: {
          Name: v.name,
          MMSI: v.mmsi,
          Type: v.type,
          Flag: v.flag,
          Speed: `${v.speed} kts`,
        },
        latitude: v.latitude,
        longitude: v.longitude,
        rawData: v,
      })
    } else if (r.type === 'satellite') {
      const s = r.raw as SatelliteData
      onTrackingClick({
        type: 'satellite',
        title: s.name,
        details: {
          'NORAD ID': s.noradId,
          Category: s.category,
          'Orbit Type': s.orbitType || 'N/A',
          'Altitude (km)': Math.round(s.altitude),
          'Velocity (km/s)': s.velocity.toFixed(1),
          'Period (min)': s.period ? s.period.toFixed(2) : 'N/A',
          Inclination: s.inclination ? `${s.inclination.toFixed(2)}°` : 'N/A',
          'Apogee (km)': s.apogee || 'N/A',
          'Perigee (km)': s.perigee || 'N/A',
          'RCS Size': s.rcsSize || 'N/A',
          'Object Type': s.objectType || 'N/A',
          Country: s.country || 'N/A',
          'Intl Designator': s.intlDesignator || 'N/A',
          'Launch Date': s.launchDate || 'N/A',
          Latitude: s.latitude.toFixed(4),
          Longitude: s.longitude.toFixed(4),
        },
        latitude: s.latitude,
        longitude: s.longitude,
        imageUrl: s.imageUrl || undefined,
      })
    }
  }, [onLocate, onTrackingClick])

  const categories: { id: SearchCategory; label: string; icon: string; color: string; count: number }[] = [
    { id: 'all', label: 'ALL', icon: '◉', color: P.accent, count: allResults.length },
    { id: 'flights', label: 'FLIGHTS', icon: '✈', color: '#00b4ff', count: flights.length },
    { id: 'vessels', label: 'VESSELS', icon: '⚓', color: '#64c8ff', count: vessels.length },
    { id: 'satellites', label: 'SATELLITES', icon: '🛰', color: '#a78bfa', count: satellites.length },
  ]

  const dataNotLoaded = !enabledLayers.flights && !enabledLayers.vessels && !enabledLayers.satellites

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: '42px', left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 250, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
        width: '640px', maxHeight: 'calc(100vh - 100px)',
        background: P.bg, border: `1px solid ${P.border}`,
        borderRadius: '12px', fontFamily: P.font,
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', borderBottom: `1px solid ${P.border}`,
        }}>
          <span style={{ fontSize: '16px', color: P.accent }}>⌕</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search flights, vessels, satellites..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: P.text, fontSize: '14px', fontFamily: P.font,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'transparent', border: 'none', color: P.dim,
              cursor: 'pointer', fontSize: '14px', fontFamily: P.font,
            }}>✕</button>
          )}
          <button onClick={onClose} style={{
            background: '#ff3b5c', border: 'none', borderRadius: '6px',
            color: '#fff', cursor: 'pointer', fontWeight: 700,
            fontSize: '12px', fontFamily: P.font, padding: '5px 10px',
          }}>ESC</button>
        </div>

        {/* Category filters */}
        <div style={{
          display: 'flex', gap: '4px', padding: '8px 16px',
          borderBottom: `1px solid ${P.border}`,
        }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
              padding: '5px 12px', borderRadius: '4px',
              background: category === cat.id ? `${cat.color}15` : 'transparent',
              border: `1px solid ${category === cat.id ? cat.color + '40' : 'transparent'}`,
              color: category === cat.id ? cat.color : P.dim,
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
              cursor: 'pointer', fontFamily: P.font, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span>{cat.icon}</span>
              {cat.label}
              <span style={{
                fontSize: '9px', opacity: 0.7,
                background: category === cat.id ? `${cat.color}20` : `${P.dim}20`,
                padding: '1px 5px', borderRadius: '3px',
              }}>{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px 16px', textAlign: 'center',
              color: P.dim, fontSize: '12px',
            }}>
              {dataNotLoaded
                ? 'Enable tracking layers (Flights, Vessels, Satellites) from the sidebar to load data.'
                : query ? `No results for "${query}"` : 'No tracking data loaded yet.'}
            </div>
          ) : (
            filtered.map(r => (
              <button key={`${r.type}-${r.id}`} onClick={() => handleResultClick(r)} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '10px 16px', background: 'transparent',
                border: 'none', borderBottom: `1px solid ${P.border}08`,
                cursor: 'pointer', fontFamily: P.font, textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${r.color}08`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: `${r.color}12`, border: `1px solid ${r.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>{r.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 700, color: '#e2e8f0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.title}</div>
                  <div style={{
                    fontSize: '10px', color: P.dim, marginTop: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.subtitle}</div>
                </div>
                <div style={{
                  fontSize: '9px', color: r.color, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 8px', background: `${r.color}10`,
                  borderRadius: '4px', flexShrink: 0,
                }}>{r.type}</div>
                <div style={{
                  fontSize: '9px', color: P.dim, flexShrink: 0, textAlign: 'right',
                  lineHeight: 1.4,
                }}>
                  <div>{r.lat.toFixed(2)}°</div>
                  <div>{r.lng.toFixed(2)}°</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: `1px solid ${P.border}`,
          fontSize: '9px', color: P.dim, display: 'flex', justifyContent: 'space-between',
          letterSpacing: '0.06em',
        }}>
          <span>{filtered.length} {filtered.length === 1 ? 'RESULT' : 'RESULTS'}</span>
          <span>CLICK TO LOCATE ON MAP</span>
        </div>
      </div>
    </div>
  )
}
