import {
  mockEvents,
  mockPlayers,
  mockResults,
  mockRoom,
  mockSpectatorRoom,
} from './mockData';

export type PlayerRole = 'player' | 'spectator';
export type RoomState = 'lobby' | 'live' | 'results';
export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export type ConnectionState = {
  status: 'connected' | 'connecting' | 'disconnected';
  label: string;
  isConnected: boolean;
  isSubmitting: boolean;
};

export type RosterPlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  color: string;
  status: string;
  isHost: boolean;
  connected: boolean;
};

export type LiveStanding = {
  id: string;
  name: string;
  color: string;
  score: number;
  status: string;
};

export type EventItem = {
  id: string;
  label: string;
  tone: 'neutral' | 'good' | 'danger';
};

export type ResultRow = {
  id: string;
  rank: number;
  name: string;
  territory: number;
  pickups: number;
  bonus: number;
  total: number;
};

export type JoinViewModel = {
  connection: ConnectionState;
  defaultName: string;
  defaultRole: PlayerRole;
  suggestedRoomCode: string;
};

export type LobbyViewModel = {
  roomId: number;
  roomCode: string;
  roomName: string;
  roomState: RoomState;
  spectatorCount: number;
  roster: RosterPlayer[];
  isHost: boolean;
  canStartRound: boolean;
  canLeaveRoom: boolean;
  canCloseRoom: boolean;
  capacityLabel: string;
  stateLabel: string;
};

export type MatchControl = {
  id: string;
  label: string;
  enabled: boolean;
};

export type MatchViewModel = {
  roomId: number;
  roomCode: string;
  roomName: string;
  roomState: RoomState;
  phaseLabel: string;
  timerLabel: string;
  timerEndsAt: number;
  localRole: PlayerRole;
  isSpectator: boolean;
  hasLiveRoom: boolean;
  liveStandings: LiveStanding[];
  events: EventItem[];
  recentTaunt: string | null;
  controls: MatchControl[];
  isHost: boolean;
  actionStatusLabel: string;
  spectatorEnergy: number;
  localCash: number;
  claimHint: string;
  canLeaveRoom: boolean;
  localPlayerEffects: { speedBoost: boolean; stunned: boolean };
};

export type ResultsViewModel = {
  roomId: number;
  roomCode: string;
  roomState: RoomState;
  winnerName: string | null;
  recapLine: string;
  results: ResultRow[];
  canRematch: boolean;
  canCloseRoom: boolean;
  canLeaveRoom: boolean;
  hasResults: boolean;
};

export type GameUiState = {
  localIdentity: string | null;
  localRole: PlayerRole;
  roomId: number;
  roomCode: string;
  roomState: RoomState;
  roundNumber: number;
  timerEndsAt: number;
  isHost: boolean;
  isSpectator: boolean;
  spectatorCount: number;
  liveStandings: LiveStanding[];
  events: EventItem[];
  recentTaunt: string | null;
  results: ResultRow[];
  join: JoinViewModel;
  lobby: LobbyViewModel;
  match: MatchViewModel;
  resultsView: ResultsViewModel;
};

export type GameUiActions = {
  onCreateRoom: (name: string, role: PlayerRole) => void;
  onJoinRoom: (name: string, role: PlayerRole, roomCode: string) => void;
  onStartRound: (roomId: number) => void;
  onEndRound: (roomId: number) => void;
  onRematch: (roomId: number) => void;
  onLeaveRoom: (roomId: number) => void;
  onCloseRoom: (roomId: number) => void;
  onBackToLobby: () => void;
  onReturnToMatch: () => void;
  onReturnToDev: () => void;
  onMove: (direction: MoveDirection) => void;
  onClaimTileAt: (x: number, y: number) => void;
  onContestTile: (tileId: number) => void;
  onCollectPickup: (pickupId: number) => void;
  onSpectatorEvent: (eventType: string, targetPlayerId?: number, targetTileId?: number) => void;
  onSpectatorTileClick: (eventType: string, x: number, y: number) => void;
};

