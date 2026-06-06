# Bodega Blitz Checklist

Living progress tracker for the project. Check items off as they land (`- [x]`). Leave pending items unchecked (`- [ ]`).

Last updated: June 6, 2026 (Wave 0 complete — spine + mocked UI [Dev E] + assets/flavor stubs [Dev D] merged; spikes verified. Entering Wave 1 — room sync.)

---

## Phase 0 — Scaffold & team baseline

Goal: every teammate can clone, connect locally, and prove shared state sync before gameplay work starts.

### Repo & tooling

- [x] Git repo initialized and pushed
- [x] SpacetimeDB `react-ts` template scaffold in place
- [x] Root `npm install` + `spacetimedb/` module deps
- [x] `spacetime.json` / local dev config
- [x] Generated `src/module_bindings/` (do not edit by hand)
- [x] Vite + React client runs (`npm run dev`)
- [x] `npm test` scaffold verification script passes
- [x] `.env.example` with local-first defaults
- [x] Publish scripts (`spacetime:publish`, `spacetime:publish:local`)

### SpacetimeDB round-trip proof

- [x] `sync_state` table (public, single row)
- [x] `set_value` reducer with validation
- [x] `init` seeds `first-pipe-online`
- [x] Client uses `SpacetimeDBProvider` + `useSpacetimeDB`
- [x] Client subscribes via `useTable(tables.sync_state)`
- [x] Client calls reducer through typed `conn.reducers.setValue`
- [x] Local host default (`ws://127.0.0.1:3000`)

### Renderer stack (early install)

- [x] `phaser@4.1.0` installed
- [x] Phaser import verified in client (`DevSync` mounts `PhaserGame`)
- [x] `PhaserGame.tsx` mounts a live Phaser canvas
- [x] React ↔ Phaser `EventBus` bridge

### Styling

- [x] Tailwind CSS v4 via `@tailwindcss/vite`
- [x] `@import "tailwindcss";` in main CSS
- [x] Interim custom CSS for Phase 0 UI (kept beneath the Tailwind import)

### Documentation

- [x] `README.md` — Phase 0 status, setup, verification
- [x] `docs/SETUP.md` — onboarding checklist
- [x] `docs/TROUBLESHOOTING.md` — common failures
- [x] `bodega-blitz-cursor-brief.md` — full game spec
- [x] `docs/checklist.md` — this file
- [x] `docs/spike-findings.md` — Dev C filtered `useTable` + scheduled `round_tick` findings
- [ ] `ARCHITECTURE.md`
- [ ] `DEMO.md`
- [x] `ASSETS.md`

### Team verification (manual)

- [ ] All teammates run `spacetime dev` successfully
- [ ] Two-tab shared value sync confirmed by whole team
- [ ] Maincloud smoke test (`spacetime publish bodega-blitz --server maincloud`)

---

## Build slices (vertical — finish each before starting the next)

From `bodega-blitz-cursor-brief.md`. Each slice must run before the next begins.

### Slice 1 — Base app

- [x] One Vite app on SpacetimeDB template (not Phaser template)
- [x] Phaser added as a library dependency
- [x] Tailwind v4 wired into Vite
- [x] Empty `PhaserGame` canvas beside React shell
- [ ] One Maincloud publish succeeds (local publish verified)

### Slice 2 — Room sync

- [ ] Game schema replaces `sync_state` (`rooms`, `players`, `player_state`, `tiles`, …) — _tables scaffolded alongside `sync_state`; `sync_state` still drives the dev round-trip_
- [ ] `register_player`, `create_room`, `join_room`, `start_round` reducers — _signatures scaffolded; bodies throw `not implemented`_
- [ ] `spacetimedb/src/map.ts` — 28x20 layout + spawn corners — _dimensions + spawn corners are in place; full live room sync still pending_
- [ ] Join screen (nickname, role, optional room code)
- [ ] Lobby screen (code, roster, host start button)
- [x] Phaser renders the 28x20 mock board in isometric projection
- [ ] `move_player` works across two tabs

