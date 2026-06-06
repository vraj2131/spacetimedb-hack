import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';
import { MAP_WIDTH, MAP_HEIGHT, tileTypeAt } from './map';
import { gridCoord, timestampMs } from './time';

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
      throw new SenderError('register_player: name must not be empty');
    }
    if (role !== 'player' && role !== 'spectator') {
      throw new SenderError("register_player: role must be 'player' or 'spectator'");
    }
    // One registration per identity.
    if ([...ctx.db.players.identity.filter(ctx.sender)][0]) {
      throw new SenderError('register_player: caller is already registered');
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
      joinedAtMs: timestampMs(ctx),
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
      throw new SenderError(`move_player: unknown direction '${direction}'`);
    }

    const player = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!player) {
      throw new SenderError('move_player: caller is not a registered player');
    }
    if (player.role !== 'player') {
      throw new SenderError('move_player: only players can move');
    }

    const room = ctx.db.rooms.id.find(player.roomId);
    if (!room || room.state !== 'live') {
      throw new SenderError('move_player: round is not live');
    }

    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      throw new SenderError('move_player: no player_state (round not started)');
    }

    const nowMs = timestampMs(ctx);

    // Stun guard: reject movement while stunned.
    if (toNumberMs(state.disabledUntilMs) > Number(nowMs)) {
      throw new SenderError('move_player: stunned');
    }

    // Speed boost: track whether the player has an active speed buff.
    const boosted = toNumberMs(state.speedUntilMs) > Number(nowMs);

    const targetX = gridCoord(state.x) + step.dx;
    const targetY = gridCoord(state.y) + step.dy;

    // Bounds: reject off-map; do not clamp or wrap.
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX >= MAP_WIDTH ||
      targetY >= MAP_HEIGHT
    ) {
      throw new SenderError('move_player: target is off the map');
    }
    if (tileTypeAt(targetX, targetY) === 'alley') {
      throw new SenderError('move_player: cannot move onto an alley tile');
    }

    // Update position.
    ctx.db.player_state.playerId.update({
      ...state,
      x: targetX,
      y: targetY,
      lastMoveAtMs: nowMs,
    });

    // --- Post-move side-effects ---

    // Spill stun: if the destination tile has an active spill, stun the player.
    const destTile = [...ctx.db.tiles.roomId.filter(player.roomId)].find(
      t => gridCoord(t.x) === targetX && gridCoord(t.y) === targetY
    );
    if (destTile && toNumberMs(destTile.spillUntilMs) > Number(nowMs)) {
      const freshStateSpill = ctx.db.player_state.playerId.find(player.id)!;
      ctx.db.player_state.playerId.update({
        ...freshStateSpill,
        disabledUntilMs: nowMs + STUN_DURATION_MS,
      });
    }

    // Auto-collect: if an active pickup exists at the new position, collect it.
    const pickup = [...ctx.db.pickups.roomId.filter(player.roomId)].find(
      p => p.active && gridCoord(p.x) === targetX && gridCoord(p.y) === targetY
    );
    if (pickup) {
      const freshState = ctx.db.player_state.playerId.find(player.id)!;

      if (pickup.pickupType === 'cash') {
        ctx.db.player_state.playerId.update({
          ...freshState,
          cash: freshState.cash + pickup.value,
          pickupCashTotal: freshState.pickupCashTotal + pickup.value,
        });
      } else if (pickup.pickupType === 'coffee') {
        ctx.db.player_state.playerId.update({
          ...freshState,
          speedUntilMs: nowMs + COFFEE_BOOST_MS,
        });
      } else if (pickup.pickupType === 'shield') {
        // Shield the destination tile.
        if (destTile) {
          // Re-read tile in case it was updated by spill check above (it wasn't, but be safe).
          const freshTile = ctx.db.tiles.id.find(destTile.id)!;
          ctx.db.tiles.id.update({ ...freshTile, shieldUntilMs: nowMs + SHIELD_DURATION_MS });
        }
      }

      // Deactivate the pickup.
      ctx.db.pickups.id.update({ ...pickup, active: false });

      // Insert pickup event.
      ctx.db.events.insert({
        id: 0n, // auto-increment
        roomId: player.roomId,
        eventType: 'pickup',
        sourcePlayerId: player.id,
        targetPlayerId: undefined,
        targetTileId: undefined,
        message: `${player.name} collected ${pickup.pickupType}`,
        createdAtMs: nowMs,
        expiresAtMs: nowMs + PICKUP_EVENT_TTL_MS,
      });
    }
  }
);

