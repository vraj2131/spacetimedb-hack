import type { PlayerSummary, ResultRow } from '../screens/mockData';

type ScoreboardProps =
  | {
      mode: 'live';
      entries: PlayerSummary[];
      title?: string;
    }
  | {
      mode: 'results';
      entries: ResultRow[];
      title?: string;
    };

export function Scoreboard({ title, ...props }: ScoreboardProps) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
        {title ?? (props.mode === 'live' ? 'Live standings' : 'Final standings')}
      </p>
      <div className="mt-3 grid gap-2">
        {props.mode === 'live'
          ? props.entries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-sm font-black text-slate-500">#{index + 1}</span>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-white"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate font-bold text-slate-900">{entry.name}</span>
                </div>
                <span className="font-black text-slate-900">{entry.score}</span>
              </div>
            ))
          : props.entries.map(entry => (
              <div
                key={entry.id}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Rank #{entry.rank}
                    </p>
                    <p className="truncate font-bold text-slate-900">{entry.name}</p>
                  </div>
                  <span className="text-lg font-black text-slate-900">{entry.total}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
                  <span>Tiles {entry.territory}</span>
                  <span>Cash {entry.pickups}</span>
                  <span>Bonus {entry.bonus}</span>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
