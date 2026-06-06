import assert from 'node:assert/strict';
import { resolvePickupIdAt } from '../src/adapters/resolvePickupId.ts';
import test from 'node:test';

const ROOM_ID = 42;

test('resolvePickupIdAt finds active pickup on a room cell', () => {
  const pickups = [
    { id: 1, roomId: ROOM_ID, x: 3, y: 4, active: true },
    { id: 2, roomId: ROOM_ID, x: 5, y: 5, active: false },
    { id: 3, roomId: 99, x: 5, y: 5, active: true },
  ];

  assert.equal(resolvePickupIdAt(pickups, ROOM_ID, 3, 4), 1);
  assert.equal(resolvePickupIdAt(pickups, ROOM_ID, 5, 5), null);
  assert.equal(resolvePickupIdAt(pickups, ROOM_ID, 0, 0), null);
});
