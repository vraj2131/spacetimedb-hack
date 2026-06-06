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

test('Match screen uses outside-chrome layout with fullscreen GameStage', () => {
  const match = read('src/screens/Match.tsx');

  assert.doesNotMatch(match, /BoardShell/);
  assert.doesNotMatch(match, /<PhaserGame/);
  assert.doesNotMatch(match, /match-overlay/);
  assert.doesNotMatch(match, /CountdownOverlay/);
  assert.doesNotMatch(match, /<Hud/);

  assert.match(match, /GameStage/);
  assert.match(match, /renderState=\{renderState\}/);
  assert.match(match, /onTileClick=\{handleTileClick\}/);
  assert.match(match, /cameraMode=\{viewModel\.isSpectator \? 'overview' : 'follow'\}/);
  assert.match(match, /localPlayerId=\{localPlayerId/);
  assert.match(match, /match-screen/);
  assert.match(match, /match-body/);
  assert.match(match, /MatchTopBar/);
  assert.match(match, /MatchBottomDock/);
  assert.match(match, /EventFeed/);
  assert.match(match, /TauntBubble/);
  assert.match(match, /variant="compact"/);
  assert.match(match, /tileActionMode/);
  assert.match(match, /handleCollect/);

  const bottomDock = read('src/components/MatchBottomDock.tsx');
  assert.match(bottomDock, /actions\.onMove/);
  assert.match(bottomDock, /Claim/);
  assert.match(bottomDock, /Contest/);
  assert.match(bottomDock, /Collect/);

  const topBar = read('src/components/MatchTopBar.tsx');
  assert.match(topBar, /Leave/);
  assert.match(topBar, /Lobby/);
});

test('DevSync scaffold still uses the boxed panel layout', () => {
  const devSync = read('src/components/DevSync.tsx');

  assert.doesNotMatch(devSync, /GameStage/);
  assert.match(devSync, /phaser-panel/);
  assert.match(devSync, /<PhaserGame/);
});
