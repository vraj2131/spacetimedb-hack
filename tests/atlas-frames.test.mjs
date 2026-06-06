import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const REQUIRED_FRAMES = [
  'tile_street',
  'tile_bodega',
  'tile_alley',
  'tile_pickup_spawn',
  'token_red',
  'token_blue',
  'token_green',
  'token_yellow',
  'token_red_walk_0',
  'token_red_walk_1',
  'pickup_cash',
  'pickup_coffee',
  'pickup_shield',
  'fx_spill',
  'fx_shield',
  'fx_speed',
  'bodega_cat',
];

test('game.json atlas defines all 17 required frame keys', () => {
  const atlasPath = join(process.cwd(), 'public/assets/game.json');
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
  const frameKeys = Object.keys(atlas.frames ?? {});

  assert.equal(frameKeys.length, 17, 'atlas should contain exactly 17 frames');
  for (const key of REQUIRED_FRAMES) {
    assert.ok(frameKeys.includes(key), `missing atlas frame: ${key}`);
    const frame = atlas.frames[key]?.frame;
    assert.ok(frame?.w > 0 && frame?.h > 0, `${key} should have non-zero dimensions`);
  }
});
