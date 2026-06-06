import { t } from 'spacetimedb/server';
import spacetimedb from './schema';

/**
 * Player action reducers — STUBS.
 *
 * Signatures are the real contract; bodies throw until the matching slice
 * implements them. See bodega-blitz-cursor-brief.md "Reducers".
 */

// register_player(name, role) -> create player; reject empty name.
export const registerPlayer = spacetimedb.reducer(
  { name: 'register_player' },
  { name: t.string(), role: t.string() },
  _ctx => {
    throw new Error('not implemented: register_player');
  }
);

// move_player(direction) -> player only; live; rate-limited; bounds/alley check.
export const movePlayer = spacetimedb.reducer(
  { name: 'move_player' },
  { direction: t.string() },
  _ctx => {
    throw new Error('not implemented: move_player');
  }
);

// claim_tile(tile_id) -> player only; adjacent only; set ownership; append event.
export const claimTile = spacetimedb.reducer(
  { name: 'claim_tile' },
  { tileId: t.u32() },
  _ctx => {
    throw new Error('not implemented: claim_tile');
  }
);

// contest_tile(tile_id) -> player only; adjacent enemy only; start takeover timer.
export const contestTile = spacetimedb.reducer(
  { name: 'contest_tile' },
  { tileId: t.u32() },
  _ctx => {
    throw new Error('not implemented: contest_tile');
  }
);

// collect_pickup(pickup_id) -> player on same cell; active only; one-time.
export const collectPickup = spacetimedb.reducer(
  { name: 'collect_pickup' },
  { pickupId: t.u32() },
  _ctx => {
    throw new Error('not implemented: collect_pickup');
  }
);
