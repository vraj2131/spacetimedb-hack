export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const WORLD_PADDING = 96;
export const DEFAULT_VIEWPORT_WIDTH = 768;
export const DEFAULT_VIEWPORT_HEIGHT = 512;

export type Point = {
  readonly px: number;
  readonly py: number;
};

export type MapOrigin = {
  readonly x: number;
  readonly y: number;
};

export type WorldBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
};

export function getMapOrigin(height: number): MapOrigin {
  return {
    x: (height - 1) * (TILE_WIDTH / 2) + WORLD_PADDING,
    y: WORLD_PADDING,
  };
}

export function gridToPixel(x: number, y: number, origin: MapOrigin = { x: 0, y: 0 }): Point {
  return {
    px: origin.x + (x - y) * (TILE_WIDTH / 2),
    py: origin.y + (x + y) * (TILE_HEIGHT / 2),
  };
}

export function pixelToGrid(
  px: number,
  py: number,
  width: number,
  height: number,
  origin: MapOrigin = { x: 0, y: 0 },
): { x: number; y: number } | null {
  const localX = px - origin.x;
  const localY = py - origin.y;
  const rawX = (localY / (TILE_HEIGHT / 2) + localX / (TILE_WIDTH / 2)) / 2;
  const rawY = (localY / (TILE_HEIGHT / 2) - localX / (TILE_WIDTH / 2)) / 2;
  const x = Math.round(rawX);
  const y = Math.round(rawY);

  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null;
  }

  return { x, y };
}

export function getMapWorldBounds(width: number, height: number): WorldBounds {
  const origin = getMapOrigin(height);
  const corners = [
    gridToPixel(0, 0, origin),
    gridToPixel(width - 1, 0, origin),
    gridToPixel(0, height - 1, origin),
    gridToPixel(width - 1, height - 1, origin),
  ];
  const xs = corners.map(point => point.px);
  const ys = corners.map(point => point.py);
  const minX = Math.min(...xs) - TILE_WIDTH / 2 - WORLD_PADDING / 2;
  const maxX = Math.max(...xs) + TILE_WIDTH / 2 + WORLD_PADDING / 2;
  const minY = Math.min(...ys) - TILE_HEIGHT / 2 - WORLD_PADDING / 2;
  const maxY = Math.max(...ys) + TILE_HEIGHT / 2 + WORLD_PADDING / 2;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function depthForGrid(x: number, y: number, layer = 0): number {
  return (x + y) * 100 + layer;
}
