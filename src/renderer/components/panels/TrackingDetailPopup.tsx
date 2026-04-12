import { useState, useEffect } from 'react'
import { useDraggable } from '@/hooks/useDraggable'
import type { TrackingClickInfo } from '../globe/TrackingOverlays'

const P = {
  font: "'JetBrains Mono', 'Fira Code', monospace",
  bg: 'rgba(10,14,23,0.97)',
  border: '#141c2e',
  dim: '#4a5568',
  text: '#c8d6e5',
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string; source?: string }> = {
  earthquake: { icon: '\u25CE', color: '#ff8800', label: 'EARTHQUAKE', source: 'DATA: USGS' },
  disaster: { icon: '\u26A0', color: '#ff60a0', label: 'NATURAL DISASTER', source: 'DATA: NASA EONET' },
  flight: { icon: '\u2708', color: '#00b4ff', label: 'AIRCRAFT', source: 'DATA: OPENSKY NETWORK' },
  vessel: { icon: '\u2693', color: '#64c8ff', label: 'VESSEL', source: 'DATA: AIS MARITIME' },
  satellite: { icon: '\uD83D\uDEF0', color: '#a78bfa', label: 'SATELLITE', source: 'DATA: CELESTRAK TLE' },
  weather: { icon: '\uD83C\uDF2A', color: '#f5c542', label: 'WEATHER ALERT', source: 'DATA: NWS ALERTS' },
  pandemic: { icon: '\uD83E\uDDA0', color: '#ff6b35', label: 'PANDEMIC', source: 'DATA: DISEASE.SH' },
  nuclear: { icon: '\u2622', color: '#f5c542', label: 'NUCLEAR / WMD', source: 'DATA: INTELLIGENCE' },
  military: { icon: '\uD83C\uDF96', color: '#00d4ff', label: 'MILITARY ACTIVITY', source: 'DATA: INTELLIGENCE' },
  energy: { icon: '\u26A1', color: '#ffd700', label: 'ENERGY INFRASTRUCTURE', source: 'DATA: GEO-POLITICAL' },
  migration: { icon: '\uD83D\uDEA2', color: '#ff8800', label: 'MIGRATION ROUTE', source: 'DATA: UNHCR / IOM' },
  internet: { icon: '\uD83C\uDF10', color: '#64c8ff', label: 'INTERNET OUTAGE', source: 'DATA: CLOUDFLARE' },
}

interface AssetPhoto {
  url: string
  credit: string
}

