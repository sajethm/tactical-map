import type { WeatherLayer } from '@/lib/weather'

export interface Entity {
  id: number
  kind: 'ship' | 'aircraft' | 'vehicle' | 'marker'
  name: string
  lat: number
  lng: number
  heading: number
  speed_knots: number
  status: 'active' | 'inactive'
  properties: Record<string, unknown>
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  status: 'pending' | 'processing' | 'completed' | 'needs_clarification' | 'failed'
  actions: Action[]
  created_at: string
}

export interface EntityPosition {
  lat: number
  lng: number
  recorded_at: string
}

export interface AuditEventRow {
  id: number
  event_type: string
  payload: Record<string, unknown>
  message_content: string | null
  created_at: string
}

export type Action =
  | { type: 'fly_to'; lat?: number; lng?: number; zoom?: number; entity_id?: number; bounds?: [number, number, number, number] }
  | { type: 'filter_entities'; kinds?: string[]; statuses?: string[]; name_contains?: string; scope?: 'viewport' | 'global' }
  | { type: 'place_marker'; lat: number; lng: number; name: string; entity_id?: number }
  | { type: 'show_history'; entity_id: number }
  | { type: 'open_details'; entity_id: number }
  | { type: 'clear_filters' }
  | { type: 'set_weather_overlay'; layer: WeatherLayer | 'none' }
  | { type: 'ask_clarification'; question: string; choices?: string[] }
  | { type: 'delete_marker'; entity_id: number; deleted?: boolean; name?: string; reason?: string }
