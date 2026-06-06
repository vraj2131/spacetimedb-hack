import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Docs/onboarding contract — fresh clones must know to regenerate bindings.
 */

test('SETUP.md tells teammates to run spacetime:generate on first clone', () => {
  const setup = readFileSync('docs/SETUP.md', 'utf8');
  assert.match(
    setup,
    /spacetime:generate/,
    'docs/SETUP.md must document npm run spacetime:generate (bindings are gitignored)'
  );
});

test('README first-time setup documents spacetime:generate', () => {
  const readme = readFileSync('README.md', 'utf8');
  assert.match(
    readme,
    /spacetime:generate/,
    'README must document npm run spacetime:generate (bindings are gitignored)'
  );
});

test('README baseline verification mentions the live Phaser canvas', () => {
  const readme = readFileSync('README.md', 'utf8');
  assert.match(
    readme,
    /Phaser board canvas|live Phaser canvas/i,
    'README should describe the live Phaser canvas, not the old version placeholder'
  );
});

test('.env.example keeps the local-first host contract', () => {
  const env = readFileSync('.env.example', 'utf8');
  assert.match(env, /VITE_SPACETIMEDB_HOST=ws:\/\/127\.0\.0\.1:3000/);
  assert.match(env, /VITE_SPACETIMEDB_DB_NAME=bodega-blitz/);
});
