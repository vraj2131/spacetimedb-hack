/**
 * Integration tests for the player action reducers (PR-A2):
 * the live-round guards on move_player, and claim_tile.
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function playerOf(conn, identity) {
  return [...conn.db.players.iter()].find(
    (p) => hex(p.identity) === hex(identity)
  );
}

/** Register a host, open a room, start the round; return host handle + ids. */
async function startedRound(name = 'Host') {
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name, role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await host.conn.reducers.startRound({ roomId: room.id });

  // Host is seated at SPAWN_POINTS[0] = (1, 1); wait for the seeded board.
  const me = playerOf(host.conn, host.identity);
  const state = await waitFor(
    () => host.conn.db.player_state.playerId.find(me.id),
    'host player_state seeded'
  );
  await waitFor(
    () => [...host.conn.db.tiles.iter()].some((t) => t.roomId === room.id),
    'tiles seeded'
  );
  return { host, room, playerId: me.id, state };
}

function tileAt(conn, roomId, x, y) {
  return [...conn.db.tiles.iter()].find(
    (t) => t.roomId === roomId && t.x === x && t.y === y
  );
}

test('move_player rejects when the room is not live', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom(); // room stays in lobby
  await assert.rejects(host.conn.reducers.movePlayer({ direction: 'up' }));
});

test('move_player steps one cell in a live round', { skip }, async () => {
  if (skip) return;
  const { host, playerId, state } = await startedRound();
  assert.deepEqual([state.x, state.y], [1, 1], 'spawned at seat 0');

  await host.conn.reducers.movePlayer({ direction: 'right' });
  const moved = host.conn.db.player_state.playerId.find(playerId);
  assert.deepEqual([moved.x, moved.y], [2, 1]);
});

test('move_player enforces normal and boosted cooldowns', { skip }, async () => {
  if (skip) return;
  const { host, room, playerId } = await startedRound();

  await host.conn.reducers.movePlayer({ direction: 'right' });
  await assert.rejects(host.conn.reducers.movePlayer({ direction: 'right' }));

  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });
  await watcher.conn.reducers.triggerSpectatorEvent({
    eventType: 'coffee_boost',
    targetPlayerId: playerId,
    targetTileId: undefined,
  });

  await sleep(300);
  await host.conn.reducers.movePlayer({ direction: 'right' });
  const moved = host.conn.db.player_state.playerId.find(playerId);
  assert.deepEqual([moved.x, moved.y], [3, 1]);
});

test('claim_tile claims an adjacent tile and writes an event', { skip }, async () => {
  if (skip) return;
  const { host, room, playerId } = await startedRound();

  // (2,1) is street and adjacent to the (1,1) spawn.
  const target = tileAt(host.conn, room.id, 2, 1);
  assert.ok(target, 'target tile exists');
  assert.equal(target.tileType, 'street');

  await host.conn.reducers.claimTile({ tileId: target.id });

  const claimed = host.conn.db.tiles.id.find(target.id);
  assert.equal(claimed.ownerPlayerId, playerId, 'tile is owned by claimer');

  const playerState = host.conn.db.player_state.playerId.find(playerId);
  assert.equal(playerState.cash, 0, 'claim does not grant instant income');

  const event = await waitFor(
    () =>
      [...host.conn.db.events.iter()].find(
        (e) => e.eventType === 'claim' && e.targetTileId === target.id
      ),
    'claim event written'
  );
  assert.equal(event.sourcePlayerId, playerId);
  assert.match(event.message, /claimed \(2,1\)/);
});

test('claim_tile rejects a non-adjacent tile', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();
  const far = tileAt(host.conn, room.id, 10, 10); // bodega cluster, far away
  assert.ok(far);
  await assert.rejects(host.conn.reducers.claimTile({ tileId: far.id }));
});

test('claim_tile rejects an alley tile', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();
  const alley = tileAt(host.conn, room.id, 0, 0); // corner alley
  assert.ok(alley);
  assert.equal(alley.tileType, 'alley');
  await assert.rejects(host.conn.reducers.claimTile({ tileId: alley.id }));
});

test('claim_tile rejects when the round is not live', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom(); // lobby, no tiles seeded
  await assert.rejects(host.conn.reducers.claimTile({ tileId: 1 }));
});

test('claim_tile rejects a spectator', { skip }, async () => {
  if (skip) return;
  const { room } = await startedRound();
  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });
  // A spectator has no player_state and is rejected by the role guard.
  await assert.rejects(watcher.conn.reducers.claimTile({ tileId: 1 }));
});