const connected: ConnectionState = {
  status: 'connected',
  label: 'Local mock connected',
  isConnected: true,
  isSubmitting: false,
};

export function createMockGameUiState(role: PlayerRole = mockRoom.localRole): GameUiState {
  const sourceRoom = role === 'spectator' ? mockSpectatorRoom : mockRoom;
  const roster = mockPlayers.map(player => ({
    id: player.id,
    name: player.name,
    role: player.role,
    color: player.color,
    status: player.status,
    isHost: Boolean(player.isHost),
    connected: true,
  }));
  const liveStandings = mockPlayers.map(player => ({
    id: player.id,
    name: player.name,
    color: player.color,
    score: player.score,
    status: player.status,
  }));
  const isSpectator = role === 'spectator';
  const roomState: RoomState = 'lobby';
  const timerEndsAt = Date.now() + 72_000;
  const recentTaunt = sourceRoom.taunt;
  const canStartRound = !isSpectator;
  const canRematch = !isSpectator;
  const canLeaveRoom = sourceRoom.id > 0;

  return {
    localIdentity: 'mock-local-identity',
    localRole: role,
    roomId: sourceRoom.id,
    roomCode: sourceRoom.code,
    roomState,
    roundNumber: sourceRoom.roundNumber,
    timerEndsAt,
    isHost: canStartRound,
    isSpectator,
    spectatorCount: sourceRoom.spectators,
    liveStandings,
    events: mockEvents,
    recentTaunt,
    results: mockResults,
    join: {
      connection: connected,
      defaultName: sourceRoom.localName,
      defaultRole: role,
      suggestedRoomCode: sourceRoom.code,
    },
    lobby: {
      roomId: sourceRoom.id,
      roomCode: sourceRoom.code,
      roomName: sourceRoom.name,
      roomState,
      spectatorCount: sourceRoom.spectators,
      roster,
      isHost: canStartRound,
      canStartRound,
      canLeaveRoom,
      canCloseRoom: canStartRound,
      capacityLabel: `${roster.filter(player => player.role === 'player').length} / 4`,
      stateLabel: canStartRound ? 'Ready' : 'Waiting for host',
    },
    match: {
      roomId: sourceRoom.id,
      roomCode: sourceRoom.code,
      roomName: sourceRoom.name,
      roomState: 'live',
      phaseLabel: sourceRoom.phaseLabel,
      timerLabel: sourceRoom.timerLabel,
      timerEndsAt,
      localRole: role,
      isSpectator,
      hasLiveRoom: true,
      liveStandings,
      events: mockEvents,
      recentTaunt,
      controls: isSpectator
        ? [
            { id: 'boost', label: 'Boost', enabled: true },
            { id: 'spill', label: 'Spill', enabled: true },
            { id: 'shield', label: 'Shield', enabled: true },
            { id: 'watch', label: 'Watch', enabled: true },
          ]
        : [
            { id: 'move', label: 'Move', enabled: true },
            { id: 'claim', label: 'Claim', enabled: true },
            { id: 'contest', label: 'Contest', enabled: true },
            { id: 'collect', label: 'Collect', enabled: true },
          ],
      isHost: canStartRound,
      actionStatusLabel: '',
      spectatorEnergy: isSpectator ? 10 : 0,
      localCash: 12,
      claimHint: 'Click an adjacent tile to claim it or contest an enemy tile.',
      canLeaveRoom,
      localPlayerEffects: { speedBoost: false, stunned: false },
    },
    resultsView: {
      roomId: sourceRoom.id,
      roomCode: sourceRoom.code,
      roomState: 'results',
      winnerName: mockResults[0]?.name ?? null,
      recapLine: 'Final scoring will come from round_results once backend scoring lands.',
      results: mockResults,
      canRematch,
      canCloseRoom: canRematch,
      canLeaveRoom,
      hasResults: mockResults.length > 0,
    },
  };
}
