import Phaser from 'phaser';
import type {
  RenderPickup,
  RenderState,
  RenderTile,
  RenderTileType,
  RenderToken,
} from '../../renderState';
import { EventBus } from '../EventBus';
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  depthForGrid,
  getMapOrigin,
  getMapWorldBounds,
  gridToPixel,
  pixelToGrid,
} from '../projection';

export type CameraMode = 'follow' | 'overview';

type BoardSceneConfig = {
  readonly cameraMode?: CameraMode;
  readonly localPlayerId?: number;
};

type TileCell = {
  readonly base: Phaser.GameObjects.Polygon | Phaser.GameObjects.Image;
  readonly overlay: Phaser.GameObjects.Polygon | Phaser.GameObjects.Image;
};

type TokenSprite = {
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly body: Phaser.GameObjects.Arc;
  readonly outline: Phaser.GameObjects.Arc;
};

type PickupSprite = Phaser.GameObjects.Polygon | Phaser.GameObjects.Image;

type SceneryBody = Phaser.GameObjects.GameObject & {
  destroy(fromScene?: boolean): void;
  setDepth(value: number): unknown;
};

type ScenerySprite = {
  readonly base: Phaser.GameObjects.Polygon | Phaser.GameObjects.Ellipse;
  readonly body: SceneryBody;
  readonly cap?: SceneryBody;
};

const TILE_FILL: Record<RenderTileType, number> = {
  street: 0x596272,
  bodega: 0x9a7419,
  alley: 0x392b4a,
};

const PICKUP_FILL: Record<RenderPickup['type'], number> = {
  cash: 0xf1c40f,
  coffee: 0xc0392b,
  shield: 0x3498db,
};

const DIAMOND_POINTS = [
  0,
  -TILE_HEIGHT / 2 - 0.75,
  TILE_WIDTH / 2 + 0.75,
  0,
  0,
  TILE_HEIGHT / 2 + 0.75,
  -TILE_WIDTH / 2 - 0.75,
  0,
];

const SMALL_DIAMOND_POINTS = [0, -7, 13, 0, 0, 7, -13, 0];
const TOKEN_BODY_OFFSET_Y = -24;
const PICKUP_OFFSET_Y = -4;
const ATLAS_KEY = 'game';
const TILE_SPRITE_SCALE = TILE_WIDTH / 128;
const PICKUP_SPRITE_SCALE = 0.22;
const FX_SPRITE_SCALE = TILE_WIDTH / 128;

