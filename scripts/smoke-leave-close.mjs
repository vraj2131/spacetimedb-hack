/**
 * Smoke leave/close against the live local `bodega-blitz` database (not test DB).
 * Run: node --import tsx scripts/smoke-leave-close.mjs
 */
import { connect, hex, waitFor } from '../tests/helpers/spacetime-harness.mjs';

const DB = 'bodega-blitz';

function log(label, err) {
  if (err instanceof Error) {
    console.error(`${label}: ${err.name}: ${err.message}`);
  } else {
    console.error(`${label}:`, err);
  }
}

async function main() {
  const host = await connect(DB);
  const guest = await connect(DB);

  try {
    await host.conn.reducers.registerPlayer({ name: 'SmokeHost', role: 'player' });
    await guest.conn.reducers.registerPlayer({ name: 'SmokeGuest', role: 'player' });
    await host.conn.reducers.createRoom({});
    const room = await waitFor(
      () =>
        [...host.conn.db.rooms.iter()].find(
          (entry) => hex(entry.hostIdentity) === hex(host.identity),
        ),
      'room created',
    );
    console.log('room', room.code, room.id);

    await guest.conn.reducers.joinRoom({ roomCode: room.code });

    await guest.conn.reducers.leaveRoom({ roomId: room.id });
    console.log('guest leave OK');

    await host.conn.reducers.leaveRoom({ roomId: room.id });
    console.log('host leave OK');

    await host.conn.reducers.createRoom({});
    const room2 = await waitFor(
      () =>
        [...host.conn.db.rooms.iter()].find(
          (entry) => hex(entry.hostIdentity) === hex(host.identity),
        ),
      'second room created',
    );
    await guest.conn.reducers.joinRoom({ roomCode: room2.code });
    await host.conn.reducers.startRound({ roomId: room2.id });
    await host.conn.reducers.endRound({ roomId: room2.id });
    await host.conn.reducers.closeRoom({ roomId: room2.id });
    console.log('close after results OK');
  } catch (err) {
    log('FAILED', err);
    process.exitCode = 1;
  } finally {
    host.conn.disconnect();
    guest.conn.disconnect();
  }
}

main();
