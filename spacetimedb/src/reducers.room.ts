import { t } from 'spacetimedb/server';
import spacetimedb from './schema';

/**
 * Room lifecycle reducers — STUBS.
 *
 * Signatures (params/names) are the real contract so generated bindings and
 * client wiring are stable; bodies throw until the matching slice implements
 * them. See bodega-blitz-cursor-brief.md "Reducers".
 */

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
  _ctx => {
    throw new Error('not implemented: start_round');
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
