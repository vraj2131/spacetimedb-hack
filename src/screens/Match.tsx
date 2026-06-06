import type { ScreenProps } from '../App';
import { BoardShell } from '../components/BoardShell';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { Hud } from '../components/Hud';
import { Scoreboard } from '../components/Scoreboard';
import { PhaserGame } from '../game/PhaserGame';
import { mockEvents, mockPlayers, mockRoom } from './mockData';

export function MatchScreen({ navigate }: ScreenProps) {
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <header className="grid gap-4 rounded-lg border border-slate-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Match</p>
            <h1 className="mt-1 text-3xl font-black">{mockRoom.name}</h1>
          </div>
          <CountdownOverlay label={mockRoom.timerLabel} />
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
            <BoardShell>
              <PhaserGame />
            </BoardShell>
            <Scoreboard mode="live" entries={mockPlayers} />
          </div>

          <Hud
            timerLabel={mockRoom.timerLabel}
            roomCode={mockRoom.code}
            phaseLabel={mockRoom.phaseLabel}
            role={mockRoom.localRole}
            taunt={mockRoom.taunt}
            events={mockEvents}
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
              onClick={() => navigate('results')}
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Preview results
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {['Move', 'Claim', 'Contest', 'Collect'].map(action => (
              <div
                key={action}
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-black uppercase tracking-wide text-slate-700"
              >
                {action}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
