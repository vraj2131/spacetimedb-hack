import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventContext,
  eventDetail,
  resultSummary,
} from '../agents/run-flavor.ts';

test('flavor worker maps gameplay events to provider contexts and details', () => {
  const event = {
    eventType: 'contest',
    message: 'Ada contested (2,1)',
    sourcePlayerId: 7,
    targetPlayerId: 4,
  };

  assert.equal(eventContext(event), 'contest');
  assert.equal(eventDetail(event), 'Ada contested (2,1)');
});

test('flavor worker builds static recap summaries from result rows', () => {
  const rows = [
    { rank: 2, playerId: 2, totalScore: 8 },
    { rank: 1, playerId: 1, totalScore: 12 },
  ];
  const players = [
    { id: 1, name: 'Host' },
    { id: 2, name: 'Guest' },
  ];

  assert.equal(resultSummary(rows, players), 'Host:12, Guest:8');
});
