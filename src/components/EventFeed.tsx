import type { EventItem } from '../screens/uiState';

type EventFeedProps = {
  events: EventItem[];
  maxItems?: number;
};

const eventToneClass = {
  neutral: 'border-white/10 bg-slate-800/60 text-slate-200',
  good: 'border-emerald-400/30 bg-emerald-900/30 text-emerald-100',
  danger: 'border-red-400/30 bg-red-900/30 text-red-100',
};

export function EventFeed({ events, maxItems = 4 }: EventFeedProps) {
  const visible = events.slice(0, maxItems);

  return (
    <section className="match-panel match-panel--rail flex min-h-0 flex-1 flex-col">
      <p className="match-panel__label">Events</p>
      <div className="match-panel__scroll mt-1.5 grid gap-1.5">
        {visible.length === 0 ? (
          <p className="text-xs font-semibold text-slate-400">No events yet</p>
        ) : (
          visible.map(event => (
            <div
              key={event.id}
              className={`rounded border px-2 py-1.5 text-xs font-semibold leading-snug ${eventToneClass[event.tone]}`}
            >
              {event.label}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
