import { schema } from 'spacetimedb/server';
import {
  rooms,
  players,
  playerState,
  spectatorState,
  tiles,
  pickups,
  events,
  taunts,
  roundResults,
} from './tables';
import { roundTick, registerTickReducer } from './reducers.tick';

/**
 * The single SpacetimeDB schema instance for the module.
 *
 * Lives in its own file so every reducer file can import the same `spacetimedb`
 * handle without importing the entry barrel (avoids an import cycle). The keys
 * here become the table accessor names on the server `ctx.db` and in the
 * generated client bindings.
 */
const spacetimedb = schema({
  rooms,
  players,
  player_state: playerState,
  spectator_state: spectatorState,
  tiles,
  pickups,
  events,
  taunts,
  round_results: roundResults,
  round_tick: roundTick,
});

registerTickReducer(spacetimedb);

export type AppSchema = typeof spacetimedb;
export default spacetimedb;
