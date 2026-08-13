# Voice Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an operator dictate a map command with the browser's `SpeechRecognition` API, with the transcript landing in the chat composer for review before sending.

**Architecture:** A `useSpeechInput` hook owns the recognition lifecycle and pushes transcripts into `ChatSidebar`'s existing `draft` state. Voice and typing converge on one submit path, so a dictated command is an ordinary message from the moment it leaves the composer — no new endpoint, no new persisted state, no change to `onSend`.

**Tech Stack:** React 19, TypeScript 7, Vitest + Testing Library.

**Spec:** No spec document — this was scoped as a bounded change during brainstorming. The design is captured in this plan's header and per-task notes.

## Global Constraints

- Voice input is browser-side only. No audio is uploaded, stored, or sent to Rails; no object storage is involved.
- The transcript **never** auto-sends. It populates the composer and waits for the operator to submit.
- No backend changes. `onSend`, `postMessage`, and the `messages` schema are all untouched — a dictated command is indistinguishable from a typed one by design (see the note under Task 3).
- TypeScript 7's `lib.dom.d.ts` ships **no** `SpeechRecognition` types. Ambient declarations are required; do not add an `@types` package.
- Frontend style (from `CLAUDE.md`): match the existing 2-space, single-quote, semicolon-free style in `app/frontend`. No nested ternaries (oxlint). Prefix handlers with `handle`, booleans with `is`/`has`/`can`.
- Do not commit. Leave all changes in the working tree.
- Frontend tests: `pnpm test`. Types: `pnpm check`.

---

### Task 1: Speech recognition hook

**Files:**
- Create: `app/frontend/types/speech.d.ts`
- Create: `app/frontend/hooks/useSpeechInput.ts`
- Create: `app/frontend/test/speechStub.ts`
- Test: `app/frontend/hooks/__tests__/useSpeechInput.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `useSpeechInput({ onTranscript }: { onTranscript: (text: string) => void }): { isSupported: boolean; isListening: boolean; error: string | null; start: (base: string) => void; stop: () => void }`
  - `StubSpeechRecognition` test double with statics `latest()`, `reset()` and instance methods `emit(...transcripts: string[])`, `fail(error: string)`.
  - `installSpeechStub()` / `removeSpeechStub()` test helpers.

**Notes:** `speech.d.ts` deliberately has no top-level `import`/`export`, which keeps it an ambient global script. `moduleDetection: "force"` in `tsconfig.app.json` only forces *non-declaration* files to be modules, so `.d.ts` files are unaffected — do not add `declare global`.

- [ ] **Step 1: Write the ambient type declarations**

Create `app/frontend/types/speech.d.ts`:

```ts
interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  readonly [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}
```

- [ ] **Step 2: Write the test stub**

Create `app/frontend/test/speechStub.ts`:

```ts
export class StubSpeechRecognition {
  static instances: StubSpeechRecognition[] = []

  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null
  onend: (() => void) | null = null
  isStarted = false
  isAborted = false

  constructor() {
    StubSpeechRecognition.instances.push(this)
  }

  static latest(): StubSpeechRecognition {
    const instance = this.instances[this.instances.length - 1]
    if (!instance) throw new Error('No StubSpeechRecognition was constructed')
    return instance
  }

  static reset(): void {
    this.instances = []
  }

  start(): void {
    this.isStarted = true
  }

  stop(): void {
    this.onend?.()
  }

  abort(): void {
    this.isAborted = true
    this.onend?.()
  }

  // Mimics SpeechRecognitionResultList: an array-like of results, each an
  // array-like of alternatives. The hook concatenates every result, so passing
  // several strings models a finalized segment followed by an interim one.
  emit(...transcripts: string[]): void {
    const results: Record<number, unknown> = {}
    transcripts.forEach((transcript, index) => {
      results[index] = { 0: { transcript, confidence: 1 }, isFinal: true, length: 1 }
    })
    this.onresult?.({
      resultIndex: 0,
      results: { ...results, length: transcripts.length },
    } as unknown as SpeechRecognitionEvent)
  }

  fail(error: string): void {
    this.onerror?.({ error } as SpeechRecognitionErrorEvent)
  }
}

export const installSpeechStub = (): void => {
  StubSpeechRecognition.reset()
  window.SpeechRecognition = StubSpeechRecognition as unknown as SpeechRecognitionConstructor
}

