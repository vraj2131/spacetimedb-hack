/**
 * Fixed board layout — STUB.
 *
 * The 12x8 bodega grid: tile types per cell, spawn corners, and pickup spawn
 * cells. `start_round` will read this to seed the `tiles` / `pickups` tables.
 * Intentionally minimal until the room-sync slice; the constants below are the
 * agreed dimensions so downstream code can depend on them now.
 */

export const BOARD_WIDTH = 12;
export const BOARD_HEIGHT = 8;

export type TileType = 'street' | 'bodega' | 'alley';

/**
 * Spawn corners for up to 4 players, in seat order.
 * (top-left, top-right, bottom-left, bottom-right)
 */
export const SPAWN_CORNERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: BOARD_WIDTH - 1, y: 0 },
  { x: 0, y: BOARD_HEIGHT - 1 },
  { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 },
];

/**
 * Returns the tile type for a cell. Placeholder rule (all `street`) until the
 * real layout (bodega/alley cells + pickup markers) is authored in the
 * room-sync slice.
 */
export function tileTypeAt(_x: number, _y: number): TileType {
  return 'street';
}
