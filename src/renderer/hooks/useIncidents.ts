import { useEffect, useCallback, useMemo, useRef } from 'react'

const INCIDENT_CAP = 2000
import { useIncidentStore } from '@/stores/incident-store'
import { argusLog } from '@/stores/log-store'
import { useLayerStore } from '@/stores/layer-store'
import { useFilterStore } from '@/stores/filter-store'
import { isLikelyOnLand } from '@/components/globe/GlobeOverlays'
import { useNotificationStore } from '@/stores/notification-store'
import { useAnnotationStore } from '@/stores/annotation-store'
import { useAlertStore } from '@/stores/alert-store'
import type { Incident } from '../../shared/types'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useIncidents() {
  const incidents = useIncidentStore(s => s.incidents)
  const selectedIncident = useIncidentStore(s => s.selectedIncident)
  const setIncidents = useIncidentStore(s => s.setIncidents)
  const setLoading = useIncidentStore(s => s.setLoading)
  const selectIncident = useIncidentStore(s => s.selectIncident)

  const initialLoadDoneRef = useRef(false)

  const layers = useLayerStore(s => s.layers)
  const visibleDomains = useMemo(
    () => layers.filter(l => l.visible).map(l => l.domain),
    [layers]
  )

  const searchQuery = useFilterStore(s => s.searchQuery)
  const severityFilter = useFilterStore(s => s.severityFilter)
  const dateRange = useFilterStore(s => s.dateRange)
  const sourceFilter = useFilterStore(s => s.sourceFilter)
  const countryFilter = useFilterStore(s => s.countryFilter)
  const domainFilter = useFilterStore(s => s.domainFilter)

  const pendingRef = useRef<Incident[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Desktop notification throttle — max 1 per 15 seconds
  const lastDesktopRef = useRef(0)
  const DESKTOP_COOLDOWN = 15_000

  // Track notified incident IDs within this session to prevent cross-path duplication
  const notifiedIdsRef = useRef(new Set<string>())

  const flushPending = useCallback(() => {
    if (pendingRef.current.length === 0) return
    const batch = pendingRef.current
    pendingRef.current = []
    argusLog('info', 'feed', `Flushing ${batch.length} new incident(s) to store`)

    if (initialLoadDoneRef.current) {
      const addNotification = useNotificationStore.getState().addNotification
      const now = Date.now()

      // Deduplicate batch internally (same incident ID appearing twice)
      const seen = new Set<string>()
      const uniqueBatch = batch.filter(i => {
        if (seen.has(i.id)) return false
        seen.add(i.id)
        return true
      })

      // ── Path 1: Severity-based in-app notifications (CRITICAL/HIGH only) ──
      const important = uniqueBatch.filter(i =>
        (i.severity === 'CRITICAL' || i.severity === 'HIGH') &&
        isLikelyOnLand(i.latitude, i.longitude) &&
        !notifiedIdsRef.current.has(i.id)  // skip if already notified via any path
      )
      for (const i of important.slice(0, 5)) {
        notifiedIdsRef.current.add(i.id)
        addNotification({
          type: 'incident',
          title: i.title,
          subtitle: `${i.severity} • ${i.domain}`,
          latitude: i.latitude,
          longitude: i.longitude,
          incidentId: i.id,
          severity: i.severity,
          domain: i.domain,
        })
      }

      // ── Path 2: Geofence notifications (only for incidents NOT already notified) ──
      const watchedZones = useAnnotationStore.getState().getWatchedZones()
      if (watchedZones.length > 0) {
        let geoCount = 0
        for (const inc of uniqueBatch) {
          if (geoCount >= 3) break // max 3 geofence notifs per flush
          if (inc.latitude == null || inc.longitude == null) continue
          if (notifiedIdsRef.current.has(inc.id)) continue // already notified via severity
          for (const zone of watchedZones) {
            const radiusKm = zone.watchRadius || zone.radius || 100
            const dist = haversineKm(zone.latitude, zone.longitude, inc.latitude, inc.longitude)
            if (dist <= radiusKm) {
              notifiedIdsRef.current.add(inc.id)
              geoCount++
              addNotification({
                type: 'incident',
                title: `⚠ GEOFENCE: ${inc.title}`,
                subtitle: `${zone.title} • ${Math.round(dist)}km • ${inc.severity}`,
                latitude: inc.latitude,
                longitude: inc.longitude,
                incidentId: inc.id,
                severity: inc.severity,
                domain: inc.domain,
              })
              break
            }
          }
        }
      }

      // ── Path 3: Alert rule matching + desktop notifications ──
      const checkIncident = useAlertStore.getState().checkIncident
      for (const inc of uniqueBatch) {
        const matched = checkIncident(inc) // alert-store has its own dedup
        for (const m of matched) {
          const rule = useAlertStore.getState().rules.find(r => r.id === m.ruleId)
          if (rule?.desktop && now - lastDesktopRef.current >= DESKTOP_COOLDOWN) {
            lastDesktopRef.current = now
            window.argus?.showNotification?.({ title: `Alert: ${rule.name}`, body: inc.title })
          }
        }
      }

      // Prune notifiedIds to avoid memory leak (keep last 2000)
      if (notifiedIdsRef.current.size > 2000) {
        const arr = [...notifiedIdsRef.current]
        notifiedIdsRef.current = new Set(arr.slice(-1000))
      }
    }

    useIncidentStore.getState().setIncidents([
      ...batch,
      ...useIncidentStore.getState().incidents
    ].slice(0, INCIDENT_CAP))
  }, [])

  const primeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchIncidents = useCallback(async () => {
    if (typeof window === 'undefined' || !window.argus) return
    useIncidentStore.getState().setLoading(true)
    try {
      const data = await window.argus.getIncidents()
      if (Array.isArray(data) && data.length > 0) {
        useIncidentStore.getState().setIncidents(data)
        argusLog('info', 'feed', `Loaded ${data.length} incidents from IPC`)
        if (primeTimerRef.current) clearTimeout(primeTimerRef.current)
        primeTimerRef.current = setTimeout(() => { initialLoadDoneRef.current = true }, 30000)
      }
    } catch (err) { argusLog('error', 'feed', 'Failed to fetch incidents', String(err)) }
    finally { useIncidentStore.getState().setLoading(false) }
  }, [])

  useEffect(() => {
    fetchIncidents()

    const retryTimer = setTimeout(() => {
      if (useIncidentStore.getState().incidents.length === 0) {
        argusLog('warn', 'feed', 'Incident store still empty after 5s — retrying fetch')
        fetchIncidents()
      }
    }, 5000)

    let dispose: (() => void) | undefined
    let maxFlushTimer: ReturnType<typeof setTimeout> | null = null
    if (window.argus) {
      dispose = window.argus.onIncidentUpdate((data) => {
        pendingRef.current.push(data as Incident)
        // Debounce: wait 500ms of silence before flushing
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
        flushTimerRef.current = setTimeout(flushPending, 500)
        // Max flush guard: force flush after 5s even if incidents keep streaming
        if (!maxFlushTimer) {
          maxFlushTimer = setTimeout(() => {
            maxFlushTimer = null
            if (pendingRef.current.length > 0) {
              if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
              flushPending()
            }
          }, 5000)
        }
      })
      argusLog('info', 'feed', 'Real-time incident listener attached')
    }

    return () => {
      clearTimeout(retryTimer)
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      if (primeTimerRef.current) clearTimeout(primeTimerRef.current)
      if (maxFlushTimer) clearTimeout(maxFlushTimer)
      dispose?.()
    }
  }, [fetchIncidents, flushPending])

  const filteredIncidents = useMemo(() => {
    const seen = new Set<string>()
    return incidents.filter(incident => {
      if (!visibleDomains.includes(incident.domain)) return false
      if (severityFilter && incident.severity !== severityFilter) return false
      if (domainFilter && incident.domain !== domainFilter) return false
      if (sourceFilter && incident.source !== sourceFilter) return false
      if (countryFilter && (incident.country || '') !== countryFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const country = (incident.country || '').toLowerCase()
        if (
          !(incident.title || '').toLowerCase().includes(q) &&
          !(incident.description || '').toLowerCase().includes(q) &&
          !(incident.source || '').toLowerCase().includes(q) &&
          !country.includes(q)
        ) return false
      }
      if (dateRange.start && incident.timestamp < dateRange.start) return false
      if (dateRange.end && incident.timestamp > dateRange.end) return false

      // Deduplicate by title (case-insensitive)
      const key = (incident.title || '').toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)

      return true
    })
  }, [incidents, visibleDomains, searchQuery, severityFilter, dateRange, sourceFilter, countryFilter, domainFilter])

  return {
    incidents: filteredIncidents,
    allIncidents: incidents,
    selectedIncident,
    selectIncident,
    refresh: fetchIncidents,
  }
}
