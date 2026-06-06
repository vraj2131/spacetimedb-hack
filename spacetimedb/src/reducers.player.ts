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

/** Player token colors, cycled by registration order. */
const PLAYER_COLORS = ['#0f766e', '#dc2626', '#ca8a04', '#2563eb'];

// register_player(name, role) -> create player; reject empty name.
export const registerPlayer = spacetimedb.reducer(
  { name: 'register_player' },
  { name: t.string(), role: t.string() },
  (ctx, { name, role }) => {
    const trimmed = name.trim();
    if (trimmed === '') {
      throw new Error('register_player: name must not be empty');
    }
    if (role !== 'player' && role !== 'spectator') {
      throw new Error("register_player: role must be 'player' or 'spectator'");
    }
    // One registration per identity.
    if ([...ctx.db.players.identity.filter(ctx.sender)][0]) {
      throw new Error('register_player: caller is already registered');
    }

    const color = PLAYER_COLORS[Number(ctx.db.players.count()) % PLAYER_COLORS.length];

    ctx.db.players.insert({
      id: 0, // auto-increment
      identity: ctx.sender,
      roomId: 0, // not in a room yet
      name: trimmed,
      role,
      color,
      connected: true,
      joinedAtMs: ctx.timestamp.toMillis(),
    });
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
    if (player.role !== 'player') {
      throw new Error('move_player: only players can move');
    }

    const room = ctx.db.rooms.id.find(player.roomId);
    if (!room || room.state !== 'live') {
      throw new Error('move_player: round is not live');
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

/** Claim-event lifetime in the feed (ms). */
const CLAIM_EVENT_TTL_MS = 30_000n;

// claim_tile(tile_id) -> player only; adjacent only; set ownership; append event.
export const claimTile = spacetimedb.reducer(
  { name: 'claim_tile' },
  { tileId: t.u32() },
  (ctx, { tileId }) => {
    const player = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!player) {
      throw new Error('claim_tile: caller is not a registered player');
    }
    if (player.role !== 'player') {
      throw new Error('claim_tile: only players can claim');
    }

    const room = ctx.db.rooms.id.find(player.roomId);
    if (!room || room.state !== 'live') {
      throw new Error('claim_tile: round is not live');
    }

    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      throw new Error('claim_tile: no player_state (round not started)');
    }

    const tile = ctx.db.tiles.id.find(tileId);
    if (!tile) {
      throw new Error('claim_tile: tile not found');
    }
    if (tile.roomId !== player.roomId) {
      throw new Error('claim_tile: tile belongs to another room');
    }
    if (tile.tileType === 'alley') {
      throw new Error('claim_tile: cannot claim an alley tile');
    }

    // Manhattan-adjacent only (no diagonal, no claiming your own cell).
    const distance = Math.abs(tile.x - state.x) + Math.abs(tile.y - state.y);
    if (distance !== 1) {
      throw new Error('claim_tile: tile is not adjacent');
    }

    // Pigeon block consumes this claim. SpacetimeDB reducers are atomic, so we
    // cannot both clear the flag and throw (the throw would roll back the
    // clear). We therefore consume the block by clearing it and skipping the
    // claim — the action fizzles for this turn. (No reducer sets pigeonBlocked
    // yet; this is forward-looking once spectator events land.)
    if (state.pigeonBlocked) {
      ctx.db.player_state.playerId.update({ ...state, pigeonBlocked: false });
      return;
    }

    ctx.db.tiles.id.update({ ...tile, ownerPlayerId: player.id });

    const nowMs = ctx.timestamp.toMillis();
    ctx.db.events.insert({
      id: 0n, // auto-increment
      roomId: player.roomId,
      eventType: 'claim',
      sourcePlayerId: player.id,
      targetPlayerId: undefined,
      targetTileId: tile.id,
      message: `${player.name} claimed (${tile.x},${tile.y})`,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + CLAIM_EVENT_TTL_MS,
    });
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
