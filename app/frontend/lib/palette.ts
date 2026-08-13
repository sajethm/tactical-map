import type { Entity } from '@/lib/types'

export const TRACK_COLORS: Record<Entity['kind'], string> = {
  ship: '#5ad2f4',
  aircraft: '#ffc24b',
  vehicle: '#7ee0a8',
  marker: '#ff7d8f',
}

export const KIND_LABELS: Record<Entity['kind'], string> = {
  ship: 'Ships',
  aircraft: 'Aircraft',
  vehicle: 'Vehicles',
  marker: 'Markers',
}

export const KINDS = ['ship', 'aircraft', 'vehicle', 'marker'] as const

export const GROUND = '#05070b'
export const HISTORY = '#93a7c9'
