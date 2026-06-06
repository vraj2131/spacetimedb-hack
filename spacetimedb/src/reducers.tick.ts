import { ScheduleAt } from 'spacetimedb';
import { table, t } from 'spacetimedb/server';
import { applyRoomTileIncome } from './income';
import { timestampMs } from './time';
import { finishRound } from './roundEnd';

const TICK_INTERVAL_MICROS = 1_000_000n;
const SPECTATOR_REGEN_INTERVAL_MS = 3_000n;
const MAX_SPECTATOR_ENERGY = 10;
const CONTEST_EVENT_TTL_MS = 30_000n;

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

export function deleteRoomTicks(ctx: ReducerCtx, roomId: number): void {
  ctx.db.round_tick.roomId.delete(roomId);
}

export function scheduleRoomTick(ctx: ReducerCtx, roomId: number): void {
  deleteRoomTicks(ctx, roomId);
  ctx.db.round_tick.insert({
    scheduledId: 0n,
    scheduledAt: ScheduleAt.interval(TICK_INTERVAL_MICROS),
    roomId,
  });
}

function toNumberMs(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function resolveExpiredContests(ctx: ReducerCtx, roomId: number, nowMs: bigint): void {
  for (const tile of ctx.db.tiles.roomId.filter(roomId)) {
    if (tile.contestedBy === undefined || tile.contestedBy === null) {
      continue;
    }
    if (toNumberMs(tile.contestedUntilMs) > Number(nowMs)) {
      continue;
    }

    const attackerId = tile.contestedBy;
    const attackerState = ctx.db.player_state.playerId.find(attackerId);
    const attacker = ctx.db.players.id.find(attackerId);
    const previousOwner = tile.ownerPlayerId ?? undefined;

    if (attackerState && attackerState.roomId === roomId) {
      ctx.db.tiles.id.update({
        ...tile,
        ownerPlayerId: attackerId,
        contestedBy: undefined,
        contestedUntilMs: 0n,
      });
      ctx.db.events.insert({
        id: 0n,
        roomId,
        eventType: 'takeover',
        sourcePlayerId: attackerId,
        targetPlayerId: previousOwner,
        targetTileId: tile.id,
        message: `${attacker?.name ?? 'Player'} took over (${tile.x},${tile.y})`,
        createdAtMs: nowMs,
        expiresAtMs: nowMs + CONTEST_EVENT_TTL_MS,
      });
    } else {
      ctx.db.tiles.id.update({
        ...tile,
        contestedBy: undefined,
        contestedUntilMs: 0n,
      });
    }
  }
}

function regenerateSpectatorEnergy(ctx: ReducerCtx, roomId: number, nowMs: bigint): void {
  for (const state of ctx.db.spectator_state.roomId.filter(roomId)) {
    if (state.energy >= MAX_SPECTATOR_ENERGY) {
      continue;
    }
    const lastRegenAtMs = BigInt(toNumberMs(state.lastRegenAtMs));
    if (lastRegenAtMs !== 0n && nowMs - lastRegenAtMs < SPECTATOR_REGEN_INTERVAL_MS) {
      continue;
    }
    ctx.db.spectator_state.playerId.update({
      ...state,
      energy: Math.min(MAX_SPECTATOR_ENERGY, state.energy + 1),
      lastRegenAtMs: nowMs,
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
      resolveExpiredContests(ctx, room.id, nowMs);
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
    }
  );
}
