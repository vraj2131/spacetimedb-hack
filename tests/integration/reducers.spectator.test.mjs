/**
 * Integration tests for the spectator reducer (trigger_spectator_event):
 * energy initialization on join, spill_slick effect, energy deduction,
 * insufficient-energy rejection, and player-role rejection.
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

/** Register a host, open a room, start the round; return host handle + room. */
async function startedRound(name = 'Host') {
  const host = await newPlayer();
  await host.conn.reducers.registerPlayer({ name, role: 'player' });
  await host.conn.reducers.createRoom();
  const room = [...host.conn.db.rooms.iter()].find(
    (r) => hex(r.hostIdentity) === hex(host.identity)
  );
  await host.conn.reducers.startRound({ roomId: room.id });

  const me = playerOf(host.conn, host.identity);
  await waitFor(
    () => host.conn.db.player_state.playerId.find(me.id),
    'host player_state seeded'
  );
  await waitFor(
    () => [...host.conn.db.tiles.iter()].some((t) => t.roomId === room.id),
    'tiles seeded'
  );
  return { host, room, playerId: me.id };
}

test('spectator gets energy 10 on join, can trigger spill_slick', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();

  // Join as spectator
  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Watcher', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });

  const watcherPlayer = playerOf(watcher.conn, watcher.identity);
  assert.ok(watcherPlayer, 'spectator registered');

  // Wait for spectator_state to be visible
  const specState = await waitFor(
    () => watcher.conn.db.spectator_state.playerId.find(watcherPlayer.id),
    'spectator_state seeded'
  );
  assert.equal(specState.energy, 10, 'spectator starts with 10 energy');

  // Pick a tile in the room for the spill
  const tile = [...watcher.conn.db.tiles.iter()].find(
    (t) => t.roomId === room.id
  );
  assert.ok(tile, 'at least one tile exists');

  // Trigger spill_slick
  await watcher.conn.reducers.triggerSpectatorEvent({
    eventType: 'spill_slick',
    targetPlayerId: undefined,
    targetTileId: tile.id,
  });

  // Energy should drop from 10 to 7 (cost 3)
  const updated = await waitFor(
    () => {
      const s = watcher.conn.db.spectator_state.playerId.find(watcherPlayer.id);
      return s && s.energy === 7 ? s : null;
    },
    'energy dropped to 7'
  );
  assert.equal(updated.energy, 7, 'energy deducted by 3');

  // Tile should have spillUntilMs > 0
  const spilledTile = await waitFor(
    () => {
      const t = watcher.conn.db.tiles.id.find(tile.id);
      return t && t.spillUntilMs > 0n ? t : null;
    },
    'tile has spillUntilMs > 0'
  );
  assert.ok(spilledTile.spillUntilMs > 0n, 'tile spillUntilMs is set');
});

test('rejects when not enough energy', { skip }, async () => {
  if (skip) return;
  const { room, playerId } = await startedRound();

  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Drainer', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });

  const watcherPlayer = playerOf(watcher.conn, watcher.identity);
  await waitFor(
    () => watcher.conn.db.spectator_state.playerId.find(watcherPlayer.id),
    'spectator_state seeded'
  );

  // Drain to 1 energy despite scheduled regen: 3 coffee boosts cost 12 total,
  // with two +1 regen windows between them.
  await watcher.conn.reducers.triggerSpectatorEvent({
    eventType: 'coffee_boost',
    targetPlayerId: playerId,
    targetTileId: undefined,
  }); // 10 -> 6

  await sleep(4_100);
  await watcher.conn.reducers.triggerSpectatorEvent({
    eventType: 'coffee_boost',
    targetPlayerId: playerId,
    targetTileId: undefined,
  }); // 7 -> 3

  await sleep(4_100);
  await watcher.conn.reducers.triggerSpectatorEvent({
    eventType: 'coffee_boost',
    targetPlayerId: playerId,
    targetTileId: undefined,
  }); // 4 -> 0

  // Wait for energy to reach 0 or 1, then a 3-cost spill should fail.
  await waitFor(
    () => {
      const s = watcher.conn.db.spectator_state.playerId.find(watcherPlayer.id);
      return s && s.energy <= 1 ? s : null;
    },
    'energy drained below spill cost'
  );

  const tile = [...watcher.conn.db.tiles.iter()].find((t) => t.roomId === room.id);
  assert.ok(tile);

  await assert.rejects(
    watcher.conn.reducers.triggerSpectatorEvent({
      eventType: 'spill_slick',
      targetPlayerId: undefined,
      targetTileId: tile.id,
    }),
    'should reject when not enough energy'
  );
});

test('spectator powers enforce cooldown independent of energy', { skip }, async () => {
  if (skip) return;
  const { room } = await startedRound();

  const watcher = await newPlayer();
  await watcher.conn.reducers.registerPlayer({ name: 'Cooldown', role: 'spectator' });
  await watcher.conn.reducers.joinRoom({ roomCode: room.code });

  const tile = [...watcher.conn.db.tiles.iter()].find((t) => t.roomId === room.id);
  assert.ok(tile);

  await watcher.conn.reducers.triggerSpectatorEvent({
    eventType: 'spill_slick',
    targetPlayerId: undefined,
    targetTileId: tile.id,
  });
  await assert.rejects(
    watcher.conn.reducers.triggerSpectatorEvent({
      eventType: 'deli_shield',
      targetPlayerId: undefined,
      targetTileId: tile.id,
    })
  );
});

test('player cannot trigger spectator events', { skip }, async () => {
  if (skip) return;
  const { host, room } = await startedRound();

  // The host is a player, not a spectator
  const tile = [...host.conn.db.tiles.iter()].find(
    (t) => t.roomId === room.id
  );
  assert.ok(tile);

  await assert.rejects(
    host.conn.reducers.triggerSpectatorEvent({
      eventType: 'spill_slick',
      targetPlayerId: undefined,
      targetTileId: tile.id,
    }),
    'should reject when caller is a player, not a spectator'
  );
});
