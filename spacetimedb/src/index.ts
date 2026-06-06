import { schema, table, t } from 'spacetimedb/server';

const syncState = table(
  { name: 'sync_state', public: true },
  {
    id: t.u32().primaryKey(),
    value: t.string(),
    updatedBy: t.string(),
  }
);

const spacetimedb = schema({ sync_state: syncState });
export default spacetimedb;

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
  // Called every time a new client connects
});

export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {
  // Called every time a client disconnects
});

export const setValue = spacetimedb.reducer(
  { name: 'set_value' },
  { value: t.string() },
  (ctx, { value }) => {
    const nextValue = value.trim().slice(0, 80);
    if (nextValue.length === 0) {
      throw new Error('Value cannot be empty');
    }

    ctx.db.sync_state.id.update({
      id: 1,
      value: nextValue,
      updatedBy: ctx.sender.toHexString(),
    });
  }
);
