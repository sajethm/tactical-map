import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuditEvents } from '@/hooks/useAuditEvents'

interface Props {
  open: boolean
  onToggle: () => void
}

const formatStamp = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.valueOf())) return ''
  return date.toLocaleTimeString('en-GB', { hour12: false })
}

export default function AuditDrawer({ open, onToggle }: Props) {
  const { data: events = [] } = useAuditEvents(open)

  return (
    <Sheet open={open} onOpenChange={onToggle}>
      <SheetContent
        side="right"
        className="gap-0 border-rule bg-panel p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-rule px-4 py-3 pr-12">
          <SheetTitle className="text-[13px] font-semibold tracking-tight">Audit log</SheetTitle>
          <p className="eyebrow text-faint">Every action, and the command behind it</p>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <ul>
            {events.map((event) => (
              <li key={event.id} className="grid grid-cols-[58px_1fr] gap-2.5 border-b border-rule/60 px-4 py-2.5">
                <time className="readout text-[10px] leading-4 text-faint">
                  {formatStamp(event.created_at)}
                </time>
                <div className="min-w-0 space-y-1">
                  <p className="eyebrow text-dim">{event.event_type.replace(/_/g, ' ')}</p>
                  {event.message_content && (
                    <p className="text-[12.5px] leading-snug text-foreground">{event.message_content}</p>
                  )}
                  <p
                    className="readout truncate text-[10.5px] text-faint"
                    title={JSON.stringify(event.payload)}
                  >
                    {JSON.stringify(event.payload)}
                  </p>
                </div>
              </li>
            ))}
            {events.length === 0 && (
              <li className="px-4 py-6 text-[12.5px] text-dim">
                No actions recorded yet. Send a command and it will show up here.
              </li>
            )}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
