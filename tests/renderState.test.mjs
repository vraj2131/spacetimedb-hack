import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  EMPTY_RENDER_STATE,
} from '../src/renderState.ts';

test('renderState board dimensions match spacetimedb/src/map.ts', () => {
  assert.equal(BOARD_WIDTH, 12);
  assert.equal(BOARD_HEIGHT, 8);
});

test('EMPTY_RENDER_STATE is a drawable empty board snapshot', () => {
  assert.equal(EMPTY_RENDER_STATE.width, BOARD_WIDTH);
  assert.equal(EMPTY_RENDER_STATE.height, BOARD_HEIGHT);
  assert.deepEqual(EMPTY_RENDER_STATE.tiles, []);
  assert.deepEqual(EMPTY_RENDER_STATE.tokens, []);
  assert.deepEqual(EMPTY_RENDER_STATE.pickups, []);
});

test('RenderState contract uses readonly fields (compile-time firewall)', () => {
  const src = readFileSync('src/renderState.ts', 'utf8');
  assert.match(src, /readonly tiles/);
  assert.match(src, /readonly tokens/);
  assert.match(src, /readonly pickups/);
});
