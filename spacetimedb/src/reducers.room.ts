import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  SPAWN_POINTS,
  MAX_SPAWN_SEATS,
  tileTypeAt,
  incomeForTileType,
} from './map';
import { timestampMs } from './time';
import { finishRound } from './roundEnd';
import { scheduleNextTick } from './reducers.tick';

/**
 * Room lifecycle reducers.
 *
 * Signatures (params/names) are the real contract so generated bindings and
 * client wiring are stable. `start_round` is implemented; the rest still throw
 * until their slice lands. See bodega-blitz-cursor-brief.md "Reducers".
 */

/** Round length in milliseconds (90s per the brief). */
const ROUND_DURATION_MS = 90_000n;

/** Characters used for room join codes (uppercase alphanumeric). */
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

// create_room() -> room in lobby; generate short code; set host identity.
export const createRoom = spacetimedb.reducer({ name: 'create_room' }, ctx => {
  const caller = [...ctx.db.players.identity.filter(ctx.sender)][0];
  if (!caller) {
    throw new SenderError('create_room: caller is not a registered player');
  }
  if (caller.roomId !== 0) {
    throw new SenderError('create_room: caller is already in a room');
  }

  const nowMs = timestampMs(ctx);

  // Generate a 6-char code unique across existing rooms (retry on collision).
  let code = '';
  for (let attempt = 0; ; attempt++) {
    if (attempt >= 20) {
      throw new Error('create_room: could not generate a unique room code');
    }
    code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[ctx.random.integerInRange(0, CODE_ALPHABET.length - 1)];
    }
    if (!ctx.db.rooms.code.find(code)) {
      break;
    }
  }

  const room = ctx.db.rooms.insert({
    id: 0, // auto-increment
    code,
    state: 'lobby',
    hostIdentity: ctx.sender,
    roundNumber: 1,
    seed: ctx.random.bigintInRange(0n, 0xffff_ffff_ffff_ffffn),
    startsAtMs: 0n,
    endsAtMs: 0n,
    createdAtMs: nowMs,
  });

  ctx.db.players.id.update({ ...caller, roomId: room.id });
});

// join_room(room_code) -> attach to room; reject if missing/full.
export const joinRoom = spacetimedb.reducer(
  { name: 'join_room' },
  { roomCode: t.string() },
  (ctx, { roomCode }) => {
    const code = roomCode.trim().toUpperCase();
    const room = ctx.db.rooms.code.find(code);
    if (!room) {
      throw new SenderError('join_room: room not found');
    }

    const caller = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!caller) {
      throw new SenderError('join_room: caller is not a registered player');
    }
    if (caller.roomId !== 0) {
      throw new SenderError('join_room: caller is already in a room');
    }

    // Players can only join a lobby/results room with an open seat; spectators
    // may join at any time (including a live round) to watch.
    if (caller.role === 'player') {
      if (room.state === 'live') {
        throw new SenderError('join_room: round is in progress');
      }
      const seatedPlayers = [...ctx.db.players.roomId.filter(room.id)].filter(
        p => p.role === 'player'
      ).length;
      if (seatedPlayers >= MAX_SPAWN_SEATS) {
        throw new SenderError('join_room: room is full');
      }
    }

    ctx.db.players.id.update({
      ...caller,
      roomId: room.id,
      joinedAtMs: timestampMs(ctx),
    });

    if (caller.role === 'spectator') {
      ctx.db.spectator_state.insert({
        playerId: caller.id,
        roomId: room.id,
        energy: 10,
        lastActionAtMs: 0n,
      });
    }
  }
);

