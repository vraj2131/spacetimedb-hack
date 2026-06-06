/**
 * Integration tests for pickup seeding and collect_pickup reducer.
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
  await waitFor(
    () => [...host.conn.db.pickups.iter()].some((p) => p.roomId === room.id),
    'pickups seeded'
  );
  return { host, room, playerId: me.id, state };
}

test('startRound seeds 10 pickups', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();

  const pickups = [...host.conn.db.pickups.iter()].filter(
    (p) => p.roomId === room.id
  );
  assert.equal(pickups.length, 10, 'should seed exactly 10 pickups');

  const cash = pickups.filter((p) => p.pickupType === 'cash');
  const coffee = pickups.filter((p) => p.pickupType === 'coffee');
  const shield = pickups.filter((p) => p.pickupType === 'shield');

  assert.equal(cash.length, 4, '4 cash pickups');
  assert.equal(coffee.length, 3, '3 coffee pickups');
  assert.equal(shield.length, 3, '3 shield pickups');

  // All pickups must be active.
  for (const p of pickups) {
    assert.equal(p.active, true, `pickup ${p.id} should be active`);
  }
});

test('collect_pickup rejects when not on the pickup tile', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();

  // Find a cash pickup — its position is random but unlikely to match (1,1).
  const pickup = [...host.conn.db.pickups.iter()].find(
    (p) => p.roomId === room.id && p.pickupType === 'cash'
  );
  assert.ok(pickup, 'a cash pickup exists');

  // Move the player away from the pickup (player starts at 1,1).
  // The pickup is at a random position; if by chance the player is already
  // there, move one step so we are definitely NOT on that tile.
  const state = host.conn.db.player_state.playerId.find(
    playerOf(host.conn, host.identity).id
  );
  const playerX = typeof state.x === 'bigint' ? Number(state.x) : state.x;
  const playerY = typeof state.y === 'bigint' ? Number(state.y) : state.y;
  const pickupX = typeof pickup.x === 'bigint' ? Number(pickup.x) : pickup.x;
  const pickupY = typeof pickup.y === 'bigint' ? Number(pickup.y) : pickup.y;

  if (playerX === pickupX && playerY === pickupY) {
    // Move off the pickup tile so the guard fires.
    await host.conn.reducers.movePlayer({ direction: 'right' });
  }

  await assert.rejects(
    host.conn.reducers.collectPickup({ pickupId: pickup.id }),
    'should reject when not on the pickup tile'
  );
});

test('collect_pickup rejects nonexistent pickup', { skip }, async () => {
  if (skip) return;
  const { host } = await startedRound();

  await assert.rejects(
    host.conn.reducers.collectPickup({ pickupId: 99999 }),
    'should reject for nonexistent pickup id'
  );
});
