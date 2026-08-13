import { CloudSun, X } from 'lucide-react'
import { WEATHER_LAYERS, WEATHER_LAYER_META } from '@/lib/weather'
import type { WeatherLayer } from '@/lib/weather'

interface Props {
  activeLayer: WeatherLayer | null
  onSelect: (layer: WeatherLayer | null) => void
  onClose: () => void
}

const rowClass = (active: boolean) =>
  `eyebrow flex h-7 w-full items-center rounded-md border px-2 transition-colors ${
    active
      ? 'border-edge bg-raised text-foreground'
      : 'border-transparent text-dim hover:border-rule hover:text-foreground'
  }`

export default function WeatherPanel({ activeLayer, onSelect, onClose }: Props) {
  const meta = activeLayer ? WEATHER_LAYER_META[activeLayer] : null

  return (
    <aside className="absolute top-3 left-3 z-10 w-[196px] overflow-hidden rounded-lg border border-rule bg-panel/95 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.75)] backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2.5">
        <CloudSun className="size-4 shrink-0 text-dim" />
        <h2 className="eyebrow flex-1 text-foreground">Weather</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close weather panel"
          className="-mr-1 grid size-6 shrink-0 place-items-center rounded-sm text-faint transition-colors hover:bg-raised hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <ul className="space-y-1 p-2">
        {WEATHER_LAYERS.map((layer) => (
          <li key={layer}>
            <button
              type="button"
              onClick={() => onSelect(layer)}
              aria-pressed={activeLayer === layer}
              className={rowClass(activeLayer === layer)}
            >
              {WEATHER_LAYER_META[layer].label}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={activeLayer === null}
            className={rowClass(activeLayer === null)}
          >
            Off
          </button>
        </li>
      </ul>

      {meta && (
        <div className="border-t border-rule px-3 py-2.5">
          <div className="h-1.5 w-full rounded-full" style={{ background: meta.gradient }} />
          <div className="mt-1.5 flex justify-between">
            <span className="eyebrow text-faint">{meta.minLabel}</span>
            <span className="eyebrow text-faint">{meta.maxLabel}</span>
          </div>
        </div>
      )}
    </aside>
  )
}
