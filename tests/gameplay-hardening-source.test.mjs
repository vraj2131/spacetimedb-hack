import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('contest_tile starts a pending timed contest instead of flipping immediately', () => {
  const playerReducers = read('spacetimedb/src/reducers.player.ts');
  const tickReducers = read('spacetimedb/src/reducers.tick.ts');

  assert.match(playerReducers, /CONTEST_DURATION_MS = 3_000n/);
  assert.match(playerReducers, /SPILL_CONTEST_EXTRA_MS = 3_000n/);
  assert.match(playerReducers, /contestedBy: player\.id/);
  assert.match(playerReducers, /contestedUntilMs: nowMs \+ contestDurationMs/);
  assert.doesNotMatch(playerReducers, /ownerPlayerId: player\.id,[\s\S]{0,120}contestedBy: undefined/);

  assert.match(tickReducers, /resolveExpiredContests/);
  assert.match(tickReducers, /ownerPlayerId: attackerId/);
  assert.match(tickReducers, /eventType: 'takeover'/);
  assert.match(tickReducers, /resolveExpiredContests\(ctx, room\.id, nowMs\);[\s\S]*applyTileIncome/);
});

test('shield blocks contests and spill extends contest duration', () => {
  const playerReducers = read('spacetimedb/src/reducers.player.ts');
  const spectatorReducers = read('spacetimedb/src/reducers.spectator.ts');

  assert.match(playerReducers, /tile is shielded/);
  assert.match(playerReducers, /tile is already contested/);
  assert.match(playerReducers, /tile\.spillUntilMs/);
  assert.match(spectatorReducers, /SPILL_CONTEST_EXTRA_MS = 3_000n/);
  assert.match(spectatorReducers, /contestedUntilMs:[\s\S]*SPILL_CONTEST_EXTRA_MS/);
});

test('no gameplay reducer remains a not implemented stub', () => {
  const reducers = [
    'spacetimedb/src/reducers.player.ts',
    'spacetimedb/src/reducers.room.ts',
    'spacetimedb/src/reducers.spectator.ts',
    'spacetimedb/src/reducers.tick.ts',
  ].map(read).join('\n');

  assert.doesNotMatch(reducers, /not implemented/);
});
