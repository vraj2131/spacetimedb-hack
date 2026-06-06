/**
 * Integration tests for the contest_tile reducer:
 * guard rejections for own tile, unowned tile, non-adjacent tile, and spectator.
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

test('contest_tile rejects contest on own tile', { skip }, async () => {
  if (skip) return;
  const { host, room, playerId } = await startedRound();

  // Claim an adjacent tile first so the host owns it.
  const target = tileAt(host.conn, room.id, 2, 1);
  assert.ok(target, 'target tile exists');
  await host.conn.reducers.claimTile({ tileId: target.id });

  const claimed = host.conn.db.tiles.id.find(target.id);
  assert.equal(claimed.ownerPlayerId, playerId, 'tile is owned by host');

  // Now try to contest our own tile -- should be rejected.
  await assert.rejects(host.conn.reducers.contestTile({ tileId: target.id }));
});

test('contest_tile rejects contest on unowned tile', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();

  // (2,1) is adjacent to spawn (1,1) and unowned by default.
  const target = tileAt(host.conn, room.id, 2, 1);
  assert.ok(target, 'target tile exists');

  await assert.rejects(host.conn.reducers.contestTile({ tileId: target.id }));
});

test('contest_tile rejects contest on non-adjacent tile', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();

  // (10, 10) is far from spawn (1,1).
  const far = tileAt(host.conn, room.id, 10, 10);
  assert.ok(far, 'far tile exists');

  await assert.rejects(host.conn.reducers.contestTile({ tileId: far.id }));
});

test('contest_tile rejects a spectator', { skip }, async () => {
  if (skip) return;
  const { room } = await startedRound();
  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });

  // A spectator has no player_state and is rejected by the role guard.
  await assert.rejects(watcher.conn.reducers.contestTile({ tileId: 1 }));
});
