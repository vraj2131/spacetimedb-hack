import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('GameStage measures its container and passes viewport dimensions to PhaserGame', () => {
  const gameStage = read('src/components/GameStage.tsx');

  assert.match(gameStage, /ResizeObserver/);
  assert.match(gameStage, /viewportWidth=\{size\.width\}/);
  assert.match(gameStage, /viewportHeight=\{size\.height\}/);
  assert.match(gameStage, /<PhaserGame/);
});

test('Match screen uses fullscreen GameStage instead of BoardShell', () => {
  const match = read('src/screens/Match.tsx');

  assert.doesNotMatch(match, /BoardShell/);
  assert.doesNotMatch(match, /<PhaserGame/);
  assert.match(match, /GameStage/);
  assert.match(match, /cameraMode="overview"/);
  assert.match(match, /match-screen/);
  assert.match(match, /match-overlay/);
});

test('DevSync scaffold still uses the boxed panel layout', () => {
  const devSync = read('src/components/DevSync.tsx');

  assert.doesNotMatch(devSync, /GameStage/);
  assert.match(devSync, /phaser-panel/);
  assert.match(devSync, /<PhaserGame/);
});
