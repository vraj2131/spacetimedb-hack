/**
 * Integration-test harness for SpacetimeDB reducers.
 *
 * Unlike the pure unit tests (which import pure helpers like `map.ts`), reducers
 * can only be exercised against a live SpacetimeDB instance — they register via
 * `spacetimedb.reducer(...)` and take a non-mockable `ctx`. This harness drives
 * a local server: publish a throwaway per-run database, open SDK connections
 * (each connection = one stable identity, so we can model host vs joiner vs N
 * players), call reducers, and assert on real table state.
 *
 * Reducer calls are awaited: the returned promise resolves after the
 * transaction commits (and the calling connection's cache is updated), and
 * rejects if the reducer throws — so `assert.rejects(...)` works for guard
 * tests. Cross-connection visibility is still asynchronous, so use `waitFor`
 * when asserting that connection B sees a change made by connection A.
 *
 * Requires the `spacetime` CLI and a reachable local server (ws://127.0.0.1:3000).
 * `scripts/run-integration.mjs` starts one for the whole run; `shouldSkip()`
 * lets test files opt out cleanly when neither is available.
 */
import { execSync } from 'node:child_process';
import { DbConnection } from '../../src/module_bindings/index.ts';

export const URI = 'ws://127.0.0.1:3000';
export const SERVER = 'local';

/** True if the `spacetime` CLI is on PATH. */
export function cliAvailable() {
  try {
    execSync('spacetime --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** True if a SpacetimeDB server is answering on the local HTTP port. */
export async function serverReachable() {
  try {
    await fetch('http://127.0.0.1:3000/', { signal: AbortSignal.timeout(1500) });
    return true; // any HTTP response (even 404) means the daemon is up
  } catch {
    return false;
  }
}

/**
 * Reason to skip integration tests, or `false` if they can run.
 * Use in a test file's `before()` and guard each test with `{ skip }`.
 */
export async function shouldSkip() {
  if (!cliAvailable()) {
    return 'requires the spacetime CLI on PATH';
  }
  if (!(await serverReachable())) {
    return 'requires a local SpacetimeDB server (run `spacetime start`)';
  }
  return false;
}

/** A unique throwaway database name for one test run. */
export function uniqueDbName() {
  return `bodega-blitz-test-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Publish the module to a per-run database (clean state). */
export function publishModule(dbName) {
  execSync(
    `spacetime publish ${dbName} --module-path spacetimedb --server ${SERVER}`,
    { stdio: 'ignore' }
  );
}

/** Delete a per-run database (best-effort; safe to call in teardown). */
export function deleteModule(dbName) {
  try {
    execSync(`spacetime delete ${dbName} --server ${SERVER} --yes`, {
      stdio: 'ignore',
    });
  } catch {
    // already gone / server down — nothing to clean up
  }
}

/** Tables every test subscribes to so `conn.db.*` is populated. */
const SUBSCRIBE_QUERIES = [
  'SELECT * FROM players',
  'SELECT * FROM rooms',
  'SELECT * FROM player_state',
  'SELECT * FROM tiles',
  'SELECT * FROM events',
  'SELECT * FROM pickups',
  'SELECT * FROM round_results',
];

/**
 * Open a connection to `dbName` as a fresh identity (no stored token) and wait
 * until its subscription is applied. Returns the connection plus its identity.
 */
export async function connect(dbName) {
  const { conn, identity } = await new Promise((resolve, reject) => {
    DbConnection.builder()
      .withUri(URI)
      .withDatabaseName(dbName)
      .withCompression('none') // avoid brotli decode in Node
      .onConnect((connection, id) => resolve({ conn: connection, identity: id }))
      .onConnectError((_ctx, err) => reject(err))
      .build();
  });

  await new Promise((resolve, reject) => {
    conn
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((ctx) => reject(ctx.event ?? new Error('subscription error')))
      .subscribe(SUBSCRIBE_QUERIES);
  });

  return { conn, identity };
}

/** Hex string of a connection identity, for matching rows by `identity`. */
export function hex(identity) {
  return identity.toHexString();
}

/**
 * Poll `fn` until it returns a truthy value (returned) or time out (throws).
 * Use for cross-connection visibility, where another identity's committed
 * change must propagate to this connection's subscription cache.
 */
export async function waitFor(fn, label = 'condition', timeoutMs = 5000) {
  const start = Date.now();
  for (;;) {
    const value = fn();
    if (value) {
      return value;
    }
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`waitFor timed out: ${label}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}
