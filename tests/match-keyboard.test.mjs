import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const repoRoot = process.cwd();

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('directionForMoveKey maps WASD and arrow keys', async () => {
  const { directionForMoveKey } = await import(
    pathToFileURL(join(repoRoot, 'src/hooks/useMatchMoveKeyboard.ts')).href
  );

  assert.equal(directionForMoveKey('ArrowUp'), 'up');
  assert.equal(directionForMoveKey('ArrowDown'), 'down');
  assert.equal(directionForMoveKey('ArrowLeft'), 'left');
  assert.equal(directionForMoveKey('ArrowRight'), 'right');
  assert.equal(directionForMoveKey('KeyW'), 'up');
  assert.equal(directionForMoveKey('KeyS'), 'down');
  assert.equal(directionForMoveKey('KeyA'), 'left');
  assert.equal(directionForMoveKey('KeyD'), 'right');
  assert.equal(directionForMoveKey('KeyQ'), null);
});

test('Match screen wires keyboard movement for live players', () => {
  const match = read('src/screens/Match.tsx');

  assert.match(match, /useMatchMoveKeyboard/);
  assert.match(match, /keyboardMoveEnabled/);
  assert.match(match, /onMove: actions\.onMove/);
});
