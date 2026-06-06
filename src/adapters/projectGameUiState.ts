import type {
  ConnectionState,
  EventItem,
  GameUiState,
  LiveStanding,
  PlayerRole,
  ResultRow,
  RoomState,
} from '../screens/uiState.ts';
import { resolvePickupIdAt } from './resolvePickupId.ts';

export type LiveRoomRow = {
  readonly id: number;
  readonly code: string;
  readonly state: string;
  readonly hostIdentity: { toHexString(): string };
  readonly roundNumber: number;
  readonly endsAtMs: number | bigint;
};

export type LivePlayerRow = {
  readonly id: number;
  readonly identity: { toHexString(): string };
  readonly roomId: number;
  readonly name: string;
  readonly role: string;
  readonly color: string;
  readonly connected: boolean;
};

export type LiveTileRow = {
  readonly roomId: number;
  readonly ownerPlayerId: number | null | undefined;
  readonly incomeValue: number;
};

export type LiveEventRow = {
  readonly id: bigint | number;
  readonly roomId: number;
  readonly eventType: string;
  readonly message: string;
  readonly createdAtMs: number | bigint;
  readonly expiresAtMs: number | bigint;
};

export type LiveTauntRow = {
  readonly roomId: number;
  readonly text: string;
  readonly createdAtMs: number | bigint;
};

export type LiveRoundResultRow = {
  readonly roomId: number;
  readonly roundNumber: number;
  readonly playerId: number;
  readonly tileScore: number;
  readonly cashScore: number;
  readonly ownershipBonus: number;
  readonly totalScore: number;
  readonly rank: number;
};

export type LiveSpectatorStateRow = {
  readonly playerId: number;
  readonly roomId: number;
  readonly energy: number;
};

export type LivePlayerStateRow = {
  readonly playerId: number;
  readonly roomId: number;
  readonly x?: number;
  readonly y?: number;
  readonly cash?: number;
  readonly tileIncomeTotal?: number;
  readonly pickupCashTotal?: number;
  readonly speedUntilMs: number | bigint;
  readonly disabledUntilMs: number | bigint;
};

export type LivePickupRow = {
  readonly id: number;
  readonly roomId: number;
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
};

export type ProjectGameUiStateInput = {
  readonly roomId: number;
  readonly room: LiveRoomRow | null;
  readonly players: readonly LivePlayerRow[];
  readonly tiles: readonly LiveTileRow[];
  readonly events: readonly LiveEventRow[];
  readonly taunts: readonly LiveTauntRow[];
  readonly roundResults: readonly LiveRoundResultRow[];
  readonly spectatorStates: readonly LiveSpectatorStateRow[];
  readonly playerStates: readonly LivePlayerStateRow[];
  readonly pickups: readonly LivePickupRow[];
  readonly localIdentity: { toHexString(): string } | null;
  readonly nowMs: number;
  readonly connection: Pick<ConnectionState, 'isConnected' | 'isSubmitting'> & {
    readonly actionError?: string | null;
  };
  readonly joinDefaults: {
    readonly defaultName: string;
    readonly defaultRole: PlayerRole;
    readonly suggestedRoomCode: string;
  };
};

const MAX_PLAYERS = 10;

