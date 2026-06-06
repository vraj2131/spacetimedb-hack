import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTileIdAt } from '../src/adapters/resolveTileId.ts';

test('resolveTileIdAt finds the tile id for a room-scoped cell', () => {
  const tiles = [
    { id: 10, roomId: 7, x: 2, y: 3 },
    { id: 11, roomId: 7, x: 4, y: 5 },
    { id: 12, roomId: 9, x: 2, y: 3 },
  ];

  assert.equal(resolveTileIdAt(tiles, 7, 2, 3), 10);
  assert.equal(resolveTileIdAt(tiles, 7, 0, 0), null);
  assert.equal(resolveTileIdAt(tiles, 9, 2, 3), 12);
});
