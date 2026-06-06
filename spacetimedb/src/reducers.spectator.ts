import { t } from 'spacetimedb/server';
import spacetimedb from './schema';

/**
 * Spectator reducers — STUBS.
 *
 * Signature is the real contract; body throws until the spectator slice
 * implements it. See bodega-blitz-cursor-brief.md "Reducers" + "Spectator design".
 */

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
  _ctx => {
    throw new Error('not implemented: trigger_spectator_event');
  }
);