function toNumberMs(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function asRoomState(state: string | undefined): RoomState {
  if (state === 'lobby' || state === 'live' || state === 'results') {
    return state;
  }
  return 'lobby';
}

function asPlayerRole(role: string | undefined): PlayerRole {
  return role === 'spectator' ? 'spectator' : 'player';
}

function eventTone(eventType: string): EventItem['tone'] {
  if (eventType === 'claim' || eventType === 'collect') {
    return 'good';
  }
  if (eventType === 'contest' || eventType === 'spill' || eventType === 'disabled') {
    return 'danger';
  }
  return 'neutral';
}

function formatTimerLabel(endsAtMs: number, nowMs: number): string {
  const remainingMs = Math.max(0, endsAtMs - nowMs);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ownedTileScore(tiles: readonly LiveTileRow[], playerId: number): number {
  return tiles
    .filter(tile => tile.ownerPlayerId === playerId)
    .reduce((sum, tile) => sum + tile.incomeValue, 0);
}

function matchActionStatus(connection: ProjectGameUiStateInput['connection']): string {
  if (connection.isSubmitting) {
    return 'Submitting action...';
  }
  if (connection.actionError) {
    return connection.actionError;
  }
  return '';
}

function buildConnectionState(
  connection: ProjectGameUiStateInput['connection'],
): ConnectionState {
  const { isConnected, isSubmitting, actionError } = connection;
  let label = 'Disconnected';
  if (isConnected && isSubmitting) {
    label = 'Submitting action...';
  } else if (isConnected && actionError) {
    label = actionError;
  } else if (isConnected) {
    label = 'Connected';
  }

  return {
    status: isConnected ? 'connected' : 'disconnected',
    label,
    isConnected,
    isSubmitting,
  };
}

function ownedTileCount(tiles: readonly LiveTileRow[], playerId: number): number {
  return tiles.filter(tile => tile.ownerPlayerId === playerId).length;
}

function incomePerSecond(tiles: readonly LiveTileRow[], playerId: number): number {
  return ownedTileScore(tiles, playerId);
}

function buildLiveStandings(
  roomPlayers: readonly LivePlayerRow[],
  roomTiles: readonly LiveTileRow[],
  playerStates: readonly LivePlayerStateRow[],
  roomId: number,
): LiveStanding[] {
  const stateByPlayerId = new Map(
    playerStates.filter(state => state.roomId === roomId).map(state => [state.playerId, state]),
  );

  return roomPlayers
    .filter(player => player.role === 'player')
    .map(player => {
      const state = stateByPlayerId.get(player.id);
      const tilesOwned = ownedTileCount(roomTiles, player.id);
      const incomePerSecondRate = incomePerSecond(roomTiles, player.id);
      const score = state ? Number(state.cash ?? 0) : 0;

      return {
        id: String(player.id),
        name: player.name,
        color: player.color,
        score,
        tilesOwned,
        incomePerSecond: incomePerSecondRate,
        status: player.connected ? 'On the board' : 'Disconnected',
      };
    })
    .sort((left, right) => right.score - left.score || right.tilesOwned - left.tilesOwned || left.name.localeCompare(right.name));
}

function buildEvents(
  roomEvents: readonly LiveEventRow[],
  nowMs: number,
): EventItem[] {
  return [...roomEvents]
    .filter(event => toNumberMs(event.expiresAtMs) > nowMs)
    .sort((left, right) => toNumberMs(right.createdAtMs) - toNumberMs(left.createdAtMs))
    .map(event => ({
      id: String(event.id),
      label: event.message,
      tone: eventTone(event.eventType),
    }));
}

function buildResults(
  roomResults: readonly LiveRoundResultRow[],
  roomPlayers: readonly LivePlayerRow[],
): ResultRow[] {
  const nameByPlayerId = new Map(roomPlayers.map(player => [player.id, player.name]));
  return [...roomResults]
    .sort((left, right) => left.rank - right.rank)
    .map(result => ({
      id: String(result.playerId),
      rank: result.rank,
      name: nameByPlayerId.get(result.playerId) ?? `Player ${result.playerId}`,
      territory: result.tileScore,
      pickups: result.cashScore,
      bonus: result.ownershipBonus,
      total: result.totalScore,
    }));
}

function newestTaunt(roomTaunts: readonly LiveTauntRow[]): string | null {
  if (roomTaunts.length === 0) {
    return null;
  }
  const sorted = [...roomTaunts].sort(
    (left, right) => toNumberMs(right.createdAtMs) - toNumberMs(left.createdAtMs),
  );
  return sorted[0]?.text ?? null;
}

/** Pure map of subscribed room rows into the Dev E screen contract. */
export function projectGameUiState({
  roomId,
  room,
  players,
  tiles,
  events,
  taunts,
  roundResults,
  spectatorStates,
  playerStates,
  pickups,
  localIdentity,
  nowMs,
  connection,
  joinDefaults,
}: ProjectGameUiStateInput): GameUiState {
  const localIdentityHex = localIdentity?.toHexString() ?? null;
  const roomPlayers = players.filter(player => player.roomId === roomId);
  const localPlayer =
    localIdentityHex == null
      ? undefined
      : roomPlayers.find(player => player.identity.toHexString() === localIdentityHex);
  const localPlayerState = localPlayer
    ? playerStates.find(s => s.playerId === localPlayer.id && s.roomId === roomId)
    : undefined;
  const localSpectatorState = localPlayer
    ? spectatorStates.find(s => s.playerId === localPlayer.id && s.roomId === roomId)
    : undefined;
  const localRole = asPlayerRole(localPlayer?.role ?? joinDefaults.defaultRole);
  const isSpectator = localRole === 'spectator';
  const hostIdentityHex = room?.hostIdentity.toHexString() ?? null;
  const isHost = localIdentityHex != null && localIdentityHex === hostIdentityHex;
  const roomState = asRoomState(room?.state);
  const roomCode = room?.code ?? joinDefaults.suggestedRoomCode;
  const roundNumber = room?.roundNumber ?? 0;
  const timerEndsAt = room ? toNumberMs(room.endsAtMs) : nowMs;
  const roomTiles = tiles.filter(tile => tile.roomId === roomId);
  const roomEvents = events.filter(event => event.roomId === roomId);
  const roomTaunts = taunts.filter(taunt => taunt.roomId === roomId);
  const roomResultRows = roundResults.filter(
    result => result.roomId === roomId && result.roundNumber === roundNumber,
  );
  const roomPickups = pickups.filter(pickup => pickup.roomId === roomId);
  const localPickupId =
    localPlayerState &&
    localPlayerState.x != null &&
    localPlayerState.y != null &&
    roomState === 'live'
      ? resolvePickupIdAt(roomPickups, roomId, localPlayerState.x, localPlayerState.y)
      : null;
  const liveStandings = buildLiveStandings(roomPlayers, roomTiles, playerStates, roomId);
  const projectedEvents = buildEvents(roomEvents, nowMs);
  const recentTaunt = newestTaunt(roomTaunts);
  const results = buildResults(roomResultRows, roomPlayers);
  const actionStatusLabel = matchActionStatus(connection);
  const playerCount = roomPlayers.filter(player => player.role === 'player').length;
  const spectatorCount = roomPlayers.filter(player => player.role === 'spectator').length;
  const canStartRound = isHost && roomState === 'lobby' && !isSpectator;
  const canRematch = isHost && roomState === 'results' && !isSpectator;
  const canLeaveRoom = roomId > 0;
  const canCloseRoom = isHost && (roomState === 'lobby' || roomState === 'results');
  const connectionState = buildConnectionState(connection);
  const roster = roomPlayers.map(player => ({
    id: String(player.id),
    name: player.name,
    role: asPlayerRole(player.role),
    color: player.color,
    status: player.connected ? 'Connected' : 'Offline',
    isHost: hostIdentityHex != null && player.identity.toHexString() === hostIdentityHex,
    connected: player.connected,
  }));

  return {
    localIdentity: localIdentityHex,
    localRole,
    roomId,
    roomCode,
    roomState,
    roundNumber,
    timerEndsAt,
    isHost,
    isSpectator,
    spectatorCount,
    liveStandings,
    events: projectedEvents,
    recentTaunt,
    results,
    join: {
      connection: connectionState,
      defaultName: joinDefaults.defaultName,
      defaultRole: joinDefaults.defaultRole,
      suggestedRoomCode: joinDefaults.suggestedRoomCode,
    },
    lobby: {
      roomId,
      roomCode,
      roomName: room ? `${room.code} Run` : 'Lobby',
      roomState,
      spectatorCount,
      roster,
      isHost,
      canStartRound,
      canLeaveRoom,
      canCloseRoom,
      actionStatusLabel,
      capacityLabel: `${playerCount} / ${MAX_PLAYERS}`,
      stateLabel: canStartRound ? 'Ready' : 'Waiting for host',
    },
    match: {
      roomId,
      roomCode,
      roomName: room ? `${room.code} Run` : 'Match',
      roomState: roomState === 'live' ? 'live' : roomState,
      phaseLabel: roundNumber > 0 ? `Round ${roundNumber}` : 'Round',
      timerLabel: formatTimerLabel(timerEndsAt, nowMs),
      timerEndsAt,
      localRole,
      isSpectator,
      hasLiveRoom: roomState === 'live',
      liveStandings,
      events: projectedEvents,
      recentTaunt,
      controls: isSpectator
        ? [
            { id: 'boost', label: 'Coffee (4)', enabled: roomState === 'live' && (localSpectatorState?.energy ?? 0) >= 4 },
            { id: 'spill', label: 'Spill (3)', enabled: roomState === 'live' && (localSpectatorState?.energy ?? 0) >= 3 },
            { id: 'shield', label: 'Shield (3)', enabled: roomState === 'live' && (localSpectatorState?.energy ?? 0) >= 3 },
            { id: 'watch', label: `Energy: ${localSpectatorState?.energy ?? 0}`, enabled: false },
          ]
        : [
            { id: 'move', label: 'Move', enabled: roomState === 'live' },
            { id: 'claim', label: 'Claim', enabled: roomState === 'live' },
          ],
      isHost,
      actionStatusLabel,
      spectatorEnergy: localSpectatorState?.energy ?? 0,
      localCash: localPlayerState?.cash ?? 0,
      localTileIncome: localPlayerState?.tileIncomeTotal ?? 0,
      localPickupCash: localPlayerState?.pickupCashTotal ?? 0,
      localTilesOwned: localPlayer ? ownedTileCount(roomTiles, localPlayer.id) : 0,
      localIncomePerSecond: localPlayer ? incomePerSecond(roomTiles, localPlayer.id) : 0,
      claimHint: 'Pick Claim or Contest, then click an adjacent tile.',
      canLeaveRoom,
      localPickupId,
      canCollectPickup: localPickupId != null && roomState === 'live' && !isSpectator,
      canCollect: localPickupId != null && roomState === 'live' && !isSpectator,
      localPlayerEffects: {
        speedBoost: localPlayerState ? toNumberMs(localPlayerState.speedUntilMs) > nowMs : false,
        stunned: localPlayerState ? toNumberMs(localPlayerState.disabledUntilMs) > nowMs : false,
      },
    },
    resultsView: {
      roomId,
      roomCode,
      roomState: roomState === 'results' ? 'results' : roomState,
      winnerName: results[0]?.name ?? null,
      recapLine:
        results.length > 0
          ? 'Total = tile income + pickup cash + territory bonus (see breakdown).'
          : 'Waiting for round_results rows.',
      results,
      canRematch,
      canCloseRoom,
      canLeaveRoom,
      actionStatusLabel,
      hasResults: results.length > 0,
    },
  };
}
