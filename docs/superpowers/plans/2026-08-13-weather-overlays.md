# Weather Overlays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users show OpenWeather raster overlays (temperature, precipitation, wind, pressure, clouds) on the tactical map via typed commands ("show me weather overlays for the current zoom window") or a Weather panel opened from a toolbar button next to Audit log. Commands auto-open the panel and set the overlay.

**Architecture:** A new client-executed command tool `set_weather_overlay` flows through the existing pipeline (CommandTools → ApplyActions → actions JSON → `executeActions` → `mapReducer`). A Rails controller proxies OpenWeather Maps 1.0 tiles so the API key stays server-side, with public cache headers so the browser caches tiles. MapCanvas renders the active layer as a Mapbox raster layer inserted beneath all contact/trail layers. A floating WeatherPanel (styled like EntityPanel) lists layers plus a legend.

**Tech Stack:** Rails 8 (Net::HTTP, no new gems), Mapbox GL raster source, React 19 + existing reducer/executor pattern, RSpec + WebMock, Vitest + Testing Library.

**Spec:** No spec file — bounded change; design approved in chat 2026-08-13 (summarized above).

## Global Constraints

- No new gems or npm packages. Use `Net::HTTP` (stdlib) for the proxy.
- Frontend style matches this repo: 2-space indent, single quotes, no semicolons, arrow-function components.
- The OpenWeather key lives in `.env` as `OPENWEATHER_API_KEY` and must never reach the client. (`.env` is loaded by overmind/hivemind via `bin/dev`; the user creates the key — free tier.)
- User-facing layer names are `temperature | precipitation | wind | pressure | clouds`; the OWM tile names (`temp_new`, …) appear only inside the tile proxy controller.
- Backend tests: `bundle exec rspec <path>`. Frontend tests: `pnpm test <path>`. Typecheck: `pnpm check`.
- Do NOT commit — the user handles commits themselves.
- Free-tier Maps 1.0 only: current conditions, no time slider.

---

### Task 1: `set_weather_overlay` command tool + prompt rule

**Files:**
- Create: `app/tools/command_tools/set_weather_overlay.rb`
- Modify: `app/tools/command_tools.rb:3` (register tool)
- Modify: `app/prompts/command_prompt.rb` (add rule line to `SYSTEM`)
- Test: `spec/tools/command_tools_spec.rb`

**Interfaces:**
- Consumes: `CommandTools` registry conventions (`NAME`, `SCHEMA`, `validate`, no `execute` = client-executed).
- Produces: action `{ "type" => "set_weather_overlay", "layer" => <one of temperature|precipitation|wind|pressure|clouds|none> }` reaching the frontend via `Message#actions`. Task 4 consumes this exact shape.

- [ ] **Step 1: Write the failing tests**

In `spec/tools/command_tools_spec.rb`, update the schema count test and add validation tests:

```ruby
  describe '.schemas' do
    it 'defines all nine tools' do
      names = described_class.schemas.map { |s| s[:function][:name] }
      expect(names).to contain_exactly(
        'fly_to', 'filter_entities', 'place_marker', 'show_history',
        'open_details', 'clear_filters', 'ask_clarification', 'search_entities',
        'set_weather_overlay'
      )
    end
  end
```

Add to the `.validate` describe block:

```ruby
    it 'accepts set_weather_overlay with a known layer' do
      expect(described_class.validate('set_weather_overlay', { 'layer' => 'temperature' })).to be_empty
      expect(described_class.validate('set_weather_overlay', { 'layer' => 'none' })).to be_empty
    end

    it 'rejects set_weather_overlay with a missing or unknown layer' do
      expect(described_class.validate('set_weather_overlay', {})).not_to be_empty
      expect(described_class.validate('set_weather_overlay', { 'layer' => 'lava' }))
        .to include(a_string_matching(/layer/))
    end
```

Add to the `.server_executed?` false-case test:

```ruby
      expect(described_class.server_executed?('set_weather_overlay')).to be(false)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bundle exec rspec spec/tools/command_tools_spec.rb`
