import { FormEvent, useMemo, useState } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { DbConnection, tables } from '../module_bindings';
import { PhaserGame } from '../game/PhaserGame';

/**
 * DevSync — scaffold round-trip screen using the real game schema.
 *
 * Proves connect → subscribe → reducer → cross-tab sync via `rooms` and
 * `players` instead of the retired `sync_state` table.
 */
export function DevSync() {
  const [devName, setDevName] = useState('Dev');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const connState = useSpacetimeDB();
  const conn = connState.getConnection() as DbConnection | null;
  const { identity, isActive: connected } = connState;
  const [rooms] = useTable(tables.rooms);
  const [players] = useTable(tables.players);

  const localPlayer = useMemo(() => {
    if (!identity) {
      return undefined;
    }
    const localIdentityHex = identity.toHexString();
    return players.find(player => player.identity.toHexString() === localIdentityHex);
  }, [identity, players]);

  const localRoom = useMemo(() => {
    if (!localPlayer || localPlayer.roomId === 0) {
      return null;
    }
    return rooms.find(room => room.id === localPlayer.roomId) ?? null;
  }, [localPlayer, rooms]);

  const sortedRooms = useMemo(
    () => [...rooms].sort((left, right) => left.id - right.id),
    [rooms],
  );

  const createTestRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!connected || !conn || isSubmitting) {
      return;
    }

    const name = devName.trim();
    if (name.length === 0) {
      setActionError('Enter a nickname first.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (!localPlayer) {
        await conn.reducers.registerPlayer({ name, role: 'player' });
        await conn.reducers.createRoom({});
        return;
      }
      if (localPlayer.roomId === 0) {
        await conn.reducers.createRoom({});
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="shell">
      <section className="panel">
        <header>
          <p className="eyebrow">Bodega Blitz Slice 2</p>
          <h1>Room sync baseline</h1>
          <p className="intro">
            Create a room in one tab and watch the subscribed room list update in
            another. This uses the same `rooms` / `players` tables as the live game
            flow.
          </p>
        </header>

        <dl className="status-grid">
          <div>
            <dt>Connection</dt>
            <dd className={connected ? 'ok' : 'bad'}>
              {connected ? 'Connected' : 'Disconnected'}
            </dd>
          </div>
          <div>
            <dt>Identity</dt>
            <dd>{identity?.toHexString().slice(0, 12) ?? 'pending'}</dd>
          </div>
          <div>
            <dt>Subscribed rooms</dt>
            <dd>{rooms.length}</dd>
          </div>
          <div>
            <dt>Subscribed players</dt>
            <dd>{players.length}</dd>
          </div>
        </dl>

        <div className="value-box" data-testid="synced-value">
          <span>Your room</span>
          <strong>{localRoom?.code ?? 'Not in a room yet'}</strong>
          <small>
            {localPlayer
              ? `${localPlayer.name} · roomId ${localPlayer.roomId}`
              : 'Register below to join the sync proof'}
          </small>
        </div>

        <form onSubmit={createTestRoom} className="sync-form">
          <label htmlFor="dev-name">Dev nickname</label>
          <div>
            <input
              id="dev-name"
              value={devName}
              onChange={event => setDevName(event.target.value)}
              placeholder="Create a room in one tab, watch the other update"
              maxLength={32}
              disabled={!connected || isSubmitting}
            />
            <button
              type="submit"
              disabled={!connected || isSubmitting || devName.trim().length === 0}
            >
              {localPlayer?.roomId ? 'Already seated' : 'Create room'}
            </button>
          </div>
        </form>

        {actionError ? <p className="intro bad">{actionError}</p> : null}

        <div className="value-box">
          <span>Live room codes</span>
          <strong>
            {sortedRooms.length > 0
              ? sortedRooms.map(room => room.code).join(', ')
              : 'No rooms yet'}
          </strong>
          <small>Open a second tab and create a room to verify cross-tab sync.</small>
        </div>

        <section className="phaser-panel" aria-label="Phaser board canvas">
          <p className="eyebrow">Renderer Stack</p>
          <h2>Phaser board canvas</h2>
          <p>
            The live canvas below renders the board grid. React owns SpacetimeDB and
            feeds Phaser a frozen RenderState snapshot; Phaser only draws.
          </p>
          <PhaserGame />
        </section>
      </section>
    </main>
  );
};
