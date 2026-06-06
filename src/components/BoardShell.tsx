import type { ReactNode } from 'react';

type BoardShellProps = {
  children: ReactNode;
};

export function BoardShell({ children }: BoardShellProps) {
  return (
    <section className="rounded-lg border border-slate-300 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">Board</p>
          <h2 className="text-lg font-black">12 x 8 turf grid</h2>
        </div>
        <span className="rounded-md border border-slate-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
          Phaser
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-950 p-3">
        {children}
      </div>
    </section>
  );
}
