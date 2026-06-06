import {
  cliAvailable,
  killLocalServer,
  readPid,
  serverUp,
  waitForServerDown,
} from './spacetime-local-server.mjs';

async function main() {
  if (!cliAvailable()) {
    console.error('[spacetime:kill] requires the spacetime CLI on PATH');
    process.exit(1);
  }

  const pid = readPid();
  if (!pid) {
    console.log('[spacetime:kill] no local spacetime.pid found — server may already be stopped');
    process.exit(0);
  }

  if (!killLocalServer()) {
    console.error(`[spacetime:kill] could not stop pid ${pid}`);
    process.exit(1);
  }

  const stopped = await waitForServerDown();
  if (!stopped) {
    console.error(`[spacetime:kill] pid ${pid} did not exit within 10s`);
    process.exit(1);
  }

  console.log(`[spacetime:kill] stopped local SpacetimeDB server (pid ${pid})`);
}

main();