Expected: FAIL — schemas count mismatch and `unknown tool: set_weather_overlay`.

- [ ] **Step 3: Implement the tool and register it**

Create `app/tools/command_tools/set_weather_overlay.rb`:

```ruby
module CommandTools
  class SetWeatherOverlay
    NAME = "set_weather_overlay".freeze
    LAYERS = %w[temperature precipitation wind pressure clouds none].freeze
    SCHEMA = {
      type: "function",
      function: {
        name: NAME,
        description: "Show a weather overlay on the map, or hide it with layer 'none'. " \
                     "The overlay covers whatever the map shows, including the current zoom window.",
        parameters: {
          type: "object",
          properties: { layer: { type: "string", enum: LAYERS } },
          required: [ "layer" ]
        }
      }
    }.freeze

    def self.validate(args)
      LAYERS.include?(args["layer"]) ? [] : [ "set_weather_overlay layer must be one of: #{LAYERS.join(', ')}" ]
    end
  end
end
```

In `app/tools/command_tools.rb`, extend the registry:

```ruby
  def self.all
    [ FlyTo, FilterEntities, PlaceMarker, ShowHistory, OpenDetails, ClearFilters,
      AskClarification, SearchEntities, SetWeatherOverlay ]
  end
```

- [ ] **Step 4: Add the prompt rule**

In `app/prompts/command_prompt.rb`, append to the `SYSTEM` heredoc's rule list (before the final "Always include a short reply" line):

```
    - For weather requests, call set_weather_overlay. Layers: temperature,
      precipitation, wind, pressure, clouds. If the user asks for "weather"
      without naming a layer, default to temperature and say so in your reply.
      Use layer "none" when the user asks to hide weather.
```

- [ ] **Step 5: Run backend tests to verify they pass**

Run: `bundle exec rspec spec/tools/command_tools_spec.rb spec/prompts/command_prompt_spec.rb spec/services`
Expected: PASS (prompt and services specs confirm no regression from the prompt edit).

---

### Task 2: Weather tile proxy endpoint

**Files:**
- Create: `app/controllers/weather_tiles_controller.rb`
- Modify: `config/routes.rb` (add route after `resources :audit_events`)
- Test: `spec/requests/weather_tiles_spec.rb`

**Interfaces:**
- Consumes: `ENV["OPENWEATHER_API_KEY"]`, session auth from `ApplicationController` (browser tile fetches are same-origin so cookies flow automatically).
- Produces: `GET /weather/tiles/:layer/:z/:x/:y` → PNG bytes with `Cache-Control: public, max-age=1800`. Task 5's Mapbox tile template consumes this URL shape with user-facing layer names.

- [ ] **Step 1: Write the failing request spec**

Create `spec/requests/weather_tiles_spec.rb`:

```ruby
require 'rails_helper'

RSpec.describe 'Weather tiles proxy', type: :request do
  let(:user) { create(:user) }

  around do |example|
    original = ENV['OPENWEATHER_API_KEY']
    ENV['OPENWEATHER_API_KEY'] = 'test-key'
    example.run
    ENV['OPENWEATHER_API_KEY'] = original
  end

  before do
    post session_path, params: { email_address: user.email_address, password: 'password123' }
  end

  it 'proxies a known layer to OpenWeather and returns the tile with cache headers' do
    stub_request(:get, 'https://tile.openweathermap.org/map/temp_new/3/2/1.png')
      .with(query: { appid: 'test-key' })
      .to_return(status: 200, body: 'PNGBYTES', headers: { 'Content-Type' => 'image/png' })

    get '/weather/tiles/temperature/3/2/1'

    expect(response).to have_http_status(:ok)
    expect(response.body).to eq('PNGBYTES')
    expect(response.headers['Content-Type']).to include('image/png')
    expect(response.headers['Cache-Control']).to include('public')
  end

  it 'maps every user-facing layer to its OpenWeather tile name' do
    {
      'precipitation' => 'precipitation_new', 'wind' => 'wind_new',
      'pressure' => 'pressure_new', 'clouds' => 'clouds_new'
    }.each do |layer, owm|
      stub = stub_request(:get, "https://tile.openweathermap.org/map/#{owm}/1/0/0.png")
        .with(query: { appid: 'test-key' }).to_return(status: 200, body: 'x')
      get "/weather/tiles/#{layer}/1/0/0"
      expect(stub).to have_been_requested
    end
  end

  it 'returns 404 for unknown layers without calling OpenWeather' do
    get '/weather/tiles/lava/3/2/1'
    expect(response).to have_http_status(:not_found)
  end

  it 'returns 502 when OpenWeather fails' do
    stub_request(:get, %r{tile\.openweathermap\.org}).to_return(status: 500)
    get '/weather/tiles/temperature/3/2/1'
    expect(response).to have_http_status(:bad_gateway)
  end

  it 'redirects unauthenticated requests to sign-in' do
    delete session_path
    get '/weather/tiles/temperature/3/2/1'
    expect(response).to redirect_to(new_session_path)
  end
end
```

