import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '@/stores/filter-store'

describe('FilterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({
      searchQuery: '',
      severityFilter: null,
      dateRange: { start: null, end: null },
      sourceFilter: null,
      countryFilter: null,
      domainFilter: null,
    })
  })

  it('setSearchQuery updates search query', () => {
    useFilterStore.getState().setSearchQuery('explosion')
    expect(useFilterStore.getState().searchQuery).toBe('explosion')
  })

  it('setSeverityFilter sets filter', () => {
    useFilterStore.getState().setSeverityFilter('CRITICAL')
    expect(useFilterStore.getState().severityFilter).toBe('CRITICAL')
  })

  it('clearAllFilters resets everything', () => {
    useFilterStore.getState().setSearchQuery('test')
    useFilterStore.getState().setSeverityFilter('HIGH')
    useFilterStore.getState().clearFilters()
    expect(useFilterStore.getState().searchQuery).toBe('')
    expect(useFilterStore.getState().severityFilter).toBeNull()
  })
})
