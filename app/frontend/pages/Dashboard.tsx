import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Map as MapboxMap } from 'mapbox-gl'
import MapCanvas from '@/components/MapCanvas'
import ChatSidebar from '@/components/ChatSidebar'
import EntityPanel from '@/components/EntityPanel'
import MapToolbar from '@/components/MapToolbar'
import WeatherPanel from '@/components/WeatherPanel'
import AuditDrawer from '@/components/AuditDrawer'
import { useChat } from '@/hooks/useChat'
import { useEntities } from '@/hooks/useEntities'
import { useEntityPositions } from '@/hooks/useEntityPositions'
import { useDeleteEntity } from '@/hooks/useDeleteEntity'
import { executeActions } from '@/lib/executeActions'
import { mapReducer, initialMapUIState, applyFilters } from '@/lib/mapReducer'
import type { ChatMessage, Entity } from '@/lib/types'

interface Props {
  mapboxToken: string
  initialEntities: Entity[]
  initialMessages: ChatMessage[]
  currentUserEmail: string
}

export default function Dashboard({
  mapboxToken,
  initialEntities,
  initialMessages,
  currentUserEmail,
}: Props) {
  const queryClient = useQueryClient()
  const { data: entities = [] } = useEntities(initialEntities)
  const entitiesRef = useRef(entities)
  entitiesRef.current = entities
  const [state, dispatch] = useReducer(mapReducer, initialMapUIState)
  const stateRef = useRef(state)
  stateRef.current = state
  const { data: trailPositions = [] } = useEntityPositions(state.trailEntityId)
  const mapRef = useRef<MapboxMap | null>(null)
  const boundsRef = useRef<[number, number, number, number] | null>(null)
  const [viewportBounds, setViewportBounds] = useState<[number, number, number, number] | null>(null)

  const refetchEntities = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['entities'] })
  }, [queryClient])

  const getContext = useCallback(() => ({
    bounds: boundsRef.current,
    selected_entity_id: stateRef.current.selectedEntityId,
  }), [])

  const handleReply = useCallback((reply: ChatMessage) => {
    if (!mapRef.current) return
    void executeActions(reply.actions, {
      map: mapRef.current,
      dispatch,
      getEntities: () => entitiesRef.current,
      refetchEntities,
    })
  }, [refetchEntities])

  const { messages, busy, error, send } = useChat({ initialMessages, getContext, onReply: handleReply })

  const visibleEntities = useMemo(
    () => applyFilters(entities, state.filters, viewportBounds),
    [entities, state.filters, viewportBounds],
  )

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === state.selectedEntityId) ?? null,
    [entities, state.selectedEntityId],
  )

  const handleMoveEnd = useCallback((bounds: [number, number, number, number]) => {
    boundsRef.current = bounds
    setViewportBounds(bounds)
  }, [])

  const handleEntityClick = useCallback((entityId: number) => {
    dispatch({ type: 'openDetails', entityId })
  }, [])

  const handleToggleTrack = useCallback((entityId: number) => {
    const shown = stateRef.current.trailEntityId === entityId
    dispatch({ type: 'showTrail', entityId: shown ? null : entityId })
  }, [])

  const handleEntityRemoved = useCallback((entityId: number) => {
    dispatch({ type: 'entityRemoved', entityId })
  }, [])

  const deleteEntityMutation = useDeleteEntity(handleEntityRemoved)

  const handleDelete = useCallback((entityId: number) => {
    deleteEntityMutation.mutate(entityId)
  }, [deleteEntityMutation])

  const contextNote = selectedEntity
    ? `Sends viewport + ${selectedEntity.name}`
    : 'Sends the current viewport'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ground text-foreground">
      <aside className="flex w-[368px] shrink-0 flex-col border-r border-rule bg-panel">
        <ChatSidebar messages={messages} busy={busy} error={error} onSend={send}
                     currentUserEmail={currentUserEmail} contextNote={contextNote} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <MapToolbar
          visibleEntities={visibleEntities}
          totalCount={entities.length}
          filters={state.filters}
          onClearFilters={() => dispatch({ type: 'clearFilters' })}
          weatherOpen={state.weatherPanelOpen}
          weatherActive={state.weatherLayer !== null}
          onToggleWeather={() => dispatch({ type: 'toggleWeatherPanel' })}
          auditOpen={state.auditOpen}
          onToggleAudit={() => dispatch({ type: 'toggleAudit' })}
        />
        <div className="relative min-h-0 flex-1">
          <MapCanvas
            mapboxToken={mapboxToken}
            entities={visibleEntities}
            trailPositions={trailPositions}
            selectedEntityId={state.selectedEntityId}
            weatherLayer={state.weatherLayer}
            onEntityClick={handleEntityClick}
            onMapReady={(map) => {
              mapRef.current = map
            }}
            onMoveEnd={handleMoveEnd}
          />
          {selectedEntity && state.detailsOpen && (
            <EntityPanel
              entity={selectedEntity}
              trackShown={state.trailEntityId === selectedEntity.id}
              onClose={() => dispatch({ type: 'closeDetails' })}
              onToggleTrack={handleToggleTrack}
              onDelete={handleDelete}
            />
          )}
          {state.weatherPanelOpen && (
            <WeatherPanel
              activeLayer={state.weatherLayer}
              onSelect={(layer) => dispatch({ type: 'setWeatherLayer', layer })}
              onClose={() => dispatch({ type: 'toggleWeatherPanel' })}
            />
          )}
        </div>
        <AuditDrawer open={state.auditOpen} onToggle={() => dispatch({ type: 'toggleAudit' })} />
      </main>
    </div>
  )
}
