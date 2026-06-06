import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Post-generate contract test for src/module_bindings/.
 *
 * Bindings are gitignored; run `npm run spacetime:generate` before this suite.
 * CI generates bindings before build/test.
 */

const EXPECTED_TABLES = [
  'sync_state',
  'rooms',
  'players',
  'player_state',
  'spectator_state',
  'tiles',
  'pickups',
  'events',
  'taunts',
  'round_results',
  'round_tick',
];

const EXPECTED_REDUCERS = [
  'set_value',
  'create_room',
  'join_room',
  'start_round',
  'end_round',
  'rematch',
  'reset_demo_room',
  'tick_round',
  'register_player',
  'move_player',
  'claim_tile',
  'contest_tile',
  'collect_pickup',
  'trigger_spectator_event',
  'post_taunt',
];

test('generated bindings directory exists after spacetime:generate', () => {
  assert.ok(
    existsSync('src/module_bindings/index.ts'),
    'Missing src/module_bindings/index.ts — run npm run spacetime:generate'
  );
});

test('generated bindings expose every table from the Wave 0 schema', () => {
  const index = readFileSync('src/module_bindings/index.ts', 'utf8');
  for (const table of EXPECTED_TABLES) {
    assert.match(index, new RegExp(`name: '${table}'`), `table ${table} missing from bindings`);
  }
});

test('generated bindings expose every reducer from the Wave 0 schema', () => {
  const index = readFileSync('src/module_bindings/index.ts', 'utf8');
  for (const reducer of EXPECTED_REDUCERS) {
    assert.match(
      index,
      new RegExp(`__reducerSchema\\("${reducer}"`),
      `reducer ${reducer} missing from bindings`
    );
  }
});

test('generated bindings export tables and DbConnection for the client', () => {
  const index = readFileSync('src/module_bindings/index.ts', 'utf8');
  assert.match(index, /export const tables/);
  assert.match(index, /export class DbConnection/);
});

test('DevSync can import sync_state from generated tables', () => {
  const devSync = readFileSync('src/components/DevSync.tsx', 'utf8');
  assert.match(devSync, /tables\.sync_state/);
  assert.match(devSync, /conn\?\.reducers\.setValue/);
});
