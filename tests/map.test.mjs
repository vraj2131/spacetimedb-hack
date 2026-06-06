import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SPAWN_CORNERS,
  tileTypeAt,
} from '../spacetimedb/src/map.ts';

test('map.ts declares the agreed 12x8 board dimensions', () => {
  assert.equal(BOARD_WIDTH, 12);
  assert.equal(BOARD_HEIGHT, 8);
});

test('SPAWN_CORNERS provides four corner seats in order', () => {
  assert.equal(SPAWN_CORNERS.length, 4);
  assert.deepEqual(SPAWN_CORNERS[0], { x: 0, y: 0 });
  assert.deepEqual(SPAWN_CORNERS[1], { x: BOARD_WIDTH - 1, y: 0 });
  assert.deepEqual(SPAWN_CORNERS[2], { x: 0, y: BOARD_HEIGHT - 1 });
  assert.deepEqual(SPAWN_CORNERS[3], { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 });
});

test('tileTypeAt stub returns street for any cell', () => {
  assert.equal(tileTypeAt(0, 0), 'street');
  assert.equal(tileTypeAt(BOARD_WIDTH - 1, BOARD_HEIGHT - 1), 'street');
});
