import { cliAvailable, readPid, serverUp } from './spacetime-local-server.mjs';

async function main() {
  if (!cliAvailable()) {
    console.log('[spacetime:status] spacetime CLI not found on PATH');
    process.exit(1);
  }

  const up = await serverUp();
  const pid = readPid();

  if (up) {
    console.log(
      `[spacetime:status] local server is running on http://127.0.0.1:3000${pid ? ` (pid ${pid})` : ''}`,
    );
    console.log('[spacetime:status] skip `spacetime start` — use `npm run spacetime:publish:local`');
    return;
  }

  console.log('[spacetime:status] local server is not reachable on http://127.0.0.1:3000');
  if (pid) {
    console.log(`[spacetime:status] stale spacetime.pid references pid ${pid} — run npm run spacetime:kill:local`);
  } else {
    console.log('[spacetime:status] run `npm run spacetime:publish:local` to start it');
  }
  process.exit(1);
}

main();
