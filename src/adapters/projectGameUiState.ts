import type {
  ConnectionState,
  EventItem,
  GameUiState,
  LiveStanding,
  PlayerRole,
  ResultRow,
  RoomState,
} from '../screens/uiState.ts';

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

export type ProjectGameUiStateInput = {
  readonly roomId: number;
  readonly room: LiveRoomRow | null;
  readonly players: readonly LivePlayerRow[];
  readonly tiles: readonly LiveTileRow[];
  readonly events: readonly LiveEventRow[];
  readonly taunts: readonly LiveTauntRow[];
  readonly roundResults: readonly LiveRoundResultRow[];
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

function buildLiveStandings(
  roomPlayers: readonly LivePlayerRow[],
  roomTiles: readonly LiveTileRow[],
): LiveStanding[] {
  return roomPlayers
    .filter(player => player.role === 'player')
    .map(player => ({
      id: String(player.id),
      name: player.name,
      color: player.color,
      score: ownedTileScore(roomTiles, player.id),
      status: player.connected ? 'On the board' : 'Disconnected',
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
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
  const liveStandings = buildLiveStandings(roomPlayers, roomTiles);
  const projectedEvents = buildEvents(roomEvents, nowMs);
  const recentTaunt = newestTaunt(roomTaunts);
  const results = buildResults(roomResultRows, roomPlayers);
  const playerCount = roomPlayers.filter(player => player.role === 'player').length;
  const spectatorCount = roomPlayers.filter(player => player.role === 'spectator').length;
  const canStartRound = isHost && roomState === 'lobby' && !isSpectator;
  const canRematch = isHost && roomState === 'results' && !isSpectator;
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
            { id: 'boost', label: 'Boost', enabled: false },
            { id: 'spill', label: 'Spill', enabled: false },
            { id: 'shield', label: 'Shield', enabled: false },
            { id: 'watch', label: 'Watch', enabled: true },
          ]
        : [
            { id: 'move', label: 'Move', enabled: roomState === 'live' },
            { id: 'claim', label: 'Claim', enabled: roomState === 'live' },
            { id: 'contest', label: 'Contest', enabled: false },
            { id: 'collect', label: 'Collect', enabled: false },
          ],
      isHost,
      actionStatusLabel: matchActionStatus(connection),
    },
    resultsView: {
      roomId,
      roomCode,
      roomState: roomState === 'results' ? 'results' : roomState,
      winnerName: results[0]?.name ?? null,
      recapLine:
        results.length > 0
          ? 'Final scores from round_results.'
          : 'Waiting for round_results rows.',
      results,
      canRematch,
      hasResults: results.length > 0,
    },
  };
}