### Slice 3 — Claim + results

- [ ] `claim_tile` reducer (adjacent only)
- [ ] Manual `end_round` reducer
- [ ] Tile ownership colors in Phaser
- [ ] Timer + score HUD
- [ ] Results screen
- [ ] Two clients agree on winner

### Slice 4 — Scoring + auto-end

- [x] Scheduled-table / `tick_round` spike verified — _integration into live module pending Slice 4 (see `docs/spike-findings.md`); lazy fallback still valid if needed_
- [ ] Tile income per tick (street 1, bodega 3)
- [ ] Ownership bonus at round end
- [ ] Auto round expiration (~90s)
- [ ] Manual math matches server results

### Slice 5 — Contest + pickups

- [ ] `contest_tile` reducer (adjacent enemy, shield/spill interaction)
- [ ] `collect_pickup` reducer
- [ ] `pickups` table + spawn on map cells
- [ ] Event rows for major actions
- [ ] Contest flips exactly once; pickup collects exactly once

### Slice 6 — Spectators

- [ ] `spectator_state` table + energy economy
- [ ] `trigger_spectator_event` reducer
- [ ] All 3 powers: `coffee_boost`, `spill_slick`, `deli_shield`
- [ ] Tick energy regen (+1 every 3s)
- [ ] Cooldown / energy blocks spam
- [ ] `EventFeed` + `SpectatorBar` components
- [ ] Spectator cannot call player-only reducers

### Slice 7 — Judge + resilience

- [ ] Judge screen (read-only projector view)
- [ ] Refresh / reconnect resyncs mid-round
- [ ] No cross-room subscription leakage

### Slice 8 — Phaser sprites

- [x] Texture atlas in `public/assets/` — _Kenney `game.png` + `game.json` ship and load through `BoardScene`_
- [x] Replace fallback rectangles with atlas-backed tile / pickup / FX rendering where available
- [x] Effect overlays (spill, shield, speed)
- [ ] Idle / walk animations (if time)

### Slice 9 — LLM flavor

- [x] `agents/phrases.json` static fallback
- [x] `agents/run-flavor.ts` worker — _stub; standalone dry-run passes (4 taunts + 1 recap via static), no STDB wiring yet_
- [ ] `post_taunt` reducer + `TauntBubble` component
- [ ] Game fully playable with empty `.env`
- [x] Groq provider (`llama-3.1-8b-instant`) — _provider stub present; live model smoke test pending (see Open spikes)_
- [x] Gemini provider (`gemini-2.5-flash-lite`) — _provider stub present; live model smoke test pending (see Open spikes)_
- [ ] Announcer recap on results screen

### Slice 10 — Polish

- [ ] NYC bodega theme pass
- [ ] `CountdownOverlay`
- [ ] Basic SFX
- [ ] Winner state
- [ ] Mobile touch controls
- [ ] `rematch` flow

---

## Acceptance tests (ship criteria)

- [ ] 4 players join one room; movement + claim stay consistent
- [ ] Spectators join in lobby and live; 3 powers work with energy/cooldown
- [ ] Contest resolves exactly once; pickups never duplicate
- [ ] Auto timer ends round; results match server math
- [ ] Refresh during live round resyncs
- [ ] Empty LLM keys still produce static flavor
- [ ] Failed flavor worker does not affect gameplay
- [ ] No cross-room state leakage
- [ ] Maincloud cold-wake tested before demo

---

## Open spikes (verify before depending on them)

- [x] Filtered `useTable` / room-scoped subscription syntax (`roomId.eq(…)`, `.and(…)`)
- [x] SpacetimeDB 2.0 scheduled-table / `tick_round` exact syntax (`t.scheduleAt()`, `{ arg: rowType }`)
- [ ] Groq + Gemini model string smoke tests
- [x] Phaser 4 loader / atlas API names
- [x] Tailwind v4 + template Vite version compatibility
