/**
 * Integration tests for the round-completion reducers (PR-A3):
 * end_round (lazy scoring + ranking) and rematch.
 *
 * Runs against a live local SpacetimeDB via the SDK harness. See
 * tests/helpers/spacetime-harness.mjs. Launch with `npm run test:integration`.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldSkip,
  uniqueDbName,
  publishModule,
  deleteModule,
  connect,
  hex,
  waitFor,
} from '../helpers/spacetime-harness.mjs';

const dbName = uniqueDbName();
const openConns = [];
let skip = false;

before(async () => {
  skip = await shouldSkip();
  if (skip) return;
  publishModule(dbName);
});

after(() => {
  for (const conn of openConns) {
    try {
      conn.disconnect();
    } catch {
      // ignore
    }
  }
  if (!skip) deleteModule(dbName);
});

async function newPlayer() {
  const handle = await connect(dbName);
  openConns.push(handle.conn);
  return handle;
}

function playerOf(conn, identity) {
  return [...conn.db.players.iter()].find(
    (p) => hex(p.identity) === hex(identity)
  );
}

function tileAt(conn, roomId, x, y) {
  return [...conn.db.tiles.iter()].find(
    (t) => t.roomId === roomId && t.x === x && t.y === y
  );
}

/** Claim the tile at (x,y) from `conn` and wait until ownership is visible. */
async function claim(conn, roomId, x, y) {
  const tile = tileAt(conn, roomId, x, y);
  await conn.reducers.claimTile({ tileId: tile.id });
  return tile.id;
}

/**
 * Host + joiner in a started round. Host seated at (1,1) [seat 0], joiner at
 * (26,1) [seat 1] (see SPAWN_POINTS).
 */
async function twoPlayerLiveRoom() {
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const joiner = await newPlayer();
  await joiner.conn.reducers.registerPlayer({ name: 'Joiner', role: 'player' });
  await joiner.conn.reducers.joinRoom({ roomCode: room.code });

  await host.conn.reducers.startRound({ roomId: room.id });
  await waitFor(
    () => [...host.conn.db.tiles.iter()].some((t) => t.roomId === room.id),
    'tiles seeded'
  );
  const hostId = playerOf(host.conn, host.identity).id;
  const joinerId = playerOf(host.conn, joiner.identity).id;
  return { host, joiner, room, hostId, joinerId };
}

test('end_round scores owned tiles + bonus and ranks players', { skip }, async () => {
  if (skip) return;
  const { host, joiner, room, hostId, joinerId } = await twoPlayerLiveRoom();

  // Host (at 1,1) claims two adjacent streets; joiner (at 26,1) claims one.
  await claim(host.conn, room.id, 2, 1);
  await claim(host.conn, room.id, 1, 0);
  await claim(joiner.conn, room.id, 25, 1);

  await host.conn.reducers.endRound({ roomId: room.id });

  const room2 = host.conn.db.rooms.id.find(room.id);
  assert.equal(room2.state, 'results');

  const results = await waitFor(() => {
    const rows = [...host.conn.db.round_results.iter()].filter(
      (r) => r.roomId === room.id
    );
    return rows.length === 2 ? rows : null;
  }, 'two result rows');

  const hostRow = results.find((r) => r.playerId === hostId);
  const joinerRow = results.find((r) => r.playerId === joinerId);

  // Street income is 1, ownership bonus is 3 → 4 per claimed street.
  assert.equal(hostRow.tileScore, 2);
  assert.equal(hostRow.ownershipBonus, 6);
  assert.equal(hostRow.cashScore, 0);
  assert.equal(hostRow.totalScore, 8);
  assert.equal(hostRow.rank, 1);

  assert.equal(joinerRow.totalScore, 4);
  assert.equal(joinerRow.rank, 2);
  assert.equal(joinerRow.roundNumber, 1);
});

test('end_round rejects a non-host caller', { skip }, async () => {
  if (skip) return;
  const { joiner, room } = await twoPlayerLiveRoom();
  await assert.rejects(joiner.conn.reducers.endRound({ roomId: room.id }));
});

test('end_round rejects when the room is not live', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom(); // lobby
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await assert.rejects(host.conn.reducers.endRound({ roomId: room.id }));
});

test('rematch clears the board and returns to lobby with the next round', { skip }, async () => {
  if (skip) return;
  const { host, room, hostId } = await twoPlayerLiveRoom();
  await claim(host.conn, room.id, 2, 1);
  await host.conn.reducers.endRound({ roomId: room.id });
  await waitFor(
    () => host.conn.db.rooms.id.find(room.id)?.state === 'results',
    'room in results'
  );

  await host.conn.reducers.rematch({ roomId: room.id });

  const room2 = await waitFor(
    () => {
      const r = host.conn.db.rooms.id.find(room.id);
      return r?.state === 'lobby' ? r : null;
    },
    'room back in lobby'
  );
  assert.equal(room2.roundNumber, 2, 'round number incremented');
  assert.equal(room2.startsAtMs, 0n);
  assert.equal(room2.endsAtMs, 0n);

  // Per-round rows are cleared...
  await waitFor(
    () =>
      [...host.conn.db.tiles.iter()].filter((t) => t.roomId === room.id)
        .length === 0,
    'tiles cleared'
  );
  assert.equal(
    [...host.conn.db.round_results.iter()].filter((r) => r.roomId === room.id)
      .length,
    0,
    'results cleared'
  );
  assert.ok(
    !host.conn.db.player_state.playerId.find(hostId),
    'player_state cleared'
  );

  // ...but the players stay in the room for the next round.
  assert.equal(playerOf(host.conn, host.identity).roomId, room.id);
});

test('rematch rejects when the room is not in results', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom(); // lobby
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await assert.rejects(host.conn.reducers.rematch({ roomId: room.id }));
});
