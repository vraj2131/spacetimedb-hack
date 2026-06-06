/** Minimum gap between tile-income ticks for a room (ms). Debounces duplicate scheduler fires. */
export const MIN_INCOME_TICK_GAP_MS = 900n;

/** Apply one tick's worth of tile income to a player_state row. */
export function grantTileIncome(
  state: { cash: number; tileIncomeTotal: number },
  income: number,
): { cash: number; tileIncomeTotal: number } {
  if (income <= 0) {
    return state;
  }
  return {
    cash: state.cash + income,
    tileIncomeTotal: state.tileIncomeTotal + income,
  };
}

/** Sum per-tick income for tiles owned by a player in a room. */
export function incomePerTickForOwnedTiles(
  tiles: readonly { ownerPlayerId?: number | null; incomeValue: number }[],
  playerId: number,
): number {
  return tiles
    .filter(tile => tile.ownerPlayerId === playerId)
    .reduce((sum, tile) => sum + Number(tile.incomeValue), 0);
}

/** Count tiles owned by a player. */
export function ownedTileCount(
  tiles: readonly { ownerPlayerId?: number | null }[],
  playerId: number,
): number {
  return tiles.filter(tile => tile.ownerPlayerId === playerId).length;
}

function toNumberMs(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

/** Grant one second of passive income to every player with owned tiles in a live room. */
export function applyRoomTileIncome(
  ctx: any,
  room: { id: number; lastTickAtMs: number | bigint },
  nowMs: bigint,
): void {
  const lastTickMs = BigInt(toNumberMs(room.lastTickAtMs ?? 0));
  if (lastTickMs > 0n && nowMs - lastTickMs < MIN_INCOME_TICK_GAP_MS) {
    return;
  }

  const tiles = [...ctx.db.tiles.roomId.filter(room.id)];
  const players = [...ctx.db.players.roomId.filter(room.id)].filter(
    (player: any) => player.role === 'player',
  );

  for (const player of players) {
    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      continue;
    }
    const income = incomePerTickForOwnedTiles(tiles, player.id);
    if (income <= 0) {
      continue;
    }
    ctx.db.player_state.playerId.update({
      ...state,
      ...grantTileIncome(state, income),
    });
  }

  const currentRoom = ctx.db.rooms.id.find(room.id);
  if (currentRoom) {
    ctx.db.rooms.id.update({
      ...currentRoom,
      lastTickAtMs: nowMs,
    });
  }
}
