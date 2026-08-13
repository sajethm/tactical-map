import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { getAuditEvents } from '@/lib/api'
import type { AuditEventRow } from '@/lib/types'

export function useAuditEvents(enabled: boolean): UseQueryResult<AuditEventRow[], Error> {
  return useQuery({
    queryKey: ['audit_events'],
    queryFn: getAuditEvents,
    enabled,
    refetchOnMount: 'always',
  })
}
