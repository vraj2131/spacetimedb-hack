import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { Hud } from '../components/Hud';
import { Scoreboard } from '../components/Scoreboard';
import type { RenderState } from '../renderState';
import type { GameUiActions, MatchViewModel, MoveDirection } from './uiState';

type MatchScreenProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
  renderState: RenderState;
  localPlayerId: number | null;
};

const overlayButtonClass =
  'rounded-md border border-yellow-300/40 bg-slate-900/90 px-3 py-2 text-xs font-black uppercase tracking-wide text-yellow-100 transition hover:border-yellow-200/70 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

const moveButtonClass =
  'rounded-md border border-yellow-300/30 bg-slate-900/80 px-3 py-2 text-xs font-black uppercase tracking-wide text-yellow-100 transition hover:border-yellow-200/70 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

const MOVE_BUTTONS: Array<{ direction: MoveDirection; label: string; className?: string }> = [
  { direction: 'up', label: 'Up', className: 'col-start-2' },
  { direction: 'left', label: 'Left', className: 'col-start-1 row-start-2' },
  { direction: 'down', label: 'Down', className: 'col-start-2 row-start-2' },
  { direction: 'right', label: 'Right', className: 'col-start-3 row-start-2' },
];

export function MatchScreen({
  viewModel,
  actions,
  renderState,
  localPlayerId,
}: MatchScreenProps) {
  const canPlay = !viewModel.isSpectator && viewModel.roomState === 'live';

  const handleTileClick = (x: number, y: number) => {
    if (!canPlay) {
      return;
    }
    actions.onClaimTileAt(x, y);
  };

  return (
    <main className="match-screen min-h-screen bg-slate-950 p-3 text-white">
      <GameStage
        cameraMode="overview"
        renderState={renderState}
        localPlayerId={localPlayerId ?? undefined}
        onTileClick={handleTileClick}
      >
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
                <h2 className="text-sm font-black text-white md:text-base">
                  {viewModel.isSpectator ? 'Spectator watch mode' : 'Move and claim adjacent tiles'}
                </h2>
                {viewModel.actionStatusLabel ? (
                  <p className="mt-1 text-xs font-semibold text-rose-300">{viewModel.actionStatusLabel}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {viewModel.isHost ? (
                  <button
                    type="button"
                    onClick={() => actions.onEndRound(viewModel.roomId)}
                    disabled={viewModel.roomState !== 'live'}
                    className={overlayButtonClass}
                  >
                    End round
                  </button>
                ) : null}
                <button type="button" onClick={() => actions.onBackToLobby()} className={overlayButtonClass}>
                  Lobby
                </button>
                <button type="button" onClick={() => actions.onReturnToDev()} className={overlayButtonClass}>
                  Dev sync
                </button>
              </div>
            </div>

            {canPlay ? (
              <div className="mt-3 grid max-w-[12rem] grid-cols-3 gap-2">
                {MOVE_BUTTONS.map(button => (
                  <button
                    key={button.direction}
                    type="button"
                    className={`${moveButtonClass} ${button.className ?? ''}`}
                    onClick={() => actions.onMove(button.direction)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </GameStage>
    </main>
  );
}
