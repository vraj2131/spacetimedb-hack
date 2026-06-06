/**
 * Pure end-of-round scoring helpers.
 *
 * Kept dependency-free (no SpacetimeDB types) so the math is unit-testable in
 * isolation like `map.ts`. `end_round` composes these over live table rows.
 */

import type { TileType } from './map';

/**
 * Flat ownership bonus per owned tile, by type: bodega +10, street +3, alley +0.
 * This is separate from per-tile `incomeValue` (street 1, bodega 3, alley 0) and
 * rewards holding the high-value bodega cluster at the final whistle.
 */
export function ownershipBonusForTileType(type: TileType): number {
  switch (type) {
    case 'bodega':
      return 10;
    case 'street':
      return 3;
    case 'alley':
    default:
      return 0;
  }
}

/** One player's score breakdown for a finished round. */
export interface ScoreLine {
  playerId: number;
  tileScore: number;
  cashScore: number;
  ownershipBonus: number;
  totalScore: number;
}

/**
 * Rank score lines by `totalScore` descending, breaking ties in favor of the
 * lower `playerId`. Returns new objects with a 1-based `rank` (sequential, so
 * tied totals still get distinct ranks via the playerId tiebreak).
 */
export function rankResults<T extends { playerId: number; totalScore: number }>(
  lines: readonly T[]
): Array<T & { rank: number }> {
  return [...lines]
    .sort((a, b) => b.totalScore - a.totalScore || a.playerId - b.playerId)
    .map((line, index) => ({ ...line, rank: index + 1 }));
}
