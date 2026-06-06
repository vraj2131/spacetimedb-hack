import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  symlinkSync,
  cpSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Spike 2 - SpacetimeDB 2.4.1 scheduled-table / tick_round syntax.
 *
 * The verified syntax lives in spikes/scheduled-tick.reference.ts. These tests:
 *  1. assert the reference keeps the verified syntax,
 *  2. assert the live repo has migrated away from the placeholder, and
 *  3. prove the reference builds and generates scheduled_at when the CLI/deps
 *     are available.
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

test('Spike 2: live repo uses the scheduled round_tick table', () => {
  const tables = readFileSync('spacetimedb/src/tables.ts', 'utf8');
  const tickReducers = readFileSync('spacetimedb/src/reducers.tick.ts', 'utf8');
  const index = readFileSync('spacetimedb/src/index.ts', 'utf8');
  assert.doesNotMatch(tables, /NON-FINAL PLACEHOLDER/);
  assert.doesNotMatch(tables, /scheduledAtMs:\s*t\.i64\(\)/);
  assert.match(tickReducers, /scheduled:\s*\(\):\s*any\s*=>\s*tickRound/);
  assert.match(tickReducers, /scheduledAt:\s*t\.scheduleAt\(\)/);
  assert.match(tickReducers, /\{\s*arg:\s*roundTick\.rowType\s*\}/);
  assert.match(tickReducers, /ctx\.senderAuth\.isInternal/);
  assert.match(index, /from '\.\/reducers\.tick'/);
});

test('Spike 2: reference builds + generates scheduled_at column', { skip: buildSkip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'bodega-spike-scheduled-'));
  try {
    mkdirSync(join(dir, 'src'));
    copyFileSync(REFERENCE, join(dir, 'src', 'index.ts'));
    copyFileSync('spacetimedb/package.json', join(dir, 'package.json'));
    copyFileSync('spacetimedb/tsconfig.json', join(dir, 'tsconfig.json'));
    try {
      symlinkSync(resolve('spacetimedb/node_modules'), join(dir, 'node_modules'));
    } catch (error) {
      if (error?.code !== 'EPERM') {
        throw error;
      }
      cpSync(resolve('spacetimedb/node_modules'), join(dir, 'node_modules'), {
        recursive: true,
      });
    }

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
