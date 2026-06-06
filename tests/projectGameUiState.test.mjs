import test from 'node:test';
import assert from 'node:assert/strict';
import { projectGameUiState } from '../src/adapters/projectGameUiState.ts';

const ROOM_ID = 42;
const NOW_MS = 1_700_000_000_000;
const HOST_HEX = 'aa'.repeat(32);
const GUEST_HEX = 'bb'.repeat(32);

function identity(hex) {
  return { toHexString: () => hex };
}

function baseRoom(overrides = {}) {
  return {
    id: ROOM_ID,
    code: 'BODEGA',
    state: 'live',
    hostIdentity: identity(HOST_HEX),
    roundNumber: 2,
    endsAtMs: NOW_MS + 72_000,
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    roomId: ROOM_ID,
    room: baseRoom(),
    players: [
      {
        id: 1,
        identity: identity(HOST_HEX),
        roomId: ROOM_ID,
        name: 'Host',
        role: 'player',
        color: '#0f766e',
        connected: true,
      },
      {
        id: 2,
        identity: identity(GUEST_HEX),
        roomId: ROOM_ID,
        name: 'Guest',
        role: 'player',
        color: '#dc2626',
        connected: true,
      },
      {
        id: 3,
        identity: identity('cc'.repeat(32)),
        roomId: ROOM_ID,
        name: 'Watcher',
        role: 'spectator',
        color: '#64748b',
        connected: true,
      },
    ],
    tiles: [
      { roomId: ROOM_ID, ownerPlayerId: 1, incomeValue: 3 },
      { roomId: ROOM_ID, ownerPlayerId: 1, incomeValue: 1 },
      { roomId: ROOM_ID, ownerPlayerId: 2, incomeValue: 1 },
      { roomId: 99, ownerPlayerId: 9, incomeValue: 99 },
    ],
    events: [
      {
        id: 1n,
        roomId: ROOM_ID,
        eventType: 'claim',
        message: 'Host claimed (2,2)',
        createdAtMs: NOW_MS - 1_000,
        expiresAtMs: NOW_MS + 5_000,
      },
      {
        id: 2n,
        roomId: ROOM_ID,
        eventType: 'contest',
        message: 'Guest contested center',
        createdAtMs: NOW_MS - 500,
        expiresAtMs: NOW_MS - 1,
      },
      {
        id: 3n,
        roomId: 99,
        eventType: 'claim',
        message: 'Other room',
        createdAtMs: NOW_MS,
        expiresAtMs: NOW_MS + 5_000,
      },
    ],
    taunts: [
      { roomId: ROOM_ID, text: 'Older taunt', createdAtMs: NOW_MS - 2_000 },
      { roomId: ROOM_ID, text: 'Fresh taunt', createdAtMs: NOW_MS - 100 },
      { roomId: 99, text: 'Wrong room', createdAtMs: NOW_MS },
    ],
    roundResults: [
      {
        roomId: ROOM_ID,
        roundNumber: 2,
        playerId: 1,
        tileScore: 10,
        cashScore: 5,
        ownershipBonus: 6,
        totalScore: 21,
        rank: 1,
      },
      {
        roomId: ROOM_ID,
        roundNumber: 1,
        playerId: 2,
        tileScore: 1,
        cashScore: 0,
        ownershipBonus: 0,
        totalScore: 1,
        rank: 1,
      },
    ],
    spectatorStates: [],
    playerStates: [],
    pickups: [],
    localIdentity: identity(HOST_HEX),
    nowMs: NOW_MS,
    connection: { isConnected: true, isSubmitting: false },
    joinDefaults: {
      defaultName: 'Player',
      defaultRole: 'player',
      suggestedRoomCode: 'BODEGA',
    },
    ...overrides,
  };
}

test('projectGameUiState resolves host, capacity, and live standings from owned tiles', () => {
  const state = projectGameUiState(baseInput());

  assert.equal(state.isHost, true);
  assert.equal(state.localRole, 'player');
  assert.equal(state.lobby.capacityLabel, '2 / 10');
  assert.equal(state.spectatorCount, 1);
  assert.deepEqual(
    state.liveStandings.map(entry => [entry.name, entry.score]),
    [
      ['Host', 4],
      ['Guest', 1],
    ],
  );
});

test('projectGameUiState filters expired events and picks newest taunt', () => {
  const state = projectGameUiState(baseInput());

  assert.deepEqual(state.events, [
    { id: '1', label: 'Host claimed (2,2)', tone: 'good' },
  ]);
  assert.equal(state.recentTaunt, 'Fresh taunt');
});

