import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMapOrigin,
  gridToPixel,
  pixelToGrid,
  getMapWorldBounds,
} from '../src/game/projection.ts';
import { MAP_WIDTH, MAP_HEIGHT } from '../src/renderState.ts';

function assertRoundTrip(x, y) {
  const origin = getMapOrigin(MAP_HEIGHT);
  const { px, py } = gridToPixel(x, y, origin);
  assert.deepEqual(pixelToGrid(px, py, MAP_WIDTH, MAP_HEIGHT, origin), { x, y });
}

test('isometric projection round-trips important tile centers', () => {
  assertRoundTrip(0, 0);
  assertRoundTrip(MAP_WIDTH - 1, MAP_HEIGHT - 1);
  assertRoundTrip(Math.floor(MAP_WIDTH / 2), Math.floor(MAP_HEIGHT / 2));
  assertRoundTrip(1, MAP_HEIGHT - 2);
  assertRoundTrip(MAP_WIDTH - 2, 1);
});

test('isometric hit-testing rejects points outside the map', () => {
  const origin = getMapOrigin(MAP_HEIGHT);
  assert.equal(pixelToGrid(origin.x - 500, origin.y, MAP_WIDTH, MAP_HEIGHT, origin), null);
  assert.equal(pixelToGrid(origin.x, origin.y - 500, MAP_WIDTH, MAP_HEIGHT, origin), null);
});

test('isometric world bounds can contain the full 28x20 map', () => {
  const bounds = getMapWorldBounds(MAP_WIDTH, MAP_HEIGHT);
  assert.ok(bounds.width > 0);
  assert.ok(bounds.height > 0);

  const origin = getMapOrigin(MAP_HEIGHT);
  for (const [x, y] of [
    [0, 0],
    [MAP_WIDTH - 1, 0],
    [0, MAP_HEIGHT - 1],
    [MAP_WIDTH - 1, MAP_HEIGHT - 1],
  ]) {
    const { px, py } = gridToPixel(x, y, origin);
    assert.ok(px >= bounds.x, `x ${px} should be inside left bound`);
    assert.ok(px <= bounds.x + bounds.width, `x ${px} should be inside right bound`);
    assert.ok(py >= bounds.y, `y ${py} should be inside top bound`);
    assert.ok(py <= bounds.y + bounds.height, `y ${py} should be inside bottom bound`);
  }
});
