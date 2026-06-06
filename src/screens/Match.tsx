import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { Hud } from '../components/Hud';
import { Scoreboard } from '../components/Scoreboard';
import type { GameUiActions, MatchViewModel } from './uiState';

type MatchScreenProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
};

const overlayButtonClass =
  'rounded-md border border-yellow-300/40 bg-slate-900/90 px-3 py-2 text-xs font-black uppercase tracking-wide text-yellow-100 transition hover:border-yellow-200/70 hover:bg-slate-800';

export function MatchScreen({ viewModel, actions }: MatchScreenProps) {
  return (
    <main className="match-screen min-h-screen bg-slate-950 p-3 text-white">
      <GameStage cameraMode="overview">
        <div className="match-overlay match-overlay--header">
          <div className="match-overlay__panel match-overlay__panel--header">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-yellow-300/90">Match</p>
              <h1 className="text-xl font-black text-white md:text-2xl">{viewModel.roomName}</h1>
            </div>
            <CountdownOverlay label={viewModel.timerLabel} />
          </div>
        </div>

        <div className="match-overlay match-overlay--scoreboard">
          <div className="match-overlay__panel match-overlay__panel--scroll">
            <Scoreboard mode="live" entries={viewModel.liveStandings} />
          </div>
        </div>

        <div className="match-overlay match-overlay--hud">
          <div className="match-overlay__panel match-overlay__panel--scroll">
            <Hud
              timerLabel={viewModel.timerLabel}
              roomCode={viewModel.roomCode}
              phaseLabel={viewModel.phaseLabel}
              role={viewModel.localRole}
              taunt={viewModel.recentTaunt}
              events={viewModel.events}
            />
          </div>
        </div>

        <div className="match-overlay match-overlay--controls">
          <div className="match-overlay__panel match-overlay__panel--controls">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-300/90">Controls</p>
                <h2 className="text-sm font-black text-white md:text-base">Role-aware action rail</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => actions.onEndRound(viewModel.roomId)}
                  className={overlayButtonClass}
                >
                  Preview results
                </button>
                <button type="button" onClick={() => actions.onBackToLobby()} className={overlayButtonClass}>
                  Lobby
                </button>
                <button type="button" onClick={() => actions.onReturnToDev()} className={overlayButtonClass}>
                  Dev sync
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {viewModel.controls.map(action => (
                <div
                  key={action.id}
                  className={`rounded-md border px-3 py-2 text-center text-xs font-black uppercase tracking-wide ${
                    action.enabled
                      ? 'border-yellow-300/30 bg-slate-900/80 text-yellow-100'
                      : 'border-slate-600/50 bg-slate-900/50 text-slate-500'
                  }`}
                >
                  {action.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GameStage>
    </main>
  );
}
