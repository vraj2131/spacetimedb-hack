import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');

test('BoardScene loads the game atlas and preserves sprite fallback contracts', () => {
  const src = read('src/game/scenes/BoardScene.ts');

  assert.match(src, /preload\(\): void/);
  assert.match(src, /this\.load\.atlas\('game', 'assets\/game\.png', 'assets\/game\.json'\)/);
  assert.match(src, /atlasReady/);
  assert.match(src, /textures\.exists\('game'\)/);
  assert.match(src, /tileFrameKey/);
  assert.match(src, /pickupFrameKey/);
  assert.match(src, /fxFrameKey/);
  assert.match(src, /TILE_WIDTH/);
  assert.match(src, /TILE_HEIGHT/);
  assert.match(src, /depthForGrid/);
});

test('asset source ignores keep local-only files out of the game repo', () => {
  const gitignore = read('.gitignore');

  assert.match(gitignore, /public\/assets\/_source\/\*\.zip/);
  assert.match(gitignore, /public\/assets\/_source\/extracted\//);
  assert.match(gitignore, /public\/assets\/_source\/renders\//);
});

test('packer documents and supports MegaKit render PNG inputs', () => {
  const packer = read('public/assets/_source/pack_atlas.py');

  assert.match(packer, /RENDERS_DIR/);
  assert.match(packer, /load_render_image/);
  assert.match(packer, /RENDER_FRAME_KEYS/);
  assert.match(packer, /renders\/\{frame_key\}\.png/);
});

test('asset docs describe Kenney fallback and Quaternius MegaKit primary path', () => {
  const assets = read('ASSETS.md');
  const sourceReadme = read('public/assets/_source/README.md');

  assert.match(assets, /Quaternius/);
  assert.match(assets, /Downtown City MegaKit/);
  assert.match(assets, /Kenney/);
  assert.match(assets, /interim|fallback/i);
  assert.match(sourceReadme, /renders\/\{frame_key\}\.png/);
});

test('visible board copy matches the 28x20 RenderState contract', () => {
  const boardShell = read('src/components/BoardShell.tsx');
  const devSync = read('src/components/DevSync.tsx');

  assert.match(boardShell, /28 x 20/);
  assert.doesNotMatch(boardShell, /12 x 8|12x8/);
  assert.match(devSync, /28x20|28 x 20/);
  assert.doesNotMatch(devSync, /12 x 8|12x8/);
});
