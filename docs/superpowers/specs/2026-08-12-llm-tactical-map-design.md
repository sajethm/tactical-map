# Tactical Map — LLM-driven Map Interface

**Date:** 2026-08-12
**Status:** Implemented (see README for the as-built architecture; naming has
since evolved — e.g. the command domain now lives under `Commands::` in
`app/services/commands/`)

## What we're building

A map-based, full-stack application where users create, place, view, and
filter entities on a tactical map using natural-language commands typed into a
chat ("show me assets in the current zoom window", "show me the historic
location of this asset", "place a marker at x location"). An LLM translates
each command into one or more map actions.

Core requirements:

1. **Ambiguity handling** — unclear commands produce clarifying questions
   rather than wrong guesses.
2. **Audit / historic event log** — every command and resulting action is
   recorded and viewable.
3. **Serialized actions** — a single request can perform multiple actions
   (adjust frame, filter, isolate an asset, open details).

## Scope decisions

- **Text commands first.** Voice input is a later extension (browser
  SpeechRecognition or Whisper).
- **Seeded/simulated data only.** No external data APIs in v1. The entity
  model is designed so live sources (OpenSky flights, weather tiles) can slot
  in later as additional entity kinds/overlays. Weather overlays are explicitly
  deferred and documented as an extension point.
- **One rolling conversation per user.** The schema keeps a `conversations`
  table so multiple named conversations can be added later without migration
  pain, but the UI exposes a single ongoing chat.
- **No multi-client real-time sync.** Out of scope. Polling only.

## Stack

- **Backend:** Rails 8 (built-in auth generator), Postgres, Solid Queue
- **Frontend:** Inertia + React + TypeScript, TanStack Query v5 (all backend
  requests via query/mutation hooks), shadcn/ui, Tailwind, Mapbox GL JS
- **LLM:** OpenAI with tool-calling
- **Deploy:** Render — single web service (Solid Queue runs in-Puma via
  `SOLID_QUEUE_IN_PUMA=1`) + Render Postgres

## Data model

- **`users`** — Rails 8 auth generator (email + password, sessions).
- **`entities`** — `kind` (`ship`/`aircraft`/`vehicle`/`marker`), `name`,
  `lat`, `lng`, `heading`, `speed_knots`, `status` (`active`/`inactive`),
  `properties` (jsonb), `created_by_id` (null for seeded assets, set for
  user-placed markers). `lat`/`lng` is the *current* position — deliberate
  denormalization so the `/entities` poll never joins for latest position.
- **`entity_positions`** — `entity_id`, `lat`, `lng`, `heading`,
  `recorded_at`. Appended by the simulation tick, pruned past 24h.
- **`conversations`** — `user_id`, timestamps. One rolling conversation per
  user in v1, created lazily; exists as a table to support multiple named
  conversations later.
- **`messages`** — `conversation_id`, `role` (`user`/`assistant`), `content`,
  `status` (`pending`/`processing`/`completed`/`needs_clarification`/`failed`),
  `actions` (jsonb — assistant messages carry the ordered action list).
- **`ai_requests`** — `message_id` (the user message being processed), rendered
  prompt (full text sent to the model, including context), raw model response,
  model name, token counts, `error`. Pure debug/observability
  table, deliberately separate from `messages`: keeps bulky payloads out of the
  chat-rendering path, and supports multiple model calls per message (retries,
  multi-step chains) later.
- **`audit_events`** — `user_id`, `message_id` (nullable), `event_type`,
  `payload` (jsonb), `created_at`. One row per action/mutation. Partially
  denormalizes `messages.actions` — deliberate: the audit log is a core
  requirement and should not be coupled to chat message format.

## Command loop (core architecture)

1. User submits text. `POST /messages` creates a `pending` user message
   (with the client's current viewport bounds and selected entity id attached),
   enqueues `ProcessCommandJob`, returns the message id.
2. The job renders the prompt: system instructions + tool schemas +
   context — viewport bounds, selected entity, a compact list of visible
   entities, and the last ~10 messages. It logs the rendered prompt to
   `ai_requests`, then calls OpenAI with tools:
   - `fly_to` (pan/zoom to a place, entity, or bounds)
   - `filter_entities` (by kind/status/name; viewport or global)
   - `place_marker`
   - `show_history` (trail polyline for an entity)
   - `open_details` (entity info panel)
   - `clear_filters`
   - `ask_clarification`
3. Returned tool calls are validated against schemas. Side effects are
   persisted server-side (marker creation), audit events written, and an
   assistant message is created with reply text + ordered `actions` array.
   Ambiguity → message status `needs_clarification`, with a question and
   structured choices.
4. The frontend polls `GET /messages/:id` (~1s) until terminal, appends the
   assistant message, and the **action executor** runs actions sequentially
   against the map (pan → filter → open panel), animating each step so
   serialized actions are visible.
5. A clarification answer is simply the next user message; prior messages in
   the prompt context resolve the reference. Multi-turn references ("now show
   its history") work the same way.

### Ambiguity handling (requirement 1)

- Explicit: the `ask_clarification` tool produces a question plus optional
  structured choices, rendered as tappable chips in the chat panel.
- Implicit: the model can note assumptions it made ("assuming current
  viewport"), displayed as a subtle note on the assistant message.
- Multi-turn context makes pronoun references resolvable, and unresolvable
  ones trigger clarification.

### Audit log (requirement 2)

`audit_events` written when actions are produced and when entities are
mutated. Viewable in a drawer: who did what, when, triggered by which message.
`ai_requests` complements it as the model-level audit (exact prompt, exact
response).

### Serialized actions (requirement 3)

The ordered `actions` jsonb array on assistant messages, executed sequentially
by the frontend executor. Example: "find the fastest ship, follow it and open
its details" → `filter_entities` + `fly_to` + `open_details`.

## Frontend

Single dashboard page (Inertia):

- Left sidebar: a regular chat interface with always-visible message history,
  input at the bottom, and clarification choice chips inline on assistant
  messages.
- Mapbox GL canvas filling the rest of the screen.
- Entity details side panel (right); audit log drawer.
- Active filters shown as removable chips — LLM-applied state is transparent
  and manually reversible.
- Entities polled every ~10s (TanStack Query `refetchInterval`), rendered as a
  GeoJSON source with kind/status symbology; history trails as polylines.
- Server data (entities, positions, audit events, message polling) flows
  through TanStack Query hooks; map UI state (filters, selection, trail
  visibility) lives in a small reducer the action executor dispatches into.

## Simulation

`SimulationTickJob` every 30s (Solid Queue recurring task):

- Advance moving entities along heading at speed; small random heading drift.
- Append `entity_positions`; prune rows older than 24h.
- Seeds: ~40 assets (ships/aircraft/vehicles) in one coastal region with
  distinct names, plus 24h of pre-seeded history so trails render immediately.

Cost profile: ~144k history rows/day at 30s ticks, pruned to 24h — negligible
for Postgres. Tick compute is milliseconds.

## Error handling

- OpenAI failure/timeout → message `failed`, friendly retryable error in chat.
- Malformed tool args → schema validation rejects; job asks the model once to
  correct, then fails gracefully.
- Frontend polling timeout after ~30s.
- Job retries only on transport errors; side effects idempotent per message
  (marker creation keyed to message id) so retries never double-apply.

## Testing

- **RSpec:** request specs (auth, messages, entities); unit specs for prompt
  rendering, action schema validation, tick-job movement math. OpenAI stubbed
  at the HTTP boundary (WebMock) with canned tool-call responses, including a
  serialized multi-action case and a clarification case.
- **Vitest + Testing Library:** action executor and chat panel; MSW for API
  mocks.

## README / deliverables plan

- Architecture writeup structured around the three core requirements.
- Tradeoffs section: sync vs async command processing, polling vs websockets,
  in-Puma Solid Queue, seeded vs live data, denormalizations named above.
- LLM-use disclosure section (model, role, specifications, workflow).
- Demo script for a short (<5 min) video.

## Extension points (documented, not built)

- Voice input (SpeechRecognition/Whisper).
- Live data sources: OpenSky flights, weather raster overlays as new entity
  kinds/layers.
- Multiple named conversations (schema already supports).
- Websocket push (ActionCable) replacing polling.
