import { describe, it, expect, beforeEach } from 'vitest'
import { useIncidentStore } from '@/stores/incident-store'
import type { Incident } from '@shared/types'

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: `inc-${Math.random().toString(36).slice(2)}`,
    title: 'Test Incident',
    description: 'Description',
    severity: 'MEDIUM',
    domain: 'INTEL',
    source: 'test',
    timestamp: new Date().toISOString(),
    latitude: 40.0,
    longitude: 29.0,
    country: 'Turkey',
    ...overrides,
  } as Incident
}

describe('IncidentStore', () => {
  beforeEach(() => {
    useIncidentStore.setState({ incidents: [], selectedIncident: null, loading: false, lastUpdated: null })
  })

  it('setIncidents replaces the incident list', () => {
    const list = [makeIncident(), makeIncident()]
    useIncidentStore.getState().setIncidents(list)
    expect(useIncidentStore.getState().incidents).toHaveLength(2)
  })

  it('addIncident prepends new incidents', () => {
    const first = makeIncident({ title: 'First' })
    const second = makeIncident({ title: 'Second' })
    useIncidentStore.getState().addIncident(first)
    useIncidentStore.getState().addIncident(second)
    expect(useIncidentStore.getState().incidents[0].title).toBe('Second')
    expect(useIncidentStore.getState().incidents[1].title).toBe('First')
  })

  it('addIncident updates existing incident by id', () => {
    const inc = makeIncident({ title: 'Original' })
    useIncidentStore.getState().addIncident(inc)
    useIncidentStore.getState().addIncident({ ...inc, title: 'Updated' })
    expect(useIncidentStore.getState().incidents).toHaveLength(1)
    expect(useIncidentStore.getState().incidents[0].title).toBe('Updated')
  })

  it('addIncident caps at 2000', () => {
    const list = Array.from({ length: 2000 }, (_, i) => makeIncident({ id: `id-${i}` }))
    useIncidentStore.getState().setIncidents(list)
    useIncidentStore.getState().addIncident(makeIncident({ id: 'new-one' }))
    expect(useIncidentStore.getState().incidents.length).toBeLessThanOrEqual(2000)
    expect(useIncidentStore.getState().incidents[0].id).toBe('new-one')
  })

  it('selectIncident sets selectedIncident', () => {
    const inc = makeIncident()
    useIncidentStore.getState().selectIncident(inc)
    expect(useIncidentStore.getState().selectedIncident?.id).toBe(inc.id)
  })

  it('selectIncident(null) clears selection', () => {
    useIncidentStore.getState().selectIncident(makeIncident())
    useIncidentStore.getState().selectIncident(null)
    expect(useIncidentStore.getState().selectedIncident).toBeNull()
  })

  it('getByDomain filters correctly', () => {
    useIncidentStore.getState().setIncidents([
      makeIncident({ domain: 'INTEL' }),
      makeIncident({ domain: 'CYBER' }),
      makeIncident({ domain: 'INTEL' }),
    ])
    expect(useIncidentStore.getState().getByDomain('INTEL' as any)).toHaveLength(2)
    expect(useIncidentStore.getState().getByDomain('CYBER' as any)).toHaveLength(1)
  })

  it('getCriticalCount returns correct count', () => {
    useIncidentStore.getState().setIncidents([
      makeIncident({ severity: 'CRITICAL' }),
      makeIncident({ severity: 'HIGH' }),
      makeIncident({ severity: 'CRITICAL' }),
    ])
    expect(useIncidentStore.getState().getCriticalCount()).toBe(2)
  })
})
