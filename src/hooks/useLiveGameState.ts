import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { projectGameUiState } from '../adapters/projectGameUiState.ts';
import { projectRenderState } from '../adapters/projectRenderState.ts';
import { resolvePickupIdAt } from '../adapters/resolvePickupId.ts';
import { resolveTileIdAt } from '../adapters/resolveTileId.ts';
import { DbConnection, tables } from '../module_bindings/index.ts';
import { EMPTY_RENDER_STATE, type RenderState } from '../renderState.ts';
import type {
  GameUiActions,
  GameUiState,
  MoveDirection,
  PlayerRole,
} from '../screens/uiState.ts';

export type { MoveDirection };

export type LiveGameState = {
  gameUiState: GameUiState;
  renderState: RenderState;
  localPlayerId: number | null;
  actions: GameUiActions;
  isReady: boolean;
  isSubmitting: boolean;
  actionError: string | null;
};

const DEFAULT_PLAYER_NAME = 'Player';

/**
 * Friendly text for known reducer rejections. Reducers throw `SenderError`
 * for expected validation failures, so the real message (e.g.
 * `join_room: room not found`) reaches the client. A plain `InternalError`
 * ("The instance encountered a fatal error.") is a genuine module crash —
 * usually a stale/corrupt local DB — and is handled separately below.
 */
const FRIENDLY_REDUCER_ERRORS: ReadonlyArray<readonly [string, string]> = [
  ['join_room: room not found', 'No room with that code. Double-check it, or create a new room.'],
  ['join_room: round is in progress', 'That round is already underway — join as a spectator to watch.'],
  ['join_room: room is full', 'That room is full.'],
  ['join_room: caller is already in a room', "You're already in a room."],
  ['create_room: caller is already in a room', "You're already in a room."],
  ['move_player: target is off the map', "Can't move that way — you're at the map edge."],
  ['move_player: cannot move onto an alley', "Can't move onto an alley tile."],
  ['claim_tile: tile is not adjacent', 'Claim an adjacent tile.'],
  ['contest_tile: tile is not adjacent', 'Contest an adjacent tile.'],
  ['contest_tile: tile is shielded', 'That tile is shielded!'],
  ['contest_tile: cannot contest your own', "Can't contest your own tile."],
  ['contest_tile: tile is not owned', 'That tile has no owner to contest.'],
  ['collect_pickup: not on the pickup', "Move onto the pickup to collect it."],
  ['trigger_spectator_event: not enough energy', "Not enough energy for that power."],
  ['move_player: stunned', "You're stunned! Wait it out."],
  ['round is not live', 'Round is not live yet.'],
  ['only the host', 'Only the host can do that.'],
  ['leave_room: caller is not in that room', "You're not in that room anymore."],
  ['leave_room: room not found', 'That room no longer exists.'],
  ['close_room: room is live', 'Finish or leave the live round before closing the room.'],
  ['close_room: only the host', 'Only the host can close the room.'],
  ['close_room: room not found', 'That room no longer exists.'],
];

function reducerErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Action failed';
  }

  const message = error.message.trim();

  // Genuine module crash (stale/corrupt local DB or a module bug): the server
  // reports a detail-free fatal error. Expected validation failures are
  // SenderError and carry a usable message, handled below.
  if (error.name === 'InternalError' || message.includes('fatal error')) {
    return 'The game server hit an internal error. If this keeps happening, run `npm run spacetime:reset:local` and reload.';
  }

  if (message.length === 0) {
    return 'Action failed';
  }

  for (const [needle, friendly] of FRIENDLY_REDUCER_ERRORS) {
    if (message.includes(needle)) {
      return friendly;
    }
  }

  // Fall back to the server message without the internal `reducer_name:` prefix.
  const stripped = message.replace(/^[a-z_]+:\s*/, '');
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
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
  const [spectatorStates, spectatorStatesReady] = useTable(tables.spectator_state);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const didAutoEnd = useRef(false);

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
    roundResultsReady &&
    spectatorStatesReady;

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
      if (!conn || !connected) {
        setActionError('Not connected to the game server.');
        return;
      }
      if (isSubmitting) {
        setActionError('Action already in progress.');
        return;
      }
      if (!isReady) {
        setActionError('Waiting for live data to sync...');
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
    [conn, connected, isReady, isSubmitting],
  );

  // Auto-end: host auto-calls endRound when timer expires.
  useEffect(() => {
    if (!room || room.state !== 'live' || !localPlayer) return;
    const isHost = identity && room.hostIdentity.toHexString() === identity.toHexString();
    if (!isHost) return;

    const endsAt = typeof room.endsAtMs === 'bigint' ? Number(room.endsAtMs) : room.endsAtMs;
    if (endsAt <= 0) return;

    const remaining = endsAt - Date.now();
    if (remaining <= 0 && !didAutoEnd.current) {
      didAutoEnd.current = true;
      void runAction(async () => {
        await conn!.reducers.endRound({ roomId: room.id });
      });
      return;
    }

    const timerId = window.setTimeout(() => {
      if (!didAutoEnd.current) {
        didAutoEnd.current = true;
        void runAction(async () => {
          await conn!.reducers.endRound({ roomId: room.id });
        });
      }
    }, Math.max(remaining, 0));

    return () => window.clearTimeout(timerId);
  }, [conn, identity, localPlayer, room, runAction]);

  // Reset auto-end flag when leaving live state.
  useEffect(() => {
    if (room?.state !== 'live') {
      didAutoEnd.current = false;
    }
  }, [room?.state]);

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

  const onLeaveRoom = useCallback(
    (targetRoomId: number) => {
      void runAction(async () => {
        await conn!.reducers.leaveRoom({ roomId: targetRoomId });
      });
    },
    [conn, runAction],
  );

  const onCloseRoom = useCallback(
    (targetRoomId: number) => {
      void runAction(async () => {
        await conn!.reducers.closeRoom({ roomId: targetRoomId });
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

  const onContestTileAt = useCallback(
    (x: number, y: number) => {
      void runAction(async () => {
        const tileId = resolveTileIdAt(tiles, roomId, x, y);
        if (tileId == null) {
          throw new Error(`No tile at (${x}, ${y})`);
        }
        await conn!.reducers.contestTile({ tileId });
      });
    },
    [conn, roomId, runAction, tiles],
  );

  const onCollectPickupAt = useCallback(
    (x: number, y: number) => {
      void runAction(async () => {
        const pickupId = resolvePickupIdAt(pickups, roomId, x, y);
        if (pickupId == null) {
          throw new Error(`No active pickup at (${x}, ${y})`);
        }
        await conn!.reducers.collectPickup({ pickupId });
      });
    },
    [conn, pickups, roomId, runAction],
  );

  const onContestTile = useCallback(
    (tileId: number) => {
      void runAction(async () => {
        await conn!.reducers.contestTile({ tileId });
      });
    },
    [conn, runAction],
  );

  const onCollectPickup = useCallback(
    (pickupId: number) => {
      void runAction(async () => {
        await conn!.reducers.collectPickup({ pickupId });
      });
    },
    [conn, runAction],
  );

  const onSpectatorEvent = useCallback(
    (eventType: string, targetPlayerId?: number, targetTileId?: number) => {
      void runAction(async () => {
        await conn!.reducers.triggerSpectatorEvent({
          eventType,
          targetPlayerId,
          targetTileId,
        });
      });
    },
    [conn, runAction],
  );

  const onSpectatorTileClick = useCallback(
    (eventType: string, x: number, y: number) => {
      void runAction(async () => {
        const tileId = resolveTileIdAt(tiles, roomId, x, y);
        if (tileId == null) {
          throw new Error(`No tile at (${x}, ${y})`);
        }
        await conn!.reducers.triggerSpectatorEvent({
          eventType,
          targetPlayerId: undefined,
          targetTileId: tileId,
        });
      });
    },
    [conn, roomId, runAction, tiles],
  );

  const actions = useMemo<GameUiActions>(
    () => ({
      onCreateRoom,
      onJoinRoom,
      onStartRound,
      onEndRound,
      onRematch,
      onLeaveRoom,
      onCloseRoom,
      onBackToLobby: () => {},
      onReturnToMatch: () => {},
      onReturnToDev: () => {},
      onMove,
      onClaimTileAt,
      onContestTileAt,
      onCollectPickupAt,
      onContestTile,
      onCollectPickup,
      onSpectatorEvent,
      onSpectatorTileClick,
    }),
    [
      onClaimTileAt,
      onCloseRoom,
      onCollectPickup,
      onCollectPickupAt,
      onContestTile,
      onContestTileAt,
      onCreateRoom,
      onEndRound,
      onJoinRoom,
      onLeaveRoom,
      onMove,
      onRematch,
      onSpectatorEvent,
      onSpectatorTileClick,
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
        spectatorStates,
        playerStates,
        pickups,
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
      pickups,
      playerStates,
      players,
      room,
      roomId,
      roundResults,
      spectatorStates,
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

  useEffect(() => {
    if (isReady) {
      setActionError(null);
    }
  }, [isReady, roomId, gameUiState.roomState]);

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
