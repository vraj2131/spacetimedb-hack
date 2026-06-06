import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  SPAWN_CORNERS,
  SPAWN_POINTS,
  PICKUP_SPAWNS,
  MAX_SPAWN_SEATS,
  tileTypeAt,
  incomeForTileType,
} from '../spacetimedb/src/map.ts';

test('map.ts declares the agreed 28x20 map dimensions', () => {
  assert.equal(MAP_WIDTH, 28);
  assert.equal(MAP_HEIGHT, 20);
});

test('SPAWN_CORNERS provides four geometric corner seats in order', () => {
  assert.equal(SPAWN_CORNERS.length, 4);
  assert.deepEqual(SPAWN_CORNERS[0], { x: 0, y: 0 });
  assert.deepEqual(SPAWN_CORNERS[1], { x: MAP_WIDTH - 1, y: 0 });
  assert.deepEqual(SPAWN_CORNERS[2], { x: 0, y: MAP_HEIGHT - 1 });
  assert.deepEqual(SPAWN_CORNERS[3], { x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 });
});

test('SPAWN_POINTS gives MAX_SPAWN_SEATS in-bounds seats, none on alley', () => {
  assert.equal(MAX_SPAWN_SEATS, 10);
  assert.equal(SPAWN_POINTS.length, 10);
  for (const p of SPAWN_POINTS) {
    assert.ok(p.x >= 0 && p.x < MAP_WIDTH, `spawn x in range: ${p.x}`);
    assert.ok(p.y >= 0 && p.y < MAP_HEIGHT, `spawn y in range: ${p.y}`);
    assert.notEqual(
      tileTypeAt(p.x, p.y),
      'alley',
      `spawn (${p.x},${p.y}) must not be on an alley tile`
    );
  }
});

test('PICKUP_SPAWNS gives 10 fixed unique non-alley cells', () => {
  assert.equal(PICKUP_SPAWNS.length, 10);
  assert.deepEqual(PICKUP_SPAWNS[0], { x: 2, y: 1 });
  assert.equal(new Set(PICKUP_SPAWNS.map((p) => `${p.x},${p.y}`)).size, 10);
  for (const p of PICKUP_SPAWNS) {
    assert.ok(p.x >= 0 && p.x < MAP_WIDTH, `pickup x in range: ${p.x}`);
    assert.ok(p.y >= 0 && p.y < MAP_HEIGHT, `pickup y in range: ${p.y}`);
    assert.notEqual(
      tileTypeAt(p.x, p.y),
      'alley',
      `pickup (${p.x},${p.y}) must not be on an alley tile`
    );
  }
});

test('tileTypeAt encodes the v1 NYC layout', () => {
  // The four map corners are alley.
  assert.equal(tileTypeAt(0, 0), 'alley');
  assert.equal(tileTypeAt(MAP_WIDTH - 1, 0), 'alley');
  assert.equal(tileTypeAt(0, MAP_HEIGHT - 1), 'alley');
  assert.equal(tileTypeAt(MAP_WIDTH - 1, MAP_HEIGHT - 1), 'alley');
  // The central cluster x in [10,17], y in [6,13] is bodega.
  assert.equal(tileTypeAt(10, 6), 'bodega');
  assert.equal(tileTypeAt(17, 13), 'bodega');
  assert.equal(tileTypeAt(14, 10), 'bodega');
  // Just outside the cluster is street.
  assert.equal(tileTypeAt(9, 6), 'street');
  assert.equal(tileTypeAt(18, 13), 'street');
  // Edges (non-corner) are street.
  assert.equal(tileTypeAt(1, 0), 'street');
  assert.equal(tileTypeAt(5, 5), 'street');
});

test('incomeForTileType matches the brief (street 1, bodega 3, alley 0)', () => {
  assert.equal(incomeForTileType('street'), 1);
  assert.equal(incomeForTileType('bodega'), 3);
  assert.equal(incomeForTileType('alley'), 0);
});
