# Bodega Blitz — Phase 0 Closeout & Split: 5-Dev Work Plan + Merge Order

> Companion to the team handbook and the Phase-0 Closeout plan. This says **who does what, in what order, and how it merges** so five people work in parallel without conflicting on the shared skeleton.

> **Status (Wave 2 in progress):** Wave 0 + the gate are done. Backend gameplay, live client wiring (L2A–L2C), Kenney atlas (L3A), M2B Match controls, and room lifecycle are on `main`. See **`docs/ROADMAP.md`** and **`docs/BACKEND_HANDOFF.md`**. Remaining work: browser smoke re-run, L4 UI polish, M3 custom art.

## The core idea (read first)
Phase 0 builds the **shared contract files** (`tables.ts`, `index.ts` barrel, `App.tsx` router, `renderState.ts`, Tailwind config). Those are the conflict magnets, so they get **one writer (Dev A)** who lands them fast. The other four do **not** edit those files during Phase 0 — they work in **scratch branches** against *agreed interfaces*, then graft their work in once the skeleton is on `main`.

The sequence has three waves:
- **Wave 0 (≈ first block): Dev A solos the foundation; everyone else spikes/preps in scratch.**
- **Wave 1: the gate — skeleton + blessed schema land on `main`; everyone syncs.**
- **Wave 2: the five real lanes branch and run in parallel.**

The single rule that prevents all conflicts in Wave 0: **only Dev A commits files destined for `main`. Everyone else is in throwaway/scratch space until the gate opens.**

---

## Role → lane mapping (who becomes what after the gate)
- **Dev A — Backend / Module + schema owner** (critical path; also blesses the schema).
- **Dev B — Board / Phaser owner** (`src/game/` — the one isolated folder, parallelizable early).
- **Dev C — Backend #2 / spikes + scoring** (pairs with A on reducers after the gate; owns the two open spikes now).
- **Dev D — Spectator system + Flavor + Judge owner** (assets, taunts, agents worker).
- **Dev E — Screens / HUD / game-flow UI owner** (`src/screens/`, HUD, router coordination).

(Dev C exists because the handbook §6 has 4 lanes; with 5 people the heaviest lane — backend — gets a second person.)

---

## WAVE 0 — Foundation + parallel prep (nobody blocks anybody)

### Dev A — the critical-path spine (lands on `main`, in order)
This is sequential because each file is imported by everything downstream. Dev A is the **only** person committing to `main` in this wave.
1. **Commit 1 (alone, first): un-track bindings.** `git rm -r --cached src/module_bindings`, add `src/module_bindings/` to `.gitignore`, commit. Push immediately; tell everyone to pull before doing anything.
2. **Commit 2: schema + barrel.** `tables.ts` (keep `sync_state` + the temporary `set_value` in `reducers.dev.ts`; add the 10 game tables; `round_tick` is a clearly-labeled non-final placeholder), `index.ts` → thin barrel, the 4 game reducer stub files (`reducers.{room,player,spectator,flavor}.ts`, bodies `throw 'not implemented'`), `map.ts` stub.
3. **Commit 3: client contract + router.** `renderState.ts` (the frozen Phaser firewall type), `App.tsx` → dumb router, `DevSync.tsx` (holds the round-trip + mounts the canvas), placeholder `screens/*.tsx` stubs.
4. **Commit 4: Tailwind.** `vite.config.ts` + `index.css` + `package.json` deps.
5. **Commit 5: regenerate + local verify + test/docs.** `spacetime:generate`, local publish, the rewritten `check-roundtrip-scaffold.mjs`, README/checklist flips. This is the **gate commit**.

**Publish `renderState.ts`'s shape to the team as early as possible** (even as a pasted draft in the channel before Commit 3 lands) — B and E build against it, so the sooner it's agreed, the more they get done in parallel.