- [ ] **Step 2: Run spec to verify it fails**

Run: `bundle exec rspec spec/requests/weather_tiles_spec.rb`
Expected: FAIL with routing error (no route matches).

- [ ] **Step 3: Add route and controller**

In `config/routes.rb`, after the `resources :audit_events` line:

```ruby
  get "weather/tiles/:layer/:z/:x/:y", to: "weather_tiles#show",
      constraints: { z: /\d+/, x: /\d+/, y: /\d+/ }
```

Create `app/controllers/weather_tiles_controller.rb`:

```ruby
require "net/http"

class WeatherTilesController < ApplicationController
  OWM_LAYERS = {
    "temperature" => "temp_new",
    "precipitation" => "precipitation_new",
    "wind" => "wind_new",
    "pressure" => "pressure_new",
    "clouds" => "clouds_new"
  }.freeze

  def show
    owm_layer = OWM_LAYERS[params[:layer]]
    return head :not_found unless owm_layer

    tile = fetch_tile(owm_layer)
    return head :bad_gateway unless tile.is_a?(Net::HTTPSuccess)

    expires_in 30.minutes, public: true
    send_data tile.body, type: "image/png", disposition: "inline"
  end

  private

  def fetch_tile(owm_layer)
    uri = URI("https://tile.openweathermap.org/map/#{owm_layer}/#{params[:z]}/#{params[:x]}/#{params[:y]}.png")
    uri.query = { appid: ENV.fetch("OPENWEATHER_API_KEY", "") }.to_query
    Net::HTTP.get_response(uri)
  rescue SocketError, Timeout::Error, Errno::ECONNREFUSED
    nil
  end
end
```

- [ ] **Step 4: Run spec to verify it passes**

Run: `bundle exec rspec spec/requests/weather_tiles_spec.rb`
Expected: PASS.

---

### Task 3: Weather constants, types, and reducer state

