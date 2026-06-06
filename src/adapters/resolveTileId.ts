type TileLookupRow = {
  readonly id: number;
  readonly roomId: number;
  readonly x: number;
  readonly y: number;
};

/** Resolve a board cell to the subscribed tiles row id for claim_tile. */
export function resolveTileIdAt(
  tiles: readonly TileLookupRow[],
  roomId: number,
  x: number,
  y: number,
): number | null {
  return tiles.find(tile => tile.roomId === roomId && tile.x === x && tile.y === y)?.id ?? null;
}
