import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';

/**
 * Dev / scaffold reducers + lifecycle hooks.
 *
 * TEMPORARY: `set_value` and the `sync_state` seeding exist only to prove the
 * end-to-end round trip (DevSync screen). They get removed once the first
 * gameplay slice replaces `sync_state` with real room/player sync.
 */

export const init = spacetimedb.init(ctx => {
  if (!ctx.db.sync_state.id.find(1)) {
    ctx.db.sync_state.insert({
      id: 1,
      value: 'first-pipe-online',
      updatedBy: 'init',
    });
  }
});

export const onConnect = spacetimedb.clientConnected(_ctx => {
  // Called every time a new client connects.
});

export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {
  // Called every time a client disconnects.
});

export const setValue = spacetimedb.reducer(
  { name: 'set_value' },
  { value: t.string() },
  (ctx, { value }) => {
    const nextValue = value.trim().slice(0, 80);
    if (nextValue.length === 0) {
      throw new SenderError('Value cannot be empty');
    }

    ctx.db.sync_state.id.update({
      id: 1,
      value: nextValue,
      updatedBy: ctx.sender.toHexString(),
    });
  }
);
