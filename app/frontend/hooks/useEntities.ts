import { useQuery } from '@tanstack/react-query'
import type { DefinedUseQueryResult } from '@tanstack/react-query'
import { getEntities } from '@/lib/api'
import type { Entity } from '@/lib/types'

const ENTITY_POLL_MS = 10_000

export function useEntities(initial: Entity[]): DefinedUseQueryResult<Entity[], Error> {
  return useQuery({
    queryKey: ['entities'],
    queryFn: getEntities,
    initialData: initial,
    refetchInterval: ENTITY_POLL_MS,
  })
}
