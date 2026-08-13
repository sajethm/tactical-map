import type { Filters } from '@/lib/mapReducer'

interface Props {
  filters: Filters
  onClear: () => void
}

export default function FilterChips({ filters, onClear }: Props) {
  const chips: { label: string; value: string }[] = []
  if (filters.kinds?.length) chips.push({ label: 'kind', value: filters.kinds.join(' · ') })
  if (filters.statuses?.length) chips.push({ label: 'status', value: filters.statuses.join(' · ') })
  if (filters.nameContains) chips.push({ label: 'name', value: filters.nameContains })
  if (filters.scope === 'viewport') chips.push({ label: 'scope', value: 'viewport' })
  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="eyebrow flex shrink-0 items-center gap-1.5 rounded-sm border border-rule bg-raised py-1 pr-1.5 pl-1.5"
        >
          <span className="text-faint">{chip.label}</span>
          <span className="text-foreground">{chip.value}</span>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="eyebrow shrink-0 rounded-sm px-1.5 py-1 text-faint transition-colors hover:bg-raised hover:text-foreground"
      >
        Clear
      </button>
    </div>
  )
}
