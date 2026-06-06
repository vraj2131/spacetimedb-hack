/**
 * Integration tests for scheduled round ticks.
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

async function liveRoomWithSpectator() {
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name: 'Host', role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );

  const spectator = await newPlayer();
  await spectator.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await spectator.conn.reducers.joinRoom({ roomCode: room.code });

  await host.conn.reducers.startRound({ roomId: room.id });
  const hostPlayer = playerOf(host.conn, host.identity);
  const spectatorPlayer = playerOf(spectator.conn, spectator.identity);

  await waitFor(
    () => host.conn.db.player_state.playerId.find(hostPlayer.id),
    'host player_state seeded'
  );
  await waitFor(
    () => [...host.conn.db.tiles.iter()].some((t) => t.roomId === room.id),
    'tiles seeded'
  );
  await waitFor(
    () => [...spectator.conn.db.tiles.iter()].some((t) => t.roomId === room.id),
    'spectator sees tiles seeded'
  );

  return { host, spectator, room, hostPlayer, spectatorPlayer };
}

test('scheduled tick grants tile income for owned tiles', { skip }, async () => {
  if (skip) return;
  const { host, room, hostPlayer } = await liveRoomWithSpectator();

  const street = tileAt(host.conn, room.id, 2, 1);
  assert.ok(street, 'street tile adjacent to host exists');
  assert.ok(
    [...host.conn.db.round_tick.iter()].some((row) => row.roomId === room.id),
    'startRound seeded a scheduled tick row'
  );
  await host.conn.reducers.claimTile({ tileId: street.id });

  const state = await waitFor(
    () => {
      const row = host.conn.db.player_state.playerId.find(hostPlayer.id);
      return row && row.tileIncomeTotal >= 1 && row.cash >= 1 ? row : null;
    },
    'scheduled tick applied street income',
    4_000
  );

  assert.ok(state.tileIncomeTotal >= 1);
  assert.ok(state.cash >= 1);
});

test('scheduled tick regenerates spectator energy after spending it', { skip }, async () => {
  if (skip) return;
  const { spectator, room, spectatorPlayer } = await liveRoomWithSpectator();

  const tile = [...spectator.conn.db.tiles.iter()].find((t) => t.roomId === room.id);
  assert.ok(tile, 'target tile exists');

  await spectator.conn.reducers.triggerSpectatorEvent({
    eventType: 'spill_slick',
    targetPlayerId: undefined,
    targetTileId: tile.id,
  });

  await waitFor(
    () => {
      const state = spectator.conn.db.spectator_state.playerId.find(spectatorPlayer.id);
      return state && state.energy === 7 ? state : null;
    },
    'energy spent'
  );

  const regenerated = await waitFor(
    () => {
      const state = spectator.conn.db.spectator_state.playerId.find(spectatorPlayer.id);
      return state && state.energy > 7 ? state : null;
    },
    'scheduled tick regenerated spectator energy',
    4_000
  );

  assert.ok(regenerated.energy > 7);
  assert.ok(regenerated.energy <= 10);
});