function InfoRow({ label, value, color, large }: { label: string; value: string | number; color?: string; large?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <span style={{
        fontSize: '10px', color: P.dim, textTransform: 'uppercase',
        letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>{label}</span>
      <span style={{
        fontSize: large ? '14px' : '12px', color: color || P.text,
        fontWeight: large ? 700 : 500, textAlign: 'right',
        maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{value}</span>
    </div>
  )
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div style={{
      fontSize: '9px', color, letterSpacing: '0.2em',
      textTransform: 'uppercase', padding: '10px 0 4px',
      borderBottom: `1px solid ${color}20`, marginBottom: '4px',
    }}>{title}</div>
  )
}

function RouteDisplay({ from, fromCode, to, toCode, color }: {
  from?: string; fromCode?: string; to?: string; toCode?: string; color: string
}) {
  if (!fromCode && !toCode) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '12px', padding: '14px 10px', margin: '0 -20px',
      background: 'rgba(0,0,0,0.25)',
      borderTop: `1px solid ${color}15`, borderBottom: `1px solid ${color}15`,
    }}>
      <div style={{ textAlign: 'center', flex: 1 }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.08em' }}>
          {fromCode || '???'}
        </div>
        <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px', lineHeight: 1.2 }}>
          {from || 'Unknown'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div style={{
          width: '60px', height: '2px', background: `linear-gradient(90deg, ${color}80, ${color}, ${color}80)`,
          borderRadius: '1px', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '-4px', right: '-2px',
            width: 0, height: 0,
            borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
            borderLeft: `8px solid ${color}`,
          }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', flex: 1 }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.08em' }}>
          {toCode || '???'}
        </div>
        <div style={{ fontSize: '9px', color: P.dim, marginTop: '2px', lineHeight: 1.2 }}>
          {to || 'Unknown'}
        </div>
      </div>
    </div>
  )
}

export function TrackingDetailPopup({ info, onClose }: { info: TrackingClickInfo; onClose: () => void }) {
  const config = TYPE_CONFIG[info.type] || TYPE_CONFIG.earthquake
  const [photo, setPhoto] = useState<AssetPhoto | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const { pos, isDragging, onMouseDown, elRef, initialized } = useDraggable()

  useEffect(() => {
    let stale = false
    setPhoto(null)
    setPhotoLoading(false)

    if (info.type === 'flight' && info.imageUrl) {
      setPhotoLoading(true)
      fetch(info.imageUrl)
        .then(r => { if (!r.ok) throw new Error('err'); return r.json() })
        .then((data: any) => {
          if (stale) return
          if (data.photos?.length > 0) {
            const p = data.photos[0]
            setPhoto({
              url: p.thumbnail_large?.src || p.thumbnail?.src || '',
              credit: p.photographer ? `\u00A9 ${p.photographer}` : '',
            })
          }
        })
        .catch(() => {})
        .finally(() => { if (!stale) setPhotoLoading(false) })
    }

    if (info.type === 'satellite') {
      if (info.imageUrl) {
        setPhoto({ url: info.imageUrl, credit: 'Wikimedia Commons' })
      } else {
        setPhotoLoading(true)
        const satName = info.title.replace(/\s+/g, '_')
        fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(satName + ' satellite')}&srnamespace=6&srlimit=3&format=json&origin=*`)
          .then(r => r.json())
          .then((data: any) => {
            if (stale) return null
            const results = data?.query?.search || []
            if (results.length > 0) {
              const title = results[0].title
              return fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`)
            }
            return null
          })
          .then((r: any) => r?.json())
          .then((data: any) => {
            if (stale) return
            if (data) {
              const pages = data?.query?.pages || {}
              const page = Object.values(pages)[0] as any
              const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url
              if (imgUrl) setPhoto({ url: imgUrl, credit: 'Wikimedia Commons' })
            }
          })
          .catch(() => {})
          .finally(() => { if (!stale) setPhotoLoading(false) })
      }
    }

    if (info.type === 'vessel' && info.details?.Type) {
      const vesselType = String(info.details.Type).toLowerCase()
      setPhotoLoading(true)
      const searchQuery = vesselType.includes('container') ? 'container ship sea' :
        vesselType.includes('tanker') || vesselType.includes('vlcc') ? 'oil tanker ship' :
        vesselType.includes('cruise') ? 'cruise ship ocean' :
        vesselType.includes('bulk') ? 'bulk carrier ship' :
        vesselType.includes('lng') ? 'LNG carrier ship' :
        vesselType.includes('roro') ? 'roro ship' :
        vesselType.includes('offshore') ? 'offshore vessel' :
        'cargo ship ocean'

      fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&srlimit=3&format=json&origin=*`)
        .then(r => r.json())
        .then((data: any) => {
          if (stale) return null
          const results = data?.query?.search || []
          if (results.length > 0) {
            const title = results[0].title
            return fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`)
          }
          return null
        })
        .then((r: any) => r?.json())
        .then((data: any) => {
          if (stale) return
          if (data) {
            const pages = data?.query?.pages || {}
            const page = Object.values(pages)[0] as any
            const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url
            if (imgUrl) setPhoto({ url: imgUrl, credit: 'Wikimedia Commons' })
          }
        })
        .catch(() => {})
        .finally(() => { if (!stale) setPhotoLoading(false) })
    }

    return () => { stale = true }
  }, [info.type, info.imageUrl, info.details?.Type, info.title])

  const isFlight = info.type === 'flight'
  const isVessel = info.type === 'vessel'
  const isSatellite = info.type === 'satellite'
  const raw = info.rawData || {}

  const routeSection = (isFlight || isVessel) ? (
    <RouteDisplay
      from={isFlight ? raw.originAirport : raw.originPort}
      fromCode={isFlight ? raw.originCode : raw.originPortCode}
      to={isFlight ? raw.destAirport : raw.destination}
      toCode={isFlight ? raw.destCode : raw.destPortCode}
      color={config.color}
    />
  ) : null

  const flightDetails = isFlight ? (
    <>
      <SectionHeader title="Aircraft Information" color={config.color} />
      {raw.airline && <InfoRow label="Airline" value={raw.airline} color="#fff" large />}
      <InfoRow label="Callsign" value={raw.callsign || 'N/A'} color={config.color} />
      <InfoRow label="ICAO24" value={raw.icao24} />
      {raw.aircraftType && <InfoRow label="Aircraft Type" value={raw.aircraftType} color="#ffd700" />}
      {raw.registration && <InfoRow label="Registration" value={raw.registration} />}
      {raw.category && <InfoRow label="Category" value={raw.category} />}
      <InfoRow label="Origin Country" value={raw.originCountry} />

      <SectionHeader title="Flight Data" color={config.color} />
      <InfoRow label="Baro. Altitude" value={`${Math.round(raw.baroAltitude || raw.altitude)} m / ${Math.round((raw.baroAltitude || raw.altitude) * 3.281)} ft`} />
      {raw.gpsAltitude ? <InfoRow label="GPS Altitude" value={`${Math.round(raw.gpsAltitude)} m`} /> : null}
      <InfoRow label="Ground Speed" value={`${Math.round(raw.velocity * 3.6)} km/h (${Math.round(raw.velocity * 1.944)} kts)`} color="#00ff87" />
      {raw.verticalRate ? <InfoRow label="Vertical Rate" value={`${raw.verticalRate > 0 ? '+' : ''}${Math.round(raw.verticalRate)} ft/min`}
        color={raw.verticalRate > 0 ? '#00ff87' : '#ff3b5c'} /> : null}
      <InfoRow label="Heading" value={`${Math.round(raw.heading)}\u00B0`} />
      {raw.squawk && <InfoRow label="Squawk" value={raw.squawk} color={raw.squawk === '7700' ? '#ff3b5c' : raw.squawk === '7500' ? '#ff6b35' : P.text} />}

      <SectionHeader title="Position" color={config.color} />
      <InfoRow label="Latitude" value={raw.latitude.toFixed(5)} />
      <InfoRow label="Longitude" value={raw.longitude.toFixed(5)} />
    </>
  ) : null

  const vesselDetails = isVessel ? (
    <>
      <SectionHeader title="Vessel Information" color={config.color} />
      <InfoRow label="Name" value={raw.name} color="#fff" large />
      {raw.imo && <InfoRow label="IMO" value={raw.imo} />}
      <InfoRow label="MMSI" value={raw.mmsi} />
      <InfoRow label="Type" value={raw.type} color={config.color} />
      {raw.vesselClass && <InfoRow label="Class" value={raw.vesselClass} color="#ffd700" />}
      <InfoRow label="Flag" value={raw.flag} />
      {raw.callsign && <InfoRow label="Call Sign" value={raw.callsign} />}
      {raw.status && <InfoRow label="Status" value={raw.status} color="#00ff87" />}
      {raw.owner && <InfoRow label="Owner / Operator" value={raw.owner} />}
      {raw.yearBuilt && <InfoRow label="Year Built" value={raw.yearBuilt} />}

      <SectionHeader title="Voyage" color={config.color} />
      <InfoRow label="Destination" value={`${raw.destination} (${raw.destPortCode || ''})`} />
      {raw.eta && <InfoRow label="ETA" value={new Date(raw.eta).toLocaleString()} />}

      <SectionHeader title="Navigation" color={config.color} />
      <InfoRow label="Speed" value={`${raw.speed} kts`} color="#00ff87" />
      <InfoRow label="Heading" value={`${Math.round(raw.heading)}\u00B0`} />
      {raw.course != null && <InfoRow label="Course" value={`${raw.course}\u00B0`} />}

      <SectionHeader title="Specifications" color={config.color} />
      {raw.length && <InfoRow label="Length" value={`${raw.length} m`} />}
      {raw.width && <InfoRow label="Beam" value={`${raw.width} m`} />}
      {raw.draft && <InfoRow label="Draft" value={`${raw.draft} m`} />}
      {raw.grossTonnage && <InfoRow label="Gross Tonnage" value={`${raw.grossTonnage.toLocaleString()} GT`} />}
      {raw.deadweight && <InfoRow label="Deadweight" value={`${raw.deadweight.toLocaleString()} DWT`} />}

      <SectionHeader title="Position" color={config.color} />
      <InfoRow label="Latitude" value={raw.latitude.toFixed(5)} />
      <InfoRow label="Longitude" value={raw.longitude.toFixed(5)} />
    </>
  ) : null

  const satelliteDetails = isSatellite ? (
    <>
      <SectionHeader title="Satellite Information" color={config.color} />
      <InfoRow label="Name" value={info.title} color="#fff" large />
      <InfoRow label="NORAD ID" value={info.details['NORAD ID'] || 'N/A'} color={config.color} />
      <InfoRow label="Category" value={info.details.Category || 'N/A'} />
      <InfoRow label="Orbit Type" value={info.details['Orbit Type'] || 'N/A'} color="#ffd700" />
      {info.details['Object Type'] && info.details['Object Type'] !== 'N/A' &&
        <InfoRow label="Object Type" value={info.details['Object Type']} />}
      {info.details.Country && info.details.Country !== 'N/A' &&
        <InfoRow label="Owner Country" value={info.details.Country} />}
      <InfoRow label="Intl Designator" value={info.details['Intl Designator'] || 'N/A'} />
      <InfoRow label="Launch Date" value={info.details['Launch Date'] || 'N/A'} />

      <SectionHeader title="Orbital Parameters" color={config.color} />
      <InfoRow label="Altitude" value={`${info.details['Altitude (km)']} km`} color="#00ff87" />
      <InfoRow label="Velocity" value={`${info.details['Velocity (km/s)']} km/s`} color="#00b4ff" />
      {info.details['Period (min)'] && info.details['Period (min)'] !== 'N/A' &&
        <InfoRow label="Orbital Period" value={`${info.details['Period (min)']} min`} />}
      {info.details.Inclination && info.details.Inclination !== 'N/A' &&
        <InfoRow label="Inclination" value={String(info.details.Inclination)} />}
      {info.details['Apogee (km)'] && info.details['Apogee (km)'] !== 'N/A' &&
        <InfoRow label="Apogee" value={`${info.details['Apogee (km)']} km`} />}
      {info.details['Perigee (km)'] && info.details['Perigee (km)'] !== 'N/A' &&
        <InfoRow label="Perigee" value={`${info.details['Perigee (km)']} km`} />}
      {info.details['RCS Size'] && info.details['RCS Size'] !== 'N/A' &&
        <InfoRow label="RCS Size" value={info.details['RCS Size']} />}

      <SectionHeader title="Position" color={config.color} />
      <InfoRow label="Latitude" value={info.details.Latitude || 'N/A'} />
      <InfoRow label="Longitude" value={info.details.Longitude || 'N/A'} />
    </>
  ) : null

  const genericDetails = (!isFlight && !isVessel && !isSatellite) ? (
    <>
      {Object.entries(info.details).map(([key, val]) => (
        <InfoRow key={key} label={key} value={val} />
      ))}
    </>
  ) : null

  return (
    <div ref={elRef} onMouseDown={onMouseDown} style={{
      position: 'absolute',
      ...(initialized
        ? { left: `${pos.x}px`, top: `${pos.y}px` }
        : { top: '40px', right: '160px' }
      ),
      zIndex: 230, background: P.bg, border: `1px solid ${config.color}30`,
      borderRadius: '12px', width: '420px', maxHeight: 'calc(100vh - 80px)',
      fontFamily: P.font, backdropFilter: 'blur(20px)',
      boxShadow: `0 12px 48px rgba(0,0,0,0.7), inset 0 1px 0 ${config.color}15`,
      display: 'flex', flexDirection: 'column',
      userSelect: isDragging ? 'none' : 'auto',
    }}>
      {/* Header with close button */}
      <div data-drag-handle style={{
        padding: '14px 20px 12px',
        borderBottom: `1px solid ${config.color}20`,
        background: `linear-gradient(135deg, ${config.color}08, transparent)`,
        cursor: 'grab', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '9px', color: config.color, letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: '4px', opacity: 0.8,
          }}>
            {config.icon} {config.label}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.04em' }}>
            {info.title}
          </div>
          {isFlight && raw.airline && (
            <div style={{ fontSize: '11px', color: P.dim, marginTop: '2px' }}>
              {raw.airline}
            </div>
          )}
        </div>
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: '#ff3b5c', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '20px', fontWeight: 900,
            fontFamily: 'Arial, Helvetica, sans-serif',
            boxShadow: '0 2px 8px rgba(255,59,92,0.4)',
            flexShrink: 0, marginLeft: '12px',
          }}
        >X</div>
      </div>

      {/* Photo */}
      {(photoLoading || photo?.url) && (
        <div style={{
          height: photoLoading ? '60px' : '170px',
          overflow: 'hidden', transition: 'height 0.3s ease',
          background: '#080c14', flexShrink: 0,
        }}>
          {photoLoading && (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4a5568', fontSize: '11px',
            }}>Loading photo...</div>
          )}
          {photo?.url && (
            <div style={{ position: 'relative', height: '100%' }}>
              <img src={photo.url} alt={info.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {photo.credit && (
                <div style={{
                  position: 'absolute', bottom: '6px', right: '10px',
                  fontSize: '9px', color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px',
                }}>{photo.credit}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Route Display */}
      {routeSection && (
        <div style={{ padding: '0 20px', flexShrink: 0 }}>
          {routeSection}
        </div>
      )}

      {/* Scrollable Details */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
        {flightDetails}
        {vesselDetails}
        {satelliteDetails}
        {genericDetails}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px', borderTop: `1px solid ${P.border}`,
        fontSize: '9px', color: P.dim, letterSpacing: '0.08em',
        display: 'flex', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span>{config.source || 'DATA: ARGUS'}</span>
        {info.routePoints && (
          <span style={{ color: config.color }}>ROUTE VISIBLE ON MAP</span>
        )}
      </div>
    </div>
  )
}