/** Convert a number or bigint millisecond value to a plain number. */
function toNumberMs(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

/** Stun duration when stepping on a spill (ms). */
const STUN_DURATION_MS = 3_000n;

/** Pickup-event lifetime in the feed (ms). */
const PICKUP_EVENT_TTL_MS = 30_000n;

/** Coffee speed boost duration (ms). */
const COFFEE_BOOST_MS = 10_000n;

/** Shield duration on a tile (ms). */
const SHIELD_DURATION_MS = 15_000n;

/** Claim-event lifetime in the feed (ms). */
const CLAIM_EVENT_TTL_MS = 30_000n;

/** Contest-event lifetime in the feed (ms). */
const CONTEST_EVENT_TTL_MS = 30_000n;

// claim_tile(tile_id) -> player only; adjacent only; set ownership; append event.
export const claimTile = spacetimedb.reducer(
  { name: 'claim_tile' },
  { tileId: t.u32() },
  (ctx, { tileId }) => {
    const player = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!player) {
      throw new SenderError('claim_tile: caller is not a registered player');
    }
    if (player.role !== 'player') {
      throw new SenderError('claim_tile: only players can claim');
    }

    const room = ctx.db.rooms.id.find(player.roomId);
    if (!room || room.state !== 'live') {
      throw new SenderError('claim_tile: round is not live');
    }

    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      throw new SenderError('claim_tile: no player_state (round not started)');
    }

    const tile = ctx.db.tiles.id.find(tileId);
    if (!tile) {
      throw new SenderError('claim_tile: tile not found');
    }
    if (tile.roomId !== player.roomId) {
      throw new SenderError('claim_tile: tile belongs to another room');
    }
    if (tile.tileType === 'alley') {
      throw new SenderError('claim_tile: cannot claim an alley tile');
    }

    // Manhattan-adjacent only (no diagonal, no claiming your own cell).
    const distance =
      Math.abs(gridCoord(tile.x) - gridCoord(state.x)) +
      Math.abs(gridCoord(tile.y) - gridCoord(state.y));
    if (distance !== 1) {
      throw new SenderError('claim_tile: tile is not adjacent');
    }

    // The brief specifies "reject+clear if pigeon-blocked", but SpacetimeDB
    // reducers are atomic: a throw rolls back every write in the call, including
    // the clear. So "reject AND clear" is impossible. We honor the gameplay
    // intent (a pigeon costs you one claim) by consuming the block — clear the
    // flag and skip the claim, so the action fizzles for this turn. Not yet
    // reachable in tests: no reducer sets pigeonBlocked until the spectator
    // pigeon power lands, which should also decide on player-facing feedback.
    if (state.pigeonBlocked) {
      ctx.db.player_state.playerId.update({ ...state, pigeonBlocked: false });
      return;
    }

    ctx.db.tiles.id.update({ ...tile, ownerPlayerId: player.id });

    const nowMs = timestampMs(ctx);
    ctx.db.events.insert({
      id: 0n, // auto-increment
      roomId: player.roomId,
      eventType: 'claim',
      sourcePlayerId: player.id,
      targetPlayerId: undefined,
      targetTileId: tile.id,
      message: `${player.name} claimed (${gridCoord(tile.x)},${gridCoord(tile.y)})`,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + CLAIM_EVENT_TTL_MS,
    });
  }
);

