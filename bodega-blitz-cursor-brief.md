# Bodega Blitz - Cursor Scaffold Brief (version-checked, June 2026)

## Directive to Cursor
Build the whole game in your head, ship it in vertical slices. Do NOT generate all files at once. Scaffold the base app, prove SpacetimeDB sync with a placeholder board, then layer claim/score, contest/pickups, spectators, Phaser sprites, and flavor. Each slice must run before the next starts. SpacetimeDB is the single source of truth for all game state. Phaser is the renderer. React owns menus/HUD/overlays. LLM flavor is non-critical and must degrade to static text.

## Concept
Session-based multiplayer NYC turf-control game. 2-4 players fight to control a 12x8 bodega-themed grid for 60-90s rounds while 0-20 spectators spend energy to trigger chaos events. Server computes scores at round end. LLMs add cat taunts and an announcer recap only.

---

## Verified tech stack (latest compatible, June 2026)

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Realtime backend | SpacetimeDB (TypeScript module) | 2.0.x | Released Feb 2026. Breaking changes vs 1.x. DB + server + sync in one. |
| CLI | `spacetime` | 2.0.x | `spacetime dev` is interactive; `--template react-ts` still works. |
| Client framework | React | 19 | Provided by the SpacetimeDB react-ts template. |
| Bundler | Vite | template-owned | Do NOT pin Vite manually. Let the template own it; add libs into it. |
| Styling | Tailwind CSS | v4.x | Via `@tailwindcss/vite` plugin. No `tailwind.config.js`. `@import "tailwindcss";` in CSS. Compatible with React 19 + Vite. |
| Canvas / sprites | Phaser | 4.1.0 ("Salusa") | Add as a library (`npm install phaser`, or pin `npm install phaser@4.1.0`), NOT via Phaser's own template. |
| Flavor worker | Node | 20 LTS or 22 | Standalone process. Groq + Gemini SDKs, OpenAI-compatible. |
| Module deploy | SpacetimeDB Maincloud | - | Host URL `https://maincloud.spacetimedb.com`. Free tier ~2,500 TeV/mo. |
| Client deploy | Vercel | - | Static SPA build. |

Runtime requirement: Node 18+ technically, but 18 is EOL. Use Node 20 LTS or 22.

### Compatibility decisions (read these, they change the scaffold)
1. One Vite app only. SpacetimeDB's `react-ts` template and Phaser's official template both produce a React+Vite app; they conflict. Base the project on the SpacetimeDB template and `npm install phaser` into it.
2. Use the current SpacetimeDB React hooks from the generated template, not a hand-rolled connection layer. Import `{ tables, reducers }` from `./module_bindings` and `{ useSpacetimeDB, useTable, useReducer }` from `spacetimedb/react`. Subscribe with `const [players, isReady] = useTable(tables.players)`; filtered subscriptions use the generated query builder shape, e.g. `tables.players.where(r => r.roomId.eq(roomId))`. Call reducers through reducer hooks, e.g. `const movePlayer = useReducer(reducers.movePlayer)` then `movePlayer({ direction })`. Use `useSpacetimeDB()` only for connection state such as `identity` and `isActive`.
3. Tailwind v4 has no config file by default. Setup is: `npm install tailwindcss @tailwindcss/vite`, add `tailwindcss()` to the Vite plugins, `@import "tailwindcss";` at the top of the main CSS. Do not scaffold a `tailwind.config.js` unless you need custom theme tokens.
4. Verify before relying on exact syntax: SpacetimeDB 2.0 scheduled-table API is documented, but the 1s tick still deserves a tiny syntax spike before scoring depends on it; use lazy elapsed-time scoring on `move`/`claim`/`end_round` as the fallback. Use `spacetime publish bodega-blitz --server maincloud` for Maincloud. Also verify Phaser 4 loader API names, since many examples online target Phaser 3.

---

## Architecture

### State ownership
- SpacetimeDB owns: room lifecycle, tile ownership, player positions, scores, timers, pickups, events, taunts, spectator energy. All writes go through reducers. Clients never mutate game state locally except for input prediction (optional).
- React owns: routing/screens, HUD, scoreboard, event feed, spectator bar, taunt bubble, menus, overlays.
- Phaser owns: the board canvas - tiles, player tokens, pickups, sprite animations, effect visuals (spill, shield, boost).
- Node flavor worker owns: calling LLMs and posting taunt/recap text back through the `post_taunt` reducer. Runs outside the game loop.