export const removeSpeechStub = (): void => {
  delete window.SpeechRecognition
  delete window.webkitSpeechRecognition
}
```

- [ ] **Step 3: Write the failing tests**

Create `app/frontend/hooks/__tests__/useSpeechInput.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { StubSpeechRecognition, installSpeechStub, removeSpeechStub } from '@/test/speechStub'

describe('useSpeechInput', () => {
  beforeEach(() => installSpeechStub())
  afterEach(() => removeSpeechStub())

  it('reports unsupported when the browser has no SpeechRecognition', () => {
    removeSpeechStub()
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(false)
  })

  it('reports supported and configures interim results on start', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(true)

    act(() => result.current.start(''))

    const recognition = StubSpeechRecognition.latest()
    expect(recognition.isStarted).toBe(true)
    expect(recognition.interimResults).toBe(true)
    expect(recognition.continuous).toBe(false)
    expect(result.current.isListening).toBe(true)
  })

  it('sends the concatenated transcript to onTranscript', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechInput({ onTranscript }))

    act(() => result.current.start(''))
    act(() => StubSpeechRecognition.latest().emit('show all ', 'ships'))

    expect(onTranscript).toHaveBeenCalledWith('show all ships')
  })

  it('appends dictation to text already in the composer', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechInput({ onTranscript }))

    act(() => result.current.start('show me'))
    act(() => StubSpeechRecognition.latest().emit('all ships'))

    expect(onTranscript).toHaveBeenCalledWith('show me all ships')
  })

  it('stops listening when recognition ends', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    act(() => result.current.stop())

    expect(result.current.isListening).toBe(false)
  })

  it('surfaces a denied microphone as an error', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    act(() => StubSpeechRecognition.latest().fail('not-allowed'))

    expect(result.current.error).toBe('Microphone access denied.')
  })

  it('stays silent when no speech was detected', () => {
    const { result } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    act(() => StubSpeechRecognition.latest().fail('no-speech'))

    expect(result.current.error).toBeNull()
  })

  it('aborts recognition on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechInput({ onTranscript: vi.fn() }))

    act(() => result.current.start(''))
    const recognition = StubSpeechRecognition.latest()
    unmount()

    expect(recognition.isAborted).toBe(true)
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm test app/frontend/hooks/__tests__/useSpeechInput.test.ts`
Expected: FAIL — cannot resolve `@/hooks/useSpeechInput`.

- [ ] **Step 5: Implement the hook**

Create `app/frontend/hooks/useSpeechInput.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  onTranscript: (text: string) => void
}

interface SpeechInput {
  isSupported: boolean
  isListening: boolean
  error: string | null
  start: (base: string) => void
  stop: () => void
}

// The user aborting or simply not speaking is normal operation, not a failure
// worth putting in front of an operator.
const SILENT_ERRORS = new Set(['no-speech', 'aborted'])

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access denied.',
  'service-not-allowed': 'Microphone access denied.',
  'audio-capture': 'No microphone found.',
  network: 'Speech service unreachable.',
}

const recognitionCtor = (): SpeechRecognitionConstructor | null =>
  window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null

