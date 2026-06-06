import { t } from 'spacetimedb/server';
import spacetimedb from './schema';
import { MAP_WIDTH, MAP_HEIGHT, tileTypeAt } from './map';

/**
 * Player action reducers.
 *
 * Signatures are the real contract. `move_player` enforces the map bounds +
 * alley rule; the rest still throw until their slice lands. See
 * bodega-blitz-cursor-brief.md "Reducers".
 */

/** One-cell step per direction (screen coords: +y is down). */
const STEP: Record<string, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// register_player(name, role) -> create player; reject empty name.
export const registerPlayer = spacetimedb.reducer(
  { name: 'register_player' },
  { name: t.string(), role: t.string() },
  _ctx => {
    throw new Error('not implemented: register_player');
  }
);

// move_player(direction) -> one cell in `direction`; reject off-map / alley.
export const movePlayer = spacetimedb.reducer(
  { name: 'move_player' },
  { direction: t.string() },
  (ctx, { direction }) => {
    const step = STEP[direction];
    if (!step) {
      throw new Error(`move_player: unknown direction '${direction}'`);
    }

    const player = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!player) {
      throw new Error('move_player: caller is not a registered player');
    }

    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      throw new Error('move_player: no player_state (round not started)');
    }

    const targetX = state.x + step.dx;
    const targetY = state.y + step.dy;

    // Bounds: reject off-map; do not clamp or wrap.
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX >= MAP_WIDTH ||
      targetY >= MAP_HEIGHT
    ) {
      throw new Error('move_player: target is off the map');
    }
    if (tileTypeAt(targetX, targetY) === 'alley') {
      throw new Error('move_player: cannot move onto an alley tile');
    }

    ctx.db.player_state.playerId.update({
      ...state,
      x: targetX,
      y: targetY,
      lastMoveAtMs: ctx.timestamp.toMillis(),
    });
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
