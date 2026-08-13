import type { Action, Entity } from '@/lib/types'
import type { MapUIAction } from '@/lib/mapReducer'

export interface ExecutorDeps {
  map: {
    flyTo(opts: { center: [number, number]; zoom?: number }): void
    fitBounds(bounds: [[number, number], [number, number]]): void
  }
  dispatch: (a: MapUIAction) => void
  getEntities: () => Entity[]
  refetchEntities: () => Promise<void>
  stepDelayMs?: number
}

const DEFAULT_STEP_DELAY_MS = 600

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function executeActions(actions: Action[], deps: ExecutorDeps): Promise<void> {
  const stepDelay = deps.stepDelayMs ?? DEFAULT_STEP_DELAY_MS
  for (const [index, action] of actions.entries()) {
    if (index > 0) await delay(stepDelay)
    await applyAction(action, deps)
  }
}

async function applyAction(action: Action, deps: ExecutorDeps): Promise<void> {
  switch (action.type) {
    case 'fly_to': {
      if (action.entity_id != null) {
        const entity = deps.getEntities().find((e) => e.id === action.entity_id)
        if (entity) deps.map.flyTo({ center: [entity.lng, entity.lat], zoom: action.zoom ?? 12 })
      } else if (action.bounds) {
        const [w, s, e, n] = action.bounds
        deps.map.fitBounds([[w, s], [e, n]])
      } else if (action.lat != null && action.lng != null) {
        deps.map.flyTo({ center: [action.lng, action.lat], zoom: action.zoom ?? 12 })
      }
      return
    }
    case 'filter_entities':
      deps.dispatch({
        type: 'setFilters',
        filters: {
          kinds: action.kinds,
          statuses: action.statuses,
          nameContains: action.name_contains,
          scope: action.scope,
        },
      })
      return
    case 'place_marker':
      await deps.refetchEntities()
      deps.dispatch({ type: 'clearFilters' })
      deps.map.flyTo({ center: [action.lng, action.lat], zoom: 12 })
      return
    case 'delete_marker': {
      if (action.deleted !== true) return
      await deps.refetchEntities()
      deps.dispatch({ type: 'entityRemoved', entityId: action.entity_id })
      return
    }
    case 'show_history':
      deps.dispatch({ type: 'showTrail', entityId: action.entity_id })
      return
    case 'open_details':
      deps.dispatch({ type: 'openDetails', entityId: action.entity_id })
      return
    case 'clear_filters':
      deps.dispatch({ type: 'clearFilters' })
      return
    case 'set_weather_overlay':
      deps.dispatch({
        type: 'setWeatherLayer',
        layer: action.layer === 'none' ? null : action.layer,
      })
      return
    case 'ask_clarification':
      return
  }
}