**Files:**
- Create: `app/frontend/lib/weather.ts`
- Modify: `app/frontend/lib/types.ts` (extend `Action` union)
- Modify: `app/frontend/lib/mapReducer.ts` (state + two actions)
- Test: `app/frontend/lib/__tests__/mapReducer.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `WeatherLayer` type and `WEATHER_LAYERS` / `WEATHER_LAYER_META` constants; `MapUIState.weatherLayer: WeatherLayer | null`, `MapUIState.weatherPanelOpen: boolean`; reducer actions `{ type: 'setWeatherLayer'; layer: WeatherLayer | null }` and `{ type: 'toggleWeatherPanel' }`; `Action` union member `{ type: 'set_weather_overlay'; layer: WeatherLayer | 'none' }`. Tasks 4–6 use these exact names.

- [ ] **Step 1: Write the failing reducer tests**

Add to `app/frontend/lib/__tests__/mapReducer.test.ts` inside `describe('mapReducer')`:

```ts
  it('setWeatherLayer sets the layer and opens the panel', () => {
    const state = mapReducer(initialMapUIState, { type: 'setWeatherLayer', layer: 'temperature' })
    expect(state.weatherLayer).toBe('temperature')
    expect(state.weatherPanelOpen).toBe(true)
  })

  it('setWeatherLayer with null clears the layer and leaves the panel state alone', () => {
    const open = mapReducer(initialMapUIState, { type: 'setWeatherLayer', layer: 'wind' })
    const cleared = mapReducer(open, { type: 'setWeatherLayer', layer: null })
    expect(cleared.weatherLayer).toBeNull()
    expect(cleared.weatherPanelOpen).toBe(true)
  })

  it('toggleWeatherPanel flips panel visibility without touching the layer', () => {
    const open = mapReducer(initialMapUIState, { type: 'toggleWeatherPanel' })
    expect(open.weatherPanelOpen).toBe(true)
    expect(open.weatherLayer).toBeNull()
    expect(mapReducer(open, { type: 'toggleWeatherPanel' }).weatherPanelOpen).toBe(false)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test app/frontend/lib/__tests__/mapReducer.test.ts`
Expected: FAIL (TypeScript errors on unknown action types count as failure here).

- [ ] **Step 3: Create the weather module**

Create `app/frontend/lib/weather.ts` (gradients approximate OpenWeather's documented palettes; legends are illustrative, not data-derived):

```ts
export const WEATHER_LAYERS = ['temperature', 'precipitation', 'wind', 'pressure', 'clouds'] as const
export type WeatherLayer = (typeof WEATHER_LAYERS)[number]

export interface WeatherLayerMeta {
  label: string
  gradient: string
  minLabel: string
  maxLabel: string
}

export const WEATHER_LAYER_META: Record<WeatherLayer, WeatherLayerMeta> = {
  temperature: {
    label: 'Temperature',
    gradient: 'linear-gradient(to right, #821692, #8257db, #208cec, #23dddd, #c2ff28, #fff028, #fc8014, #c00000)',
    minLabel: '-40 °C',
    maxLabel: '40 °C',
  },
  precipitation: {
    label: 'Precipitation',
    gradient: 'linear-gradient(to right, rgba(120, 120, 190, 0), #7878be, #505dd0, #38a5f0, #4098ff)',
    minLabel: '0 mm',
    maxLabel: '60 mm',
  },
  wind: {
    label: 'Wind speed',
    gradient: 'linear-gradient(to right, rgba(238, 206, 206, 0), #eececc, #b364bc, #744cac, #4600af)',
    minLabel: '0 m/s',
    maxLabel: '100 m/s',
  },
  pressure: {
    label: 'Pressure',
    gradient: 'linear-gradient(to right, #0073ff, #4bd0d6, #b0f720, #f0b800, #fb5515, #f31d64, #742cb0)',
    minLabel: '950 hPa',
    maxLabel: '1070 hPa',
  },
  clouds: {
    label: 'Clouds',
    gradient: 'linear-gradient(to right, rgba(253, 253, 255, 0), rgba(245, 245, 255, 0.7), #f0f0ff)',
    minLabel: '0 %',
    maxLabel: '100 %',
  },
}
```

- [ ] **Step 4: Extend the Action union**

In `app/frontend/lib/types.ts`, add at the top:

```ts
import type { WeatherLayer } from '@/lib/weather'
```

and add the union member to `Action`:

```ts
  | { type: 'set_weather_overlay'; layer: WeatherLayer | 'none' }
```

- [ ] **Step 5: Extend the reducer**

In `app/frontend/lib/mapReducer.ts`, import the type:

```ts
import type { WeatherLayer } from '@/lib/weather'
```

Add to `MapUIState`:

```ts
  weatherLayer: WeatherLayer | null
  weatherPanelOpen: boolean
```

Add to `initialMapUIState`:

```ts
  weatherLayer: null,
  weatherPanelOpen: false,
```

Add to `MapUIAction`:

```ts
  | { type: 'setWeatherLayer'; layer: WeatherLayer | null }
  | { type: 'toggleWeatherPanel' }
```

Add cases to `mapReducer`:

```ts
    case 'setWeatherLayer':
      return {
        ...state,
        weatherLayer: action.layer,
        weatherPanelOpen: action.layer ? true : state.weatherPanelOpen,
      }
    case 'toggleWeatherPanel':
      return { ...state, weatherPanelOpen: !state.weatherPanelOpen }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test app/frontend/lib/__tests__/mapReducer.test.ts`
Expected: PASS. Note: `pnpm check` will fail until Task 4 adds the `ACTION_LABELS` entry and executor case for the new `Action` member — that is expected; don't "fix" it here.

---

### Task 4: Executor case + chat action label

**Files:**
- Modify: `app/frontend/lib/executeActions.ts` (new switch case)
- Modify: `app/frontend/components/ChatSidebar.tsx:16-24` (`ACTION_LABELS` entry)
- Test: `app/frontend/lib/__tests__/executeActions.test.ts`

**Interfaces:**
- Consumes: `Action` member `set_weather_overlay` (Task 3), reducer action `setWeatherLayer` (Task 3).
- Produces: executing `{ type: 'set_weather_overlay', layer }` dispatches `{ type: 'setWeatherLayer', layer: <layer or null> }`; chat renders the action chip label `'set weather'`.

- [ ] **Step 1: Write the failing executor tests**

Add to `app/frontend/lib/__tests__/executeActions.test.ts` inside `describe('executeActions')`:

```ts
  it('set_weather_overlay dispatches setWeatherLayer with the layer', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'set_weather_overlay', layer: 'precipitation' }], deps)
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'setWeatherLayer', layer: 'precipitation' })
  })

  it('set_weather_overlay with none clears the layer', async () => {
    const deps = makeDeps()
    await executeActions([{ type: 'set_weather_overlay', layer: 'none' }], deps)
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'setWeatherLayer', layer: null })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test app/frontend/lib/__tests__/executeActions.test.ts`
Expected: FAIL (dispatch never called with `setWeatherLayer`).

- [ ] **Step 3: Implement the executor case and label**

In `app/frontend/lib/executeActions.ts`, add a case to `applyAction` before `ask_clarification`:

```ts
    case 'set_weather_overlay':
      deps.dispatch({
        type: 'setWeatherLayer',
        layer: action.layer === 'none' ? null : action.layer,
      })
      return
