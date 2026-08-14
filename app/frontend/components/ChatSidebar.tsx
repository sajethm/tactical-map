import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Square } from 'lucide-react'
import Reticle from '@/components/Reticle'
import { Button } from '@/components/ui/button'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import type { Action, ChatMessage } from '@/lib/types'

interface Props {
  messages: ChatMessage[]
  busy: boolean
  error: string | null
  onSend: (content: string) => void
}

const ACTION_LABELS: Record<Action['type'], string | null> = {
  fly_to: 'moved map',
  filter_entities: 'filtered',
  place_marker: 'placed marker',
  show_history: 'drew track',
  open_details: 'opened details',
  clear_filters: 'cleared filters',
  set_weather_overlay: 'set weather',
  ask_clarification: null,
  delete_marker: 'deleted marker',
}

const EXAMPLES = [
  'show only active ships',
  'find the fastest ship and open its details',
  'show the last 24 hours for that ship',
  'show me weather overlays for the current zoom window',
]

const clarificationChoices = (messages: ChatMessage[]): string[] => {
  const last = messages[messages.length - 1]
  if (last?.role !== 'assistant') return []
  const clarification = last.actions.find((a) => a.type === 'ask_clarification')
  return clarification?.type === 'ask_clarification' ? clarification.choices ?? [] : []
}

const formatTime = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleTimeString('en-GB', { hour12: false })
}

// Commands sit on the right with their timestamp outboard; replies sit on the
// left. The two timestamp gutters frame the log so the sides read as a dialogue.
const Entry = ({
  time,
  side = 'left',
  children,
}: {
  time: string
  side?: 'left' | 'right'
  children: React.ReactNode
}) => {
  const stamp = <time className="readout pt-px text-[10px] leading-5 text-faint">{time}</time>

  if (side === 'right') {
    return (
      <li className="log-entry grid grid-cols-[1fr_46px] gap-2.5">
        <div className="ml-5 min-w-0 text-right">{children}</div>
        {stamp}
      </li>
    )
  }

  return (
    <li className="log-entry grid grid-cols-[46px_1fr] gap-2.5">
      {stamp}
      <div className="mr-5 min-w-0">{children}</div>
    </li>
  )
}

const footerNote = (
  speechError: string | null,
  isListening: boolean,
): { text: string; tone: string } | null => {
  if (speechError) return { text: speechError, tone: 'text-destructive' }
  if (isListening) return { text: 'Listening — speak your command', tone: 'text-chart-1' }
  return null
}

export default function ChatSidebar({
  messages,
  busy,
  error,
  onSend,
}: Props) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const choices = clarificationChoices(messages)

  const handleTranscript = useCallback((text: string) => setDraft(text), [])
  const speech = useSpeechInput({ onTranscript: handleTranscript })
  const note = footerNote(speech.error, speech.isListening)

  const handleToggleMic = () => {
    if (speech.isListening) speech.stop()
    else speech.start(draft)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, busy])

  const submit = () => {
    const content = draft.trim()
    if (!content || busy) return
    speech.stop()
    setDraft('')
    onSend(content)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2.5 border-b border-rule px-4">
        <Reticle className="size-4 shrink-0" />
        <h1 className="text-[13px] leading-tight font-semibold tracking-tight">Tactical Map</h1>
      </header>

      <ol className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
        {messages.length === 0 && !busy && (
          <li className="space-y-3">
            <p className="text-[13px] leading-relaxed text-dim">
              Ask for a contact, a filter, or a place. Actions run on the map in the order they
              come back.
            </p>
            <ul className="space-y-1.5">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => onSend(example)}
                    className="readout w-full rounded-md border border-rule bg-raised/50 px-2.5 py-2 text-left text-[12px] text-dim transition-colors hover:border-edge hover:text-foreground"
                  >
                    <span aria-hidden="true" className="mr-1.5 text-faint">›</span>
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <Entry
              key={message.id}
              time={formatTime(message.created_at)}
              side={isUser ? 'right' : 'left'}
            >
              {isUser ? (
                <p className="readout text-[12.5px] leading-5 text-dim">{message.content}</p>
              ) : (
                <p className="text-[13px] leading-5 text-foreground">{message.content}</p>
              )}
              {!isUser && (
                <ul className="mt-1.5 flex flex-wrap gap-1">
                  {message.actions.map((action, index) => {
                    const label = ACTION_LABELS[action.type]
                    if (!label) return null
                    return (
                      <li
                        key={`${action.type}-${index}`}
                        className="eyebrow rounded-sm border border-rule bg-raised px-1.5 py-1 text-faint"
                      >
                        {label}
                      </li>
                    )
                  })}
                </ul>
              )}
              {message.status === 'failed' && (
                <p className="eyebrow mt-1.5 text-destructive">Failed — send it again</p>
              )}
            </Entry>
          )
        })}

        {busy && (
          <Entry time="">
            <p className="readout text-[12.5px] leading-5 text-faint">
              Working<span className="caret ml-0.5">▌</span>
            </p>
          </Entry>
        )}
        {error && (
          <Entry time="">
            <p className="eyebrow text-destructive">{error}</p>
          </Entry>
        )}
        <div ref={bottomRef} />
      </ol>

      {choices.length > 0 && (
        <div className="border-t border-rule px-4 py-2.5">
          <p className="eyebrow mb-2 text-right text-faint">Choose one</p>
          <div className="flex flex-wrap justify-end gap-1.5">
            {choices.map((choice) => (
              <Button
                key={choice}
                variant="secondary"
                size="sm"
                className="readout text-[12px]"
                onClick={() => onSend(choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form
        className="border-t border-rule px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex items-center gap-2 rounded-md border border-rule bg-raised px-2.5 py-1.5 transition-colors focus-within:border-edge">
          <span aria-hidden="true" className="readout text-[13px] text-faint select-none">›</span>
          <input
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a command…"
            className="readout min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[12.5px] text-foreground outline-none placeholder:text-faint focus:border-0 focus:ring-0 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleToggleMic}
            aria-pressed={speech.isListening}
            aria-label={speech.isListening ? 'Stop voice input' : 'Start voice input'}
            disabled={busy || !speech.isSupported}
            title={speech.isSupported ? undefined : 'Voice input needs Chrome, Edge, or Safari'}
            className={`grid size-6 shrink-0 place-items-center rounded-sm transition-colors hover:bg-edge hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent ${
              speech.isListening ? 'caret text-chart-1' : 'text-faint disabled:hover:text-faint'
            }`}
          >
            {speech.isListening ? (
              <Square className="size-2.5" fill="currentColor" />
            ) : (
              <Mic className="size-3.5" />
            )}
          </button>
          <button
            type="submit"
            aria-label="Send command"
            disabled={busy || !draft.trim()}
            className="grid size-6 shrink-0 place-items-center rounded-sm text-faint transition-colors hover:bg-edge hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-faint"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
        <p aria-live="polite" className="sr-only">
          {speech.isListening ? 'Listening for a voice command' : ''}
        </p>
        {note && <p className={`eyebrow mt-2 ${note.tone}`}>{note.text}</p>}
      </form>
    </div>
  )
}
