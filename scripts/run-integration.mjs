/**
 * Runner for the SpacetimeDB reducer integration tests.
 *
 * Integration tests need a live local SpacetimeDB. This wrapper owns the daemon
 * lifecycle for the whole run (so individual test files never race to start/stop
 * it): if no CLI is present it skips cleanly; if a server is already up it reuses
 * it; otherwise it starts an in-memory daemon, runs the tests, and stops the
 * daemon it started.
 *
 * Tests run under `node --import tsx` because the generated `src/module_bindings`
 * use bundler-style (extension-less) imports that Node's type-stripping can't
 * resolve on its own.
 */
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const HTTP = 'http://127.0.0.1:3000/';

function cliAvailable() {
  try {
    execSync('spacetime --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function serverUp() {
  try {
    await fetch(HTTP, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!cliAvailable()) {
    console.log('[integration] skipped — spacetime CLI not found on PATH');
    return 0;
  }

  let daemon = null;
  if (!(await serverUp())) {
    console.log('[integration] starting local in-memory SpacetimeDB…');
    daemon = spawn('spacetime', ['start', '--in-memory'], {
      stdio: 'ignore',
      detached: false,
    });
    const start = Date.now();
    while (!(await serverUp())) {
      if (Date.now() - start > 30_000) {
        daemon.kill('SIGTERM');
        console.error('[integration] server did not start within 30s');
        return 1;
      }
      await sleep(500);
    }
    console.log('[integration] server is up');
  } else {
    console.log('[integration] reusing already-running server');
  }

  const child = spawn(
    'node',
    ['--import', 'tsx', '--test', 'tests/integration/*.test.mjs'],
    { stdio: 'inherit' }
  );
  const code = await new Promise((resolve) => child.on('exit', resolve));

  if (daemon) {
    console.log('[integration] stopping local server');
    daemon.kill('SIGTERM');
  }
  return code ?? 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
