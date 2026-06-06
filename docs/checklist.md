# Bodega Blitz Checklist

Living progress tracker for the project. Check items off as they land (`- [x]`). Leave pending items unchecked (`- [ ]`).

Last updated: June 6, 2026 (Slice 2 cutover: game schema replaces `sync_state`; DevSync uses `rooms`/`players`.)

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
- [x] Maincloud smoke test (`spacetime publish bodega-blitz --server maincloud`) — _published from `main`; schema responsive_

---

## Build slices (vertical — finish each before starting the next)

From `bodega-blitz-cursor-brief.md`. Each slice must run before the next begins.

### Slice 1 — Base app

- [x] One Vite app on SpacetimeDB template (not Phaser template)
- [x] Phaser added as a library dependency
- [x] Tailwind v4 wired into Vite
- [x] Empty `PhaserGame` canvas beside React shell
- [x] One Maincloud publish succeeds (local publish verified) — _published `bodega-blitz` to maincloud; schema responsive (read-only smoke)_

### Slice 2 — Room sync

- [x] Game schema replaces `sync_state` (`rooms`, `players`, `player_state`, `tiles`, …) — _DevSync subscribes to `rooms`/`players`; `sync_state` + `set_value` removed_
- [x] `register_player`, `create_room`, `join_room`, `start_round` reducers — _implemented + integration-tested on `backend-mvp-reducers`_
- [x] `spacetimedb/src/map.ts` — 28×20 layout + spawn points — _v1 NYC tile types (street/bodega/alley); pickup spawns still empty_
- [x] Join screen (nickname, role, optional room code) — _live reducers via `useLiveGameState`_
- [x] Lobby screen (code, roster, host start button) — _live roster + host `startRound`_
- [x] Phaser draws 28×20 grid as colored rectangles — _live `projectRenderState` on Match; primitives until L3 atlas_
- [x] `move_player` works across two tabs — _integration-tested; browser smoke in `docs/M1_SMOKE_TEST.md`_

### Slice 3 — Claim + results

- [x] `claim_tile` reducer (adjacent only) — _implemented + integration-tested on `backend-mvp-reducers`_
- [x] Manual `end_round` reducer — _implemented (lazy scoring + ranking); `rematch` also landed_
- [x] Tile ownership colors in Phaser — _live owner colors from `projectRenderState` (primitive tiles)_
- [x] Timer + score HUD — _live `endsAtMs` timer + standings on Match_
- [x] Results screen — _live `round_results` + host rematch_
- [x] Two clients agree on winner — _server `end_round` scores; verify in browser smoke_

### Slice 2b — Room lifecycle

- [x] `leave_room` reducer (host transfer, empty-room delete, spectator cleanup)
- [x] `close_room` reducer (host-only, lobby/results only)
- [x] Leave + Close buttons on Lobby, Match, Results
- [x] Action errors visible on Lobby and Results (not just Match)
- [x] Auto-route to Join when `player.roomId === 0`
- [x] Room leave/close automated smoke — _`npm run smoke:leave-close` against local `bodega-blitz`; manual browser steps in `docs/M1_SMOKE_TEST.md` section 9_

### Slice 4 — Scoring + auto-end

- [x] Scheduled-table / `tick_round` spike verified and integrated into the live module
- [x] Tile income per tick (street 1, bodega 3)
- [x] Ownership bonus at round end
- [x] Auto round expiration (~90s)
- [x] Manual math matches server results

### Slice 5 — Contest + pickups

- [x] `contest_tile` reducer (adjacent enemy, shield/spill interaction)
- [x] `collect_pickup` reducer
- [x] `pickups` table + spawn on map cells
- [x] Event rows for major actions
- [x] Contest resolves exactly once; pickup collects exactly once

### Slice 6 — Spectators

- [x] `spectator_state` table + energy economy
- [x] `trigger_spectator_event` reducer
- [x] All 3 powers: `coffee_boost`, `spill_slick`, `deli_shield`
- [x] Tick energy regen (+1 every 3s)
- [x] Cooldown / energy blocks spam
- [ ] `EventFeed` + `SpectatorBar` components
- [ ] Spectator cannot call player-only reducers

### Slice 7 — Judge + resilience

- [ ] Judge screen (read-only projector view)
- [ ] Refresh / reconnect resyncs mid-round
- [ ] No cross-room subscription leakage

### Slice 8 — Phaser sprites

- [x] Texture atlas in `public/assets/` — _Kenney `game.png` + `game.json`; `BoardScene` loads it in preload_
- [x] Replace primitives with tile / token / pickup sprites — _Kenney atlas with circle/polygon fallbacks when load fails_
- [x] Effect overlays (spill, shield, speed) — _fx_* atlas frames on tile overlay layer_
- [ ] Idle / walk animations (if time)

### Slice 9 — LLM flavor

- [x] `agents/phrases.json` static fallback
- [x] `agents/run-flavor.ts` worker — _live STDB polling path plus standalone dry-run with static fallback_
- [x] `post_taunt` reducer
- [ ] `TauntBubble` component
- [x] Game fully playable with empty `.env`
- [x] Groq provider (`llama-3.1-8b-instant`) — _provider stub present; live model smoke test pending (see Open spikes)_
- [x] Gemini provider (`gemini-2.5-flash-lite`) — _provider stub present; live model smoke test pending (see Open spikes)_
- [x] Announcer recap rows posted after results

### Slice 10 — Polish

- [ ] NYC bodega theme pass
- [x] `CountdownOverlay` — _used on Match screen_
- [ ] Basic SFX
- [ ] Winner state
- [ ] Mobile touch controls
- [x] `rematch` flow — _reducer + Results/Lobby UI wired; verify in browser smoke_

---

## Acceptance tests (ship criteria)

- [ ] 4 players join one room; movement + claim stay consistent
- [x] Spectators join in lobby and live; 3 powers work with energy/cooldown
- [x] Contest resolves exactly once; pickups never duplicate
- [x] Auto timer ends round; results match server math
- [ ] Refresh during live round resyncs
- [x] Empty LLM keys still produce static flavor
- [x] Failed flavor worker does not affect gameplay
- [ ] No cross-room state leakage
- [ ] Maincloud cold-wake tested before demo

---

## Open spikes (verify before depending on them)

- [x] Filtered `useTable` / room-scoped subscription syntax (`roomId.eq(…)`, `.and(…)`)
- [x] SpacetimeDB 2.0 scheduled-table / `tick_round` exact syntax (`t.scheduleAt()`, `{ arg: rowType }`)
- [ ] Groq + Gemini model string smoke tests
- [ ] Phaser 4 loader / atlas API names
- [x] Tailwind v4 + template Vite version compatibility
