import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { schema, table, t, makeQueryBuilder, toSql } from 'spacetimedb';

/**
 * Spike 1 — filtered, room-scoped subscriptions via the generated query builder.
 *
 * The generated bindings can't be imported under `node --test` (they use
 * extensionless relative imports meant for the bundler), so this models the
 * exact shape the generator emits — a camelCase accessor (`roomId`) over a
 * snake_case wire column (`room_id`), i.e. `roomId: t.u32().name('room_id')` —
 * and checks the SQL the query builder produces. A second test reads the real
 * generated table file to prove the generator actually applies that mapping,
 * so the model above stays faithful to reality.
 */

function buildTables() {
  const s = schema({
    players: table(
      { name: 'players' },
      {
        id: t.u32().primaryKey().autoInc(),
        roomId: t.u32().name('room_id').index('btree'),
      }
    ),
    pickups: table(
      { name: 'pickups' },
      {
        id: t.u32().primaryKey().autoInc(),
        roomId: t.u32().name('room_id').index('btree'),
        active: t.bool(),
      }
    ),
  });
  return makeQueryBuilder(s.schemaType);
}

test('Spike 1: filtered players subscription scopes by room_id', () => {
  const tables = buildTables();
  assert.equal(
    toSql(tables.players.where(row => row.roomId.eq(7))),
    'SELECT * FROM "players" WHERE "players"."room_id" = 7'
  );
});

test('Spike 1: compound filter on pickups (room_id + active)', () => {
  const tables = buildTables();
  assert.equal(
    toSql(tables.pickups.where(row => row.roomId.eq(7).and(row.active.eq(true)))),
    'SELECT * FROM "pickups" WHERE ("pickups"."room_id" = 7) AND ("pickups"."active" = TRUE)'
  );
});

test('Spike 1: generated bindings map the roomId accessor to the room_id column', () => {
  const file = 'src/module_bindings/players_table.ts';
  assert.ok(
    existsSync(file),
    'run `npm run spacetime:generate` before this suite (CI generates first)'
  );
  const players = readFileSync(file, 'utf8');
  assert.match(players, /roomId:\s*__t\.u32\(\)\.name\("room_id"\)/);
});
