import { FormEvent, useMemo, useState } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { DbConnection, tables } from './module_bindings';
import { PhaserPlaceholder } from './components/PhaserPlaceholder';

function App() {
  const [nextValue, setNextValue] = useState('');
  const connState = useSpacetimeDB();
  const conn = connState.getConnection() as DbConnection | null;
  const { identity, isActive: connected } = connState;
  const [syncRows] = useTable(tables.sync_state);

  const syncValue = useMemo(() => syncRows.find(row => row.id === 1), [syncRows]);
  const displayValue = syncValue?.value ?? 'Waiting for sync_state row...';
  const updatedBy = syncValue?.updatedBy ?? 'none';

  const submitValue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!connected || nextValue.trim().length === 0) {
      return;
    }

    conn?.reducers.setValue({ value: nextValue });
    setNextValue('');
  };

  return (
    <main className="shell">
      <section className="panel">
        <header>
          <p className="eyebrow">Bodega Blitz Phase 0</p>
          <h1>Shared Scaffold Baseline</h1>
          <p className="intro">
            This temporary screen proves the team can install dependencies, connect to
            SpacetimeDB locally, and verify shared state before gameplay work begins.
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
        </dl>

        <div className="value-box" data-testid="synced-value">
          <span>Synced value</span>
          <strong>{displayValue}</strong>
          <small>Last update: {updatedBy.slice(0, 16)}</small>
        </div>

        <form onSubmit={submitValue} className="sync-form">
          <label htmlFor="next-value">Set shared value</label>
          <div>
            <input
              id="next-value"
              value={nextValue}
              onChange={event => setNextValue(event.target.value)}
              placeholder="Type in one tab, watch the other update"
              maxLength={80}
              disabled={!connected}
            />
            <button type="submit" disabled={!connected || nextValue.trim().length === 0}>
              Sync
            </button>
          </div>
        </form>

        <PhaserPlaceholder />
      </section>
    </main>
  );
}

export default App;
