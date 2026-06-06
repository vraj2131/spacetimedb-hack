/**
 * Fixed NYC map layout.
 *
 * The 28x20 bodega map: dimensions, player spawn seats, and per-cell tile
 * types. `start_round` reads this to seed the `tiles` table and to place
 * players. The map is intentionally larger than the visible viewport so the
 * client can scroll a camera over it later (Dev B); the backend stays the
 * single source of truth for dimensions.
 */

export const MAP_WIDTH = 28;
export const MAP_HEIGHT = 20;

export type TileType = 'street' | 'bodega' | 'alley';

/**
 * The four geometric map corners, in seat order
 * (top-left, top-right, bottom-left, bottom-right). Derived from the map
 * dimensions. NOTE: the corners themselves are `alley` tiles (see
 * `tileTypeAt`), so player spawns use the inward-nudged `SPAWN_POINTS`.
 */
export const SPAWN_CORNERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: MAP_WIDTH - 1, y: 0 },
  { x: 0, y: MAP_HEIGHT - 1 },
  { x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 },
];

/** Maximum number of seated player spawns in a round. */
export const MAX_SPAWN_SEATS = 10;

/**
 * Up to 10 player spawn seats, in join order:
 *   seats 0-3: the four corners (nudged one cell inward so they land on
 *              `street` instead of the `alley` corner tiles),
 *   seats 4-7: the four edge midpoints,
 *   seats 8-9: two extra top-edge points.
 * Every seat is guaranteed to be a non-`alley` tile (asserted in tests).
 */
export const SPAWN_POINTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 1, y: 1 }, // 0 top-left     (nudged from 0,0)
  { x: 26, y: 1 }, // 1 top-right    (nudged from 27,0)
  { x: 1, y: 18 }, // 2 bottom-left  (nudged from 0,19)
  { x: 26, y: 18 }, // 3 bottom-right (nudged from 27,19)
  { x: 14, y: 0 }, // 4 top edge mid
  { x: 27, y: 10 }, // 5 right edge mid
  { x: 14, y: 19 }, // 6 bottom edge mid
  { x: 0, y: 10 }, // 7 left edge mid
  { x: 7, y: 0 }, // 8 extra top-edge
  { x: 21, y: 0 }, // 9 extra top-edge
];

/** Pickup spawn cells. Empty stub for this PR; seeded in a later slice. */
export const PICKUP_SPAWNS: ReadonlyArray<{ x: number; y: number }> = [];

/**
 * Returns the tile type for a cell — the minimal v1 NYC layout:
 *   - the four map corners are `alley`,
 *   - the central cluster x in [10,17], y in [6,13] is `bodega`,
 *   - everything else is `street`.
 */
export function tileTypeAt(x: number, y: number): TileType {
  const isCorner =
    (x === 0 && y === 0) ||
    (x === MAP_WIDTH - 1 && y === 0) ||
    (x === 0 && y === MAP_HEIGHT - 1) ||
    (x === MAP_WIDTH - 1 && y === MAP_HEIGHT - 1);
  if (isCorner) {
    return 'alley';
  }
  if (x >= 10 && x <= 17 && y >= 6 && y <= 13) {
    return 'bodega';
  }
  return 'street';
}

/** Per-tick income for a tile type: street 1, bodega 3, alley 0. */
export function incomeForTileType(type: TileType): number {
  switch (type) {
    case 'bodega':
      return 3;
    case 'alley':
      return 0;
    case 'street':
    default:
      return 1;
  }
}
