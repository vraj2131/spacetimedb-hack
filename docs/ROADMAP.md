# Bodega Blitz — Forward Dev Roadmap (Wave 2)

Companion to `handbook.md` (the Wave 0/1 plan) and `BACKEND_HANDOFF.md` (the reducer contract).
This says **who does what next, in what order**, to get from "scaffold + backend + mock board"
to a **playable, good-looking game**.

## Where we are

- **Backend spine done & live:** `register_player → create_room|join_room → start_round →
  move_player → claim_tile → end_round → rematch` — implemented, integration-tested, on maincloud.
- **Renderer exists:** frozen `RenderState` contract (`src/renderState.ts`), iso projection
  (`src/game/projection.ts`), 2.5D `BoardScene` with camera/pan/zoom, and a 17-frame CC0 Kenney
  iso atlas (`public/assets/game.{png,json}` via `_source/pack_atlas.py`).

## What's landed (M1 live wiring — L2A–L2C merged)

1. **Live `RenderState` adapter** — `src/adapters/projectRenderState.ts` projects subscribed rows
   into the frozen `RenderState` shape; Match passes live state into `GameStage`/`PhaserGame`.
2. **Live screens + controller** — `useLiveGameState` subscribes via `useTable`, derives
   `GameUiState`, and calls `conn.reducers.*`; `App.tsx` routes Join → Lobby → Match → Results.
3. **Dev scaffold mock retained** — `createMockGameUiState()` / `MOCK_RENDER_STATE` remain for
   Dev sync only; the live game flow does not use them.

## What's still open (M1 demo polish + M2+)

1. **Browser smoke not CI-gated** — run the two-client checklist in `docs/M1_SMOKE_TEST.md`.
2. **The board draws primitives** — colored diamonds + circles; the Kenney atlas isn't loaded (L3).
3. **Auto round-end** — manual `end_round` works; `tick_round` / lazy auto-end still pending (L1).

## Direction

**Playable live MVP first**, then full gameplay, then custom art. For visuals: **Kenney sprites
now, custom 3D→2D bake later.**

**Frozen seams** (change only by team agreement): `renderState.ts` (the contract),
`projection.ts` (`gridToPixel`/`pixelToGrid`/`depthForGrid`, `TILE_WIDTH=64`, `TILE_HEIGHT=32`),
and `EventBus` (`renderState:update` in, `tile:click` out).

---

## The 4 lanes

| Lane | Owner | Owns (writes outright) | Mission |
|---|---|---|---|
| **L1 — Backend / gameplay** | Dev A | `spacetimedb/**` (sole writer of `tables.ts`) | Finish `contest_tile`, `collect_pickup`, pickups spawn, auto-end/scoring tick, spectator + taunt reducers. |
| **L2 — Live integration / screens / HUD** | Dev B | `src/adapters/`, `src/screens/`, `src/components/` (HUD), `src/App.tsx` | **MVP critical path:** live `RenderState` adapter + a controller that subscribes to tables and drives the real screens via live reducers. |
| **L3 — Rendering / board / art** | Dev C | `src/game/**`, `public/assets/**` | Primitives → Kenney sprites; then the custom 3D→2D iso bake pipeline. |
| **L4 — Spectator / flavor / judge / polish** | Dev D | `reducers.spectator.ts`+`flavor.ts` (with A), spectator/taunt UI, `Judge.tsx`, juice | 3 spectator powers + energy, the LLM taunt worker live, Judge projector, polish. |

Names are placeholders. L2 carries the demo; L1/L3/L4 run in parallel and integrate through the frozen seams.

---

## Milestones

### M1 — Playable live MVP (demo-critical)
Two tabs play a full round on **live data**: join → lobby → start → move/claim on a live board →
end → results → rematch.

- **L2 (critical path) — landed (L2A–L2C):**
  - ~~`src/adapters/projectRenderState.ts`~~ — done + unit-tested.
  - ~~`src/hooks/useLiveGameState.ts`~~ — done; subscribes, projects `GameUiState`, exposes reducer actions.
  - ~~Wire screens in `App.tsx`~~ — Join/Lobby/Match/Results on live data; auto-route on `room.state`.
  - ~~`tile:click` → `resolveTileIdAt` → `claimTile`~~ — done.
  - ~~Match passes live `renderState`~~ — done; `MOCK_RENDER_STATE` only in Dev sync.
  - **Remaining M1 gate:** browser smoke per `docs/M1_SMOKE_TEST.md`.
- **L1 (parallel):** auto-end when `endsAtMs` passes (lazy check in an action reducer, or scheduled
  `tick_round` if the spike holds — `docs/spike-findings.md`). Manual `end_round` stays as fallback.
- **L3 (parallel, non-blocking):** Rendering **Stage A** — load the Kenney atlas, swap primitives → sprites.
- **L4 (parallel, prep):** make `SpectatorBar`/`TauntBubble`/`EventFeed` real components fed by live `events`.
- **Cut line:** demo with manual `end_round` and Kenney-or-primitive board if needed. Never cut the live adapter + core loop.

### M2 — Full gameplay
- **L1:** `contest_tile` (adjacent enemy, shield/spill interaction, single-flip), `collect_pickup`
  (one-time), `pickups` spawns (`map.ts` `PICKUP_SPAWNS`), per-tick income + ownership-bonus scoring, energy regen.
- **L4:** `trigger_spectator_event` (3 powers: `coffee_boost`, `spill_slick`, `deli_shield`; the
  pigeon power sets `player_state.pigeonBlocked`, which `claim_tile` already consumes), energy +
  cooldowns, `post_taunt` + live `agents/run-flavor.ts` (Groq→Gemini→static).
