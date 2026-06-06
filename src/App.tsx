import { useState } from 'react';
import { DevSync } from './components/DevSync';
import { JoinScreen } from './screens/Join';
import { LobbyScreen } from './screens/Lobby';
import { MatchScreen } from './screens/Match';
import { ResultsScreen } from './screens/Results';
import { JudgeScreen } from './screens/Judge';

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

  switch (screen) {
    case 'join':
      return <JoinScreen navigate={setScreen} />;
    case 'lobby':
      return <LobbyScreen navigate={setScreen} />;
    case 'match':
      return <MatchScreen navigate={setScreen} />;
    case 'results':
      return <ResultsScreen navigate={setScreen} />;
    case 'judge':
      return <JudgeScreen navigate={setScreen} />;
    case 'dev':
    default:
      return <DevSync />;
  }
}

export default App;
