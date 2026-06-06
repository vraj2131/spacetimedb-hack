import { useEffect, useMemo, useRef, useState } from 'react';
import { DevSync } from './components/DevSync';
import { useLiveGameState } from './hooks/useLiveGameState.ts';
import { JoinScreen } from './screens/Join';
import { LobbyScreen } from './screens/Lobby';
import { MatchScreen } from './screens/Match';
import { ResultsScreen } from './screens/Results';
import { JudgeScreen } from './screens/Judge';
import type { GameUiActions, GameUiState } from './screens/uiState';

/** Every top-level view the app can show. `dev` is the Phase 0 scaffold proof. */
export type Screen = 'dev' | 'join' | 'lobby' | 'match' | 'results' | 'judge';

/** Props every game screen receives from the router. */
export interface ScreenProps {
  navigate: (screen: Screen) => void;
}

/**
 * Live router. Defaults to Join; Dev scaffold and Judge stay reachable via
 * explicit navigation.
 */
function App() {
  const [screen, setScreen] = useState<Screen>('join');
  const { gameUiState, renderState, localPlayerId, actions: liveActions } = useLiveGameState();
  const prevRoomIdRef = useRef<number | null>(null);
  const prevRoomStateRef = useRef<GameUiState['roomState'] | null>(null);

  useEffect(() => {
    if (screen === 'dev' || screen === 'judge') {
      return;
    }

    const { roomId, roomState } = gameUiState;
    const prevRoomId = prevRoomIdRef.current;
    const prevRoomState = prevRoomStateRef.current;

    if (roomId === 0) {
      prevRoomIdRef.current = null;
      prevRoomStateRef.current = null;
      if (screen !== 'join') {
        setScreen('join');
      }
      return;
    }

    const roomChanged = prevRoomId !== roomId;
    const stateChanged = prevRoomState !== roomState;
    const isFirstRoute = prevRoomId === null;

    prevRoomIdRef.current = roomId;
    prevRoomStateRef.current = roomState;

    if (!isFirstRoute && !roomChanged && !stateChanged) {
      return;
    }

    const targetScreen: Screen =
      roomState === 'live' ? 'match' : roomState === 'results' ? 'results' : 'lobby';

    setScreen(targetScreen);
  }, [gameUiState.roomId, gameUiState.roomState, screen]);

  const navigateToJoin = () => {
    setScreen('join');
  };

  const actions = useMemo<GameUiActions>(
    () => ({
      ...liveActions,
      onBackToLobby: () => setScreen('lobby'),
      onReturnToMatch: () => setScreen('match'),
      onReturnToDev: () => setScreen('dev'),
    }),
    [liveActions],
  );

  switch (screen) {
    case 'join':
      return <JoinScreen viewModel={gameUiState.join} actions={actions} />;
    case 'lobby':
      return <LobbyScreen viewModel={gameUiState.lobby} actions={actions} />;
    case 'match':
      return (
        <MatchScreen
          viewModel={gameUiState.match}
          actions={actions}
          renderState={renderState}
          localPlayerId={localPlayerId}
        />
      );
    case 'results':
      return <ResultsScreen viewModel={gameUiState.resultsView} actions={actions} />;
    case 'judge':
      return <JudgeScreen navigate={setScreen} />;
    case 'dev':
    default:
      return (
        <>
          <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  Bodega Blitz
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  Phase 0 scaffold stays below. Enter the live game flow from here.
                </p>
              </div>
              <button
                type="button"
                onClick={navigateToJoin}
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-black uppercase tracking-wide text-white"
              >
                Start Bodega Blitz
              </button>
            </div>
          </div>
          <DevSync />
        </>
      );
  }
}

export default App;
