import { useState } from 'react'
import { X } from 'lucide-react'
import KindGlyph from '@/components/KindGlyph'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import type { Entity } from '@/lib/types'

interface Props {
  entity: Entity
  trackShown: boolean
  onClose: () => void
  onToggleTrack: (entityId: number) => void
  onDelete: (entityId: number) => void
}

// Degrees and decimal minutes, the way a position is read out loud on a bridge.
const formatDegrees = (value: number, axis: 'lat' | 'lng'): string => {
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W')
  const absolute = Math.abs(value)
  const degrees = Math.floor(absolute)
  const minutes = (absolute - degrees) * 60
  const width = axis === 'lat' ? 2 : 3
  return `${String(degrees).padStart(width, '0')}°${minutes.toFixed(2).padStart(5, '0')}′${hemisphere}`
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 px-3 py-2">
    <dt className="eyebrow shrink-0 text-faint">{label}</dt>
    <dd className="readout min-w-0 text-right text-[12px] text-foreground">{children}</dd>
  </div>
)

export default function EntityPanel({ entity, trackShown, onClose, onToggleTrack, onDelete }: Props) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const heading = Math.round(entity.heading) % 360
  const isMarker = entity.kind === 'marker'

  return (
    <aside className="absolute top-3 right-3 z-10 w-[264px] overflow-hidden rounded-lg border border-rule bg-panel/95 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.75)] backdrop-blur-sm">
      <div className="flex items-start gap-2.5 border-b border-rule px-3 py-2.5">
        <KindGlyph kind={entity.kind} className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="readout truncate text-[13px] font-medium tracking-[0.06em] text-foreground uppercase">
            {entity.name}
          </h2>
          <p className="eyebrow mt-1 text-faint">{entity.kind}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="-mt-0.5 -mr-1 grid size-6 shrink-0 place-items-center rounded-sm text-faint transition-colors hover:bg-raised hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <dl className="divide-y divide-rule/70">
        <Row label="Position">
          {formatDegrees(entity.lat, 'lat')} {formatDegrees(entity.lng, 'lng')}
        </Row>
        <Row label="Heading">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 text-dim" style={{ transform: `rotate(${heading}deg)` }}>
              <path d="M6 1.5 9.5 10 6 8 2.5 10Z" fill="currentColor" />
            </svg>
            {String(heading).padStart(3, '0')}°
          </span>
        </Row>
        <Row label="Speed">{entity.speed_knots.toFixed(1)} kn</Row>
        <Row label="Status">
          <span className={entity.status === 'active' ? 'text-foreground' : 'text-faint'}>
            {entity.status}
          </span>
        </Row>
      </dl>

      <div className="flex flex-col gap-1.5 border-t border-rule p-2">
        <button
          type="button"
          onClick={() => onToggleTrack(entity.id)}
          className={`eyebrow h-7 w-full rounded-md border transition-colors ${
            trackShown
              ? 'border-edge bg-raised text-foreground'
              : 'border-rule text-dim hover:border-edge hover:text-foreground'
          }`}
        >
          {trackShown ? 'Hide 24-hour track' : 'Show 24-hour track'}
        </button>

        {isMarker && (
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="eyebrow h-7 w-full rounded-md border border-rule text-dim transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            Delete marker
          </button>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Delete marker"
        description={`${entity.name} will be removed from the map permanently.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => onDelete(entity.id)}
      />
    </aside>
  )
}
