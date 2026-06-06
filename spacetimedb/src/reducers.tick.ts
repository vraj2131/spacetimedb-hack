import { ScheduleAt } from 'spacetimedb';
import { table, t } from 'spacetimedb/server';
import { applyRoomTileIncome } from './income';
import { timestampMs } from './time';
import { finishRound } from './roundEnd';

const TICK_INTERVAL_MICROS = 1_000_000n;
const SPECTATOR_REGEN_INTERVAL_MS = 3_000n;
const MAX_SPECTATOR_ENERGY = 10;

export const roundTick = table(
  { name: 'round_tick', public: true, scheduled: (): any => tickRound },
  {
    scheduledId: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    roomId: t.u32().index('btree'),
  }
);

export let tickRound: any;

type ReducerCtx = any;

export function scheduleNextTick(ctx: ReducerCtx, roomId: number): void {
  ctx.db.round_tick.roomId.delete(roomId);
  ctx.db.round_tick.insert({
    scheduledId: 0n,
    scheduledAt: ScheduleAt.interval(TICK_INTERVAL_MICROS),
    roomId,
  });
}

function toNumberMs(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function regenerateSpectatorEnergy(ctx: ReducerCtx, roomId: number, nowMs: bigint): void {
  for (const state of ctx.db.spectator_state.roomId.filter(roomId)) {
    if (state.energy >= MAX_SPECTATOR_ENERGY) {
      continue;
    }
    const lastActionAtMs = BigInt(toNumberMs(state.lastActionAtMs));
    if (lastActionAtMs !== 0n && nowMs - lastActionAtMs < SPECTATOR_REGEN_INTERVAL_MS) {
      continue;
    }
    ctx.db.spectator_state.playerId.update({
      ...state,
      energy: Math.min(MAX_SPECTATOR_ENERGY, state.energy + 1),
      lastActionAtMs: nowMs,
    });
  }
}

export function registerTickReducer(spacetimedb: any): void {
  tickRound = spacetimedb.reducer(
    { name: 'tick_round' },
    { arg: roundTick.rowType },
    (ctx: ReducerCtx, { arg }: { arg: any }) => {
      if (!ctx.senderAuth.isInternal && ctx.connectionId !== null) {
        throw new Error('tick_round can only be called by the scheduler');
      }

      const room = ctx.db.rooms.id.find(arg.roomId);
      if (!room || room.state !== 'live') {
        return;
      }

      const nowMs = timestampMs(ctx);
      regenerateSpectatorEnergy(ctx, room.id, nowMs);

      const refreshedRoom = ctx.db.rooms.id.find(room.id);
      if (!refreshedRoom || refreshedRoom.state !== 'live') {
        return;
      }

      applyRoomTileIncome(ctx, refreshedRoom, nowMs);

      const roomAfterIncome = ctx.db.rooms.id.find(room.id);
      if (!roomAfterIncome || roomAfterIncome.state !== 'live') {
        return;
      }

      if (toNumberMs(roomAfterIncome.endsAtMs) > 0 && nowMs >= BigInt(toNumberMs(roomAfterIncome.endsAtMs))) {
        finishRound(ctx, roomAfterIncome);
        return;
      }

      scheduleNextTick(ctx, room.id);
    }
  );
}