```

In `app/frontend/components/ChatSidebar.tsx`, add to `ACTION_LABELS`:

```ts
  set_weather_overlay: 'set weather',
```

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `pnpm test app/frontend/lib/__tests__/executeActions.test.ts && pnpm check`
Expected: PASS, typecheck clean (the exhaustive `Record<Action['type'], …>` and switch now cover the new member).

---

### Task 5: Weather raster layer in MapCanvas

**Files:**
- Modify: `app/frontend/components/MapCanvas.tsx`

**Interfaces:**
- Consumes: tile proxy URL shape `/weather/tiles/:layer/{z}/{x}/{y}` (Task 2), `WeatherLayer` type (Task 3).
- Produces: MapCanvas prop `weatherLayer: WeatherLayer | null` (Task 6's Dashboard wiring passes `state.weatherLayer`).

There is no unit test for MapCanvas (the existing component has none — Mapbox GL doesn't run under jsdom). Verification is `pnpm check` plus the manual check in Task 7.

- [ ] **Step 1: Add the prop**

In `app/frontend/components/MapCanvas.tsx`, import the type and extend `Props`:

```ts
import type { WeatherLayer } from '@/lib/weather'
```

```ts
interface Props {
  mapboxToken: string
  entities: Entity[]
  trailPositions: { lat: number; lng: number }[]
  selectedEntityId: number | null
  weatherLayer: WeatherLayer | null
  onEntityClick: (entityId: number) => void
  onMapReady: (map: mapboxgl.Map) => void
  onMoveEnd: (bounds: [number, number, number, number]) => void
}
```

Add `weatherLayer` to the destructured props in the component signature.

- [ ] **Step 2: Add the layer-sync helper and effect**

Add above the component (next to the other module-level helpers):

```ts
const WEATHER_SOURCE = 'weather-tiles'

