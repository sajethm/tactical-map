import { TRACK_COLORS } from '@/lib/palette'

export default function Reticle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={TRACK_COLORS.ship} strokeWidth="1.4" />
      <path
        d="M12 1.5v3.5M12 19v3.5M1.5 12h3.5M19 12h3.5"
        stroke={TRACK_COLORS.ship}
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