### Dev B — `src/game/` in a scratch branch (grafts in clean)
The game folder is its own ownership lane — nobody else touches it — so B can build the whole thing in parallel against the **agreed `RenderState` shape** (use A's draft; if it's not posted yet, mock it from the brief and reconcile when A's lands).
- Build `PhaserGame.tsx` (mount/destroy), `EventBus.ts` (typed: `renderState:update` in, `tile:click`/`tap:target` out), `scenes/BoardScene.ts` (draws the placeholder 12×8 grid from `RenderState`, emits `tile:click`).
- Because `src/game/` is a folder no one else writes, B's branch merges with **zero conflict** the moment A's skeleton (esp. `renderState.ts`) is on `main` — B rebases onto it and the import resolves.

### Dev C — the two open spikes (throwaway scratch, touches nothing shared)
- **Spike 1:** filtered `useTable` (`WHERE room_id`) exact syntax. Unblocks every room-scoped subscription (slice 2+).
- **Spike 2:** the 2.0 scheduled-reducer wiring (`t.scheduleAt()` + the table `scheduled` option) that will define the *real* `round_tick`. Unblocks scoring (slice 4). If painful, confirm the lazy-elapsed-time fallback instead.
- Output is a short written findings note + a working snippet, **not** a PR into the skeleton. Hand the verified syntax to A so the real `round_tick`/subscriptions use it post-gate.

### Dev D — assets + flavor prep (scratch / new folder, no shared-file edits)
- Source the **CC0 Kenney isometric tileset**; pack the ~15–20-frame atlas (tiles, tokens, pickups, effects, bodega cat); drop into `public/assets/` (new files, no conflict). Track licenses in `ASSETS.md`.
- Write `phrases.json` (static taunt fallback) and stub the `agents/` worker structure (`run-flavor.ts`, `providers/{groq,gemini,static}.ts`). All new files in a new folder → mergeable anytime.

### Dev E — screen prototype against a mocked `RenderState` (scratch branch)
- Build a throwaway Join + Lobby + Match-shell mockup using a **hand-written fake `RenderState`** object, so layout/UX is designed before the real skeleton lands.
- Produce the **Match-screen wireframe** (board canvas as central panel + HUD strip + spectator bottom-bar on phones) so the layout decision is settled, not improvised mid-sprint.
- Do **not** edit the real `App.tsx`. When the gate opens, drop the designed screens into the real `src/screens/` stubs A created.

---

## WAVE 1 — THE GATE (everyone converges, ~30 min, do together)
This is the one synchronous moment. In order:
1. Dev A's gate commit (Commit 5) is on `main`: skeleton complete, local round-trip + canvas verified, `npm test` + `npm run build` green.
2. **Backend owner (Dev A) blesses `tables.ts`** — the 10 game tables' id/timestamp/enum representation and indexes. `round_tick` is explicitly *excluded* (pending C's scheduled spike).
3. **Everyone pulls `main`, runs `npm run spacetime:generate`, then `npm run dev`**, and confirms on their own machine: two-tab local round-trip syncs, router renders, Phaser placeholder grid draws, no errors. (Fresh clones must `spacetime:generate` first — bindings are untracked now.)
4. B, C, D, E **rebase their scratch branches onto the new `main`.** B's game folder and D's assets graft in with no conflict; C's spike findings get folded into A's reducers; E's screens drop into the real stubs.
5. Lock `.env.local` to local (`ws://127.0.0.1:3000`) for everyone's dev loop. Maincloud is a separate pre-demo task — **now proven**: `bodega-blitz` published from `main` and smoke-tested (cold-wake still to be checked before the demo).

**Do not start Wave 2 until step 3 passes for all five.** This is the §4 precondition: lanes are only disjoint once the files exist on `main`.

---

## WAVE 2 — Five parallel lanes (the build slices)
Now files are disjoint and five-way parallelism is safe. Each dev owns a file set nobody else writes.

| Dev | Lane | Primary files (owns outright) | Slices |
|---|---|---|---|
| A | Backend / room + lifecycle | `reducers.room.ts`, `tables.ts` (schema authority), `index.ts` barrel, `map.ts` | 2,3,4 (server) |
| C | Backend / player + scoring | `reducers.player.ts`, scoring + the real `round_tick` (from spike) | 3,4,5 (server) |
| B | Board / Phaser | all of `src/game/`, `public/assets/` rendering | 2,3,5,8 |
| E | Screens / HUD | `src/screens/{Join,Lobby,Match,Results}`, HUD/Scoreboard/Countdown, `connection.ts` | 2,3,10 |
| D | Spectator + Flavor + Judge | `reducers.spectator.ts`, `reducers.flavor.ts`, SpectatorBar/EventFeed/TauntBubble, Judge screen, `agents/` | 6,7,9 |

**A and C both write server reducers** — the one place two people share territory. They're already split by file (`reducers.room.ts` vs `reducers.player.ts`), but the **schema (`tables.ts`) has a single writer: A.** C requests columns from A; A edits `tables.ts`, republishes, announces "schema updated — re-pull + generate." That keeps the one shared backend file conflict-free.

---

## Merge order & PR discipline (Wave 2, ongoing)
The rule that keeps five branches from tangling:
1. **Schema/reducer changes from A merge FIRST.** Anything that changes `tables.ts` or the barrel lands before dependent work. After each such merge, everyone re-pulls + `spacetime generate` + rebases their open branch. This prevents stale-binding conflicts.
2. **Branch per slice, short-lived, merged daily.** Never let a branch live more than a slice. Long branches are where conflicts breed.
3. **One slice per PR, single lane.** Don't mix lanes in a PR (handbook Strict Rule #8).
4. **Touching a shared file** (`tables.ts`, `index.ts`, `App.tsx`, `renderState.ts`) = announce in the channel before pushing; only the owner edits it (A for schema/barrel, E for the router, by agreement for `renderState.ts`).
5. **B and E never block on the backend.** They integrate through `RenderState` (read) + EventBus (events), so they keep working against the contract even while A/C iterate on reducers behind it.
6. **`renderState.ts` is frozen** after the gate; changing it is an announced, agreed event because B, E, and D all read it.

### Typical daily merge cycle
```
A merges any schema change → announces → all rebase + spacetime generate
  then, in any order, conflict-free because lanes are disjoint:
    B merges game-folder slice
    C merges player/scoring slice (after A's schema if it added columns)
    D merges spectator/flavor slice
    E merges screen slice
```
A's schema is the only ordering constraint. Everything else merges independently.

---

## One-screen summary
1. **Wave 0:** A builds the skeleton solo on `main` (un-track → schema → contract → Tailwind → verify). B builds `src/game/` in scratch against the `RenderState` draft. C runs the two spikes. D preps assets + flavor. E prototypes screens against a mocked `RenderState`. *Nobody but A touches `main`.*
2. **Wave 1 (gate):** skeleton + blessed schema on `main`; all five pull, `spacetime generate`, verify local round-trip + canvas; B/C/D/E rebase their scratch work in.
3. **Wave 2:** five disjoint lanes run in parallel; **A's schema changes merge first and trigger a re-generate**, every other lane merges independently because no two share a primary file.