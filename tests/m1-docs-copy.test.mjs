import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('Lobby screen no longer contains stale live-wiring placeholder copy', () => {
  const lobby = read('src/screens/Lobby.tsx');

  for (const stale of [
    'ready for live wiring',
    'once room reducers land',
    'Next wiring',
  ]) {
    assert.doesNotMatch(
      lobby,
      new RegExp(stale, 'i'),
      `Lobby.tsx should not contain stale copy: ${stale}`,
    );
  }

  assert.match(lobby, /live\. Share it with players or spectators/);
  assert.match(lobby, /Live room/);
});

test('README reflects merged M1 live wiring instead of pending client work', () => {
  const readme = read('README.md');

  assert.match(readme, /M1 live client wiring/i);
  assert.match(readme, /M1_SMOKE_TEST\.md/);
  assert.match(readme, /Maincloud-default app target/i);
  assert.match(readme, /VITE_SPACETIMEDB_HOST=https:\/\/maincloud\.spacetimedb\.com/);
  assert.doesNotMatch(
    readme,
    /wiring\s+the client \(screens, HUD, live Phaser `RenderState`\) onto those reducers/i,
    'README should not say client live wiring is still in progress',
  );
  assert.doesNotMatch(
    readme,
    /wire Join \+ Lobby \+ Match \+ Results screens to those reducers$/m,
    'README should not list unwired screens as next up',
  );
});

test('checklist marks M1 live UI items complete and atlas sprites landed', () => {
  const checklist = read('docs/checklist.md');

  for (const landed of [
    '- [x] Join screen',
    '- [x] Lobby screen',
    '- [x] Phaser draws 28×20 grid',
    '- [x] `move_player` works across two tabs',
    '- [x] Tile ownership colors in Phaser',
    '- [x] Timer + score HUD',
    '- [x] Results screen',
    '- [x] Two clients agree on winner',
    '- [x] `rematch` flow',
    '- [x] Replace primitives with tile / token / pickup sprites',
    '- [x] Effect overlays (spill, shield, speed)',
  ]) {
    assert.match(checklist, new RegExp(landed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(checklist, /M1_SMOKE_TEST\.md/);
});

test('M1 smoke doc records verified pass criteria', () => {
  const smoke = read('docs/M1_SMOKE_TEST.md');

  assert.match(smoke, /Recorded smoke run/);
  for (const criterion of [
    'Both clients connect with separate identities',
    'Host creates room; guest joins by code',
    'Host starts round; both route to Match',
    'Move buttons call live movement on both clients',
  ]) {
    assert.match(smoke, new RegExp(`- \\[x\\] ${criterion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
  for (const pending of [
    'Board \\*\\*Claim\\*\\* mode claims adjacent tile and updates both clients',
    '\\*\\*Contest\\*\\* mode flips adjacent enemy tile on both clients',
    '\\*\\*Collect\\*\\* pickup while standing on cell',
  ]) {
    assert.match(smoke, new RegExp(`- \\[ \\] ${pending}`));
  }
});

test('ROADMAP reflects L2A-L2C landed and notes remaining L4 polish', () => {
  const roadmap = read('docs/ROADMAP.md');

  assert.match(roadmap, /What's landed \(M1 live wiring — L2A–L2C merged\)/);
  assert.match(roadmap, /projectRenderState\.ts/);
  assert.match(roadmap, /useLiveGameState/);
  assert.doesNotMatch(
    roadmap,
    /Screens are 100% mock/,
    'ROADMAP should not claim screens are still mock',
  );
  assert.doesNotMatch(
    roadmap,
    /No live `RenderState` adapter/,
    'ROADMAP should not claim the live adapter is missing',
  );
  assert.match(roadmap, /L4 UI polish/);
  assert.match(roadmap, /L3A landed/);
  assert.match(roadmap, /M2B landed/);
  assert.match(roadmap, /M1_SMOKE_TEST\.md/);
});
