import {
  MAP_HEIGHT,
  MAP_WIDTH,
  type RenderState,
  type RenderTile,
  type RenderTileType,
} from '../renderState';

function tileTypeAt(x: number, y: number): RenderTileType {
  if (x >= 10 && x <= 17 && y >= 6 && y <= 13) {
    return 'bodega';
  }
  if (
    (x === 0 && y === 0) ||
    (x === MAP_WIDTH - 1 && y === 0) ||
    (x === 0 && y === MAP_HEIGHT - 1) ||
    (x === MAP_WIDTH - 1 && y === MAP_HEIGHT - 1)
  ) {
    return 'alley';
  }
  return 'street';
}

function buildMockTiles(): RenderTile[] {
  const tiles: RenderTile[] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles.push({
        x,
        y,
        type: tileTypeAt(x, y),
        ownerColor: x === 4 && y === 4 ? '#e74c3c' : null,
        contested: x === 14 && y === 10,
        shielded: x === 12 && y === 8,
        spilled: x === 8 && y === 12,
      });
    }
  }
  return tiles;
}

/** Self-demonstrating board fixture for Phase 0 renderer work. */
export const MOCK_RENDER_STATE: RenderState = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tiles: buildMockTiles(),
  tokens: [
    {
      playerId: 0,
      x: 1,
      y: 1,
      color: '#3498db',
      boosted: true,
      disabled: false,
    },
    {
      playerId: 1,
      x: 26,
      y: 18,
      color: '#f97316',
      boosted: false,
      disabled: false,
    },
  ],
  pickups: [
    { x: 14, y: 10, type: 'cash' },
    { x: 7, y: 6, type: 'coffee' },
  ],
};
