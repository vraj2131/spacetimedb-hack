/**
 * Integration tests for the room-spine reducers (PR-A1):
 * register_player, create_room, join_room.
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
  if (skip) {
    return;
  }
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
  if (!skip) {
    deleteModule(dbName);
  }
});

/** Connect a fresh identity and track it for teardown. */
async function newPlayer() {
  const handle = await connect(dbName);
  openConns.push(handle.conn);
  return handle;
}

/** Find a player row by its identity in the given connection's cache. */
function playerOf(conn, identity) {
  return [...conn.db.players.iter()].find(
    (p) => hex(p.identity) === hex(identity)
  );
}

test('register_player creates a player not in any room', { skip }, async () => {
  if (skip) return;
  const { conn, identity } = await newPlayer();
  await conn.reducers.registerPlayer({ name: '  Alice  ', role: 'player' });

  const row = playerOf(conn, identity);
  assert.ok(row, 'player row exists');
  assert.equal(row.name, 'Alice', 'name is trimmed');
  assert.equal(row.role, 'player');
  assert.equal(row.roomId, 0, 'not in a room yet');
  assert.match(row.color, /^#[0-9a-f]{6}$/, 'has a hex color');
});

test('register_player rejects empty name', { skip }, async () => {
  if (skip) return;
  const { conn } = await newPlayer();
  await assert.rejects(
    conn.reducers.registerPlayer({ name: '   ', role: 'player' })
  );
});

test('register_player rejects an invalid role', { skip }, async () => {
  if (skip) return;
  const { conn } = await newPlayer();
  await assert.rejects(
    conn.reducers.registerPlayer({ name: 'Bo', role: 'referee' })
  );
});

test('register_player rejects a duplicate registration', { skip }, async () => {
  if (skip) return;
  const { conn } = await newPlayer();
  await conn.reducers.registerPlayer({ name: 'Once', role: 'player' });
  await assert.rejects(
    conn.reducers.registerPlayer({ name: 'Twice', role: 'player' })
  );
});

test('create_room opens a lobby and seats the host', { skip }, async () => {
  if (skip) return;
  const { conn, identity } = await newPlayer();
  await conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await conn.reducers.createRoom();

  const host = playerOf(conn, identity);
  const room = [...conn.db.rooms.iter()].find((r) => r.id === host.roomId);
  assert.ok(room, 'room exists');
  assert.equal(room.state, 'lobby');
  assert.equal(room.roundNumber, 1);
  assert.match(room.code, /^[A-Z0-9]{6}$/, 'code is 6-char uppercase alnum');
  assert.equal(hex(room.hostIdentity), hex(identity), 'caller is host');
  assert.notEqual(host.roomId, 0, 'host moved into the room');
});

test('create_room rejects an unregistered caller', { skip }, async () => {
  if (skip) return;
  const { conn } = await newPlayer();
  await assert.rejects(conn.reducers.createRoom());
});

test('create_room rejects a caller already in a room', { skip }, async () => {
  if (skip) return;
  const { conn } = await newPlayer();
  await conn.reducers.registerPlayer({ name: 'Dup', role: 'player' });
  await conn.reducers.createRoom();
  await assert.rejects(conn.reducers.createRoom());
});

test('join_room attaches a second player to the host room', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const joiner = await newPlayer();
  await joiner.conn.reducers.registerPlayer({ name: 'Joiner', role: 'player' });
  await joiner.conn.reducers.joinRoom({ roomCode: room.code });

  const joined = playerOf(joiner.conn, joiner.identity);
  assert.equal(joined.roomId, room.id, 'joiner is in the host room');

  // Host eventually sees two players in the room (cross-connection propagation).
  const both = await waitFor(
    () =>
      [...host.conn.db.players.iter()].filter((p) => p.roomId === room.id)
        .length === 2,
    'host sees 2 players'
  );
  assert.ok(both);
});

test('join_room normalizes the code (trim + uppercase)', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const joiner = await newPlayer();
  await joiner.conn.reducers.registerPlayer({ name: 'Joiner', role: 'player' });
  await joiner.conn.reducers.joinRoom({ roomCode: `  ${room.code.toLowerCase()}  ` });

  assert.equal(playerOf(joiner.conn, joiner.identity).roomId, room.id);
});

test('join_room rejects an unknown code', { skip }, async () => {
  if (skip) return;
  const { conn } = await newPlayer();
  await conn.reducers.registerPlayer({ name: 'Lost', role: 'player' });
  await assert.rejects(conn.reducers.joinRoom({ roomCode: 'ZZZZZZ' }));
});

test('join_room rejects joining a live round', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await host.conn.reducers.startRound({ roomId: room.id });

  const latecomer = await newPlayer();
  await latecomer.conn.reducers.registerPlayer({ name: 'Late', role: 'player' });
  await assert.rejects(latecomer.conn.reducers.joinRoom({ roomCode: room.code }));
});

test('join_room lets a spectator watch a live round', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await host.conn.reducers.startRound({ roomId: room.id });

  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });
  assert.equal(playerOf(watcher.conn, watcher.identity).roomId, room.id);
});

