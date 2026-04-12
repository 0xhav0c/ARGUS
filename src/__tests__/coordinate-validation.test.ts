import { describe, it, expect } from 'vitest'

function isValidCoordinate(lat: any, lng: any): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
}

function hasValidIncidentCoords(lat: any, lng: any): boolean {
  if (lat == null || lng == null) return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5) return false
  return true
}

describe('Coordinate Validation', () => {
  describe('isValidCoordinate', () => {
    it('accepts valid coordinates', () => {
      expect(isValidCoordinate(40.7128, -74.006)).toBe(true)
      expect(isValidCoordinate(0, 0)).toBe(true)
      expect(isValidCoordinate(-90, 180)).toBe(true)
    })

    it('rejects null/undefined', () => {
      expect(isValidCoordinate(null, 29)).toBe(false)
      expect(isValidCoordinate(40, undefined)).toBe(false)
      expect(isValidCoordinate(null, null)).toBe(false)
    })

    it('rejects NaN/Infinity', () => {
      expect(isValidCoordinate(NaN, 29)).toBe(false)
      expect(isValidCoordinate(40, Infinity)).toBe(false)
      expect(isValidCoordinate(-Infinity, NaN)).toBe(false)
    })

    it('accepts zero coordinates (equator/prime meridian)', () => {
      expect(isValidCoordinate(0, 29)).toBe(true)
      expect(isValidCoordinate(40, 0)).toBe(true)
    })
  })

  describe('hasValidIncidentCoords', () => {
    it('accepts valid incident coordinates', () => {
      expect(hasValidIncidentCoords(40.7128, -74.006)).toBe(true)
      expect(hasValidIncidentCoords(-33.8688, 151.2093)).toBe(true)
    })

    it('rejects near-zero coordinates (0,0 ocean)', () => {
      expect(hasValidIncidentCoords(0, 0)).toBe(false)
      expect(hasValidIncidentCoords(0.1, 0.2)).toBe(false)
    })

    it('accepts valid zero-ish coordinates outside threshold', () => {
      expect(hasValidIncidentCoords(0.6, 0)).toBe(true)
      expect(hasValidIncidentCoords(0, 0.6)).toBe(true)
    })

    it('rejects null/undefined', () => {
      expect(hasValidIncidentCoords(null, 29)).toBe(false)
      expect(hasValidIncidentCoords(40, null)).toBe(false)
    })

    it('rejects NaN', () => {
      expect(hasValidIncidentCoords(NaN, 29)).toBe(false)
    })
  })
})
