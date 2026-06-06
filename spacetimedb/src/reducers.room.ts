import { t } from 'spacetimedb/server';
import spacetimedb from './schema';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  SPAWN_POINTS,
  MAX_SPAWN_SEATS,
  tileTypeAt,
  incomeForTileType,
} from './map';

/**
 * Room lifecycle reducers.
 *
 * Signatures (params/names) are the real contract so generated bindings and
 * client wiring are stable. `start_round` is implemented; the rest still throw
 * until their slice lands. See bodega-blitz-cursor-brief.md "Reducers".
 */

/** Round length in milliseconds (90s per the brief). */
const ROUND_DURATION_MS = 90_000n;

// create_room() -> room in lobby; generate short code; set host identity.
export const createRoom = spacetimedb.reducer({ name: 'create_room' }, _ctx => {
  throw new Error('not implemented: create_room');
});

// join_room(room_code) -> attach to room; reject if missing/full.
export const joinRoom = spacetimedb.reducer(
  { name: 'join_room' },
  { roomCode: t.string() },
  _ctx => {
    throw new Error('not implemented: join_room');
  }
);

// start_round(room_id) -> host only; seed tiles, spawn players, set timers.
export const startRound = spacetimedb.reducer(
  { name: 'start_round' },
  { roomId: t.u32() },
  (ctx, { roomId }) => {
    const room = ctx.db.rooms.id.find(roomId);
    if (!room) {
      throw new Error('start_round: room not found');
    }
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new Error('start_round: only the host can start the round');
    }
    // Must be in lobby — this also guards against double-seeding a live round.
    if (room.state !== 'lobby') {
      throw new Error('start_round: room is not in lobby');
    }

    const nowMs = ctx.timestamp.toMillis();

    // Re-seed the board: clear this room's tiles, then insert all 560 cells.
    ctx.db.tiles.roomId.delete(roomId);
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        const tileType = tileTypeAt(x, y);
        ctx.db.tiles.insert({
          id: 0, // auto-increment
          roomId,
          x,
          y,
          tileType,
          ownerPlayerId: undefined,
          incomeValue: incomeForTileType(tileType),
          contestedBy: undefined,
          contestedUntilMs: 0n,
          shieldUntilMs: 0n,
          spillUntilMs: 0n,
        });
      }
    }

    // Spawn players (role 'player') at seat points, by join order.
    const seated = [...ctx.db.players.roomId.filter(roomId)]
      .filter(p => p.role === 'player')
      .sort((a, b) =>
        a.joinedAtMs === b.joinedAtMs
          ? a.id - b.id
          : a.joinedAtMs < b.joinedAtMs
            ? -1
            : 1
      );

    ctx.db.player_state.roomId.delete(roomId);
    seated.forEach((player, seatIndex) => {
      if (seatIndex >= MAX_SPAWN_SEATS) {
        return;
      }
      const spawn = SPAWN_POINTS[seatIndex];
      ctx.db.player_state.insert({
        playerId: player.id,
        roomId,
        x: spawn.x,
        y: spawn.y,
        cash: 0,
        tileIncomeTotal: 0,
        pickupCashTotal: 0,
        speedUntilMs: 0n,
        disabledUntilMs: 0n,
        pigeonBlocked: false,
        lastMoveAtMs: 0n,
        lastClaimAtMs: 0n,
        lastContestAtMs: 0n,
      });
    });

    ctx.db.rooms.id.update({
      ...room,
      state: 'live',
      startsAtMs: nowMs,
      endsAtMs: nowMs + ROUND_DURATION_MS,
    });
  }
);

// end_round(room_id) -> host/dev path; compute scores; write results.
export const endRound = spacetimedb.reducer(
  { name: 'end_round' },
  { roomId: t.u32() },
  _ctx => {
    throw new Error('not implemented: end_round');
  }
);

// rematch(room_id) -> results only; clear board; keep room+players; -> lobby.
export const rematch = spacetimedb.reducer(
  { name: 'rematch' },
  { roomId: t.u32() },
  _ctx => {
    throw new Error('not implemented: rematch');
  }
);

// reset_demo_room(room_code) -> hard reset; gated to host/dev identity.
export const resetDemoRoom = spacetimedb.reducer(
  { name: 'reset_demo_room' },
  { roomCode: t.string() },
  _ctx => {
    throw new Error('not implemented: reset_demo_room');
  }
);

// tick_round(room_id) -> scheduled-reducer path (placeholder; see round_tick
// table note). Income, energy regen, buff expiry, contest resolution, scoring.
export const tickRound = spacetimedb.reducer(
  { name: 'tick_round' },
  { roomId: t.u32() },
  _ctx => {
    throw new Error('not implemented: tick_round');
  }
);