function isImage(
  object: Phaser.GameObjects.GameObject,
): object is Phaser.GameObjects.Image {
  return object instanceof Phaser.GameObjects.Image;
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function pickupKey(pickup: RenderPickup): string {
  return `${pickup.x},${pickup.y},${pickup.type}`;
}

function parseColor(color: string): number {
  return Phaser.Display.Color.HexStringToColor(color).color;
}

function tileFrameKey(type: RenderTileType): string {
  return `tile_${type}`;
}

function pickupFrameKey(type: RenderPickup['type']): string {
  return `pickup_${type}`;
}

function fxFrameKey(tile: RenderTile): string | null {
  if (tile.spilled) return 'fx_spill';
  if (tile.shielded) return 'fx_shield';
  if (tile.contested) return 'fx_speed';
  return null;
}

function decorationKind(tile: RenderTile): 'tree' | 'hydrant' | 'newsstand' | 'building' | null {
  if (tile.type === 'alley') return 'building';
  if (tile.type === 'bodega' && (tile.x * 17 + tile.y * 19) % 53 === 0) return 'newsstand';
  if (tile.type === 'street' && (tile.x * 13 + tile.y * 7) % 37 === 0) return 'tree';
  if (tile.type === 'street' && (tile.x * 5 + tile.y * 11) % 43 === 0) return 'hydrant';
  return null;
}

export class BoardScene extends Phaser.Scene {
  static readonly KEY = 'BoardScene';

  private readonly cameraMode: CameraMode;
  private readonly localPlayerId?: number;
  private boardWidth = 0;
  private boardHeight = 0;
  private tileCells = new Map<string, TileCell>();
  private tokenSprites = new Map<number, TokenSprite>();
  private pickupSprites = new Map<string, PickupSprite>();
  private scenerySprites = new Map<string, ScenerySprite>();
  private gridLines: Phaser.GameObjects.Graphics | null = null;
  private skyline: Phaser.GameObjects.Graphics | null = null;
  private frame: Phaser.GameObjects.Graphics | null = null;
  private atlasReady = false;
  private unsubscribeRenderState: (() => void) | null = null;
  private pendingRenderState: RenderState | null = null;
  private applyScheduled = false;
  private lastRenderState: RenderState | null = null;
  private minZoom = 0.35;
  private maxZoom = 2.5;
  private isPanning = false;
  private didPan = false;
  private panPointerId = -1;
  private panStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };

  constructor({ cameraMode = 'follow', localPlayerId }: BoardSceneConfig = {}) {
    super({ key: BoardScene.KEY });
    this.cameraMode = cameraMode;
    this.localPlayerId = localPlayerId;
  }

  preload(): void {
    this.load.atlas('game', 'assets/game.png', 'assets/game.json');
    this.load.on('loaderror', () => {
      this.atlasReady = false;
    });
  }

  create(): void {
    this.atlasReady = this.textures.exists('game');

    this.unsubscribeRenderState = EventBus.on('renderState:update', state => {
      this.scheduleApplyRenderState(state);
    });

    const camera = this.cameras.main;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      this.isPanning = true;
      this.didPan = false;
      this.panPointerId = pointer.id;
      this.panStart = {
        x: pointer.x,
        y: pointer.y,
        scrollX: camera.scrollX,
        scrollY: camera.scrollY,
      };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPanning || pointer.id !== this.panPointerId || !pointer.isDown) return;
      const dx = pointer.x - this.panStart.x;
      const dy = pointer.y - this.panStart.y;
      if (Math.hypot(dx, dy) < 6) return;
      this.didPan = true;
      camera.scrollX = this.panStart.scrollX - dx / camera.zoom;
      camera.scrollY = this.panStart.scrollY - dy / camera.zoom;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.panPointerId) return;
      if (!this.didPan && this.boardWidth > 0 && this.boardHeight > 0) {
        const origin = getMapOrigin(this.boardHeight);
        const grid = pixelToGrid(
          pointer.worldX,
          pointer.worldY,
          this.boardWidth,
          this.boardHeight,
          origin,
        );
        if (grid) {
          EventBus.emit('tile:click', grid);
        }
      }
      this.isPanning = false;
      this.didPan = false;
      this.panPointerId = -1;
    });

    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _gameObjects: unknown,
        _deltaX: number,
        deltaY: number,
      ) => {
        const prevZoom = camera.zoom;
        const nextZoom = Phaser.Math.Clamp(prevZoom - deltaY * 0.0015, this.minZoom, this.maxZoom);
        if (nextZoom === prevZoom) return;

        const worldBeforeZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
        camera.setZoom(nextZoom);
        camera.preRender();
        const worldAfterZoom = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
        camera.scrollX += worldBeforeZoom.x - worldAfterZoom.x;
        camera.scrollY += worldBeforeZoom.y - worldAfterZoom.y;
      },
    );

    this.scale.on('resize', () => {
      if (this.lastRenderState) {
        this.configureCamera(this.lastRenderState);
      }
    });
  }

  shutdown(): void {
    this.unsubscribeRenderState?.();
    this.unsubscribeRenderState = null;
    this.pendingRenderState = null;
    this.applyScheduled = false;
  }

  private scheduleApplyRenderState(state: RenderState): void {
    this.pendingRenderState = state;
    if (this.applyScheduled) return;
    this.applyScheduled = true;

    const tryApply = (): void => {
      const camera = this.cameras?.main;
      if (!camera) {
        this.events.once(Phaser.Scenes.Events.UPDATE, tryApply);
        return;
      }

      this.applyScheduled = false;
      const pending = this.pendingRenderState;
      if (!pending) return;
      this.pendingRenderState = null;
      this.applyRenderState(pending);
    };

    tryApply();
  }

  private applyRenderState(state: RenderState): void {
    this.lastRenderState = state;
    const dimensionsChanged =
      state.width !== this.boardWidth || state.height !== this.boardHeight;

    this.boardWidth = state.width;
    this.boardHeight = state.height;

    if (dimensionsChanged || this.tileCells.size === 0) {
      this.rebuildBoardShell(state);
    }

    this.syncTiles(state.tiles);
    this.syncScenery(state.tiles);
    this.syncPickups(state.pickups);
    this.syncTokens(state.tokens);
    this.configureCamera(state);
  }

  private rebuildBoardShell(state: RenderState): void {
    this.destroyBoardObjects();

    const origin = getMapOrigin(state.height);
    const bounds = getMapWorldBounds(state.width, state.height);
    const camera = this.cameras?.main;
    if (!camera) return;
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);

    this.skyline = this.add.graphics();
    this.skyline.fillStyle(0x20334f, 0.72);
    const skylineY = bounds.y + 32;
    for (let i = 0; i < 22; i++) {
      const buildingX = bounds.x + i * 80;
      const buildingHeight = 35 + ((i * 19) % 56);
      this.skyline.fillRect(buildingX, skylineY - buildingHeight, 52, buildingHeight);
    }
    this.skyline.setDepth(-200);
    this.skyline.setScrollFactor(0.35);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const { px, py } = gridToPixel(x, y, origin);
        const depth = depthForGrid(x, y);
        const base = this.atlasReady
          ? this.add
              .image(px, py, ATLAS_KEY, 'tile_street')
              .setOrigin(0.5, 0.75)
              .setScale(TILE_SPRITE_SCALE)
              .setDepth(depth)
          : this.add
              .polygon(px, py, DIAMOND_POINTS, TILE_FILL.street)
              .setDepth(depth);
        const overlay = this.atlasReady
          ? this.add
              .image(px, py, ATLAS_KEY, 'fx_spill')
              .setOrigin(0.5, 0.75)
              .setScale(FX_SPRITE_SCALE)
              .setAlpha(0)
              .setDepth(depth + 1)
          : this.add
              .polygon(px, py - 1, DIAMOND_POINTS, 0xffffff, 0)
              .setDepth(depth + 1);
        this.tileCells.set(tileKey(x, y), { base, overlay });
      }
    }

    this.gridLines = this.add.graphics();
    this.gridLines.lineStyle(1, 0x1f2937, 0.24);
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const { px, py } = gridToPixel(x, y, origin);
        this.gridLines.lineBetween(px, py - TILE_HEIGHT / 2, px + TILE_WIDTH / 2, py);
        this.gridLines.lineBetween(px + TILE_WIDTH / 2, py, px, py + TILE_HEIGHT / 2);
        this.gridLines.lineBetween(px, py + TILE_HEIGHT / 2, px - TILE_WIDTH / 2, py);
        this.gridLines.lineBetween(px - TILE_WIDTH / 2, py, px, py - TILE_HEIGHT / 2);
      }
    }
    this.gridLines.setDepth(9_500);

    this.frame = this.add.graphics();
    this.frame.lineStyle(3, 0xf7d27a, 0.8);
    this.frame.strokeRect(bounds.x + 16, bounds.y + 16, bounds.width - 32, bounds.height - 32);
    this.frame.setDepth(10_000);
  }

  private destroyBoardObjects(): void {
    this.tileCells.forEach(cell => {
      cell.base.destroy();
      cell.overlay.destroy();
    });
    this.tileCells.clear();
    this.tokenSprites.forEach(sprite => {
      sprite.shadow.destroy();
      sprite.body.destroy();
      sprite.outline.destroy();
    });
    this.tokenSprites.clear();
    this.pickupSprites.forEach(sprite => sprite.destroy());
    this.pickupSprites.clear();
    this.scenerySprites.forEach(sprite => {
      sprite.base.destroy();
      sprite.body.destroy();
      sprite.cap?.destroy();
    });
    this.scenerySprites.clear();
    this.gridLines?.destroy();
    this.gridLines = null;
    this.skyline?.destroy();
    this.skyline = null;
    this.frame?.destroy();
    this.frame = null;
  }

  private syncTiles(tiles: readonly RenderTile[]): void {
    const seen = new Set<string>();

    for (const tile of tiles) {
      const key = tileKey(tile.x, tile.y);
      seen.add(key);
      const cell = this.tileCells.get(key);
      if (!cell) continue;

      if (isImage(cell.base)) {
        cell.base.setTexture(ATLAS_KEY, tileFrameKey(tile.type));
        if (tile.ownerColor) {
          cell.base.setTint(parseColor(tile.ownerColor));
          cell.base.setAlpha(0.88);
        } else {
          cell.base.clearTint();
          cell.base.setAlpha(1);
        }
      } else {
        const fill = tile.ownerColor ? parseColor(tile.ownerColor) : TILE_FILL[tile.type];
        cell.base.setFillStyle(fill, tile.ownerColor ? 0.88 : 1);
      }

      const fxFrame = fxFrameKey(tile);
      if (isImage(cell.overlay)) {
        if (fxFrame) {
          cell.overlay.setTexture(ATLAS_KEY, fxFrame);
          cell.overlay.setAlpha(0.42);
        } else {
          cell.overlay.setAlpha(0);
        }
      } else if (tile.contested) {
        cell.overlay.setFillStyle(0xe67e22, 0.42);
      } else if (tile.shielded) {
        cell.overlay.setFillStyle(0x34d399, 0.38);
      } else if (tile.spilled) {
        cell.overlay.setFillStyle(0x9b59b6, 0.42);
      } else {
        cell.overlay.setFillStyle(0xffffff, 0);
      }
    }

    for (const [key, cell] of this.tileCells) {
      if (seen.has(key)) continue;
      if (isImage(cell.base)) {
        cell.base.setTexture(ATLAS_KEY, 'tile_street');
        cell.base.clearTint();
        cell.base.setAlpha(1);
      } else {
        cell.base.setFillStyle(TILE_FILL.street);
      }
      if (isImage(cell.overlay)) {
        cell.overlay.setAlpha(0);
      } else {
        cell.overlay.setFillStyle(0xffffff, 0);
      }
    }
  }

  private syncScenery(tiles: readonly RenderTile[]): void {
    const seen = new Set<string>();
    const origin = getMapOrigin(this.boardHeight);

    for (const tile of tiles) {
      const kind = decorationKind(tile);
      if (!kind) continue;

      const key = `${kind}:${tile.x},${tile.y}`;
      seen.add(key);
      if (this.scenerySprites.has(key)) continue;

      const { px, py } = gridToPixel(tile.x, tile.y, origin);
      const depth = depthForGrid(tile.x, tile.y, 35);
      let sprite: ScenerySprite;

      if (kind === 'tree') {
        sprite = {
          base: this.add.ellipse(px, py + 2, 18, 8, 0x000000, 0.22),
          body: this.add.rectangle(px, py - 9, 5, 18, 0x8b5a2b),
          cap: this.add.circle(px, py - 22, 12, 0x2f8f5b),
        };
      } else if (kind === 'hydrant') {
        sprite = {
          base: this.add.polygon(px, py, SMALL_DIAMOND_POINTS, 0x000000, 0.18),
          body: this.add.rectangle(px, py - 9, 7, 16, 0xd9463e),
        };
      } else if (kind === 'newsstand') {
        sprite = {
          base: this.add.polygon(px, py, SMALL_DIAMOND_POINTS, 0x1d4ed8, 0.35),
          body: this.add.rectangle(px, py - 16, 24, 18, 0x2563eb),
          cap: this.add.rectangle(px, py - 27, 28, 6, 0xfacc15),
        };
      } else {
        sprite = {
          base: this.add.polygon(px, py, [0, -11, 22, 0, 0, 11, -22, 0], 0x332940, 0.75),
          body: this.add.rectangle(px, py - 24, 30, 38, 0x51415f),
          cap: this.add.rectangle(px, py - 46, 34, 6, 0x6d597a),
        };
      }

      sprite.base.setDepth(depth - 2);
      sprite.body.setDepth(depth);
      sprite.cap?.setDepth(depth + 1);
      this.scenerySprites.set(key, sprite);
    }

    for (const [key, sprite] of this.scenerySprites) {
      if (seen.has(key)) continue;
      sprite.base.destroy();
      sprite.body.destroy();
      sprite.cap?.destroy();
      this.scenerySprites.delete(key);
    }
  }

  private syncPickups(pickups: readonly RenderPickup[]): void {
    const seen = new Set<string>();
    const origin = getMapOrigin(this.boardHeight);

    for (const pickup of pickups) {
      const key = pickupKey(pickup);
      seen.add(key);
      const { px, py } = gridToPixel(pickup.x, pickup.y, origin);
      let sprite = this.pickupSprites.get(key);

      if (!sprite) {
        sprite = this.atlasReady
          ? this.add
              .image(px, py + PICKUP_OFFSET_Y, ATLAS_KEY, pickupFrameKey(pickup.type))
              .setOrigin(0.5, 0.75)
              .setScale(PICKUP_SPRITE_SCALE)
          : this.add
              .polygon(
                px,
                py + PICKUP_OFFSET_Y,
                [0, -9, 9, 0, 0, 9, -9, 0],
                PICKUP_FILL[pickup.type],
              )
              .setStrokeStyle(2, 0xfff4b8, 0.9);
        this.pickupSprites.set(key, sprite);
      } else {
        sprite.setPosition(px, py + PICKUP_OFFSET_Y);
        if (isImage(sprite)) {
          sprite.setTexture(ATLAS_KEY, pickupFrameKey(pickup.type));
        } else {
          sprite.setFillStyle(PICKUP_FILL[pickup.type]);
        }
      }

      sprite.setDepth(depthForGrid(pickup.x, pickup.y, 70));
    }

    for (const [key, sprite] of this.pickupSprites) {
      if (seen.has(key)) continue;
      sprite.destroy();
      this.pickupSprites.delete(key);
    }
  }

  private syncTokens(tokens: readonly RenderToken[]): void {
    const seen = new Set<number>();
    const origin = getMapOrigin(this.boardHeight);

    for (const token of tokens) {
      seen.add(token.playerId);
      const { px, py } = gridToPixel(token.x, token.y, origin);
      let sprite = this.tokenSprites.get(token.playerId);

      if (!sprite) {
        sprite = {
          shadow: this.add.ellipse(px, py, 30, 12, 0x000000, 0.38),
          outline: this.add.circle(px, py + TOKEN_BODY_OFFSET_Y, 17, 0xffffff),
          body: this.add.circle(px, py + TOKEN_BODY_OFFSET_Y, 13, parseColor(token.color)),
        };
        this.tokenSprites.set(token.playerId, sprite);
      } else {
        sprite.shadow.setPosition(px, py);
        sprite.outline.setPosition(px, py + TOKEN_BODY_OFFSET_Y);
        sprite.body.setPosition(px, py + TOKEN_BODY_OFFSET_Y);
        sprite.body.setFillStyle(parseColor(token.color));
      }

      const depth = depthForGrid(token.x, token.y, 5_000);
      sprite.shadow.setDepth(depth - 2);
      sprite.outline.setDepth(depth - 1);
      sprite.body.setDepth(depth);
      sprite.body.setAlpha(token.disabled ? 0.35 : 1);
      sprite.outline.setAlpha(token.disabled ? 0.4 : 1);
      sprite.body.setScale(token.boosted ? 1.15 : 1);
      sprite.outline.setScale(token.boosted ? 1.15 : 1);
    }

    for (const [playerId, sprite] of this.tokenSprites) {
      if (seen.has(playerId)) continue;
      sprite.shadow.destroy();
      sprite.outline.destroy();
      sprite.body.destroy();
      this.tokenSprites.delete(playerId);
    }
  }

  private getFitZoom(camera: Phaser.Cameras.Scene2D.Camera, state: RenderState): number {
    const bounds = getMapWorldBounds(state.width, state.height);
    return Math.min(camera.width / bounds.width, camera.height / bounds.height) * 0.94;
  }

  private configureCamera(state: RenderState): void {
    const camera = this.cameras?.main;
    if (!camera) return;

    const bounds = getMapWorldBounds(state.width, state.height);
    const fitZoom = this.getFitZoom(camera, state);
    this.minZoom = fitZoom;
    this.maxZoom = Math.max(fitZoom * 2.4, 1.25);

    if (this.cameraMode === 'overview') {
      camera.stopFollow();
      camera.setZoom(fitZoom);
      camera.centerOn(bounds.centerX, bounds.centerY);
      return;
    }

    camera.setZoom(Math.max(fitZoom, 0.75));
    const followId = this.localPlayerId ?? state.tokens[0]?.playerId;
    const followTarget = followId === undefined ? undefined : this.tokenSprites.get(followId)?.body;
    if (followTarget) {
      camera.startFollow(followTarget, true, 0.14, 0.14);
    } else {
      camera.stopFollow();
      camera.centerOn(bounds.centerX, bounds.centerY);
    }
  }
}
