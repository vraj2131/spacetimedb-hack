/**
 * Integration tests for post_taunt.
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

async function roomWithHost() {
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  return { host, room, hostPlayer: playerOf(host.conn, host.identity) };
}

test('post_taunt inserts a sanitized taunt row', { skip }, async () => {
  if (skip) return;
  const { host, room, hostPlayer } = await roomWithHost();

  await host.conn.reducers.postTaunt({
    roomId: room.id,
    speaker: 'announcer',
    text: `  ${'A'.repeat(140)}  `,
    modelLabel: 'static',
    targetPlayerId: hostPlayer.id,
  });

  const taunt = await waitFor(
    () => [...host.conn.db.taunts.iter()].find((row) => row.roomId === room.id),
    'taunt inserted'
  );

  assert.equal(taunt.speaker, 'announcer');
  assert.equal(taunt.text.length, 120);
  assert.equal(taunt.modelLabel, 'static');
  assert.equal(taunt.targetPlayerId, hostPlayer.id);
});

test('post_taunt rejects invalid room, speaker, text, and target', { skip }, async () => {
  if (skip) return;
  const { host, room } = await roomWithHost();

  await assert.rejects(host.conn.reducers.postTaunt({
    roomId: 999_999,
    speaker: 'announcer',
    text: 'hello',
    modelLabel: 'static',
    targetPlayerId: undefined,
  }));

  await assert.rejects(host.conn.reducers.postTaunt({
    roomId: room.id,
    speaker: 'wizard',
    text: 'hello',
    modelLabel: 'static',
    targetPlayerId: undefined,
  }));

  await assert.rejects(host.conn.reducers.postTaunt({
    roomId: room.id,
    speaker: 'cat',
    text: '   ',
    modelLabel: 'static',
    targetPlayerId: undefined,
  }));

  await assert.rejects(host.conn.reducers.postTaunt({
    roomId: room.id,
    speaker: 'cat',
    text: 'hello',
    modelLabel: 'static',
    targetPlayerId: 999_999,
  }));
});
