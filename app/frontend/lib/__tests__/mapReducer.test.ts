import { describe, it, expect } from 'vitest'
import { mapReducer, initialMapUIState, applyFilters } from '@/lib/mapReducer'
import type { Entity } from '@/lib/types'

const entity = (overrides: Partial<Entity>): Entity => ({
  id: 1,
  kind: 'ship',
  name: 'Tanker-1',
  lat: 44.5,
  lng: -63.5,
  heading: 0,
  speed_knots: 10,
  status: 'active',
  properties: {},
  ...overrides,
})

describe('mapReducer', () => {
  it('sets and clears filters', () => {
    const withFilters = mapReducer(initialMapUIState, { type: 'setFilters', filters: { kinds: ['ship'] } })
    expect(withFilters.filters.kinds).toEqual(['ship'])
    expect(mapReducer(withFilters, { type: 'clearFilters' }).filters).toEqual({})
  })

  it('openDetails selects the entity and opens the panel', () => {
    const state = mapReducer(initialMapUIState, { type: 'openDetails', entityId: 7 })
    expect(state.selectedEntityId).toBe(7)
    expect(state.detailsOpen).toBe(true)
  })

  it('entityRemoved clears the selection, panel, and trail for that entity', () => {
    const open = mapReducer(initialMapUIState, { type: 'openDetails', entityId: 7 })
    const withTrail = mapReducer(open, { type: 'showTrail', entityId: 7 })

    const state = mapReducer(withTrail, { type: 'entityRemoved', entityId: 7 })

    expect(state.selectedEntityId).toBeNull()
    expect(state.detailsOpen).toBe(false)
    expect(state.trailEntityId).toBeNull()
  })

  it('entityRemoved leaves a different entity selected', () => {
    const open = mapReducer(initialMapUIState, { type: 'openDetails', entityId: 7 })
    const withTrail = mapReducer(open, { type: 'showTrail', entityId: 7 })

    const state = mapReducer(withTrail, { type: 'entityRemoved', entityId: 9 })

    expect(state.selectedEntityId).toBe(7)
    expect(state.detailsOpen).toBe(true)
    expect(state.trailEntityId).toBe(7)
  })

  it('setWeatherLayer sets the layer and opens the panel', () => {
    const state = mapReducer(initialMapUIState, { type: 'setWeatherLayer', layer: 'temperature' })
    expect(state.weatherLayer).toBe('temperature')
    expect(state.weatherPanelOpen).toBe(true)
  })

  it('setWeatherLayer with null clears the layer and leaves the panel state alone', () => {
    const open = mapReducer(initialMapUIState, { type: 'setWeatherLayer', layer: 'wind' })
    const cleared = mapReducer(open, { type: 'setWeatherLayer', layer: null })
    expect(cleared.weatherLayer).toBeNull()
    expect(cleared.weatherPanelOpen).toBe(true)
  })

  it('toggleWeatherPanel flips panel visibility without touching the layer', () => {
    const open = mapReducer(initialMapUIState, { type: 'toggleWeatherPanel' })
    expect(open.weatherPanelOpen).toBe(true)
    expect(open.weatherLayer).toBeNull()
    expect(mapReducer(open, { type: 'toggleWeatherPanel' }).weatherPanelOpen).toBe(false)
  })
})

describe('applyFilters', () => {
  const entities = [
    entity({ id: 1, kind: 'ship', name: 'Tanker-1' }),
    entity({ id: 2, kind: 'aircraft', name: 'Falcon-1', lat: 50, lng: -70 }),
  ]

  it('filters by kind', () => {
    expect(applyFilters(entities, { kinds: ['ship'] }, null).map((e) => e.id)).toEqual([1])
  })

  it('filters by name substring, case-insensitive', () => {
    expect(applyFilters(entities, { nameContains: 'falcon' }, null).map((e) => e.id)).toEqual([2])
  })

  it('viewport scope keeps only entities inside bounds', () => {
    const result = applyFilters(entities, { scope: 'viewport' }, [-64, 44, -63, 45])
    expect(result.map((e) => e.id)).toEqual([1])
  })

  it('empty filters keep everything', () => {
    expect(applyFilters(entities, {}, null)).toHaveLength(2)
  })
})
