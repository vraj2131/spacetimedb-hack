import type { RosterPlayer } from '../screens/uiState';
import { StatusPill } from './StatusPill';

type PlayerRosterProps = {
  players: RosterPlayer[];
};

export function PlayerRoster({ players }: PlayerRosterProps) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Roster</p>
          <h2 className="text-lg font-black text-slate-950">Ready players</h2>
        </div>
        <StatusPill label={`${players.length} active`} tone="good" />
      </div>
      <ul className="mt-4 grid gap-2">
        {players.length === 0 ? (
          <li className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-600">
            Waiting for players
          </li>
        ) : (
          players.map(player => (
          <li
            key={player.id}
            className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white"
                style={{ backgroundColor: player.color }}
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  {player.name}
                  {player.isHost ? <span className="text-teal-700"> host</span> : null}
                </p>
                <p className="truncate text-sm text-slate-600">{player.status}</p>
              </div>
            </div>
            <StatusPill label={player.role} tone={player.role === 'spectator' ? 'warning' : 'neutral'} />
          </li>
          ))
        )}
      </ul>
    </section>
  );
}
