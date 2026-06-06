import Phaser from 'phaser';
import type {
  RenderPickup,
  RenderState,
  RenderTile,
  RenderTileType,
  RenderToken,
} from '../../renderState';
import { EventBus } from '../EventBus';

export const TILE_PX = 32;

const TILE_FILL: Record<RenderTileType, number> = {
  street: 0x4a4f5c,
  bodega: 0x8b6914,
  alley: 0x3d2f4a,
};

const PICKUP_FILL: Record<RenderPickup['type'], number> = {
  cash: 0xf1c40f,
  coffee: 0xc0392b,
  shield: 0x3498db,
};

type TileCell = {
  rect: Phaser.GameObjects.Rectangle;
  overlay: Phaser.GameObjects.Rectangle;
};

type TokenSprite = Phaser.GameObjects.Arc;

type PickupSprite = Phaser.GameObjects.Polygon;

/** Orthographic grid projection — swap helpers later for isometric/2.5D. */
export function gridToPixel(x: number, y: number): { px: number; py: number } {
  return {
    px: x * TILE_PX + TILE_PX / 2,
    py: y * TILE_PX + TILE_PX / 2,
  };
}

export function gridToPixelTopLeft(x: number, y: number): { px: number; py: number } {
  return { px: x * TILE_PX, py: y * TILE_PX };
}

export function pixelToGrid(
  px: number,
  py: number,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const x = Math.floor(px / TILE_PX);
  const y = Math.floor(py / TILE_PX);
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null;
  }
  return { x, y };
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function pickupKey(x: number, y: number): string {
  return `${x},${y}`;
}

function parseColor(color: string): number {
  return Phaser.Display.Color.HexStringToColor(color).color;
}

export class BoardScene extends Phaser.Scene {
  static readonly KEY = 'BoardScene';

  private boardWidth = 0;
  private boardHeight = 0;
  private tileCells = new Map<string, TileCell>();
  private tokenSprites = new Map<number, TokenSprite>();
  private pickupSprites = new Map<string, PickupSprite>();
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private unsubscribeRenderState: (() => void) | null = null;

  constructor() {
    super({ key: BoardScene.KEY });
  }

  create(): void {
    this.unsubscribeRenderState = EventBus.on('renderState:update', state => {
      this.applyRenderState(state);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const grid = pixelToGrid(pointer.x, pointer.y, this.boardWidth, this.boardHeight);
      if (grid) {
        EventBus.emit('tile:click', grid);
      }
    });
  }

  shutdown(): void {
    this.unsubscribeRenderState?.();
    this.unsubscribeRenderState = null;
  }

  private applyRenderState(state: RenderState): void {
    const dimensionsChanged =
      state.width !== this.boardWidth || state.height !== this.boardHeight;

    this.boardWidth = state.width;
    this.boardHeight = state.height;

    if (dimensionsChanged || this.tileCells.size === 0) {
      this.rebuildBoardShell(state);
    }

    this.syncTiles(state.tiles);
    this.syncTokens(state.tokens);
    this.syncPickups(state.pickups);
  }

  private rebuildBoardShell(state: RenderState): void {
    this.tileCells.forEach(cell => {
      cell.rect.destroy();
      cell.overlay.destroy();
    });
    this.tileCells.clear();
    this.tokenSprites.forEach(sprite => sprite.destroy());
    this.tokenSprites.clear();
    this.pickupSprites.forEach(sprite => sprite.destroy());
    this.pickupSprites.clear();
    this.gridGraphics?.destroy();

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const { px, py } = gridToPixelTopLeft(x, y);
        const rect = this.add
          .rectangle(px, py, TILE_PX - 1, TILE_PX - 1, TILE_FILL.street)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x2a2e36);
        const overlay = this.add
          .rectangle(px + 2, py + 2, TILE_PX - 5, TILE_PX - 5, 0xffffff, 0)
          .setOrigin(0, 0);
        this.tileCells.set(tileKey(x, y), { rect, overlay });
      }
    }

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x3a3f4a, 1);
    for (let x = 0; x <= state.width; x++) {
      this.gridGraphics.lineBetween(x * TILE_PX, 0, x * TILE_PX, state.height * TILE_PX);
    }
    for (let y = 0; y <= state.height; y++) {
      this.gridGraphics.lineBetween(0, y * TILE_PX, state.width * TILE_PX, y * TILE_PX);
    }
    this.gridGraphics.setDepth(1);
  }

  private syncTiles(tiles: readonly RenderTile[]): void {
    const seen = new Set<string>();

    for (const tile of tiles) {
      const key = tileKey(tile.x, tile.y);
      seen.add(key);
      const cell = this.tileCells.get(key);
      if (!cell) continue;

      cell.rect.setFillStyle(TILE_FILL[tile.type]);
      if (tile.ownerColor) {
        cell.rect.setFillStyle(parseColor(tile.ownerColor), 0.85);
      } else {
        cell.rect.setFillStyle(TILE_FILL[tile.type]);
      }

      if (tile.contested) {
        cell.overlay.setFillStyle(0xe67e22, 0.35);
      } else if (tile.shielded) {
        cell.overlay.setFillStyle(0x3498db, 0.35);
      } else if (tile.spilled) {
        cell.overlay.setFillStyle(0x9b59b6, 0.35);
      } else {
        cell.overlay.setFillStyle(0xffffff, 0);
      }
    }

    for (const [key, cell] of this.tileCells) {
      if (seen.has(key)) continue;
      cell.rect.setFillStyle(TILE_FILL.street);
      cell.overlay.setFillStyle(0xffffff, 0);
    }
  }

  private syncTokens(tokens: readonly RenderToken[]): void {
    const seen = new Set<number>();

    for (const token of tokens) {
      seen.add(token.playerId);
      const { px, py } = gridToPixel(token.x, token.y);
      let sprite = this.tokenSprites.get(token.playerId);

      if (!sprite) {
        sprite = this.add
          .circle(px, py, TILE_PX * 0.28, parseColor(token.color))
          .setStrokeStyle(2, 0xffffff)
          .setDepth(3);
        this.tokenSprites.set(token.playerId, sprite);
      } else {
        sprite.setPosition(px, py);
        sprite.setFillStyle(parseColor(token.color));
      }

      sprite.setAlpha(token.disabled ? 0.35 : 1);
      sprite.setScale(token.boosted ? 1.15 : 1);
    }

    for (const [playerId, sprite] of this.tokenSprites) {
      if (seen.has(playerId)) continue;
      sprite.destroy();
      this.tokenSprites.delete(playerId);
    }
  }

  private syncPickups(pickups: readonly RenderPickup[]): void {
    const seen = new Set<string>();

    for (const pickup of pickups) {
      const key = pickupKey(pickup.x, pickup.y);
      seen.add(key);
      const { px, py } = gridToPixel(pickup.x, pickup.y);
      const radius = TILE_PX * 0.18;
      let sprite = this.pickupSprites.get(key);

      if (!sprite) {
        sprite = this.add
          .polygon(
            px,
            py,
            [
              0,
              -radius,
              radius,
              0,
              0,
              radius,
              -radius,
              0,
            ],
            PICKUP_FILL[pickup.type],
          )
          .setDepth(2);
        this.pickupSprites.set(key, sprite);
      } else {
        sprite.setPosition(px, py);
        sprite.setFillStyle(PICKUP_FILL[pickup.type]);
      }
    }

    for (const [key, sprite] of this.pickupSprites) {
      if (seen.has(key)) continue;
      sprite.destroy();
      this.pickupSprites.delete(key);
    }
  }
}
