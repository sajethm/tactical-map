import type { AuditEventRow, ChatMessage, Entity, EntityPosition } from '@/lib/types'

const csrfToken = (): string =>
  document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken(),
      Accept: 'application/json',
    },
    ...options,
  })
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url} failed: ${response.status}`)
  return response.json() as Promise<T>
}

export async function postMessage(
  content: string,
  context: { bounds: [number, number, number, number] | null; selected_entity_id: number | null },
): Promise<ChatMessage> {
  const data = await request<{ message: ChatMessage }>('/messages', {
    method: 'POST',
    body: JSON.stringify({ content, context }),
  })
  return data.message
}

export async function getMessage(id: number): Promise<{ message: ChatMessage; reply: ChatMessage | null }> {
  return request(`/messages/${id}`)
}

export async function getMessages(): Promise<ChatMessage[]> {
  const data = await request<{ messages: ChatMessage[] }>('/messages')
  return data.messages
}

export async function getEntities(): Promise<Entity[]> {
  const data = await request<{ entities: Entity[] }>('/entities')
  return data.entities
}

export async function getPositions(entityId: number): Promise<EntityPosition[]> {
  const data = await request<{ positions: EntityPosition[] }>(`/entities/${entityId}/positions`)
  return data.positions
}

export async function deleteEntity(entityId: number): Promise<{ deleted_entity_id: number }> {
  return request(`/entities/${entityId}`, { method: 'DELETE' })
}

export async function getAuditEvents(): Promise<AuditEventRow[]> {
  const data = await request<{ audit_events: AuditEventRow[] }>('/audit_events')
  return data.audit_events
}
