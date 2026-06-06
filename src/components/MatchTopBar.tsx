import type { GameUiActions, MatchViewModel } from '../screens/uiState';

type MatchTopBarProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
};

const navButtonClass =
  'rounded border border-yellow-300/40 bg-slate-900/90 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-yellow-100 transition hover:border-yellow-200/70 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

export function MatchTopBar({ viewModel, actions }: MatchTopBarProps) {
  return (
    <header className="match-top-bar match-panel">
      <div className="match-top-bar__left">
        <span className="match-top-bar__code">{viewModel.roomCode}</span>
        <span className="match-top-bar__phase">{viewModel.phaseLabel}</span>
      </div>

      <div className="match-top-bar__center">
        <span className="match-top-bar__timer">{viewModel.timerLabel}</span>
      </div>

      <div className="match-top-bar__right">
        <span className="match-top-bar__cash">${viewModel.localCash}</span>
        <span className="match-top-bar__role">{viewModel.localRole}</span>
        {viewModel.isHost ? (
          <button
            type="button"
            onClick={() => actions.onEndRound(viewModel.roomId)}
            disabled={viewModel.roomState !== 'live'}
            className={navButtonClass}
          >
            End round
          </button>
        ) : null}
        <button type="button" onClick={() => actions.onBackToLobby()} className={navButtonClass}>
          Lobby
        </button>
        {viewModel.canLeaveRoom ? (
          <button
            type="button"
            onClick={() => actions.onLeaveRoom(viewModel.roomId)}
            className={navButtonClass}
          >
            Leave
          </button>
        ) : null}
      </div>
    </header>
  );
}
