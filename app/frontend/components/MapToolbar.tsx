import { CloudSun, ScrollText } from 'lucide-react'
import FilterChips from '@/components/FilterChips'
import KindGlyph from '@/components/KindGlyph'
import { KIND_LABELS, KINDS } from '@/lib/palette'
import type { Filters } from '@/lib/mapReducer'
import type { Entity } from '@/lib/types'

interface Props {
  visibleEntities: Entity[]
  totalCount: number
  filters: Filters
  onClearFilters: () => void
  weatherOpen: boolean
  weatherActive: boolean
  onToggleWeather: () => void
  auditOpen: boolean
  onToggleAudit: () => void
}

export default function MapToolbar({
  visibleEntities,
  totalCount,
  filters,
  onClearFilters,
  weatherOpen,
  weatherActive,
  onToggleWeather,
  auditOpen,
  onToggleAudit,
}: Props) {
  const hidden = totalCount - visibleEntities.length

  return (
    <div className="flex h-11 shrink-0 items-center gap-4 border-b border-rule bg-panel px-3">
      <p className="flex shrink-0 items-baseline gap-1.5">
        <span className="readout text-[12px] text-foreground">{visibleEntities.length}</span>
        <span className="eyebrow text-faint">visible</span>
        {hidden > 0 && <span className="eyebrow text-faint">· {hidden} hidden</span>}
      </p>

      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-rule" />

      <ul className="flex shrink-0 items-center gap-3.5">
        {KINDS.map((kind) => {
          const count = visibleEntities.filter((entity) => entity.kind === kind).length
          return (
            <li key={kind} className="flex items-center gap-1.5" title={KIND_LABELS[kind]}>
              <KindGlyph kind={kind} className={count > 0 ? 'size-3' : 'size-3 opacity-35'} />
              <span className={count > 0 ? 'readout text-[11px] text-dim' : 'readout text-[11px] text-faint'}>
                {count}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="scroll-thin min-w-0 flex-1 overflow-x-auto">
        <FilterChips filters={filters} onClear={onClearFilters} />
      </div>

      <button
        type="button"
        onClick={onToggleWeather}
        aria-expanded={weatherOpen}
        className={`eyebrow flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 transition-colors ${
          weatherOpen || weatherActive
            ? 'border-edge bg-raised text-foreground'
            : 'border-rule text-dim hover:border-edge hover:text-foreground'
        }`}
      >
        <CloudSun className="size-3.5" />
        Weather
      </button>

      <button
        type="button"
        onClick={onToggleAudit}
        aria-expanded={auditOpen}
        className={`eyebrow flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 transition-colors ${
          auditOpen
            ? 'border-edge bg-raised text-foreground'
            : 'border-rule text-dim hover:border-edge hover:text-foreground'
        }`}
      >
        <ScrollText className="size-3.5" />
        Audit log
      </button>
    </div>
  )
}
