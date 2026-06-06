import { useState } from 'react';
import { DevSync } from './components/DevSync';
import { JoinScreen } from './screens/Join';
import { LobbyScreen } from './screens/Lobby';
import { MatchScreen } from './screens/Match';
import { ResultsScreen } from './screens/Results';
import { JudgeScreen } from './screens/Judge';
import {
  createMockGameUiState,
  type GameUiActions,
  type PlayerRole,
} from './screens/uiState';

/** Every top-level view the app can show. `dev` is the Phase 0 scaffold proof. */
export type Screen = 'dev' | 'join' | 'lobby' | 'match' | 'results' | 'judge';

/** Props every game screen receives from the router. */
export interface ScreenProps {
  navigate: (screen: Screen) => void;
}

/**
 * Dumb router.
 *
 * Holds the current screen in local state and renders the matching component —
 * nothing more. Real navigation (driven by room/connection state) and global
 * state (identity, role, room code) land with the gameplay slices. Until then
 * it defaults to the `dev` scaffold screen.
 */
function App() {
  const [screen, setScreen] = useState<Screen>('dev');
  const [gameUiState, setGameUiState] = useState(() => createMockGameUiState());

  const updateMockRole = (role: PlayerRole) => {
    setGameUiState(createMockGameUiState(role));
  };

  const navigateToJoin = () => {
    setScreen('join');
  };

  const actions: GameUiActions = {
    onCreateRoom: (_name, role) => {
      updateMockRole(role);
      setScreen('lobby');
    },
    onJoinRoom: (_name, role, _roomCode) => {
      updateMockRole(role);
      setScreen('lobby');
    },
    onStartRound: () => {
      setScreen('match');
    },
    onEndRound: () => {
      setScreen('results');
    },
    onRematch: () => {
      setScreen('match');
    },
    onBackToLobby: () => {
      setScreen('lobby');
    },
    onReturnToDev: () => {
      setScreen('dev');
    },
  };

  switch (screen) {
    case 'join':
      return <JoinScreen viewModel={gameUiState.join} actions={actions} />;
    case 'lobby':
      return <LobbyScreen viewModel={gameUiState.lobby} actions={actions} />;
    case 'match':
      return <MatchScreen viewModel={gameUiState.match} actions={actions} />;
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
                  Dev E review lane
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  Phase 0 stays below; enter the mocked game screens from here.
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
