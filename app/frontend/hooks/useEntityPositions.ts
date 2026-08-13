import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { getPositions } from '@/lib/api'
import type { EntityPosition } from '@/lib/types'

export function useEntityPositions(entityId: number | null): UseQueryResult<EntityPosition[], Error> {
  return useQuery({
    queryKey: ['positions', entityId],
    queryFn: () => getPositions(entityId as number),
    enabled: entityId != null,
  })
}
