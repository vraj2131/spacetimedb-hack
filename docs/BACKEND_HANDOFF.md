# Backend MVP Handoff (Wave 1 → Wave 2)

The room/gameplay reducer chain is implemented, integration-tested, merged to `main`,
and published to maincloud. This is the contract the client lanes build on.

---

## Everyone: do this after pulling `main`

```sh
git pull
npm install          # new devDep: tsx (used only by the integration runner)
npm run spacetime:generate   # bindings are gitignored — regenerate locally
```

Reducer **signatures** did not change from the scaffold, so generated bindings are
the same shape — but regenerate anyway so your local `src/module_bindings/` is current.

---

## What landed

Current update: full-gameplay backend is now beyond the original MVP handoff.
`contest_tile`, `collect_pickup`, pickup seeding, `trigger_spectator_event`,
scheduled `tick_round`, spectator energy regen, server auto-end, and `post_taunt`
are implemented and integration-tested. The flavor worker has a live polling path
and still works with empty LLM keys through the static provider.

- **Reducers** (`spacetimedb/src/reducers.{room,player}.ts`): `register_player`,
  `create_room`, `join_room`, `claim_tile`, `end_round`, `rematch`, plus live-round
  guards on `move_player`. (`start_round` was already in.)
- **Scoring** (`spacetimedb/src/scoring.ts`): pure, unit-tested helpers used by `end_round`.
- **Schema blessed**: `tables.ts` matches the brief field-for-field (Dev A sign-off in the file header). Treat as the frozen contract.
- **Integration harness**: real SpacetimeDB tests — `npm run test:integration`.
- **Maincloud**: `bodega-blitz` is published and live (https://spacetimedb.com/bodega-blitz).

Remaining explicit backend stub: `reset_demo_room`. `tick_round` is scheduler-internal
and no longer exposed as a client reducer.

---

## Reducer contract (what the client calls)

Flow: `register_player` → `create_room` **or** `join_room` → `start_round` →
`move_player` / `claim_tile` (live) → `end_round` → `rematch`.

| Reducer | Args (camelCase) | Guards / behavior |
|---|---|---|
| `registerPlayer` | `{ name, role }` | trims name (reject empty); `role` ∈ `player\|spectator`; one row per identity; `roomId = 0`; cycles a color. |
| `createRoom` | `{}` | caller registered & not in a room; makes a 6-char uppercase code; room `state='lobby'`, host = caller; caller joins it. |
| `joinRoom` | `{ roomCode }` | normalizes code (trim+upper); **players** gated by `live` state + 10-seat cap; **spectators may join lobby/live/results** (to watch). |
| `startRound` | `{ roomId }` | host only, lobby only; seeds the 28×20 board; spawns `player`-role at `SPAWN_POINTS`; `state='live'`, sets `startsAtMs`/`endsAtMs` (+90s). |
| `movePlayer` | `{ direction }` | `direction` ∈ `up\|down\|left\|right`; player-role + live only; one cell; rejects off-map / alley. |
| `claimTile` | `{ tileId }` | player-role + live; tile must be in your room, non-alley, **Manhattan-adjacent** to you; sets `ownerPlayerId`; writes a `claim` event. |
| `endRound` | `{ roomId }` | host only, live only; writes ranked `round_results`; `state='results'`. |
| `rematch` | `{ roomId }` | host only, results only; clears tiles/player_state/events/round_results/pickups; `state='lobby'`, `roundNumber++`. |
| `leaveRoom` | `{ roomId }` | caller must be in the room; removes caller's `player_state` or `spectator_state`; sets `player.roomId = 0`; transfers host to next connected player by join order if host leaves; deletes room if empty. |
| `closeRoom` | `{ roomId }` | host only; **rejects if `state='live'`**; rehomes all participants (`roomId = 0`), deletes room-scoped rows, deletes room. |

**Calling convention** (matches `DevSync.tsx`): `conn.reducers.registerPlayer({ name, role })`.
The call returns a `Promise<void>` that **resolves after commit** and **rejects if the
reducer throws** (generic "fatal error" message — assert on effects, not text).

**Identity:** the local player is the `players` row whose `identity` equals your
connection identity (`conn.identity`).

**`claimTile` needs a tile id, not (x,y):** the board emits a clicked cell; look up the
`tiles` row for that `(x, y)` in your room from the `tiles` subscription and pass its `id`.

### State notes
- `player_state` rows exist **only after `start_round`**, and only for `player`-role; spectators never get one.
- `round_results` are **appended per round** (carry `roundNumber`); `rematch` deletes the prior round's rows.
- `rooms.state` is exactly `lobby | live | results`. Timer: derive remaining time client-side from `rooms.endsAtMs`.
- Scoring: `tileScore` = accumulated tile income (`tileIncomeTotal`, lazy fallback to owned-tile snapshot); `ownershipBonus` = street +3 / bodega +10 per owned tile at round end; `cashScore` = `pickupCashTotal` (pickup cash only); `totalScore` = sum of the three. Live `player_state.cash` = tile income + pickup cash during the round.

---

## How to run & test

```sh
npm test                 # pure suite: scaffold check + unit tests (no DB)
npm run test:integration # live reducers against a local SpacetimeDB
npm run dev              # client (with spacetime dev / a local server running)
```

`npm run test:integration` owns its daemon: it starts an in-memory server if one
isn't up, runs the tests serially, and stops the server it started. It skips cleanly
if the `spacetime` CLI or a server isn't available. Details + gotchas in
[reducer-integration testing notes] — key ones: it runs under `tsx`; reducers are
atomic (a throw rolls back all writes); multi-identity scenarios need separate SDK
connections, not the CLI.

---

## Next steps by lane (Wave 2)

**Dev E — screens / HUD / live wiring**
- Wire Join → `registerPlayer` + (`createRoom` | `joinRoom`); Lobby → roster + host `startRound`; Match controls → `movePlayer` / `claimTile`; Results → `round_results` + host `rematch`.
- Build the live `RenderState` adapter that projects subscribed rows (`tiles`, `players`, `player_state`, `pickups`) into the frozen `renderState.ts` shape, replacing `createMockGameUiState()` / `MOCK_RENDER_STATE`.
- Remember `claimTile` takes the `tiles` row id for the clicked cell.

**Dev B — Phaser**
- Iso board + 28×20 camera already render against the mock. Swap the mock for the live `RenderState` (from Dev E's adapter) and emit `tile:click` carrying `(x,y)` so the controller can resolve the tile id.

**Dev C — backend #2 / scoring**
- `contest_tile`, `collect_pickup`, `pickups` spawn + table; per-tick tile income; auto round-expiration. Decide scheduled `tick_round` (spike verified, see `docs/spike-findings.md`) vs the lazy fallback. Schema changes go through Dev A.

**Dev D — spectator / flavor / judge**
- `trigger_spectator_event` (the 3 powers + energy/cooldown), `spectator_state`. **Note:** the pigeon power is the thing that should set `player_state.pigeonBlocked = true`; `claim_tile` already consumes it (clears + fizzles, since atomic reducers can't both clear and throw). `post_taunt` + `TauntBubble`; Judge screen.

---

## Merge discipline (unchanged)
Dev A's schema changes (`tables.ts`) merge first; everyone then re-pulls + `spacetime:generate` + rebases. One slice per PR, one lane per PR. `renderState.ts` is frozen — changes are announced.
