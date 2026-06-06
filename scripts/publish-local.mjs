/**
 * Publish the module to the local `bodega-blitz` database.
 *
 * Ensures a local SpacetimeDB server is reachable first (starts one in the
 * background if needed). Use this instead of calling `spacetime publish`
 * directly during dev — a failed publish leaves the browser on a stale module
 * and reducer calls surface as "The instance encountered a fatal error."
 */
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { cliAvailable, readPid, serverUp } from './spacetime-local-server.mjs';

async function ensureServer() {
  if (await serverUp()) {
    const pid = readPid();
    console.log(
      `[publish:local] reusing already-running SpacetimeDB server${pid ? ` (pid ${pid})` : ''}`,
    );
    return;
  }

  console.log('[publish:local] starting local SpacetimeDB server…');
  spawn('spacetime', ['start'], {
    stdio: 'ignore',
    detached: true,
  }).unref();

  const start = Date.now();
  while (!(await serverUp())) {
    if (Date.now() - start > 30_000) {
      throw new Error('SpacetimeDB server did not start within 30s');
    }
    await sleep(500);
  }

  await sleep(1500);
  console.log('[publish:local] server is up');
}

async function main() {
  if (!cliAvailable()) {
    console.error('[publish:local] requires the spacetime CLI on PATH');
    process.exit(1);
  }

  await ensureServer();
  execSync('spacetime publish bodega-blitz --module-path spacetimedb --server local', {
    stdio: 'inherit',
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