// start_round(room_id) -> host only; seed tiles, spawn players, set timers.
export const startRound = spacetimedb.reducer(
  { name: 'start_round' },
  { roomId: t.u32() },
  (ctx, { roomId }) => {
    const room = ctx.db.rooms.id.find(roomId);
    if (!room) {
      throw new SenderError('start_round: room not found');
    }
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('start_round: only the host can start the round');
    }
    // Must be in lobby — this also guards against double-seeding a live round.
    if (room.state !== 'lobby') {
      throw new SenderError('start_round: room is not in lobby');
    }

    const nowMs = timestampMs(ctx);

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

    const spectators = [...ctx.db.spectator_state.roomId.filter(roomId)];
    for (const spec of spectators) {
      ctx.db.spectator_state.playerId.update({ ...spec, energy: 10, lastActionAtMs: 0n });
    }

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

    // Seed pickups: 4 cash, 3 coffee, 3 shield on random non-alley tiles.
    ctx.db.pickups.roomId.delete(roomId);

    const nonAlleyTiles: { x: number; y: number }[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        if (tileTypeAt(x, y) !== 'alley') {
          nonAlleyTiles.push({ x, y });
        }
      }
    }

    const pickupDefs: { pickupType: string; value: number }[] = [
      { pickupType: 'cash', value: 5 },
      { pickupType: 'cash', value: 5 },
      { pickupType: 'cash', value: 5 },
      { pickupType: 'cash', value: 5 },
      { pickupType: 'coffee', value: 0 },
      { pickupType: 'coffee', value: 0 },
      { pickupType: 'coffee', value: 0 },
      { pickupType: 'shield', value: 0 },
      { pickupType: 'shield', value: 0 },
      { pickupType: 'shield', value: 0 },
    ];

    for (const def of pickupDefs) {
      const idx = ctx.random.integerInRange(0, nonAlleyTiles.length - 1);
      const pos = nonAlleyTiles[idx];
      ctx.db.pickups.insert({
        id: 0, // auto-increment
        roomId,
        x: pos.x,
        y: pos.y,
        pickupType: def.pickupType,
        value: def.value,
        active: true,
        spawnedAtMs: nowMs,
      });
    }

    ctx.db.rooms.id.update({
      ...room,
      state: 'live',
      startsAtMs: nowMs,
      endsAtMs: nowMs + ROUND_DURATION_MS,
    });
    scheduleNextTick(ctx, roomId);
  }
);

// end_round(room_id) -> host/dev path; compute scores; write results.
export const endRound = spacetimedb.reducer(
  { name: 'end_round' },
  { roomId: t.u32() },
  (ctx, { roomId }) => {
    const room = ctx.db.rooms.id.find(roomId);
    if (!room) {
      throw new SenderError('end_round: room not found');
    }
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('end_round: only the host can end the round');
    }
    if (room.state !== 'live') {
      throw new SenderError('end_round: room is not live');
    }

    finishRound(ctx, room);
  }
);

// rematch(room_id) -> results only; clear board; keep room+players; -> lobby.
export const rematch = spacetimedb.reducer(
  { name: 'rematch' },
  { roomId: t.u32() },
  (ctx, { roomId }) => {
    const room = ctx.db.rooms.id.find(roomId);
    if (!room) {
      throw new SenderError('rematch: room not found');
    }
    if (room.hostIdentity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('rematch: only the host can rematch');
    }
    if (room.state !== 'results') {
      throw new SenderError('rematch: room is not in results');
    }

    // Clear the finished round's per-room rows; keep the room + its players.
    ctx.db.tiles.roomId.delete(roomId);
    ctx.db.player_state.roomId.delete(roomId);
    ctx.db.events.roomId.delete(roomId);
    ctx.db.round_results.roomId.delete(roomId);
    ctx.db.pickups.roomId.delete(roomId);

    ctx.db.taunts.roomId.delete(roomId);
    const spectators = [...ctx.db.spectator_state.roomId.filter(roomId)];
    for (const spec of spectators) {
      ctx.db.spectator_state.playerId.update({ ...spec, energy: 10, lastActionAtMs: 0n });
    }

    ctx.db.rooms.id.update({
      ...room,
      state: 'lobby',
      roundNumber: room.roundNumber + 1,
      startsAtMs: 0n,
      endsAtMs: 0n,
    });
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
