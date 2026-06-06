import type { LiveStanding, ResultRow } from '../screens/uiState';

type ScoreboardBaseProps = {
  title?: string;
  variant?: 'default' | 'compact';
};

type ScoreboardProps = ScoreboardBaseProps &
  (
    | {
        mode: 'live';
        entries: LiveStanding[];
      }
    | {
        mode: 'results';
        entries: ResultRow[];
      }
  );

export function Scoreboard({ title, variant = 'default', ...props }: ScoreboardProps) {
  const emptyLabel = props.mode === 'live' ? 'No standings yet' : 'No result rows yet';
  const isCompact = variant === 'compact';

  const sectionClass = isCompact
    ? 'match-panel match-panel--rail flex min-h-0 flex-1 flex-col'
    : 'rounded-lg border border-slate-300 bg-white p-4 shadow-sm';

  const labelClass = isCompact
    ? 'match-panel__label'
    : 'text-xs font-bold uppercase tracking-wide text-teal-700';

  const listClass = isCompact ? 'match-panel__scroll mt-1.5 grid gap-1' : 'mt-3 grid gap-2';

  const emptyClass = isCompact
    ? 'text-xs font-semibold text-slate-400'
    : 'rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-600';

  const liveRowClass = isCompact
    ? 'flex items-center justify-between rounded border border-white/10 bg-slate-800/50 px-2 py-1'
    : 'flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2';

  const rankClass = isCompact
    ? 'w-5 text-[0.65rem] font-black text-slate-400'
    : 'w-6 text-sm font-black text-slate-500';

  const nameClass = isCompact
    ? 'truncate text-xs font-bold text-slate-100'
    : 'truncate font-bold text-slate-900';

  const scoreClass = isCompact
    ? 'text-xs font-black text-yellow-200'
    : 'font-black text-slate-900';

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
        {title ?? (props.mode === 'live' ? 'Live standings (income + pickups)' : 'Final standings')}
      </p>
      <div className={listClass}>
        {props.entries.length === 0 ? (
          <div className={emptyClass}>{emptyLabel}</div>
        ) : props.mode === 'live' ? (
          props.entries.map((entry, index) => (
            <div key={entry.id} className={liveRowClass}>
              <div className="flex min-w-0 items-center gap-2">
                <span className={rankClass}>#{index + 1}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={nameClass}>{entry.name}</span>
              </div>
              <span className={scoreClass}>{entry.score}</span>
            </div>
          ))
        ) : (
          props.entries.map(entry => (
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
          ))
        )}
      </div>
    </section>
  );
}
