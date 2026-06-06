import { BoardShell } from '../components/BoardShell';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { Hud } from '../components/Hud';
import { Scoreboard } from '../components/Scoreboard';
import { PhaserGame } from '../game/PhaserGame';
import type { GameUiActions, MatchViewModel } from './uiState';

type MatchScreenProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
};

export function MatchScreen({ viewModel, actions }: MatchScreenProps) {
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <header className="grid gap-4 rounded-lg border border-slate-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Match</p>
            <h1 className="mt-1 text-3xl font-black">{viewModel.roomName}</h1>
          </div>
          <CountdownOverlay label={viewModel.timerLabel} />
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
            <BoardShell>
              <PhaserGame />
            </BoardShell>
            <Scoreboard mode="live" entries={viewModel.liveStandings} />
          </div>

          <Hud
            timerLabel={viewModel.timerLabel}
            roomCode={viewModel.roomCode}
            phaseLabel={viewModel.phaseLabel}
            role={viewModel.localRole}
            taunt={viewModel.recentTaunt}
            events={viewModel.events}
          />
        </div>

        <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Controls</p>
              <h2 className="text-xl font-black">Role-aware action rail</h2>
            </div>
            <button
              type="button"
              onClick={() => actions.onEndRound(viewModel.roomId)}
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Preview results
            </button>
            <button
              type="button"
              onClick={() => actions.onBackToLobby()}
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Lobby
            </button>
            <button
              type="button"
              onClick={() => actions.onReturnToDev()}
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Dev sync
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {viewModel.controls.map(action => (
              <div
                key={action.id}
                className={`rounded-md border px-4 py-4 text-center text-sm font-black uppercase tracking-wide ${
                  action.enabled
                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                    : 'border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                {action.label}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
