import spacetimedb from './schema';

/**
 * Dev / scaffold lifecycle hooks.
 *
 * Gameplay reducers own room/player sync; DevSync proves the round trip via
 * subscribed `rooms` and `players` rows instead of a temporary sync table.
 */

export const init = spacetimedb.init(_ctx => {
  // Module bootstrap — no seed rows required.
});

export const onConnect = spacetimedb.clientConnected(_ctx => {
  // Called every time a new client connects.
});

export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {
  // Called every time a client disconnects.
});
