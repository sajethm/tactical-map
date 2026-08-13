import type { Entity } from '@/lib/types'
import { TRACK_COLORS } from '@/lib/palette'

// A flatter echo of the map symbols in lib/symbology.ts, so the legend and the
// entity readout name a contact the same way the map draws it.
const SHAPES: Record<Entity['kind'], React.ReactNode> = {
  ship: <path d="M8 1.6c2.4 2.5 2.3 5.6 2.2 8L9.8 14H6.2l-.4-4.4c-.1-2.4-.2-5.5 2.2-8Z" />,
  aircraft: <path d="M8 1.6 14 14l-6-2.6L2 14Z" />,
  vehicle: <path d="M8 2l5 3.8V14H3V5.8Z" />,
  marker: (
    <>
      <circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 0v2.2M8 13.8V16M0 8h2.2M13.8 8H16"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
}

interface Props {
  kind: Entity['kind']
  className?: string
}

export default function KindGlyph({ kind, className }: Props) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      style={{ color: TRACK_COLORS[kind], fill: 'currentColor' }}
    >
      {SHAPES[kind]}
    </svg>
  )
}