### React <-> Phaser bridge
Standard pattern. One React component mounts Phaser:
- `PhaserGame.tsx`: a `useRef` div container + `useEffect` that constructs `new Phaser.Game(config)` on mount and calls `game.destroy(true)` on unmount.
- An `EventBus` (tiny emitter, or Phaser's built-in events) passes data both ways: React pushes SpacetimeDB state snapshots into the active Scene; Phaser emits click/tap targets (tile or player) back to React, which calls the matching reducer.
- SpacetimeDB hooks live in React. On each `useTable` update, diff and forward changed rows to the Scene. Phaser does not talk to SpacetimeDB directly.

Example client hook shape:
```ts
import { tables, reducers } from './module_bindings'
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react'

const { identity, isActive: connected } = useSpacetimeDB()
const [players, playersReady] = useTable(tables.players)
const [roomPlayers] = useTable(
  tables.players.where(r => r.roomId.eq(roomId))
)

const movePlayer = useReducer(reducers.movePlayer)
const claimTile = useReducer(reducers.claimTile)

movePlayer({ direction })
claimTile({ tileId })
```

### Why this ordering
Build the board first with Phaser drawing colored rectangles (no art) so sync is provable in hours. Swap rectangles for sprites once the loop works. This keeps Phaser in from the start without blocking on assets.

---

## Repo structure
```
bodega-blitz/
  spacetimedb/
    src/index.ts            # tables + reducers (2.0 TS module)
    src/map.ts              # fixed 12x8 map layout + spawn corners
  client/
    src/main.tsx
    src/App.tsx             # screen router + connection
    src/connection.ts       # thin STDB connect/config (not a hook layer)
    src/module_bindings/    # AUTO-GENERATED, do not edit
    src/screens/            # Join, Lobby, Match, Results, Judge
    src/components/         # HUD, Scoreboard, EventFeed, SpectatorBar, TauntBubble, CountdownOverlay
    src/game/
      PhaserGame.tsx        # React<->Phaser mount + bridge
      EventBus.ts
      scenes/BoardScene.ts  # renders tiles, tokens, pickups, effects
      sprites/              # sprite class wrappers (Player, Tile, Pickup)
    public/assets/          # spritesheets, atlas json, audio
    src/index.css           # @import "tailwindcss";
  agents/
    run-flavor.ts           # worker entry, subscribes to events, posts taunts
    providers/groq.ts       # llama-3.1-8b-instant
    providers/gemini.ts     # gemini-2.5-flash-lite
    providers/static.ts     # phrases.json fallback
    phrases.json
  ASSETS.md                 # asset sources + licenses (required for submission)
  README.md  ARCHITECTURE.md  DEMO.md
```

---

## Game rules

### Lifecycle
`lobby` -> host `start_round` -> `live` (runs `ROUND_DURATION_MS = 90000`) -> server tick finalizes -> `results` -> host `rematch` -> `lobby`.

### Verbs
`move`, `claim`, `contest`, `collect`.

### Tiles
`street` (common, low value), `bodega` (rare, high value), `alley` (blocked / zero), pickups spawn on fixed cells via the `pickups` table.

### Scoring (server-authoritative)
`final_total = tile_income_total + pickup_cash_total + ownership_bonus`
- street income/tick: 1; bodega income/tick: 3
- street end bonus: 3; bodega end bonus: 10
- cash pickup: +5; coffee: speed buff (no cash); shield: defense buff (no cash)

### Contest
Adjacent enemy tile only. Starts a takeover timer. Active shield on the tile blocks/delays it. Spill on the tile lengthens it. On completion, ownership flips to attacker, an `events` row is written, optional taunt fires.

---

## Spectator design
Ship exactly 3 powers:
- `coffee_boost`: target player speed buff, 5s
- `spill_slick`: target tile hazardous/slows control, 8s
- `deli_shield`: target tile temporary defense, 6s

Economy: start energy 10, max 10, regen +1 every 3s (in tick), each power 3-5 energy, per-action cooldown 4-6s. Spectator joins by room code with `role=spectator`, sees full board + standings + energy + power buttons. Fallback if targeting UI is slow: one-tap context powers (boost leader's opponent, shield selected tile, spill last-claimed tile).

---

## LLM flavor (non-critical, verified model names)
Game must be fully playable with empty `.env`, all providers down, or no network.
- Bodega Cat (short taunts after claims/contests/power swings): Groq `llama-3.1-8b-instant` -> Gemini `gemini-2.5-flash-lite` -> `phrases.json` static.
- Announcer (one recap line on results): Gemini `gemini-2.5-flash-lite` -> Groq `llama-3.1-8b-instant` -> static templates.
- Groq endpoint is OpenAI-compatible: base URL `https://api.groq.com/openai/v1`, key `gsk_...`. Gemini via `ai.google.dev` key. Both have free tiers adequate for a demo (Groq ~30 RPM free; Gemini Flash-Lite ~15 RPM / 1000 per day free).
- Output contract: taunt <= 120 chars, max one taunt per room per 3s, LLM never sends instructions to reducers, worker posts via `post_taunt`. NVIDIA excluded.

Note: Groq lists `llama-3.1-8b-instant` as a production model and it is ideal for tiny fast taunts; if Groq deprecates it, fall to `openai/gpt-oss-120b` or `llama-3.3-70b-versatile`. Gemini 2.5 Flash-Lite exists and is positioned as the fastest budget-friendly 2.5 model, but smoke-test the exact API model string during setup. Model catalogs rotate, so the static fallback remains mandatory.

---

## SpacetimeDB schema
Tables (room_id-scoped throughout; single database, all rooms share it, scoped by `room_id`):

- `rooms`: id, code, state(lobby|live|results), host_identity, round_number, seed, starts_at_ms, ends_at_ms, created_at_ms
- `players`: id, identity, room_id, name, role(player|spectator), color, connected, joined_at_ms
- `player_state`: player_id, room_id, x, y, cash, tile_income_total, pickup_cash_total, speed_until_ms, disabled_until_ms, pigeon_blocked, last_move_at_ms, last_claim_at_ms, last_contest_at_ms
- `spectator_state`: player_id, room_id, energy, last_action_at_ms
- `tiles`: id, room_id, x, y, tile_type, owner_player_id, income_value, contested_by, contested_until_ms, shield_until_ms, spill_until_ms
- `pickups`: id, room_id, x, y, pickup_type, value, active, spawned_at_ms
- `events`: id, room_id, event_type, source_player_id, target_player_id, target_tile_id, message, created_at_ms, expires_at_ms
- `taunts`: id, room_id, speaker, target_player_id, text, model_label, created_at_ms
- `round_results`: id, room_id, round_number, player_id, tile_score, cash_score, ownership_bonus, total_score, rank
- `round_tick` (scheduled table, primary 1s tick): scheduled_id, scheduled_at, room_id. Fallback if the scheduler syntax spike fails: compute elapsed income, energy regen, buff expiry, and round-end scoring lazily when `move_player`, `claim_tile`, `trigger_spectator_event`, or `end_round` runs.

Naming: SpacetimeDB database names must match `^[a-z0-9]+(-[a-z0-9]+)*$`, so `bodega-blitz` is valid. In-game room codes like `BODEGA` are app data, unaffected.

Per-room isolation note: SpacetimeDB's docs suggest one DB per room via external orchestration for hard isolation. For this hackathon, use one DB with strict `room_id` scoping on every table and subscription. Acceptance tests must prove no cross-room leakage.

---

## Reducers
1. `register_player(name, role)` - create player; reject empty name; role in {player, spectator}.
2. `create_room()` - room in lobby; generate short code; set host identity.
3. `join_room(room_code)` - attach to room; reject if missing; reject player role if live room full.
4. `start_round(room_id)` - host only; lobby only; seed tiles; spawn players at corners; create pickups; set times; insert `round_tick`.
5. `move_player(direction)` - player only; live; rate-limited; blocked by alley/out-of-bounds; applies speed buff.
6. `claim_tile(tile_id)` - player only; adjacent only; reject+clear if pigeon-blocked; set ownership; append event.
7. `end_round(room_id)` - host/dev for testing; prod path is the tick; compute scores; write results; clear effects; set results.
8. `contest_tile(tile_id)` - player only; adjacent enemy only; start timer; blocked by shield; append event.
9. `collect_pickup(pickup_id)` - player on same cell; active only; one-time; update cash/buff.
10. `tick_round(room_id)` - scheduled reducer path; in order: ensure live; finalize if expired; add tile income to owners; regen spectator energy; expire buffs/debuffs; resolve contests; purge expired events. If the scheduled reducer spike blocks the build, preserve this behavior through lazy scoring based on elapsed time in player/spectator action reducers and `end_round`.
11. `trigger_spectator_event(event_type, target_player_id?, target_tile_id?)` - spectator only; live; energy+cooldown check; apply effect; append event; deduct energy.
12. `post_taunt(room_id, speaker, text, model_label, target_player_id?)` - insert taunt; truncate to 120; accepts static + worker posts.
13. `rematch(room_id)` - results only; clear tiles/pickups/events/taunts; keep room+players; back to lobby.
14. `reset_demo_room(room_code)` - hard reset; gated to known host/dev identity.

---

## Client plan (2.0 hooks)
Global state (minimal): identity, role, room code, room id, current screen, connection status.

Screens:
- Join: nickname, role selector, optional room code. No code -> `create_room`; code -> `join_room`.
- Lobby: room code, players + spectators, host badge, start button (host), waiting state.
- Match: Phaser board canvas, timer, local score, standings, event feed, taunt bubble, role-based controls.
- Results: ranked scores, breakdown, recap line, rematch (host).
- Judge: read-only projector view, large board, timer, feed, standings, recent taunt, no controls.

Components: HUD, Scoreboard, EventFeed, SpectatorBar, TauntBubble, CountdownOverlay (plus PhaserGame for the board).

Subscriptions (room-scoped, via generated `tables.*` query builders):
Use the tuple return shape from current hooks: `const [tiles, tilesReady] = useTable(tables.tiles.where(r => r.roomId.eq(roomId)))`.
```
rooms          WHERE code=:code
players        WHERE room_id=:id
player_state   WHERE room_id=:id
spectator_state WHERE room_id=:id
tiles          WHERE room_id=:id
pickups        WHERE room_id=:id AND active=true
events         WHERE room_id=:id
taunts         WHERE room_id=:id
round_results  WHERE room_id=:id AND round_number=:n
```

---

## Asset plan (NYC theme, Phaser sprites)

### Style and format
- Top-down 2D, pixel-art, 32x32 px per tile (clean for a 12x8 grid; bump to 64x64 only if art reads poorly). Pick one and keep it consistent.
- Ship sprites as a single texture atlas (one PNG + one JSON) loaded in Phaser's `preload`. One atlas keeps draw calls and load time low.
- Place final assets in `client/public/assets/`. Reference by atlas frame key in scenes.

### What to make (minimum set)
- Tiles: street, bodega (deli awning/storefront), alley (blocked), pickup-spawn marker. 4 frames.
- Player tokens: 1 base + recolor per player (4 colors). Idle + walk if time.
- Pickups: cash (dollar/bodega receipt), coffee cup, shield (deli shutter). 3 frames.
- Effect overlays: spill (banana/oil slick), shield glow, speed lines. 3 frames.
- Flavor: bodega cat sprite for the taunt bubble. 1 frame.
- Total MVP: ~15-20 frames.

### Where to get them (fastest -> custom)
1. CC0 packs (no attribution required, safest for submission). Kenney.nl has top-down city/roguelike tilesets and character packs that cover streets, buildings, and tokens. OpenGameArt and itch.io have CC0 urban/pixel packs. Recolor and relabel for the bodega theme.
2. Tilemap editor: build the 12x8 layout visually in Tiled, export Tiled JSON; Phaser loads Tiled maps natively. Optional but speeds up map iteration.
3. Pixel editing / recolors / custom hero sprites: Aseprite (cheap, paid) or LibreSprite / Piskel (free). Use for the bodega cat, deli awning, NYC-specific touches (pigeons, coffee cart).
4. AI generation for one-off hero art only (cat, signage). Caution: AI sprites are inconsistent in style, rarely tile cleanly, and need transparent backgrounds and hand-cleanup. Do not use AI for the tile set; use it for isolated decorative sprites at most.
5. Audio (optional, last): CC0 SFX from Kenney audio packs or freesound (check license per file).

### Pipeline
source pack -> recolor/relabel in Aseprite/Piskel -> export frames -> pack into one atlas (TexturePacker free tier, or Phaser's bundled packer / a free CLI packer) -> drop PNG+JSON into `public/assets/` -> `this.load.atlas('game', 'assets/game.png', 'assets/game.json')` in preload -> create sprites by frame key.

### Licensing discipline
Prefer CC0 to avoid attribution headaches. Track every asset (source URL + license) in `ASSETS.md`. Required for a clean hackathon submission.

### Asset sequencing (do not block the build)
Phase 1-4 use Phaser colored rectangles + text labels, zero art. Drop the atlas in during the polish phase. The game must be fully playable before any sprite exists.

---

## Build slices (vertical, run each before the next)
1. Base app: `spacetime dev --template react-ts bodega-blitz`; add Tailwind v4 (`@tailwindcss/vite`); `npm install phaser`; render an empty `PhaserGame` canvas next to a React shell. One Vite app runs, one Maincloud publish succeeds.
2. Room sync: `register_player`, `create_room`, `join_room`, `start_round`; Join + Lobby screens; Phaser draws the 12x8 grid as rectangles; `move_player` works across two tabs (both see movement).
3. Claim + results: `claim_tile`, manual `end_round`; ownership color in Phaser; timer + score HUD; Results screen; two clients agree on winner.
4. Scoring + auto-end: first spike the documented scheduled reducer syntax; then use `round_tick` + `tick_round` for tile income, ownership bonus, and auto round expiration. If the spike fails, use lazy scoring based on elapsed time when action reducers or `end_round` run. Short test round ends itself or finalizes correctly through the fallback; manual math matches server.
5. Contest + pickups: `contest_tile`, `collect_pickup`; event rows for major actions; contest flips once, pickup collects once.
6. Spectators: `spectator_state`, `trigger_spectator_event`, tick energy regen, all 3 powers, EventFeed, SpectatorBar; cooldown/energy block spam; spectator cannot call player reducers.
7. Judge screen + resilience: projector view; refresh/reconnect resyncs; no cross-room subscription leakage.
8. Phaser sprites: load atlas, replace rectangles with tile/token/pickup/effect sprites, add idle/walk and effect animations.
9. Flavor: `phrases.json` + static worker + `post_taunt` + TauntBubble + recap. Works with empty `.env`. Add Groq then Gemini routing only after static path works.
10. Polish: theme, countdown, basic SFX, winner state, mobile touch controls, `rematch`.

---

## Commands

Scaffold (macOS / zsh):
```sh
curl -sSf https://install.spacetimedb.com | sh
spacetime login
spacetime dev bodega-blitz --template react-ts --server maincloud
cd bodega-blitz
npm install -D tailwindcss @tailwindcss/vite
npm install phaser
```
Tailwind wiring: add `tailwindcss()` to the Vite plugins array, then `@import "tailwindcss";` at the top of `src/index.css`.

Local dev (from project root):
```sh
spacetime dev
spacetime logs
spacetime sql "SELECT * FROM rooms"
```

Publish to Maincloud:
```sh
spacetime publish bodega-blitz --server maincloud
```
Client points at `https://maincloud.spacetimedb.com` with database name `bodega-blitz`.

Flavor worker:
```sh
node agents/run-flavor.ts
```

---

## Acceptance tests
Core: 4 players join one room; spectators join in lobby and live; movement+claim stay consistent across clients; contest resolves exactly once; pickups never duplicate; auto timer ends the round; results match server math.
Spectator: energy drains+regens correctly; cooldown blocks spam; boost/shield/spill visibly change outcomes; spectator cannot call player-only reducers.
Resilience: refresh during a live round resyncs; empty LLM keys still produce flavor via static; a failed worker does not affect gameplay; no cross-room state leakage; Maincloud cold-wake tested before demo.

## Cut order (top-down if behind)
Groq, Gemini, extra powers beyond 3, pickups beyond one cash + one coffee, custom sprites (fall back to colored rectangles), mobile touch polish, SFX, advanced animations, rematch polish, anything invisible in the judge demo.
Never cut: join/create room, live synced movement, claim, timer, server score calc, results screen, 3 spectator powers, event feed, judge screen, static taunts.

## Open items to verify at build time (do not assume)
- SpacetimeDB 2.0 scheduled-table / scheduled-reducer exact syntax for the 1s tick, via a tiny spike before scoring depends on it.
- LLM provider smoke tests: Groq `llama-3.1-8b-instant`, Gemini 2.5 Flash-Lite exact API model string, and static fallback with empty `.env`.
- Phaser 4 loader/atlas API names (minor renames vs Phaser 3 tutorials).
- Tailwind v4 + the template's bundled Vite version play nice (they should; confirm classes render).
