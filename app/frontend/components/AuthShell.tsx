import Reticle from '@/components/Reticle'

interface Props {
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-5">
      <div className="w-full max-w-[332px]">
        <div className="flex items-center gap-2">
          <Reticle className="size-4" />
          <p className="eyebrow text-faint">Tactical Map</p>
        </div>
        <h1 className="mt-6 text-[19px] leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-[13px] text-dim">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  )
}

export const Field = ({
  label,
  ...props
}: React.ComponentProps<'input'> & { label: string }) => (
  <label className="block">
    <span className="eyebrow text-faint">{label}</span>
    <input
      {...props}
      className="readout mt-1.5 h-9 w-full rounded-md border border-rule bg-raised px-2.5 text-[12.5px] text-foreground transition-colors outline-none placeholder:text-faint focus:border-edge focus:ring-0"
    />
  </label>
)
