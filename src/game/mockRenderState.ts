import {
  MAP_HEIGHT,
  MAP_WIDTH,
  type RenderState,
  type RenderTile,
  type RenderTileType,
} from '../renderState';

function tileTypeAt(x: number, y: number): RenderTileType {
  if (x >= 4 && x <= 7 && y >= 2 && y <= 5) {
    return 'bodega';
  }
  if ((x === 0 || x === MAP_WIDTH - 1) && y === Math.floor(MAP_HEIGHT / 2)) {
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
        ownerColor: x === 2 && y === 2 ? '#e74c3c' : null,
        contested: x === 6 && y === 4,
        shielded: x === 5 && y === 3,
        spilled: x === 3 && y === 6,
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
  ],
  pickups: [{ x: 6, y: 4, type: 'cash' }],
};
