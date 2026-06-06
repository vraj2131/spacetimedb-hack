import type { ScreenProps } from '../App';
import { Scoreboard } from '../components/Scoreboard';
import { mockResults, mockRoom } from './mockData';

export function ResultsScreen({ navigate }: ScreenProps) {
  const winner = mockResults[0];

  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Results</p>
          <h1 className="mt-2 text-4xl font-black">
            {winner ? `${winner.name} owns the block` : 'Round complete'}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-700">
            Server-owned result rows will replace this mocked breakdown once round scoring lands.
          </p>

          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-800">Room</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{mockRoom.code}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('lobby')}
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Back to lobby
            </button>
            <button
              type="button"
              onClick={() => navigate('match')}
              className="rounded-md bg-teal-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Mock rematch
            </button>
            <button
              type="button"
              onClick={() => navigate('dev')}
              className="rounded-md border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-600"
            >
              Dev sync
            </button>
          </div>
        </div>

        <Scoreboard mode="results" entries={mockResults} />
      </section>
    </main>
  );
}