- **L2:** wire spectator controls, pickups, contest, event feed/taunt bubble to live data.
- **L3:** effect overlays (`fx_spill/shield/speed`), owner-color tint, directional tokens.

### M3 — Custom art + polish
- **L3:** Rendering **Stage B** — custom Blender 3D→2D bakes replace Kenney frames.
- **L4:** `Judge.tsx` projector view, announcer recap on Results, countdown, SFX, winner state, mobile touch, rematch-flow polish.

---

## The 3D → 2D → 2.5D rendering pipeline (L3)

The board is already 2.5D (iso projection + depth sort). Art layers on top **without changing
`projection.ts` or `renderState.ts`** — `BoardScene` swaps draw calls; the atlas is swapped by
re-baking with the **same frame keys**.

### Stage A — Sprites now (Kenney atlas) — M1
1. `BoardScene.preload()`: `this.load.atlas('game', 'assets/game.png', 'assets/game.json')`.
2. Replace polygon/circle draws with `this.add.sprite(px, py, 'game', key)` at `gridToPixel(x,y)` +
   `setDepth(depthForGrid(x,y,layer))`. Keys exist: `tile_street|bodega|alley`,
   `token_red|blue|green|yellow` (+ `token_red_walk_0/1`), `pickup_cash|coffee|shield`,
   `fx_spill|shield|speed`, `bodega_cat`.
3. **Alignment:** frames are 2:1 dimetric (128×256). Origin = tile bottom-center; scale the
   footprint to the 64×32 diamond; per-asset y-offset for tall props/tokens. Keep the
   `syncTiles/syncTokens/syncPickups` reconciliation — only the visual primitive changes.
4. Owner color via tint on `tile_*` (or keep the overlay polygon as a tint layer).

### Stage B — Custom 3D → 2D bake — M3
1. **Model** low-poly assets in Blender: tiles (street/bodega/alley), 4 player tokens, pickups, bodega cat, props.
2. **Camera = 2:1 dimetric to match the 64×32 tile:** orthographic, **30° elevation / 45° azimuth**
   (Blender Euler ≈ X 60°, Z 45°). True 35.26° iso gives ~1.73:1; we need 2:1, so 30°. Render at
   ≥2× then downscale; transparent background.
3. **Render** each asset to PNG. Tokens: 4 facings (+ optional walk frames) for direction; effects: overlay sprites.
4. **Pack** the PNGs into `game.png` + `game.json` by extending `pack_atlas.py` into a `bake_iso.py`
   that ingests the Blender output instead of `kenney.zip`. **Keep frame key names identical** →
   `BoardScene` needs zero code change to adopt new art.
5. Tune per-asset origin/anchor, y-offset, depth layer.

**Authoring contract:** every asset drawn at 2:1 dimetric, footprint = the 64×32 diamond, anchored
bottom-center. Art stays swappable; the projection stays frozen.

---

## The "proper board" = live adapter + wiring (L2)

`src/adapters/projectRenderState.ts` — pure; React layer only (never import `module_bindings`
inside `src/game/`):

```typescript
function projectRenderState(tiles, players, playerStates, pickups, nowMs): RenderState {
  const colorByPlayer = new Map(players.map(p => [p.id, p.color]));
  return {
    width: MAP_WIDTH, height: MAP_HEIGHT,
    tiles: tiles.map(t => ({
      x: t.x, y: t.y, type: t.tileType,
      ownerColor: t.ownerPlayerId != null ? colorByPlayer.get(t.ownerPlayerId) ?? null : null,
      contested: t.contestedUntilMs > nowMs,
      shielded:  t.shieldUntilMs   > nowMs,
      spilled:   t.spillUntilMs    > nowMs,
    })),
    tokens: playerStates
      .filter(ps => players.find(p => p.id === ps.playerId)?.role === 'player')
      .map(ps => ({
        playerId: ps.playerId, x: ps.x, y: ps.y,
        color: colorByPlayer.get(ps.playerId),
        boosted:  ps.speedUntilMs    > nowMs,
        disabled: ps.disabledUntilMs > nowMs,
      })),
    pickups: pickups.filter(p => p.active).map(p => ({ x: p.x, y: p.y, type: p.pickupType })),
  };
}
```

**Landed:** `src/adapters/projectRenderState.ts`, `src/hooks/useLiveGameState.ts`,
`tests/projectRenderState.test.mjs`, live `App.tsx` router, live screen wiring, Match
`renderState={live}`. `GameUiState` shape unchanged so screen JSX stayed stable.

---

## Dependency ordering & merge discipline (from the handbook)

- **L1 schema changes merge first.** Any `tables.ts` change → everyone re-pulls + `npm run
  spacetime:generate` + rebases. Dev A is the sole writer of `tables.ts`.
- **`renderState.ts` is frozen** — the seam between L2 (adapter) and L3 (board). Changes are announced/agreed.
- One slice per PR, one lane per PR. L2 and L3 never block on L1 — they integrate through
  `RenderState` (read) + `EventBus` (events) + the reducer contract.
- L2's adapter is the keystone: once it lands, L3's sprites and L1's new reducers light up the same live board automatically.

## Verification (per milestone)

- **M1:** two tabs play a full round on live data; `projectRenderState` + `useLiveGameState`
  unit-tested; `npm test` + `npm run test:integration` green; `tsc -b`.
- **M2:** brief acceptance tests — contest flips once, pickups collect once, spectator powers gated
  by energy, scores match server math.
- **M3:** custom atlas swaps in with no `BoardScene` code change (frame-key parity); maincloud cold-wake smoke before demo.
