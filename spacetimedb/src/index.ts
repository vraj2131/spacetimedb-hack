/**
 * Module entry barrel.
 *
 * Thin on purpose: the schema lives in `schema.ts`, tables in `tables.ts`, and
 * reducers in `reducers.*.ts`. This file just wires them into the single
 * default export (the schema) plus the named reducer exports SpacetimeDB needs
 * to register. Re-exporting also imports each reducer module, so their
 * `spacetimedb.reducer(...)` registrations run.
 */
import spacetimedb from './schema';

export default spacetimedb;

// Dev / scaffold (temporary round-trip proof + lifecycle hooks).
export { init, onConnect, onDisconnect } from './reducers.dev';

// Room lifecycle.
export {
  createRoom,
  joinRoom,
  leaveRoom,
  closeRoom,
  startRound,
  endRound,
  rematch,
  resetDemoRoom,
} from './reducers.room';

// Scheduled tick.
export { tickRound } from './reducers.tick';

// Player actions.
export {
  registerPlayer,
  movePlayer,
  claimTile,
  contestTile,
  collectPickup,
} from './reducers.player';

// Spectator.
export { triggerSpectatorEvent } from './reducers.spectator';

// Flavor (LLM taunts / recap).
export { postTaunt } from './reducers.flavor';
