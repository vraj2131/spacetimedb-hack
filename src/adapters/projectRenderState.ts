import {
  MAP_HEIGHT,
  MAP_WIDTH,
  type RenderPickupType,
  type RenderState,
  type RenderTileType,
} from '../renderState.ts';

export type LiveTileRow = {
  readonly roomId: number;
  readonly x: number;
  readonly y: number;
  readonly tileType: string;
  readonly ownerPlayerId: number | null | undefined;
  readonly contestedUntilMs: number | bigint;
  readonly shieldUntilMs: number | bigint;
  readonly spillUntilMs: number | bigint;
};

export type LivePlayerRow = {
  readonly id: number;
  readonly roomId: number;
  readonly role: string;
  readonly color: string;
};

export type LivePlayerStateRow = {
  readonly playerId: number;
  readonly roomId: number;
  readonly x: number;
  readonly y: number;
  readonly speedUntilMs: number | bigint;
  readonly disabledUntilMs: number | bigint;
};

export type LivePickupRow = {
  readonly roomId: number;
  readonly x: number;
  readonly y: number;
  readonly pickupType: string;
  readonly active: boolean;
};

export type ProjectRenderStateInput = {
  readonly roomId: number;
  readonly tiles: readonly LiveTileRow[];
  readonly players: readonly LivePlayerRow[];
  readonly playerStates: readonly LivePlayerStateRow[];
  readonly pickups: readonly LivePickupRow[];
  readonly nowMs: number;
};

function toNumberMs(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function isPlayerRole(role: string): boolean {
  return role === 'player';
}

function asRenderTileType(tileType: string): RenderTileType {
  if (tileType === 'street' || tileType === 'bodega' || tileType === 'alley') {
    return tileType;
  }
  return 'street';
}

function asRenderPickupType(pickupType: string): RenderPickupType {
  if (pickupType === 'cash' || pickupType === 'coffee' || pickupType === 'shield') {
    return pickupType;
  }
  return 'cash';
}

/** Pure map of subscribed room rows into the frozen Phaser-facing snapshot. */
export function projectRenderState({
  roomId,
  tiles,
  players,
  playerStates,
  pickups,
  nowMs,
}: ProjectRenderStateInput): RenderState {
  const roomTiles = tiles.filter(tile => tile.roomId === roomId);
  const roomPlayers = players.filter(player => player.roomId === roomId);
  const roomPlayerStates = playerStates.filter(state => state.roomId === roomId);
  const roomPickups = pickups.filter(pickup => pickup.roomId === roomId && pickup.active);
  const colorByPlayerId = new Map(roomPlayers.map(player => [player.id, player.color]));
  const playerRoleById = new Map(roomPlayers.map(player => [player.id, player.role]));

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles: roomTiles.map(tile => ({
      x: tile.x,
      y: tile.y,
      type: asRenderTileType(tile.tileType),
      ownerColor:
        tile.ownerPlayerId != null
          ? (colorByPlayerId.get(tile.ownerPlayerId) ?? null)
          : null,
      contested: toNumberMs(tile.contestedUntilMs) > nowMs,
      shielded: toNumberMs(tile.shieldUntilMs) > nowMs,
      spilled: toNumberMs(tile.spillUntilMs) > nowMs,
    })),
    tokens: roomPlayerStates
      .filter(state => isPlayerRole(playerRoleById.get(state.playerId) ?? ''))
      .map(state => ({
        playerId: state.playerId,
        x: state.x,
        y: state.y,
        color: colorByPlayerId.get(state.playerId) ?? '#94a3b8',
        boosted: toNumberMs(state.speedUntilMs) > nowMs,
        disabled: toNumberMs(state.disabledUntilMs) > nowMs,
      })),
    pickups: roomPickups.map(pickup => ({
      x: pickup.x,
      y: pickup.y,
      type: asRenderPickupType(pickup.pickupType),
    })),
  };
}