// Inserted before trail-halo (the lowest overlay layer) so weather sits on the
// basemap but under every track, leader and label.
const syncWeatherLayer = (map: mapboxgl.Map, layer: WeatherLayer | null) => {
  if (map.getLayer(WEATHER_SOURCE)) map.removeLayer(WEATHER_SOURCE)
  if (map.getSource(WEATHER_SOURCE)) map.removeSource(WEATHER_SOURCE)
  if (!layer) return
  map.addSource(WEATHER_SOURCE, {
    type: 'raster',
    tiles: [`/weather/tiles/${layer}/{z}/{x}/{y}`],
    tileSize: 256,
    attribution: 'Weather © OpenWeather',
  })
  map.addLayer(
    { id: WEATHER_SOURCE, type: 'raster', source: WEATHER_SOURCE, paint: { 'raster-opacity': 0.55 } },
    'trail-halo',
  )
}
```

Add an effect after the existing `selectedEntityId` effect:

```ts
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    syncWeatherLayer(mapRef.current, weatherLayer)
  }, [weatherLayer])
```

(`weatherLayer` is `null` on mount, so nothing needs to run inside the `load` handler — the effect only ever fires after `loadedRef` is set.)

- [ ] **Step 3: Typecheck**

Run: `pnpm check`
Expected: one error — Dashboard.tsx missing the new required `weatherLayer` prop. That is Task 6's job; anything else here must be fixed now. If executing Tasks 5+6 in one sitting, defer the typecheck to Task 6 Step 5.

---

### Task 6: WeatherPanel, toolbar button, Dashboard wiring

**Files:**
- Create: `app/frontend/components/WeatherPanel.tsx`
- Modify: `app/frontend/components/MapToolbar.tsx` (Weather button next to Audit log)
- Modify: `app/frontend/pages/Dashboard.tsx` (wire panel, toolbar, MapCanvas prop)
- Modify: `app/frontend/components/ChatSidebar.tsx:26-30` (add weather example chip)
- Test: `app/frontend/components/__tests__/WeatherPanel.test.tsx`

**Interfaces:**
- Consumes: `WEATHER_LAYERS`, `WEATHER_LAYER_META`, `WeatherLayer` (Task 3); reducer actions `setWeatherLayer` / `toggleWeatherPanel` (Task 3); MapCanvas `weatherLayer` prop (Task 5).
- Produces: `WeatherPanel` props `{ activeLayer: WeatherLayer | null; onSelect: (layer: WeatherLayer | null) => void; onClose: () => void }`; `MapToolbar` gains props `{ weatherOpen: boolean; weatherActive: boolean; onToggleWeather: () => void }`.

- [ ] **Step 1: Write the failing component test**

Create `app/frontend/components/__tests__/WeatherPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeatherPanel from '@/components/WeatherPanel'

