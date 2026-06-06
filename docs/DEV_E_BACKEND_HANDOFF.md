# Dev E Backend Handoff

This branch finishes the Dev E mocked UI lane for Bodega Blitz. The screens are intentionally frontend-only right now, but the route flow, view-model shape, and action callbacks are ready for backend wiring.

## What Dev E Completed

- Preserved the Phase 0 `dev` scaffold screen as the default app entry.
- Added a visible `Start Bodega Blitz` entry point into the mocked game UI flow.
- Finished the mocked `join -> lobby -> match -> results` route flow.
- Added reusable UI components for roster, HUD, scoreboard, countdown, status pills, and the Phaser board shell.
- Added `src/screens/uiState.ts` as the frontend contract for backend data.
- Kept `Judge`, spectator-power widgets, reducers, schema, Phaser internals, and generated bindings out of Dev E scope.

## Route Flow Backend Should Preserve

The current mocked review flow is:

```text
dev -> join -> lobby -> match -> results
```

Expected live mapping later:

- `join`: user enters name, role, and optional room code.
- `lobby`: room exists, roster is room-scoped, host can start the round.
- `match`: room is live, timer/standings/feed update from server state.
- `results`: room is in results state and reads final rows from `round_results`.

Keep `dev` available until the team removes the Phase 0 scaffold proof.

## Frontend Contract File

Wire backend data through:

```text
src/screens/uiState.ts
```

The UI expects these top-level fields to be derivable from SpacetimeDB rows:

- `localIdentity`
- `localRole`
- `roomId`
- `roomCode`
- `roomState`
- `roundNumber`
- `timerEndsAt`
- `isHost`
- `isSpectator`
- `spectatorCount`
- `liveStandings`
- `events`
- `recentTaunt`
- `results`

The screens consume these view models:

- `JoinViewModel`
- `LobbyViewModel`
- `MatchViewModel`
- `ResultsViewModel`

The backend wiring should replace `createMockGameUiState()` with a live adapter that projects subscribed rows into the same view models.

## Reducers Dev E Is Ready To Call

The UI action callbacks already mirror the backend reducer flow:

- `onCreateRoom(name, role)` should call `register_player(name, role)` and `create_room()`, or the backend-approved combined flow.
- `onJoinRoom(name, role, roomCode)` should call `register_player(name, role)` and `join_room(room_code)`.
- `onStartRound(roomId)` should call `start_round(room_id)`.
- `onEndRound(roomId)` should call `end_round(room_id)` for the manual/dev results path.
- `onRematch(roomId)` should call `rematch(room_id)`.

If backend changes reducer ordering, keep the UI action names stable and update only the adapter/controller layer.

## Tables Needed For First Live Wiring

For Join and Lobby:

- `rooms`: `id`, `code`, `state`, `hostIdentity`, `roundNumber`, `startsAtMs`, `endsAtMs`
- `players`: `id`, `identity`, `roomId`, `name`, `role`, `color`, `connected`, `joinedAtMs`

For Match:

- `player_state`: position, cash, income totals, pickup totals, buff/debuff timestamps
- `tiles`: ownership, contested, shield, spill state
- `pickups`: active pickups
- `events`: event type, source/target ids, message, created/expires timestamps
- `taunts`: speaker, text, model label, created timestamp

For Results:

- `round_results`: `playerId`, `tileScore`, `cashScore`, `ownershipBonus`, `totalScore`, `rank`

## Where Backend Wiring Should Happen

Keep screen components presentational:

- Do not put SpacetimeDB subscriptions directly inside `Join.tsx`, `Lobby.tsx`, `Match.tsx`, or `Results.tsx`.
- Do not make Phaser import raw database rows or generated bindings.
- Do map raw rows into the `uiState.ts` view-model shape in one adapter/controller layer.
- Do call reducers from the top-level action/controller layer, not from individual presentational components.

Good target shape:

```text
SpacetimeDB rows + reducer handles
  -> live UI adapter
  -> GameUiState + GameUiActions
  -> App.tsx
  -> screen viewModel props
```

## Backend Questions To Confirm

Before Dev E live-wires the UI, backend should confirm:

- Does `register_player` happen before `create_room`, after `create_room`, or inside `create_room`?
- Is a spectator represented in `players` with `role = spectator`?
- What is the exact room capacity rule for players and spectators?
- Which row identifies the local player from `ctx.sender`?
- Is `rooms.state` exactly `lobby | live | results`?
- Should timer labels derive from `endsAtMs` on the client, or should backend expose a remaining-time value?
- Are result rows appended per round or replaced on each rematch?

## Manual Review Checklist

Run:

```bash
npm run spacetime:generate
npm test
npx tsc -b
npm run build
```

Then run `spacetime dev` and verify:

- `dev` still shows Phase 0 sync and Phaser canvas.
- `Start Bodega Blitz` opens `join`.
- `Create room` or `Join room` opens `lobby`.
- `Start round` opens `match`.
- `Preview results` opens `results`.
- `Back to lobby`, `Mock rematch`, and `Dev sync` navigate correctly.
- Selecting `spectator` in Join changes the later control labels and disables host-only actions.

## Files Backend Should Usually Avoid Editing

Avoid changing these unless coordinating with Dev E:

- `src/screens/Join.tsx`
- `src/screens/Lobby.tsx`
- `src/screens/Match.tsx`
- `src/screens/Results.tsx`
- `src/components/Hud.tsx`
- `src/components/Scoreboard.tsx`
- `src/components/PlayerRoster.tsx`

Backend should primarily wire through the adapter/controller layer that replaces the current mocked `createMockGameUiState()` flow.
