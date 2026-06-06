import { PlayerRoster } from '../components/PlayerRoster';
import { StatusPill } from '../components/StatusPill';
import type { GameUiActions, LobbyViewModel } from './uiState';

type LobbyScreenProps = {
  viewModel: LobbyViewModel;
  actions: GameUiActions;
};

export function LobbyScreen({ viewModel, actions }: LobbyScreenProps) {
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-6">
          <section className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Lobby</p>
                <h1 className="mt-2 text-4xl font-black">{viewModel.roomName}</h1>
                <p className="mt-3 max-w-2xl leading-7 text-slate-700">
                  Room code <span className="font-black text-slate-950">{viewModel.roomCode}</span> is
                  live. Share it with players or spectators.
                </p>
              </div>
              <StatusPill label={`${viewModel.spectatorCount} spectators`} tone="warning" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Players</p>
                <p className="mt-2 text-2xl font-black">{viewModel.capacityLabel}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Host</p>
                <p className="mt-2 text-2xl font-black">
                  {viewModel.roster.find(player => player.isHost)?.name ?? 'Waiting'}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">State</p>
                <p className="mt-2 text-2xl font-black">{viewModel.stateLabel}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {viewModel.roomState === 'live' ? (
                <button
                  type="button"
                  onClick={actions.onReturnToMatch}
                  className="rounded-md bg-teal-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
                >
                  Return to match
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => actions.onStartRound(viewModel.roomId)}
                  disabled={!viewModel.canStartRound}
                  className="rounded-md bg-teal-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
                >
                  Start round
                </button>
              )}
              {viewModel.canCloseRoom ? (
                <button
                  type="button"
                  onClick={() => actions.onCloseRoom(viewModel.roomId)}
                  className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
                >
                  Close room
                </button>
              ) : viewModel.canLeaveRoom ? (
                <button
                  type="button"
                  onClick={() => actions.onLeaveRoom(viewModel.roomId)}
                  className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
                >
                  Leave room
                </button>
              ) : null}
            </div>
          </section>

          <PlayerRoster players={viewModel.roster} />
        </div>

        <aside className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Live room</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
            <li className="rounded-md border border-slate-200 bg-slate-50 p-3">
              Share the room code so guests can join from the Join screen.
            </li>
            <li className="rounded-md border border-slate-200 bg-slate-50 p-3">
              Host starts the round when the roster is ready. Everyone routes to Match automatically.
            </li>
            <li className="rounded-md border border-slate-200 bg-slate-50 p-3">
              During a live round, use Return to match if you stepped back to the lobby view.
            </li>
            <li className="rounded-md border border-slate-200 bg-slate-50 p-3">
              Close room ends the session in lobby or results. Leave room exits only your own seat.
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