describe('WeatherPanel', () => {
  it('lists all five layers and an off row', () => {
    render(<WeatherPanel activeLayer={null} onSelect={() => {}} onClose={() => {}} />)
    for (const label of ['Temperature', 'Precipitation', 'Wind speed', 'Pressure', 'Clouds', 'Off']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks the active layer and shows its legend range', () => {
    render(<WeatherPanel activeLayer="temperature" onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Temperature' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('-40 °C')).toBeInTheDocument()
    expect(screen.getByText('40 °C')).toBeInTheDocument()
  })

  it('hides the legend when no layer is active', () => {
    render(<WeatherPanel activeLayer={null} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.queryByText('-40 °C')).not.toBeInTheDocument()
  })

  it('selects a layer, clears with Off, and closes', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<WeatherPanel activeLayer="temperature" onSelect={onSelect} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Precipitation' }))
    expect(onSelect).toHaveBeenCalledWith('precipitation')
    await userEvent.click(screen.getByRole('button', { name: 'Off' }))
    expect(onSelect).toHaveBeenCalledWith(null)
    await userEvent.click(screen.getByRole('button', { name: 'Close weather panel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/frontend/components/__tests__/WeatherPanel.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement WeatherPanel**

Create `app/frontend/components/WeatherPanel.tsx`:

```tsx
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
```

- [ ] **Step 4: Add the toolbar button and wire Dashboard**

In `app/frontend/components/MapToolbar.tsx`:
- Change the lucide import to `import { CloudSun, ScrollText } from 'lucide-react'`.
- Add to `Props` and the destructured parameters:

```ts
  weatherOpen: boolean
  weatherActive: boolean
  onToggleWeather: () => void
```

- Insert this button directly BEFORE the existing Audit log button:

```tsx
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
```

In `app/frontend/pages/Dashboard.tsx`:
- Add `import WeatherPanel from '@/components/WeatherPanel'`.
- Pass the new MapToolbar props:

```tsx
          weatherOpen={state.weatherPanelOpen}
          weatherActive={state.weatherLayer !== null}
          onToggleWeather={() => dispatch({ type: 'toggleWeatherPanel' })}
```

- Pass `weatherLayer={state.weatherLayer}` to `MapCanvas`.
- Render the panel inside the `relative` map container, after the `EntityPanel` block:

```tsx
          {state.weatherPanelOpen && (
            <WeatherPanel
              activeLayer={state.weatherLayer}
              onSelect={(layer) => dispatch({ type: 'setWeatherLayer', layer })}
              onClose={() => dispatch({ type: 'toggleWeatherPanel' })}
            />
          )}
```

In `app/frontend/components/ChatSidebar.tsx`, add to `EXAMPLES`:

```ts
  'show me weather overlays for the current zoom window',
```

- [ ] **Step 5: Run the full frontend suite and typecheck**

Run: `pnpm test && pnpm check`
Expected: PASS, no type errors (the Task 5 dangling prop error is now resolved).

---

### Task 7: Env key, README, manual end-to-end check

**Files:**
- Modify: `.env` (user-supplied key)
- Modify: `README.md` (setup + architecture notes)

- [ ] **Step 1: Add the API key**

Sign up at https://home.openweathermap.org/users/sign_up (free tier) and add to `.env`:

```
OPENWEATHER_API_KEY=<your key>
```

Note: OpenWeather activates new keys asynchronously — allow up to ~1 hour before tiles return 200. Restart `bin/dev` after editing `.env`.

- [ ] **Step 2: Document in README**

Add `OPENWEATHER_API_KEY` to the README's environment/setup list, and add a short subsection to the architecture section:

```markdown
### Weather overlays

"Show me weather overlays for the current zoom window" is handled by the
`set_weather_overlay` tool. It is client-executed like `fly_to`: the LLM emits
the action, the browser reducer stores the active layer and opens the Weather
panel, and MapCanvas renders it as a Mapbox raster layer under the tactical
layers. Tiles come from OpenWeather Maps 1.0 via a Rails proxy
(`/weather/tiles/:layer/:z/:x/:y`) so the API key never reaches the client;
the proxy sets `Cache-Control: public, max-age=1800` so the browser caches
tiles. The free tier serves current conditions only, so there is no forecast
time slider. The Weather toolbar button toggles the same panel the command
auto-opens.
```

- [ ] **Step 3: Manual end-to-end verification**

Run `bin/dev`, sign in, then check:
1. Toolbar Weather button opens/closes the panel; selecting Temperature shows the heatmap under tracks/labels; legend renders; Off removes it.
2. Command "show me weather overlays for the current zoom window" → reply mentions defaulting to temperature, panel auto-opens, overlay appears.
3. "show precipitation instead" swaps the layer; "hide the weather" clears it.
4. Audit log drawer shows `set_weather_overlay` events.
5. Network tab: tile requests hit `/weather/tiles/...` (no `appid` visible) and repeat pans serve from browser cache.

- [ ] **Step 4: Full test pass**

Run: `bundle exec rspec && pnpm test && pnpm check`
Expected: all green.
