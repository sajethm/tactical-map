import type { Entity } from '@/lib/types'
import type { WeatherLayer } from '@/lib/weather'

export interface Filters {
  kinds?: string[]
  statuses?: string[]
  nameContains?: string
  scope?: 'viewport' | 'global'
}

export interface MapUIState {
  filters: Filters
  selectedEntityId: number | null
  detailsOpen: boolean
  trailEntityId: number | null
  auditOpen: boolean
  weatherLayer: WeatherLayer | null
  weatherPanelOpen: boolean
}

export const initialMapUIState: MapUIState = {
  filters: {},
  selectedEntityId: null,
  detailsOpen: false,
  trailEntityId: null,
  auditOpen: false,
  weatherLayer: null,
  weatherPanelOpen: false,
}

export type MapUIAction =
  | { type: 'setFilters'; filters: Filters }
  | { type: 'clearFilters' }
  | { type: 'selectEntity'; entityId: number | null }
  | { type: 'openDetails'; entityId: number }
  | { type: 'showTrail'; entityId: number | null }
  | { type: 'closeDetails' }
  | { type: 'entityRemoved'; entityId: number }
  | { type: 'toggleAudit' }
  | { type: 'setWeatherLayer'; layer: WeatherLayer | null }
  | { type: 'toggleWeatherPanel' }

export function mapReducer(state: MapUIState, action: MapUIAction): MapUIState {
  switch (action.type) {
    case 'setFilters':
      return { ...state, filters: action.filters }
    case 'clearFilters':
      return { ...state, filters: {} }
    case 'selectEntity':
      return { ...state, selectedEntityId: action.entityId }
    case 'openDetails':
      return { ...state, selectedEntityId: action.entityId, detailsOpen: true }
    case 'showTrail':
      return { ...state, trailEntityId: action.entityId }
    case 'closeDetails':
      return { ...state, detailsOpen: false }
    case 'entityRemoved': {
      const wasSelected = state.selectedEntityId === action.entityId
      return {
        ...state,
        selectedEntityId: wasSelected ? null : state.selectedEntityId,
        detailsOpen: wasSelected ? false : state.detailsOpen,
        trailEntityId: state.trailEntityId === action.entityId ? null : state.trailEntityId,
      }
    }
    case 'toggleAudit':
      return { ...state, auditOpen: !state.auditOpen }
    case 'setWeatherLayer':
      return {
        ...state,
        weatherLayer: action.layer,
        weatherPanelOpen: action.layer ? true : state.weatherPanelOpen,
      }
    case 'toggleWeatherPanel':
      return { ...state, weatherPanelOpen: !state.weatherPanelOpen }
  }
}

export function applyFilters(
  entities: Entity[],
  filters: Filters,
  viewportBounds: [number, number, number, number] | null,
): Entity[] {
  return entities.filter((entity) => {
    if (filters.kinds?.length && !filters.kinds.includes(entity.kind)) return false
    if (filters.statuses?.length && !filters.statuses.includes(entity.status)) return false
    if (filters.nameContains && !entity.name.toLowerCase().includes(filters.nameContains.toLowerCase())) return false
    if (filters.scope === 'viewport' && viewportBounds) {
      const [w, s, e, n] = viewportBounds
      if (entity.lng < w || entity.lng > e || entity.lat < s || entity.lat > n) return false
    }
    return true
  })
}
