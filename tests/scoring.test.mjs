import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ownershipBonusForTileType,
  rankResults,
} from '../spacetimedb/src/scoring.ts';

test('ownershipBonusForTileType rewards bodegas over streets, alleys score nothing', () => {
  assert.equal(ownershipBonusForTileType('bodega'), 10);
  assert.equal(ownershipBonusForTileType('street'), 3);
  assert.equal(ownershipBonusForTileType('alley'), 0);
});

test('rankResults orders by totalScore descending', () => {
  const ranked = rankResults([
    { playerId: 1, totalScore: 5 },
    { playerId: 2, totalScore: 12 },
    { playerId: 3, totalScore: 9 },
  ]);
  assert.deepEqual(
    ranked.map(r => [r.playerId, r.rank]),
    [
      [2, 1],
      [3, 2],
      [1, 3],
    ]
  );
});

test('rankResults breaks ties in favor of the lower playerId', () => {
  const ranked = rankResults([
    { playerId: 7, totalScore: 10 },
    { playerId: 3, totalScore: 10 },
    { playerId: 5, totalScore: 10 },
  ]);
  assert.deepEqual(
    ranked.map(r => [r.playerId, r.rank]),
    [
      [3, 1],
      [5, 2],
      [7, 3],
    ]
  );
});

test('rankResults does not mutate its input', () => {
  const input = [
    { playerId: 1, totalScore: 1 },
    { playerId: 2, totalScore: 2 },
  ];
  const snapshot = JSON.stringify(input);
  rankResults(input);
  assert.equal(JSON.stringify(input), snapshot);
});