export function useSpeechInput({ onTranscript }: Options): SpeechInput {
  const [isSupported] = useState(() => recognitionCtor() !== null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const baseRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback((base: string) => {
    const Recognition = recognitionCtor()
    if (!Recognition || recognitionRef.current) return

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    baseRef.current = base.trim() ? `${base.trimEnd()} ` : ''

    // Every result is re-read on each event so interim words are replaced by
    // their finalized form instead of accumulating twice.
    recognition.onresult = (event) => {
      let spoken = ''
      for (let i = 0; i < event.results.length; i += 1) {
        spoken += event.results[i][0].transcript
      }
      onTranscriptRef.current(baseRef.current + spoken.trimStart())
    }

    recognition.onerror = (event) => {
      if (SILENT_ERRORS.has(event.error)) return
      setError(ERROR_MESSAGES[event.error] ?? 'Voice input failed.')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
    }

    setError(null)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { isSupported, isListening, error, start, stop }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test app/frontend/hooks/__tests__/useSpeechInput.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 7: Verify types**

Run: `pnpm check`
Expected: no errors.

---

### Task 2: Mic button in the composer

**Files:**
- Modify: `app/frontend/components/ChatSidebar.tsx:1-5` (imports), `:76-97` (state and submit), `:203-229` (composer form)
- Test: `app/frontend/components/__tests__/ChatSidebar.test.tsx`

**Interfaces:**
- Consumes: `useSpeechInput` and the stub helpers from Task 1.
- Produces: a composer with a mic toggle. `Props.onSend` keeps its existing `(content: string) => void` signature, so the three pre-existing tests in `ChatSidebar.test.tsx` must continue to pass unmodified — treat any change to them as a signal you have broken something.

**Notes:** The mic renders **disabled with an explanatory `title`** when unsupported rather than being hidden, so the Firefox limitation reads as deliberate rather than as a missing feature. Listening state uses `text-chart-1` (the palette's cyan "live" colour — note `--accent` resolves to `--raised`, a background tone, and is unusable for text) and reuses the existing `.caret` blink animation.

- [ ] **Step 1: Write the failing tests**

Replace the import block at the top of `app/frontend/components/__tests__/ChatSidebar.test.tsx` with:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatSidebar from '@/components/ChatSidebar'
import { StubSpeechRecognition, installSpeechStub, removeSpeechStub } from '@/test/speechStub'
import type { ChatMessage } from '@/lib/types'
```

Add this cleanup immediately after the `describe('ChatSidebar', () => {` line so a stub never leaks between tests:

```tsx
  afterEach(() => removeSpeechStub())
```

Then append these cases inside the same `describe` block:

```tsx
  it('disables the mic with an explanation when speech is unsupported', () => {
    removeSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} currentUserEmail="demo@example.com" />)
    const mic = screen.getByRole('button', { name: /start voice input/i })
    expect(mic).toBeDisabled()
    expect(mic).toHaveAttribute('title', expect.stringMatching(/chrome/i))
  })

  it('starts listening when the mic is clicked', async () => {
    installSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} currentUserEmail="demo@example.com" />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))

    const mic = screen.getByRole('button', { name: /stop voice input/i })
    expect(mic).toHaveAttribute('aria-pressed', 'true')
    // Matched on the tail of the note: "Listening" alone also appears in the
    // sr-only live region, and getByText throws on multiple matches.
    expect(screen.getByText(/speak your command/i)).toBeInTheDocument()
  })

  it('puts the transcript in the composer without sending it', async () => {
    installSpeechStub()
    const onSend = vi.fn()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={onSend} currentUserEmail="demo@example.com" />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().emit('show all ships'))

    expect(screen.getByPlaceholderText(/command/i)).toHaveValue('show all ships')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('appends dictation to text already typed', async () => {
    installSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} currentUserEmail="demo@example.com" />)
    await userEvent.type(screen.getByPlaceholderText(/command/i), 'show me')
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().emit('all ships'))

    expect(screen.getByPlaceholderText(/command/i)).toHaveValue('show me all ships')
  })

  it('sends a dictated command through the normal submit path', async () => {
    installSpeechStub()
    const onSend = vi.fn()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={onSend} currentUserEmail="demo@example.com" />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().emit('show all ships'))
    await userEvent.click(screen.getByRole('button', { name: 'Send command' }))

    expect(onSend).toHaveBeenCalledWith('show all ships')
    expect(screen.getByPlaceholderText(/command/i)).toHaveValue('')
  })

  it('shows a microphone permission error', async () => {
    installSpeechStub()
    render(<ChatSidebar messages={[]} busy={false} error={null}
                        onSend={vi.fn()} currentUserEmail="demo@example.com" />)
    await userEvent.click(screen.getByRole('button', { name: /start voice input/i }))
    act(() => StubSpeechRecognition.latest().fail('not-allowed'))

    expect(screen.getByText('Microphone access denied.')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test app/frontend/components/__tests__/ChatSidebar.test.tsx`
Expected: FAIL — no button named "start voice input". The three pre-existing tests still pass.

- [ ] **Step 3: Add the imports and the footer-note helper**

Replace the import block at `ChatSidebar.tsx:1-5` with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Square } from 'lucide-react'
import Reticle from '@/components/Reticle'
import { Button } from '@/components/ui/button'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import type { Action, ChatMessage } from '@/lib/types'
```

Add this helper directly above the `ChatSidebar` component, after the `Entry` component definition. It exists so the footer stays free of nested ternaries, which oxlint rejects:

```tsx
const footerNote = (
  speechError: string | null,
  isListening: boolean,
  contextNote?: string,
): { text: string; tone: string } | null => {
  if (speechError) return { text: speechError, tone: 'text-destructive' }
  if (isListening) return { text: 'Listening — speak your command', tone: 'text-chart-1' }
  if (contextNote) return { text: contextNote, tone: 'text-faint' }
  return null
}
```

- [ ] **Step 4: Wire the hook into component state**

Replace the state block at `ChatSidebar.tsx:84-86` with:

```tsx
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const choices = clarificationChoices(messages)

  const handleTranscript = useCallback((text: string) => setDraft(text), [])
  const speech = useSpeechInput({ onTranscript: handleTranscript })
  const note = footerNote(speech.error, speech.isListening, contextNote)

  const handleToggleMic = () => {
    if (speech.isListening) speech.stop()
    else speech.start(draft)
  }
```

- [ ] **Step 5: Stop listening on submit**

Replace the `submit` function at `ChatSidebar.tsx:92-97` with:

```tsx
  const submit = () => {
    const content = draft.trim()
    if (!content || busy) return
    speech.stop()
    setDraft('')
    onSend(content)
  }
```

- [ ] **Step 6: Render the mic button and the footer note**

Replace the composer `<form>` at `ChatSidebar.tsx:203-229` with:

```tsx
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
```

- [ ] **Step 7: Run the full frontend suite**

Run: `pnpm test`
Expected: PASS — all suites green, including the three untouched `ChatSidebar` cases.

- [ ] **Step 8: Verify types**

Run: `pnpm check`
Expected: no errors.

---

### Task 3: Document voice input

**Files:**
- Modify: `README.md` — add a section after "Weather overlays"; update "Testing" and "Extension points"

**Interfaces:**
- Consumes: the finished feature.
- Produces: README prose. No code.

**Notes:** The "no provenance field" decision is documented deliberately rather than silently. A naive `input_mode` flag would stay `voice` even after the operator hand-edits the transcript, which is a tag that looks precise and is not — worse in an audit log than no tag. Say so, and name what a correct version would require.

- [ ] **Step 1: Add the feature section**

Insert this after the "Weather overlays" section, before "## The three core requirements":

```markdown
### Voice input

The composer's microphone button uses the browser's `SpeechRecognition` API to
dictate a command. Interim results stream into the input as you speak, and the
transcript **stays in the box** — it is never auto-sent. That is deliberate:
speech models mangle callsigns and place names, and the same principle behind
`ask_clarification` applies one layer earlier, letting the operator correct a
misheard transcript before it becomes a command.

Dictation therefore resolves to ordinary text in the composer, and a spoken
command takes the identical path as a typed one — `POST /messages`, an
`AiRequest`, and `audit_events` rows. No new endpoint, no new persisted state.
Audio never leaves the browser for this application's servers, so there is no
upload path and no object storage to operate.

The audit log does not record whether a command was spoken or typed. A flag set
when dictation begins would remain set after the operator hand-edits the
transcript, labelling as "voice" a command a human actually rewrote — a tag
that reads as precise while being wrong. Recording this honestly means
comparing submitted text against the final transcript and marking only exact
matches, which is worth doing when someone needs the distinction and is not
worth a misleading field before then.

The tradeoff is browser support: `SpeechRecognition` is available in Chrome,
Edge, and Safari but not Firefox, where the mic renders disabled with an
explanation rather than disappearing. Chrome also relays audio to Google's
speech service. A server-side Whisper endpoint would avoid both issues and put
transcription itself under the audit trail, at the cost of a round trip and
losing live interim text; it remains the natural upgrade if either matters.
```

- [ ] **Step 2: Replace the stale extension point**

In "## Extension points", replace the `**Voice input:**` bullet with:

```markdown
- **Server-side transcription:** Swap browser `SpeechRecognition` for a Whisper
  endpoint to gain Firefox support and bring the audio-to-text step itself into
  the audit trail. The composer already treats the transcript as ordinary text,
  so only the hook changes.
```

- [ ] **Step 3: Update the testing paragraph**

In "## Testing", extend the Vitest sentence so it reads:

```markdown
Vitest and Testing Library cover the map reducer and sequential executor,
clarification chips and chat interactions, speech-recognition transcript
handling and its unsupported-browser fallback, filters, trails, and
audit-facing UI behavior.
```

- [ ] **Step 4: Run the full verification**

Run: `pnpm test && pnpm check && bundle exec rspec`
Expected: all three green. RSpec is included to confirm this change touched nothing on the backend.

- [ ] **Step 5: Manual smoke test in Chrome**

Run `bin/dev`, sign in as `demo@example.com` / `password123`, then:
1. Click the mic, allow microphone access, and say "show only active ships".
2. Confirm words appear in the composer while speaking and that nothing sends.
3. Edit the transcript if it misheard, then press enter and confirm the map filters.
4. Click the mic, deny microphone access, and confirm "Microphone access denied." appears.
5. Open the app in Firefox and confirm the mic is disabled with its explanatory tooltip.
