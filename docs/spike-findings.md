# SpacetimeDB API Spike Findings (Dev C — Wave 0)

Verified against **spacetimedb@2.4.1** / CLI **2.4.1** (June 2026).  
These spikes are **throwaway research** — they do **not** modify the live module. Reference code and tests live in:

- `tests/spike1-filter.test.mjs` — filtered subscription SQL
- `tests/spike2-scheduled.test.mjs` — scheduled-table syntax + placeholder guard
- `spikes/scheduled-tick.reference.ts` — build-verified Spike 2 reference (not wired in)

Run `npm test` to re-verify. Spike 2’s live `spacetime build` proof runs in CI (and locally when the CLI + `spacetimedb/node_modules` exist).

---

## Spike 1 — Filtered `useTable` (room-scoped subscriptions)

**Unblocks:** Slice 2+ room-scoped subscriptions (Join/Lobby/Match wiring).

### React hook syntax (use generated camelCase accessors)

```tsx
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';

function RoomSubscriptions({ roomId }: { roomId: number }) {
  const [players, playersReady] = useTable(
    tables.players.where(row => row.roomId.eq(roomId))
  );

  const [activePickups, pickupsReady] = useTable(
    tables.pickups.where(row => row.roomId.eq(roomId).and(row.active.eq(true)))
  );

  // playersReady / pickupsReady → subscription applied; rows update live
}
```

### SQL the query builder emits

| Subscription | SQL |
|---|---|
| Players in room `7` | `SELECT * FROM "players" WHERE "players"."room_id" = 7` |
| Active pickups in room `7` | `SELECT * FROM "pickups" WHERE ("pickups"."room_id" = 7) AND ("pickups"."active" = TRUE)` |

### Rules for the team

- **TS / hooks:** camelCase field names from generated bindings (`roomId`, `active`, …).
- **Wire / SQL:** snake_case columns (`room_id`, …) — the generator maps them via `.name("room_id")`.
- **Compound filters:** use `.and()`; emitted SQL may parenthesize clauses and uppercase `TRUE`.
- **`useTable` tuple:** `[rows, isReady]` — gate on `isReady` before treating rows as authoritative.

### Other room-scoped tables (same pattern)

```tsx
tables.tiles.where(row => row.roomId.eq(roomId))
tables.player_state.where(row => row.roomId.eq(roomId))
tables.spectator_state.where(row => row.roomId.eq(roomId))
tables.events.where(row => row.roomId.eq(roomId))
tables.taunts.where(row => row.roomId.eq(roomId))
```

---

## Spike 2 — Scheduled `round_tick` (1s server tick)

**Unblocks:** Slice 4 scoring (tile income, energy regen, auto round end).  
**Not integrated yet** — live repo still ships a **NON-FINAL PLACEHOLDER** in `spacetimedb/src/tables.ts` (`scheduledAtMs: t.i64()`, no scheduler). See `tests/spike2-scheduled.test.mjs` guard.

### Verified syntax (`spikes/scheduled-tick.reference.ts`)

```ts
import { ScheduleAt } from 'spacetimedb';
import { schema, table, t } from 'spacetimedb/server';

const roundTick = table(
  { name: 'round_tick', public: true, scheduled: (): any => tickRound },
  {
    scheduledId: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    roomId: t.u32().index('btree'),
  }
);

const spacetimedb = schema({ round_tick: roundTick });
export default spacetimedb;

export const tickRound = spacetimedb.reducer(
  { name: 'tick_round' },
  { arg: roundTick.rowType },
  (ctx, { arg }) => {
    if (!ctx.senderAuth.isInternal) {
      throw new Error('tick_round can only be called by the scheduler');
    }

    ctx.db.round_tick.insert({
      scheduledId: 0n,
      scheduledAt: ScheduleAt.interval(1_000_000n), // 1 second (microseconds)
      roomId: arg.roomId,
    });
  }
);
```

### Key findings

| Topic | Detail |
|---|---|
| `scheduled` option | `scheduled: (): any => tickRound` — lazy thunk breaks table ↔ reducer cycle; `(): any` is the current TS workaround |
| Schedule column | `scheduledAt: t.scheduleAt()` — wire column is **`scheduled_at`**, not `scheduled_at_ms` |
| Reducer args | `{ arg: roundTick.rowType }` — **not** `{ roomId: t.u32() }`; scheduled row passed as `arg` |
| Auth guard | `ctx.senderAuth.isInternal` — clients must not call `tick_round` |
| Interval | `ScheduleAt.interval(1_000_000n)` — microseconds (1s = 1_000_000n) |
| Client bindings | `tick_round` does **not** appear in client generated bindings (scheduler-internal) |

### Dev A integration plan (post-gate, Slice 4)

The current file split (`tables.ts` → `schema.ts` ← `reducers.room.ts`) cannot put `scheduled: () => tickRound` in `tables.ts` while `tickRound` lives in `reducers.room.ts` without a cycle.

**Recommended:** new `spacetimedb/src/reducers.tick.ts` co-locating:

1. `roundTick` table definition (with `scheduled`)
2. `tickRound` reducer body

Then:

- Remove placeholder `roundTick` from `tables.ts`
- Remove `tickRound` stub from `reducers.room.ts`
- Register `round_tick` in `schema.ts` from `reducers.tick.ts`
- Re-export from `index.ts` barrel
- `start_round` seeds the first scheduled row:

```ts
ctx.db.round_tick.insert({
  scheduledId: 0n,
  scheduledAt: ScheduleAt.interval(1_000_000n),
  roomId,
});
```

After schema change: announce in channel → everyone `git pull` + `npm run spacetime:generate`.

### Lazy fallback (still valid)

If scheduled integration slips, Slice 4 can compute elapsed income / energy regen inside action reducers and `end_round` (brief fallback path). Spike 2 succeeded — prefer the scheduled path when integrating.

---

## What was explicitly *not* done (per handbook)

**Current status:** the live module has since integrated the scheduled-table
syntax in `spacetimedb/src/reducers.tick.ts`; the older placeholder notes above
are retained as historical spike context.

- No edits to live `spacetimedb/src/` schema for spike tables
- No edits to `App.tsx`, `renderState.ts`, or tracked `module_bindings`
- Old branch `spike/spacetimedb-api-verification` is **obsolete** — do not merge (pre-spine, touched shared files)

---

## Handoff checklist for merge steward

- [x] Spike findings documented (this file)
- [x] Reference + tests committed (`spikes/`, `tests/spike*.test.mjs`)
- [x] PR merged to `main` (Spike 1 + Spike 2 syntax integrated in Slice 4)
- [x] Close obsolete `spike/spacetimedb-api-verification` branch (if still open locally, delete)
- [x] Announce Spike 1 hook shape to Dev E; Spike 2 integration plan to Dev A/C at Slice 4
