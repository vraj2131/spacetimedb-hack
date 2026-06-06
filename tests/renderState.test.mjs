import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  EMPTY_RENDER_STATE,
} from '../src/renderState.ts';
import {
  MAP_WIDTH as SERVER_MAP_WIDTH,
  MAP_HEIGHT as SERVER_MAP_HEIGHT,
} from '../spacetimedb/src/map.ts';

test('renderState declares the 28x20 map dimensions', () => {
  assert.equal(MAP_WIDTH, 28);
  assert.equal(MAP_HEIGHT, 20);
});

test('client renderState dimensions match the server map.ts', () => {
  assert.equal(MAP_WIDTH, SERVER_MAP_WIDTH);
  assert.equal(MAP_HEIGHT, SERVER_MAP_HEIGHT);
});

test('EMPTY_RENDER_STATE is a drawable empty board snapshot', () => {
  assert.equal(EMPTY_RENDER_STATE.width, MAP_WIDTH);
  assert.equal(EMPTY_RENDER_STATE.height, MAP_HEIGHT);
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
