/**
 * RenderState — the FROZEN React <-> Phaser firewall.
 *
 * This is the *only* shape Phaser scenes are allowed to read. React owns the
 * SpacetimeDB hooks, diffs `useTable` updates, and projects them into a
 * `RenderState` snapshot that it pushes to the active scene. Phaser never
 * imports `module_bindings`, never talks to SpacetimeDB, and never sees a raw
 * DB row — it only ever consumes this type.
 *
 * Treat this contract as frozen: it is renderer-facing (positions, colors,
 * effect flags), not DB-shaped. Changing it ripples into every scene, so
 * additions should be deliberate and agreed with whoever owns the Phaser layer.
 * Everything is `readonly` so a snapshot can't be mutated after it's handed off.
 */

export type RenderTileType = 'street' | 'bodega' | 'alley';
export type RenderPickupType = 'cash' | 'coffee' | 'shield';

export interface RenderTile {
  readonly x: number;
  readonly y: number;
  readonly type: RenderTileType;
  /** Owning player's display color, or null when unowned. */
  readonly ownerColor: string | null;
  readonly contested: boolean;
  readonly shielded: boolean;
  readonly spilled: boolean;
}

export interface RenderToken {
  readonly playerId: number;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly boosted: boolean;
  readonly disabled: boolean;
}

export interface RenderPickup {
  readonly x: number;
  readonly y: number;
  readonly type: RenderPickupType;
}

export interface RenderState {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly RenderTile[];
  readonly tokens: readonly RenderToken[];
  readonly pickups: readonly RenderPickup[];
}

/** Default 28x20 bodega map (must match spacetimedb/src/map.ts). */
export const MAP_WIDTH = 28;
export const MAP_HEIGHT = 20;

/** An empty, drawable board — used before a room is joined / round starts. */
export const EMPTY_RENDER_STATE: RenderState = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tiles: [],
  tokens: [],
  pickups: [],
};
