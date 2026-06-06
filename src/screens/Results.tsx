import { Scoreboard } from '../components/Scoreboard';
import type { GameUiActions, ResultsViewModel } from './uiState';

type ResultsScreenProps = {
  viewModel: ResultsViewModel;
  actions: GameUiActions;
};

export function ResultsScreen({ viewModel, actions }: ResultsScreenProps) {
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Results</p>
          <h1 className="mt-2 text-4xl font-black">
            {viewModel.winnerName ? `${viewModel.winnerName} owns the block` : 'Round complete'}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-700">
            {viewModel.recapLine}
          </p>

          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-800">Room</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{viewModel.roomCode}</p>
          </div>

          {viewModel.actionStatusLabel ? (
            <p className="mt-4 text-sm font-semibold text-rose-700">{viewModel.actionStatusLabel}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => actions.onRematch(viewModel.roomId)}
              disabled={!viewModel.canRematch}
              className="rounded-md bg-teal-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Rematch
            </button>
            {viewModel.canLeaveRoom ? (
              <button
                type="button"
                onClick={() => actions.onLeaveRoom(viewModel.roomId)}
                className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
              >
                Leave room
              </button>
            ) : null}
            {viewModel.canCloseRoom ? (
              <button
                type="button"
                onClick={() => actions.onCloseRoom(viewModel.roomId)}
                className="rounded-md border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-600"
              >
                Close room
              </button>
            ) : null}
          </div>
        </div>

        <Scoreboard mode="results" entries={viewModel.results} />
      </section>
    </main>
  );
}
