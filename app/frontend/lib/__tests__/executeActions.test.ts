import { describe, it, expect, vi } from 'vitest'
import { executeActions } from '@/lib/executeActions'
import type { ExecutorDeps } from '@/lib/executeActions'
import type { Entity, Action } from '@/lib/types'

const ship: Entity = {
  id: 5,
  kind: 'ship',
  name: 'Tanker-5',
  lat: 44.5,
  lng: -63.5,
  heading: 0,
  speed_knots: 10,
  status: 'active',
  properties: {},
}

const makeDeps = () => {
  const flyTo = vi.fn<ExecutorDeps['map']['flyTo']>()
  const fitBounds = vi.fn<ExecutorDeps['map']['fitBounds']>()
  const dispatch = vi.fn<ExecutorDeps['dispatch']>()
  const refetchEntities = vi.fn<ExecutorDeps['refetchEntities']>().mockResolvedValue(undefined)
  return {
    map: { flyTo, fitBounds },
    dispatch,
    getEntities: () => [ship],
    refetchEntities,
    stepDelayMs: 0,
  } satisfies ExecutorDeps
}

describe('executeActions', () => {
  it('executes actions sequentially in order', async () => {
    const deps = makeDeps()
    const calls: string[] = []
    deps.map.flyTo.mockImplementation(() => calls.push('fly'))
    deps.dispatch.mockImplementation((a: { type: string }) => calls.push(a.type))

    const actions: Action[] = [
      { type: 'fly_to', entity_id: 5 },
      { type: 'filter_entities', kinds: ['ship'] },
      { type: 'open_details', entity_id: 5 },
    ]
    await executeActions(actions, deps)
    expect(calls).toEqual(['fly', 'setFilters', 'openDetails'])
  })

  it('fly_to with entity_id centers on the entity position', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'fly_to', entity_id: 5 }], deps)
    expect(deps.map.flyTo).toHaveBeenCalledWith({ center: [-63.5, 44.5], zoom: 12 })
  })

  it('fly_to with bounds fits bounds', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'fly_to', bounds: [-64, 44, -63, 45] }], deps)
    expect(deps.map.fitBounds).toHaveBeenCalledWith([[-64, 44], [-63, 45]])
  })

  it('place_marker refetches entities, clears filters, and flies to it', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'place_marker', lat: 44.1, lng: -63.1, name: 'RP', entity_id: 9 }], deps)
    expect(deps.refetchEntities).toHaveBeenCalled()
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'clearFilters' })
    expect(deps.map.flyTo).toHaveBeenCalledWith({ center: [-63.1, 44.1], zoom: 12 })
  })

  it('place_marker opens details for the new marker', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'place_marker', lat: 44.1, lng: -63.1, name: 'RP', entity_id: 9 }], deps)
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'openDetails', entityId: 9 })
  })

  it('place_marker without an entity_id does not open details', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'place_marker', lat: 44.1, lng: -63.1, name: 'RP' }], deps)
    expect(deps.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'openDetails' }),
    )
  })

  it('refetches and clears state after a successful delete_marker', async () => {
    const deps = makeDeps()

    await executeActions([{ type: 'delete_marker', entity_id: 11, deleted: true, name: 'Rally point' }], deps)

    expect(deps.refetchEntities).toHaveBeenCalled()
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'entityRemoved', entityId: 11 })
  })

  it('ignores a refused delete_marker', async () => {
    const deps = makeDeps()

    await executeActions([{ type: 'delete_marker', entity_id: 5, deleted: false, reason: 'not_a_marker' }], deps)

    expect(deps.refetchEntities).not.toHaveBeenCalled()
    expect(deps.dispatch).not.toHaveBeenCalled()
  })

  it('show_history and clear_filters dispatch, ask_clarification is a no-op', async () => {
    const deps = makeDeps()
    await executeActions([
      { type: 'show_history', entity_id: 5 },
      { type: 'clear_filters' },
      { type: 'ask_clarification', question: 'Which?' },
    ], deps)
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'showTrail', entityId: 5 })
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'clearFilters' })
    expect(deps.dispatch).toHaveBeenCalledTimes(2)
  })

  it('skips fly_to for unknown entity ids without throwing', async () => {
    const deps = makeDeps()
    await expect(executeActions([{ type: 'fly_to', entity_id: 999 }], deps)).resolves.toBeUndefined()
    expect(deps.map.flyTo).not.toHaveBeenCalled()
  })

  it('set_weather_overlay dispatches setWeatherLayer with the layer', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'set_weather_overlay', layer: 'precipitation' }], deps)
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'setWeatherLayer', layer: 'precipitation' })
  })

  it('set_weather_overlay with none clears the layer', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'set_weather_overlay', layer: 'none' }], deps)
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'setWeatherLayer', layer: null })
  })
})
