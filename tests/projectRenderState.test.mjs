import test from 'node:test';
import assert from 'node:assert/strict';
import { projectRenderState } from '../src/adapters/projectRenderState.ts';
import { MAP_HEIGHT, MAP_WIDTH } from '../src/renderState.ts';

const ROOM_ID = 7;
const NOW_MS = 1_700_000_000_000;

test('projectRenderState filters rows by roomId and preserves map dimensions', () => {
  const state = projectRenderState({
    roomId: ROOM_ID,
    tiles: [
      {
        roomId: ROOM_ID,
        x: 2,
        y: 3,
        tileType: 'street',
        ownerPlayerId: 11,
        contestedUntilMs: 0n,
        shieldUntilMs: 0n,
        spillUntilMs: 0n,
      },
      {
        roomId: 99,
        x: 0,
        y: 0,
        tileType: 'bodega',
        ownerPlayerId: null,
        contestedUntilMs: 0n,
        shieldUntilMs: 0n,
        spillUntilMs: 0n,
      },
    ],
    players: [
      { id: 11, roomId: ROOM_ID, role: 'player', color: '#112233' },
      { id: 12, roomId: ROOM_ID, role: 'spectator', color: '#445566' },
      { id: 13, roomId: 99, role: 'player', color: '#778899' },
    ],
    playerStates: [
      { playerId: 11, roomId: ROOM_ID, x: 2, y: 3, speedUntilMs: NOW_MS + 5_000, disabledUntilMs: 0 },
      { playerId: 12, roomId: ROOM_ID, x: 4, y: 4, speedUntilMs: 0, disabledUntilMs: 0 },
      { playerId: 13, roomId: 99, x: 1, y: 1, speedUntilMs: 0, disabledUntilMs: 0 },
    ],
    pickups: [
      { roomId: ROOM_ID, x: 5, y: 5, pickupType: 'cash', active: true },
      { roomId: ROOM_ID, x: 6, y: 6, pickupType: 'coffee', active: false },
      { roomId: 99, x: 1, y: 1, pickupType: 'shield', active: true },
    ],
    nowMs: NOW_MS,
  });

  assert.equal(state.width, MAP_WIDTH);
  assert.equal(state.height, MAP_HEIGHT);
  assert.equal(state.tiles.length, 1);
  assert.equal(state.tokens.length, 1);
  assert.equal(state.pickups.length, 1);
});

test('projectRenderState maps owner colors and active tile effects', () => {
  const state = projectRenderState({
    roomId: ROOM_ID,
    tiles: [
      {
        roomId: ROOM_ID,
        x: 1,
        y: 1,
        tileType: 'bodega',
        ownerPlayerId: 11,
        contestedUntilMs: NOW_MS + 1_000,
        shieldUntilMs: NOW_MS + 2_000,
        spillUntilMs: NOW_MS - 1,
      },
    ],
    players: [{ id: 11, roomId: ROOM_ID, role: 'player', color: '#ff00aa' }],
    playerStates: [
      {
        playerId: 11,
        roomId: ROOM_ID,
        x: 1,
        y: 1,
        speedUntilMs: NOW_MS - 1,
        disabledUntilMs: NOW_MS + 500,
      },
    ],
    pickups: [],
    nowMs: NOW_MS,
  });

  assert.deepEqual(state.tiles[0], {
    x: 1,
    y: 1,
    type: 'bodega',
    ownerColor: '#ff00aa',
    contested: true,
    shielded: true,
    spilled: false,
  });
  assert.deepEqual(state.tokens[0], {
    playerId: 11,
    x: 1,
    y: 1,
    color: '#ff00aa',
    boosted: false,
    disabled: true,
  });
});

test('projectRenderState converts bigint timestamps', () => {
  const state = projectRenderState({
    roomId: ROOM_ID,
    tiles: [
      {
        roomId: ROOM_ID,
        x: 0,
        y: 0,
        tileType: 'street',
        ownerPlayerId: null,
        contestedUntilMs: BigInt(NOW_MS + 10),
        shieldUntilMs: 0n,
        spillUntilMs: 0n,
      },
    ],
    players: [],
    playerStates: [],
    pickups: [],
    nowMs: NOW_MS,
  });

  assert.equal(state.tiles[0].contested, true);
});
