import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Enforce the RenderState firewall: Phaser code must not import module_bindings.
 */

function collectTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      out.push(...collectTsFiles(path));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

test('src/game/ never imports module_bindings (RenderState firewall)', () => {
  const gameFiles = collectTsFiles('src/game');
  assert.ok(gameFiles.length > 0, 'expected at least one file under src/game/');
  for (const file of gameFiles) {
    const src = readFileSync(file, 'utf8');
    assert.ok(
      !src.includes('module_bindings'),
      `${file} must not import module_bindings — Phaser reads RenderState only`
    );
  }
});

test('PhaserGame consumes RenderState, not raw DB rows', () => {
  const phaserGame = readFileSync('src/game/PhaserGame.tsx', 'utf8');
  assert.match(phaserGame, /RenderState/);
  assert.match(phaserGame, /new Phaser\.Game/);
  assert.match(phaserGame, /game\.destroy\(true\)/);
});

test('EventBus exposes renderState and tile click events', () => {
  const eventBus = readFileSync('src/game/EventBus.ts', 'utf8');
  assert.match(eventBus, /renderState:update/);
  assert.match(eventBus, /tile:click/);
  assert.match(eventBus, /GAME_EVENT_NAMES/);
});

test('PhaserGame exposes camera mode without changing RenderState', () => {
  const phaserGame = readFileSync('src/game/PhaserGame.tsx', 'utf8');
  assert.match(phaserGame, /cameraMode/);
  assert.match(phaserGame, /localPlayerId/);

  const renderState = readFileSync('src/renderState.ts', 'utf8');
  assert.doesNotMatch(renderState, /gridW|gridH|localPlayerId|cameraMode/);
});
