import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';
import { timestampMs } from './time';

const ENERGY_COST: Record<string, number> = {
  spill_slick: 3,
  deli_shield: 3,
  coffee_boost: 4,
};

const SPILL_DURATION_MS = 8_000n;
const SHIELD_DURATION_MS = 12_000n;
const COFFEE_BOOST_MS = 8_000n;
const SPECTATOR_EVENT_TTL_MS = 30_000n;
const SPECTATOR_POWER_COOLDOWN_MS = 4_000n;
const SPILL_CONTEST_EXTRA_MS = 3_000n;

// trigger_spectator_event(event_type, target_player_id?, target_tile_id?)
//   -> spectator only; live; energy + cooldown check; apply effect; deduct energy.
//   Powers: coffee_boost (player), spill_slick (tile), deli_shield (tile).
export const triggerSpectatorEvent = spacetimedb.reducer(
  { name: 'trigger_spectator_event' },
  {
    eventType: t.string(),
    targetPlayerId: t.option(t.u32()),
    targetTileId: t.option(t.u32()),
  },
  (ctx, { eventType, targetPlayerId, targetTileId }) => {
    // --- Caller must be a registered spectator in a live room ---
    const caller = [...ctx.db.players.identity.filter(ctx.sender)][0];
    if (!caller) {
      throw new SenderError('trigger_spectator_event: caller is not a registered player');
    }
    if (caller.role !== 'spectator') {
      throw new SenderError('trigger_spectator_event: caller is not a spectator');
    }
    if (caller.roomId === 0) {
      throw new SenderError('trigger_spectator_event: caller is not in a room');
    }

    const room = ctx.db.rooms.id.find(caller.roomId);
    if (!room) {
      throw new SenderError('trigger_spectator_event: room not found');
    }
    if (room.state !== 'live') {
      throw new SenderError('trigger_spectator_event: room is not live');
    }

    // --- Validate event type ---
    const cost = ENERGY_COST[eventType];
    if (cost === undefined) {
      throw new SenderError('trigger_spectator_event: unknown event type');
    }

    // --- Energy check ---
    const spectatorState = ctx.db.spectator_state.playerId.find(caller.id);
    if (!spectatorState) {
      throw new SenderError('trigger_spectator_event: spectator state not found');
    }
    if (spectatorState.energy < cost) {
      throw new SenderError('trigger_spectator_event: not enough energy');
    }

    const nowMs = timestampMs(ctx);
    const lastActionAtMs = BigInt(spectatorState.lastActionAtMs);
    if (
      lastActionAtMs !== 0n &&
      nowMs - lastActionAtMs < SPECTATOR_POWER_COOLDOWN_MS
    ) {
      throw new SenderError('trigger_spectator_event: cooldown active');
    }
    let message = '';

    if (eventType === 'spill_slick') {
      // --- spill_slick: requires targetTileId, tile must exist in room ---
      if (targetTileId === undefined || targetTileId === null) {
        throw new SenderError('trigger_spectator_event: spill_slick requires targetTileId');
      }
      const tile = ctx.db.tiles.id.find(targetTileId);
      if (!tile || tile.roomId !== room.id) {
        throw new SenderError('trigger_spectator_event: target tile not found in room');
      }
      ctx.db.tiles.id.update({
        ...tile,
        spillUntilMs: nowMs + SPILL_DURATION_MS,
        contestedUntilMs:
          tile.contestedBy !== undefined && tile.contestedBy !== null
            ? BigInt(tile.contestedUntilMs) + SPILL_CONTEST_EXTRA_MS
            : tile.contestedUntilMs,
      });
      message = `Spectator ${caller.name} spilled slick on (${tile.x},${tile.y})`;
    } else if (eventType === 'deli_shield') {
      // --- deli_shield: requires targetTileId, tile must exist in room ---
      if (targetTileId === undefined || targetTileId === null) {
        throw new SenderError('trigger_spectator_event: deli_shield requires targetTileId');
      }
      const tile = ctx.db.tiles.id.find(targetTileId);
      if (!tile || tile.roomId !== room.id) {
        throw new SenderError('trigger_spectator_event: target tile not found in room');
      }
      ctx.db.tiles.id.update({ ...tile, shieldUntilMs: nowMs + SHIELD_DURATION_MS });
      message = `Spectator ${caller.name} shielded (${tile.x},${tile.y})`;
    } else if (eventType === 'coffee_boost') {
      // --- coffee_boost: requires targetPlayerId, playerState must exist in room ---
      if (targetPlayerId === undefined || targetPlayerId === null) {
        throw new SenderError('trigger_spectator_event: coffee_boost requires targetPlayerId');
      }
      const playerState = ctx.db.player_state.playerId.find(targetPlayerId);
      if (!playerState || playerState.roomId !== room.id) {
        throw new SenderError('trigger_spectator_event: target player not found in room');
      }
      ctx.db.player_state.playerId.update({ ...playerState, speedUntilMs: nowMs + COFFEE_BOOST_MS });
      const targetPlayer = ctx.db.players.id.find(targetPlayerId);
      message = `Spectator ${caller.name} boosted ${targetPlayer?.name ?? 'unknown'}`;
    }

    // --- Deduct energy and update lastActionAtMs ---
    ctx.db.spectator_state.playerId.update({
      ...spectatorState,
      energy: spectatorState.energy - cost,
      lastActionAtMs: nowMs,
    });

    // --- Insert event row ---
    ctx.db.events.insert({
      id: 0n, // auto-increment
      roomId: room.id,
      eventType,
      sourcePlayerId: caller.id,
      targetPlayerId: targetPlayerId ?? undefined,
      targetTileId: targetTileId ?? undefined,
      message,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + SPECTATOR_EVENT_TTL_MS,
    });
  }
);