// contest_tile(tile_id) -> player only; adjacent enemy tile; instant takeover.
export const contestTile = spacetimedb.reducer(
  { name: 'contest_tile' },
  { tileId: t.u32() },
  (ctx, { tileId }) => {
    const player = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!player) {
      throw new SenderError('contest_tile: caller is not a registered player');
    }
    if (player.role !== 'player') {
      throw new SenderError('contest_tile: only players can contest');
    }

    const room = ctx.db.rooms.id.find(player.roomId);
    if (!room || room.state !== 'live') {
      throw new SenderError('contest_tile: round is not live');
    }

    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      throw new SenderError('contest_tile: no player_state (round not started)');
    }

    const tile = ctx.db.tiles.id.find(tileId);
    if (!tile) {
      throw new SenderError('contest_tile: tile not found');
    }
    if (tile.roomId !== player.roomId) {
      throw new SenderError('contest_tile: tile belongs to another room');
    }

    // Tile must be owned by a different player.
    if (tile.ownerPlayerId === undefined || tile.ownerPlayerId === null) {
      throw new SenderError('contest_tile: tile is not owned');
    }
    if (tile.ownerPlayerId === player.id) {
      throw new SenderError('contest_tile: cannot contest your own tile');
    }

    // Manhattan-adjacent only (distance === 1).
    const distance =
      Math.abs(gridCoord(tile.x) - gridCoord(state.x)) +
      Math.abs(gridCoord(tile.y) - gridCoord(state.y));
    if (distance !== 1) {
      throw new SenderError('contest_tile: tile is not adjacent');
    }

    const nowMs = timestampMs(ctx);

    // Tile must not be shielded.
    if (toNumberMs(tile.shieldUntilMs) > toNumberMs(nowMs)) {
      throw new SenderError('contest_tile: tile is shielded');
    }

    const previousOwner = tile.ownerPlayerId;

    // Instant takeover: set ownership, clear contest fields.
    ctx.db.tiles.id.update({
      ...tile,
      ownerPlayerId: player.id,
      contestedBy: undefined,
      contestedUntilMs: 0n,
    });

    // Update caller's last contest timestamp.
    ctx.db.player_state.playerId.update({
      ...state,
      lastContestAtMs: nowMs,
    });

    // Insert contest event.
    ctx.db.events.insert({
      id: 0n, // auto-increment
      roomId: player.roomId,
      eventType: 'contest',
      sourcePlayerId: player.id,
      targetPlayerId: previousOwner,
      targetTileId: tile.id,
      message: `${player.name} contested (${gridCoord(tile.x)},${gridCoord(tile.y)})`,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + CONTEST_EVENT_TTL_MS,
    });
  }
);

// collect_pickup(pickup_id) -> player on same cell; active only; one-time.
export const collectPickup = spacetimedb.reducer(
  { name: 'collect_pickup' },
  { pickupId: t.u32() },
  (ctx, { pickupId }) => {
    const player = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!player) {
      throw new SenderError('collect_pickup: caller is not a registered player');
    }
    if (player.role !== 'player') {
      throw new SenderError('collect_pickup: only players can collect pickups');
    }

    const room = ctx.db.rooms.id.find(player.roomId);
    if (!room || room.state !== 'live') {
      throw new SenderError('collect_pickup: round is not live');
    }

    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      throw new SenderError('collect_pickup: no player_state (round not started)');
    }

    const pickup = ctx.db.pickups.id.find(pickupId);
    if (!pickup) {
      throw new SenderError('collect_pickup: pickup not found');
    }
    if (pickup.roomId !== player.roomId) {
      throw new SenderError('collect_pickup: pickup belongs to another room');
    }
    if (!pickup.active) {
      throw new SenderError('collect_pickup: pickup is not active');
    }

    // Must be standing on the same tile as the pickup.
    if (
      gridCoord(pickup.x) !== gridCoord(state.x) ||
      gridCoord(pickup.y) !== gridCoord(state.y)
    ) {
      throw new SenderError('collect_pickup: not on the pickup tile');
    }

    const nowMs = timestampMs(ctx);

    // Apply pickup effect by type.
    if (pickup.pickupType === 'cash') {
      ctx.db.player_state.playerId.update({
        ...state,
        cash: state.cash + pickup.value,
        pickupCashTotal: state.pickupCashTotal + pickup.value,
      });
    } else if (pickup.pickupType === 'coffee') {
      ctx.db.player_state.playerId.update({
        ...state,
        speedUntilMs: nowMs + COFFEE_BOOST_MS,
      });
    } else if (pickup.pickupType === 'shield') {
      // Find the tile at the pickup's position and shield it.
      const tile = [...ctx.db.tiles.roomId.filter(player.roomId)].find(
        t => t.x === pickup.x && t.y === pickup.y
      );
      if (tile) {
        ctx.db.tiles.id.update({ ...tile, shieldUntilMs: nowMs + SHIELD_DURATION_MS });
      }
    }

    // Deactivate the pickup.
    ctx.db.pickups.id.update({ ...pickup, active: false });

    // Insert pickup event.
    ctx.db.events.insert({
      id: 0n, // auto-increment
      roomId: player.roomId,
      eventType: 'pickup',
      sourcePlayerId: player.id,
      targetPlayerId: undefined,
      targetTileId: undefined,
      message: `${player.name} collected ${pickup.pickupType}`,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + PICKUP_EVENT_TTL_MS,
    });
  }
);