test('projectGameUiState uses round_results for the active round only', () => {
  const state = projectGameUiState(baseInput());

  assert.equal(state.results.length, 1);
  assert.deepEqual(state.results[0], {
    id: '1',
    rank: 1,
    name: 'Host',
    territory: 10,
    pickups: 5,
    bonus: 6,
    total: 21,
  });
  assert.equal(state.resultsView.hasResults, true);
});

test('projectGameUiState exposes join connection errors and spectator controls', () => {
  const state = projectGameUiState(
    baseInput({
      localIdentity: identity('cc'.repeat(32)),
      connection: {
        isConnected: true,
        isSubmitting: false,
        actionError: 'claim failed',
      },
    }),
  );

  assert.equal(state.isSpectator, true);
  assert.equal(state.join.connection.label, 'claim failed');
  assert.equal(state.match.controls.every(control => !control.enabled), true);
});

test('projectGameUiState gates host actions by room state', () => {
  const lobbyState = projectGameUiState(
    baseInput({
      room: baseRoom({ state: 'lobby' }),
    }),
  );
  const resultsState = projectGameUiState(
    baseInput({
      room: baseRoom({ state: 'results' }),
    }),
  );

  assert.equal(lobbyState.lobby.canStartRound, true);
  assert.equal(resultsState.resultsView.canRematch, true);
  assert.equal(resultsState.match.controls.find(control => control.id === 'move')?.enabled, false);
});

test('projectGameUiState exposes leave and close affordances plus live cash', () => {
  const lobbyState = projectGameUiState(
    baseInput({
      room: baseRoom({ state: 'lobby' }),
      playerStates: [
        {
          playerId: 1,
          roomId: ROOM_ID,
          speedUntilMs: NOW_MS + 10_000,
          disabledUntilMs: 0,
          cash: 12,
          tileIncomeTotal: 7,
          pickupCashTotal: 5,
        },
      ],
    }),
  );
  const resultsState = projectGameUiState(
    baseInput({
      room: baseRoom({ state: 'results' }),
      connection: {
        isConnected: true,
        isSubmitting: false,
        actionError: 'Finish or leave the live round before closing the room.',
      },
      playerStates: [
        {
          playerId: 1,
          roomId: ROOM_ID,
          speedUntilMs: NOW_MS + 10_000,
          disabledUntilMs: 0,
          cash: 12,
          tileIncomeTotal: 7,
          pickupCashTotal: 5,
        },
      ],
    }),
  );

  assert.equal(lobbyState.lobby.canCloseRoom, true);
  assert.equal(lobbyState.lobby.canLeaveRoom, true);
  assert.equal(lobbyState.lobby.actionStatusLabel, '');
  assert.equal(lobbyState.match.claimHint, 'Pick Claim or Contest, then click an adjacent tile.');
  assert.equal(lobbyState.match.localCash, 12);
  assert.equal(lobbyState.match.localTileIncome, 7);
  assert.equal(lobbyState.match.localPickupCash, 5);
  assert.equal(resultsState.resultsView.canCloseRoom, true);
  assert.equal(resultsState.resultsView.canLeaveRoom, true);
  assert.equal(
    resultsState.resultsView.actionStatusLabel,
    'Finish or leave the live round before closing the room.',
  );
});

test('projectGameUiState live standings use accumulated income and pickup cash', () => {
  const state = projectGameUiState(
    baseInput({
      playerStates: [
        {
          playerId: 1,
          roomId: ROOM_ID,
          speedUntilMs: 0,
          disabledUntilMs: 0,
          tileIncomeTotal: 15,
          pickupCashTotal: 10,
        },
        {
          playerId: 2,
          roomId: ROOM_ID,
          speedUntilMs: 0,
          disabledUntilMs: 0,
          tileIncomeTotal: 8,
          pickupCashTotal: 0,
        },
      ],
    }),
  );

  assert.deepEqual(
    state.liveStandings.map(entry => [entry.name, entry.score]),
    [
      ['Host', 25],
      ['Guest', 8],
    ],
  );
});

test('projectGameUiState enables collect when local player stands on active pickup', () => {
  const state = projectGameUiState(
    baseInput({
      localIdentity: identity(GUEST_HEX),
      playerStates: [
        {
          playerId: 2,
          roomId: ROOM_ID,
          x: 5,
          y: 5,
          speedUntilMs: 0,
          disabledUntilMs: 0,
          cash: 3,
        },
      ],
      pickups: [{ id: 7, roomId: ROOM_ID, x: 5, y: 5, active: true }],
    }),
  );

  assert.equal(state.match.localPickupId, 7);
  assert.equal(state.match.canCollectPickup, true);
});
