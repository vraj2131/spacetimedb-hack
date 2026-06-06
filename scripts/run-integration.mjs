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

// Daemon we started, if any. `spacetime start` forks a `spacetimedb-standalone`
// child, so killing only the wrapper orphans the server. We spawn it as a
// process-group leader (detached) and signal the whole group to tear both down.
let daemon = null;

function stopDaemon() {
  if (!daemon) {
    return;
  }
  const pid = daemon.pid;
  daemon = null;
  try {
    process.kill(-pid, 'SIGTERM'); // negative pid => whole process group
  } catch {
    // already exited / not a group leader — nothing to clean up
  }
}

// Ensure the daemon dies even if the runner exits abnormally.
process.on('exit', stopDaemon);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stopDaemon();
    process.exit(1);
  });
}

async function main() {
  if (!cliAvailable()) {
    console.log('[integration] skipped — spacetime CLI not found on PATH');
    return 0;
  }

  if (!(await serverUp())) {
    console.log('[integration] starting local in-memory SpacetimeDB…');
    daemon = spawn('spacetime', ['start', '--in-memory'], {
      stdio: 'ignore',
      detached: true, // own process group, so stopDaemon() can kill the group
    });
    const start = Date.now();
    while (!(await serverUp())) {
      if (Date.now() - start > 30_000) {
        stopDaemon();
        console.error('[integration] server did not start within 30s');
        return 1;
      }
      await sleep(500);
    }
    // The HTTP port answers (even 404) before the module host is ready for
    // publishes/connections — settle briefly so the first test file doesn't race
    // a half-initialized daemon.
    await sleep(1500);
    console.log('[integration] server is up');
  } else {
    console.log('[integration] reusing already-running server');
  }

  // Run integration files serially: they share one daemon and concurrent
  // publishes/connections against it are flaky (especially right after start).
  const child = spawn(
    'node',
    [
      '--import',
      'tsx',
      '--test',
      '--test-concurrency=1',
      'tests/integration/*.test.mjs',
    ],
    { stdio: 'inherit' }
  );
  const code = await new Promise((resolve) => child.on('exit', resolve));

  if (daemon) {
    console.log('[integration] stopping local server');
    stopDaemon();
  }
  return code ?? 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    stopDaemon();
    process.exit(1);
  }
);
