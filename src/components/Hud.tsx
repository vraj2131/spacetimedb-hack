import type { EventItem, PlayerRole } from '../screens/uiState';
import { StatusPill } from './StatusPill';

type HudProps = {
  timerLabel: string;
  roomCode: string;
  phaseLabel: string;
  role: PlayerRole;
  taunt: string | null;
  events: EventItem[];
};

const eventToneClass = {
  neutral: 'border-slate-200 bg-slate-50',
  good: 'border-teal-200 bg-teal-50',
  danger: 'border-red-200 bg-red-50',
};

export function Hud({ timerLabel, roomCode, phaseLabel, role, taunt, events }: HudProps) {
  return (
    <aside className="grid gap-4 rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{phaseLabel}</p>
          <p className="text-4xl font-black text-slate-950">{timerLabel}</p>
        </div>
        <div className="grid justify-items-end gap-2">
          <StatusPill label={roomCode} tone="warning" />
          <StatusPill label={role} />
        </div>
      </div>

      <section className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-yellow-800">Taunt feed</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
          {taunt ?? 'Taunts warming up'}
        </p>
      </section>

      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Events</p>
        <div className="mt-2 grid gap-2">
          {events.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
              No events yet
            </div>
          ) : (
            events.map(event => (
            <div
              key={event.id}
              className={`rounded-md border px-3 py-2 text-sm font-semibold text-slate-800 ${eventToneClass[event.tone]}`}
            >
              {event.label}
            </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