test('join_room rejects a player past the 10-seat cap', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  // Host is seat 1; add 9 more players to fill all 10 seats.
  for (let i = 0; i < 9; i++) {
    const p = await newPlayer();
    await p.conn.reducers.registerPlayer({ name: `P${i}`, role: 'player' });
    await p.conn.reducers.joinRoom({ roomCode: room.code });
  }

  // The 11th player is rejected...
  const overflow = await newPlayer();
  await overflow.conn.reducers.registerPlayer({ name: 'Extra', role: 'player' });
  await assert.rejects(overflow.conn.reducers.joinRoom({ roomCode: room.code }));

  // ...but a spectator can still join a full room.
  const spectator = await newPlayer();
  await spectator.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await spectator.conn.reducers.joinRoom({ roomCode: room.code });
  assert.equal(playerOf(spectator.conn, spectator.identity).roomId, room.id);
});

test('leave_room removes a spectator from the room', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const spectator = await newPlayer();
  await spectator.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await spectator.conn.reducers.joinRoom({ roomCode: room.code });

  const spectatorRow = playerOf(spectator.conn, spectator.identity);
  assert.ok(spectator.conn.db.spectator_state.playerId.find(spectatorRow.id));

  await spectator.conn.reducers.leaveRoom({ roomId: room.id });

  assert.equal(playerOf(spectator.conn, spectator.identity).roomId, 0);
  assert.equal(spectator.conn.db.spectator_state.playerId.find(spectatorRow.id), null);
});

test('leave_room transfers host to the next participant when host exits', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const guest = await newPlayer();
  await guest.conn.reducers.registerPlayer({ name: 'Guest', role: 'player' });
  await guest.conn.reducers.joinRoom({ roomCode: room.code });

  await host.conn.reducers.leaveRoom({ roomId: room.id });

  await waitFor(
    () => playerOf(host.conn, host.identity)?.roomId === 0,
    'host left room'
  );
  const transferred = await waitFor(
    () => [...guest.conn.db.rooms.iter()].find((r) => r.id === room.id && hex(r.hostIdentity) === hex(guest.identity)),
    'guest became host'
  );
  assert.ok(transferred);
});

test('leave_room deletes the room when the last participant exits', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Solo', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  await host.conn.reducers.leaveRoom({ roomId: room.id });

  assert.equal(playerOf(host.conn, host.identity).roomId, 0);
  assert.equal([...host.conn.db.rooms.iter()].find((r) => r.id === room.id), undefined);
});

test('close_room is host-only and deletes room-scoped data from results', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const guest = await newPlayer();
  await guest.conn.reducers.registerPlayer({ name: 'Guest', role: 'player' });
  await guest.conn.reducers.joinRoom({ roomCode: room.code });

  await host.conn.reducers.startRound({ roomId: room.id });
  await host.conn.reducers.endRound({ roomId: room.id });

  await assert.rejects(guest.conn.reducers.closeRoom({ roomId: room.id }));

  await host.conn.reducers.closeRoom({ roomId: room.id });

  await waitFor(
    () => playerOf(host.conn, host.identity)?.roomId === 0,
    'host sees own room reset'
  );
  await waitFor(
    () => playerOf(guest.conn, guest.identity)?.roomId === 0,
    'guest sees own room reset'
  );
  await waitFor(
    () => [...host.conn.db.rooms.iter()].find((r) => r.id === room.id) === undefined,
    'host sees room deleted'
  );
  assert.equal([...host.conn.db.round_results.iter()].find((r) => r.roomId === room.id), undefined);
  assert.equal([...host.conn.db.tiles.iter()].find((t) => t.roomId === room.id), undefined);
});

test('close_room rejects a live room', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await host.conn.reducers.startRound({ roomId: room.id });

  await assert.rejects(host.conn.reducers.closeRoom({ roomId: room.id }));
});

test('reset_demo_room hard-deletes a live room for the host', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const guest = await newPlayer();
  await guest.conn.reducers.registerPlayer({ name: 'Guest', role: 'player' });
  await guest.conn.reducers.joinRoom({ roomCode: room.code });

  await host.conn.reducers.startRound({ roomId: room.id });
  await host.conn.reducers.resetDemoRoom({ roomCode: ` ${room.code.toLowerCase()} ` });

  await waitFor(
    () => playerOf(host.conn, host.identity)?.roomId === 0,
    'host rehomed after reset'
  );
  await waitFor(
    () => playerOf(guest.conn, guest.identity)?.roomId === 0,
    'guest rehomed after reset'
  );
  assert.equal([...host.conn.db.rooms.iter()].find((r) => r.id === room.id), undefined);
  assert.equal([...host.conn.db.tiles.iter()].find((t) => t.roomId === room.id), undefined);
  assert.equal([...host.conn.db.round_tick.iter()].find((t) => t.roomId === room.id), undefined);
});

test('reset_demo_room rejects non-host callers', { skip }, async () => {
  if (skip) return;
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const guest = await newPlayer();
  await guest.conn.reducers.registerPlayer({ name: 'Guest', role: 'player' });
  await guest.conn.reducers.joinRoom({ roomCode: room.code });

  await assert.rejects(guest.conn.reducers.resetDemoRoom({ roomCode: room.code }));
});
