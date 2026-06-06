/**
 * Helpers for the local SpacetimeDB daemon started by publish-local.mjs.
 */
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export const LOCAL_HTTP = 'http://127.0.0.1:3000/';
const PID_FILE = join(homedir(), '.local/share/spacetime/data/spacetime.pid');

export function cliAvailable() {
  try {
    execSync('spacetime --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function serverUp() {
  try {
    await fetch(LOCAL_HTTP, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

export function readPid() {
  try {
    const raw = readFileSync(PID_FILE, 'utf8').trim();
    const pid = Number(raw);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function killLocalServer() {
  const pid = readPid();
  if (!pid) {
    return false;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      return false;
    }
  }

  try {
    unlinkSync(PID_FILE);
  } catch {
    // stale pid file is harmless once the process is gone
  }

  return true;
}

export async function waitForServerDown(timeoutMs = 10_000) {
  const start = Date.now();
  while (await serverUp()) {
    if (Date.now() - start > timeoutMs) {
      return false;
    }
    await sleep(250);
  }
  return true;
}
