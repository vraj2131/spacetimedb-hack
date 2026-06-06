import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Spike 2 — SpacetimeDB 2.4.1 scheduled-table / tick_round syntax.
 *
 * The verified syntax lives in spikes/scheduled-tick.reference.ts (committed,
 * not wired into the live module). These tests:
 *  1. assert the reference keeps the verified syntax,
 *  2. assert the live repo still ships the NON-FINAL PLACEHOLDER so Dev A knows
 *     to migrate, and
 *  3. when the spacetime CLI + module deps are available (CI, local dev),
 *     copy the reference into a throwaway module and prove it builds + that the
 *     schedule column generates as `scheduled_at` (not `scheduled_at_ms`).
 * Step 3 skips cleanly where the CLI/deps are absent, so the gate stays green
 * for teammates running `npm test` without SpacetimeDB installed.
 */

const REFERENCE = 'spikes/scheduled-tick.reference.ts';

function hasSpacetimeCli() {
  try {
    execSync('spacetime --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const CAN_BUILD = hasSpacetimeCli() && existsSync('spacetimedb/node_modules');
const buildSkip = CAN_BUILD
  ? false
  : 'requires the spacetime CLI and spacetimedb/node_modules';

test('Spike 2: reference keeps the verified scheduled-table syntax', () => {
  const src = readFileSync(REFERENCE, 'utf8');
  assert.match(src, /scheduled:\s*\(\):\s*any\s*=>\s*tickRound/);
  assert.match(src, /scheduledAt:\s*t\.scheduleAt\(\)/);
  assert.match(src, /\{\s*arg:\s*roundTick\.rowType\s*\}/);
  assert.match(src, /ScheduleAt\.interval\(1_000_000n\)/);
  assert.match(src, /ctx\.senderAuth\.isInternal/);
});

test('Spike 2: live repo still ships the placeholder (Dev A must migrate)', () => {
  const tables = readFileSync('spacetimedb/src/tables.ts', 'utf8');
  const roomReducers = readFileSync('spacetimedb/src/reducers.room.ts', 'utf8');
  assert.match(tables, /NON-FINAL PLACEHOLDER/);
  assert.match(tables, /scheduledAtMs:\s*t\.i64\(\)/);
  assert.match(roomReducers, /tick_round[\s\S]*\{\s*roomId:\s*t\.u32\(\)\s*\}/);
  // The placeholder's table() opts must be exactly name+public — i.e. NOT yet
  // wired as a scheduled table. (A literal `scheduled: () => tickRound` appears
  // in the placeholder's doc comment, so match the opts object precisely.)
  assert.match(tables, /table\(\s*\{ name: 'round_tick', public: true \}/);
});

test('Spike 2: reference builds + generates scheduled_at column', { skip: buildSkip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'bodega-spike-scheduled-'));
  try {
    mkdirSync(join(dir, 'src'));
    copyFileSync(REFERENCE, join(dir, 'src', 'index.ts'));
    copyFileSync('spacetimedb/package.json', join(dir, 'package.json'));
    copyFileSync('spacetimedb/tsconfig.json', join(dir, 'tsconfig.json'));
    symlinkSync(resolve('spacetimedb/node_modules'), join(dir, 'node_modules'));

    const build = execSync(`spacetime build --module-path "${dir}" --lint-dir ""`, {
      encoding: 'utf8',
    });
    assert.match(build, /Build finished successfully/);

    const outDir = join(dir, 'bindings');
    execSync(
      `spacetime generate --lang typescript --out-dir "${outDir}" --module-path "${dir}"`,
      { encoding: 'utf8' }
    );
    const row = readFileSync(join(outDir, 'round_tick_table.ts'), 'utf8');
    assert.match(row, /scheduledAt:\s*__t\.scheduleAt\(\)\.name\("scheduled_at"\)/);
    assert.doesNotMatch(row, /scheduled_at_ms/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
