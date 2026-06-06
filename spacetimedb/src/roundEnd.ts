import type { TileType } from './map';
import { ownershipBonusForTileType, rankResults } from './scoring';

type ReducerCtx = any;

/**
 * Finish a live room and write one round_results row per player.
 *
 * Scheduled ticks are the source of accumulated tile income. For manual demo
 * ends before the first tick, keep the old lazy fallback so a claimed tile still
 * scores immediately.
 */
export function finishRound(ctx: ReducerCtx, room: any): void {
  const currentRoom = ctx.db.rooms.id.find(room.id);
  if (!currentRoom || currentRoom.state !== 'live') {
    return;
  }

  const roomTiles = [...ctx.db.tiles.roomId.filter(currentRoom.id)];
  const players = [...ctx.db.players.roomId.filter(currentRoom.id)].filter(
    (p: any) => p.role === 'player'
  );

  const lines = [];
  for (const player of players) {
    const state = ctx.db.player_state.playerId.find(player.id);
    if (!state) {
      continue;
    }

    const owned = roomTiles.filter((tile: any) => tile.ownerPlayerId === player.id);
    const currentOwnedIncome = owned.reduce(
      (sum: number, tile: any) => sum + Number(tile.incomeValue),
      0
    );
    const tileScore = Math.max(Number(state.tileIncomeTotal), currentOwnedIncome);
    const ownershipBonus = owned.reduce(
      (sum: number, tile: any) => sum + ownershipBonusForTileType(tile.tileType as TileType),
      0
    );
    const cashScore = Number(state.pickupCashTotal);

    lines.push({
      playerId: player.id,
      tileScore,
      cashScore,
      ownershipBonus,
      totalScore: tileScore + cashScore + ownershipBonus,
    });
  }

  for (const line of rankResults(lines)) {
    ctx.db.round_results.insert({
      id: 0n,
      roomId: currentRoom.id,
      roundNumber: currentRoom.roundNumber,
      playerId: line.playerId,
      tileScore: line.tileScore,
      cashScore: line.cashScore,
      ownershipBonus: line.ownershipBonus,
      totalScore: line.totalScore,
      rank: line.rank,
    });
  }

  ctx.db.round_tick.roomId.delete(currentRoom.id);
  ctx.db.rooms.id.update({ ...currentRoom, state: 'results' });
}
