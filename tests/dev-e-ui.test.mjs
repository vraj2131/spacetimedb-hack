import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('Dev E adapter exposes backend handoff view models and actions', () => {
  const uiState = read('src/screens/uiState.ts');

  for (const exportName of [
    'ConnectionState',
    'JoinViewModel',
    'LobbyViewModel',
    'MatchViewModel',
    'ResultsViewModel',
    'GameUiState',
    'GameUiActions',
    'createMockGameUiState',
  ]) {
    assert.match(uiState, new RegExp(`export (type|function) ${exportName}\\b`));
  }

  for (const expectedField of [
    'localIdentity',
    'localRole',
    'roomState',
    'timerEndsAt',
    'spectatorCount',
    'liveStandings',
    'recentTaunt',
    'canStartRound',
    'canRematch',
    'canCloseRoom',
    'canLeaveRoom',
    'localCash',
    'claimHint',
    'localPickupId',
    'canCollectPickup',
    'onMove',
    'onClaimTileAt',
    'onContestTileAt',
    'onCollectPickupAt',
    'onLeaveRoom',
    'onCloseRoom',
    'actionStatusLabel',
  ]) {
    assert.match(uiState, new RegExp(`\\b${expectedField}\\b`));
  }
});

test('App defaults to Join while keeping the dev scaffold reachable', () => {
  const app = read('src/App.tsx');

  assert.match(app, /useState<Screen>\('join'\)/);
  assert.match(app, /useLiveGameState/);
  assert.match(app, /onReturnToDev/);
  assert.match(app, /<DevSync/);
  assert.match(app, /Start Bodega Blitz/);
});

test('Dev E screens consume view models and action callbacks instead of mockData directly', () => {
  for (const screen of ['Join', 'Lobby', 'Match', 'Results']) {
    const contents = read(`src/screens/${screen}.tsx`);
    assert.doesNotMatch(contents, /from '\.\/mockData'/, `${screen} should not import mockData`);
    assert.match(contents, /viewModel/, `${screen} should receive a viewModel prop`);
  }
});

test('player-facing screens expose leave-close flow and claim guidance', () => {
  const lobby = read('src/screens/Lobby.tsx');
  const match = read('src/screens/Match.tsx');
  const matchTopBar = read('src/components/MatchTopBar.tsx');
  const matchBottomDock = read('src/components/MatchBottomDock.tsx');
  const results = read('src/screens/Results.tsx');

  assert.match(lobby, /Close room/);
  assert.match(lobby, /Leave room/);
  assert.match(lobby, /actionStatusLabel/);
  assert.match(matchTopBar, /Leave room/);
  assert.match(matchBottomDock, /Claim/);
  assert.match(matchBottomDock, /Contest/);
  assert.match(matchBottomDock, /Collect/);
  assert.match(match, /MatchTopBar/);
  assert.match(match, /MatchBottomDock/);
  assert.match(matchBottomDock, /actionStatusLabel/);
  assert.match(results, /Close room/);
  assert.match(results, /Leave room/);
  assert.match(results, /actionStatusLabel/);
  assert.doesNotMatch(results, /Back to lobby/);
});

test('Dev E components have empty-state labels for backend-not-ready data', () => {
  const componentChecks = {
    'src/components/Scoreboard.tsx': ['No standings yet', 'No result rows yet'],
    'src/components/PlayerRoster.tsx': ['Waiting for players'],
    'src/components/Hud.tsx': ['No events yet', 'Taunts warming up'],
    'src/components/EventFeed.tsx': ['No events yet'],
    'src/components/TauntBubble.tsx': ['Taunts warming up'],
  };

  for (const [path, labels] of Object.entries(componentChecks)) {
    const contents = read(path);
    for (const label of labels) {
      assert.match(contents, new RegExp(label));
    }
  }
});
