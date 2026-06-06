import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { projectGameUiState } from '../adapters/projectGameUiState.ts';
import { projectRenderState } from '../adapters/projectRenderState.ts';
import { resolveTileIdAt } from '../adapters/resolveTileId.ts';
import { DbConnection, tables } from '../module_bindings/index.ts';
import { EMPTY_RENDER_STATE, type RenderState } from '../renderState.ts';
import type { GameUiActions, GameUiState, PlayerRole } from '../screens/uiState.ts';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export type LiveGameActions = GameUiActions & {
  onMove: (direction: MoveDirection) => void;
  onClaimTileAt: (x: number, y: number) => void;
};

export type LiveGameState = {
  gameUiState: GameUiState;
  renderState: RenderState;
  localPlayerId: number | null;
  actions: LiveGameActions;
  isReady: boolean;
  isSubmitting: boolean;
  actionError: string | null;
};

const DEFAULT_PLAYER_NAME = 'Player';

function reducerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Action failed';
}

export function useLiveGameState(): LiveGameState {
  const connState = useSpacetimeDB();
  const conn = connState.getConnection() as DbConnection | null;
  const { identity, isActive: connected } = connState;

  const [rooms, roomsReady] = useTable(tables.rooms);
  const [players, playersReady] = useTable(tables.players);
  const [playerStates, playerStatesReady] = useTable(tables.player_state);
  const [tiles, tilesReady] = useTable(tables.tiles);
  const [pickups, pickupsReady] = useTable(tables.pickups);
  const [events, eventsReady] = useTable(tables.events);
  const [taunts, tauntsReady] = useTable(tables.taunts);
  const [roundResults, roundResultsReady] = useTable(tables.round_results);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) {
      return;
    }

    setNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [connected]);

  const isReady =
    connected &&
    roomsReady &&
    playersReady &&
    playerStatesReady &&
    tilesReady &&
    pickupsReady &&
    eventsReady &&
    tauntsReady &&
    roundResultsReady;

  const localPlayer = useMemo(() => {
    if (!identity) {
      return undefined;
    }
    const localIdentityHex = identity.toHexString();
    return players.find(player => player.identity.toHexString() === localIdentityHex);
  }, [identity, players]);

  const roomId = localPlayer?.roomId ?? 0;
  const room = useMemo(
    () => (roomId > 0 ? (rooms.find(entry => entry.id === roomId) ?? null) : null),
    [roomId, rooms],
  );

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      if (!conn || !connected || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setActionError(null);
      try {
        await action();
      } catch (error) {
        setActionError(reducerErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [conn, connected, isSubmitting],
  );

  const ensureRegistered = useCallback(
    async (name: string, role: PlayerRole) => {
      if (!conn) {
        throw new Error('Not connected');
      }
      if (localPlayer) {
        return;
      }
      await conn.reducers.registerPlayer({ name: name.trim(), role });
    },
    [conn, localPlayer],
  );

  const onCreateRoom = useCallback(
    (name: string, role: PlayerRole) => {
      void runAction(async () => {
        await ensureRegistered(name, role);
        await conn!.reducers.createRoom({});
      });
    },
    [conn, ensureRegistered, runAction],
  );

  const onJoinRoom = useCallback(
    (name: string, role: PlayerRole, roomCode: string) => {
      void runAction(async () => {
        await ensureRegistered(name, role);
        await conn!.reducers.joinRoom({ roomCode });
      });
    },
    [conn, ensureRegistered, runAction],
  );

  const onStartRound = useCallback(
    (targetRoomId: number) => {
      void runAction(async () => {
        await conn!.reducers.startRound({ roomId: targetRoomId });
      });
    },
    [conn, runAction],
  );

  const onEndRound = useCallback(
    (targetRoomId: number) => {
      void runAction(async () => {
        await conn!.reducers.endRound({ roomId: targetRoomId });
      });
    },
    [conn, runAction],
  );

  const onRematch = useCallback(
    (targetRoomId: number) => {
      void runAction(async () => {
        await conn!.reducers.rematch({ roomId: targetRoomId });
      });
    },
    [conn, runAction],
  );

  const onMove = useCallback(
    (direction: MoveDirection) => {
      void runAction(async () => {
        await conn!.reducers.movePlayer({ direction });
      });
    },
    [conn, runAction],
  );

  const onClaimTileAt = useCallback(
    (x: number, y: number) => {
      void runAction(async () => {
        const tileId = resolveTileIdAt(tiles, roomId, x, y);
        if (tileId == null) {
          throw new Error(`No tile at (${x}, ${y})`);
        }
        await conn!.reducers.claimTile({ tileId });
      });
    },
    [conn, roomId, runAction, tiles],
  );

  const actions = useMemo<LiveGameActions>(
    () => ({
      onCreateRoom,
      onJoinRoom,
      onStartRound,
      onEndRound,
      onRematch,
      onBackToLobby: () => {},
      onReturnToDev: () => {},
      onMove,
      onClaimTileAt,
    }),
    [
      onClaimTileAt,
      onCreateRoom,
      onEndRound,
      onJoinRoom,
      onMove,
      onRematch,
      onStartRound,
    ],
  );

  const gameUiState = useMemo(
    () =>
      projectGameUiState({
        roomId,
        room,
        players,
        tiles,
        events,
        taunts,
        roundResults,
        localIdentity: identity ?? null,
        nowMs,
        connection: {
          isConnected: connected,
          isSubmitting,
          actionError,
        },
        joinDefaults: {
          defaultName: localPlayer?.name ?? DEFAULT_PLAYER_NAME,
          defaultRole: (localPlayer?.role === 'spectator' ? 'spectator' : 'player') as PlayerRole,
          suggestedRoomCode: room?.code ?? '',
        },
      }),
    [
      actionError,
      connected,
      events,
      identity,
      isSubmitting,
      localPlayer,
      nowMs,
      players,
      room,
      roomId,
      roundResults,
      taunts,
      tiles,
    ],
  );

  const renderState = useMemo(
    () =>
      roomId > 0 && room
        ? projectRenderState({
            roomId,
            tiles,
            players,
            playerStates,
            pickups,
            nowMs,
          })
        : EMPTY_RENDER_STATE,
    [nowMs, pickups, playerStates, players, room, roomId, tiles],
  );

  return {
    gameUiState,
    renderState,
    localPlayerId: localPlayer?.id ?? null,
    actions,
    isReady,
    isSubmitting,
    actionError,
  };
}
