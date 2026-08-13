import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { deleteEntity } from '@/lib/api'

export function useDeleteEntity(
  onDeleted: (entityId: number) => void,
): UseMutationResult<{ deleted_entity_id: number }, Error, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEntity,
    onSuccess: async (_data, entityId) => {
      onDeleted(entityId)
      await queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}
