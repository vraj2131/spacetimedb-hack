/**
 * SPIKE REFERENCE — verified SpacetimeDB 2.4.1 scheduled-table syntax.
 *
 * This file is a captured, build-verified reference for the open spike "2.0
 * scheduled-table / tick_round exact syntax" (see bodega-blitz-cursor-brief.md).
 * It is NOT wired into the live module (spacetimedb/src/) — the repo ships
 * round_tick as a clearly-labeled NON-FINAL PLACEHOLDER until Dev A migrates.
 *
 * tests/spike2-scheduled.test.mjs asserts this syntax stays intact and, when
 * the spacetime CLI + module deps are available (e.g. in CI), copies it into a
 * throwaway module and runs `spacetime build` to prove it still compiles.
 *
 * Verified findings captured here:
 *  - a scheduled table passes `scheduled: () => <reducer>` in the table opts
 *    (lazy thunk to break the table<->reducer cycle),
 *  - the schedule column is `t.scheduleAt()` (generates as wire column
 *    `scheduled_at`, NOT `scheduled_at_ms`),
 *  - the scheduled reducer takes a single arg typed `<table>.rowType`,
 *  - `ctx.senderAuth.isInternal` gates it to scheduler-only invocation,
 *  - `ScheduleAt.interval(micros)` sets a repeating interval (1s = 1_000_000n).
 */
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

const spacetimedb = schema({
  round_tick: roundTick,
});

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
      scheduledAt: ScheduleAt.interval(1_000_000n),
      roomId: arg.roomId,
    });
  }
);
